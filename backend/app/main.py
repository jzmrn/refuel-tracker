import logging
import logging.config
import os
from contextlib import asynccontextmanager
from contextvars import ContextVar
from pathlib import Path
from uuid import uuid4

from dagster_duckdb import DuckDBResource
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fueldata.aggregates import AggregatedFuelDataClient
from fueldata.stations import FuelStationClient
from tankerkoenig.client import TankerkoenigClient

from app.api import (
    cars,
    data_points,
    fuel_prices,
    kilometers,
    refuels,
    time_spans,
)
from app.auth import CurrentUser
from app.migrations import run_migrations
from app.storage.car_client import CarClient
from app.storage.data_point_client import DataPointClient
from app.storage.duckdb_resource import BackendDuckDBResource
from app.storage.kilometer_client import KilometerClient
from app.storage.refuel_client import RefuelDataClient
from app.storage.time_span_client import TimeSpanClient
from app.storage.user_store import UserStore

# Context variable for request ID
request_id_var: ContextVar[str] = ContextVar("request_id", default="no-request-id")


class RequestIdFilter(logging.Filter):
    """Filter to add request ID to log records"""

    def filter(self, record):
        record.request_id = request_id_var.get("no-request-id")
        return True


class ExtraContextFormatter(logging.Formatter):
    """Formatter that includes extra context from log records"""

    # Standard log record attributes to exclude from extra context
    STANDARD_ATTRS = {
        "name",
        "msg",
        "args",
        "created",
        "filename",
        "funcName",
        "levelname",
        "levelno",
        "lineno",
        "module",
        "msecs",
        "message",
        "pathname",
        "process",
        "processName",
        "relativeCreated",
        "thread",
        "threadName",
        "exc_info",
        "exc_text",
        "stack_info",
        "request_id",
        "asctime",  # Added by formatter
        "taskName",  # Added by asyncio
    }

    def format(self, record):
        # Get base formatted message
        base_msg = super().format(record)

        # Extract extra context (any attribute not in standard set)
        extra_context = {
            key: value
            for key, value in record.__dict__.items()
            if key not in self.STANDARD_ATTRS and not key.startswith("_")
        }

        # Append extra context if present
        if extra_context:
            # Format extra context as key=value pairs
            context_str = " ".join(f"{k}={v}" for k, v in sorted(extra_context.items()))
            return f"{base_msg} | {context_str}"

        return base_msg


# Configure logging
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "detailed": {
            "()": ExtraContextFormatter,
            "format": "%(asctime)s - %(name)s - %(levelname)s - [%(request_id)s] - %(message)s",
        },
        "simple": {"format": "%(levelname)s - %(name)s - %(message)s"},
    },
    "filters": {"request_id": {"()": RequestIdFilter}},
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "detailed",
            "filters": ["request_id"],
        }
    },
    "root": {"level": os.getenv("LOG_LEVEL", "INFO"), "handlers": ["console"]},
    "loggers": {
        # Framework loggers
        "uvicorn": {"level": "INFO"},
        "uvicorn.access": {"level": "INFO"},
        "httpx": {"level": "WARNING"},
        # Application loggers - can be overridden with env vars
        "app.api": {"level": os.getenv("LOG_LEVEL_API", "INFO")},
        "app.storage": {"level": os.getenv("LOG_LEVEL_STORAGE", "INFO")},
        "app.auth": {"level": os.getenv("LOG_LEVEL_AUTH", "INFO")},
        "app.migrations": {"level": "INFO"},
        # Library loggers
        "fueldata": {"level": os.getenv("LOG_LEVEL_FUELDATA", "INFO")},
        "tankerkoenig": {"level": os.getenv("LOG_LEVEL_TANKERKOENIG", "INFO")},
    },
}

logging.config.dictConfig(LOGGING_CONFIG)
logger = logging.getLogger(__name__)

# Global DuckDB resource instance
duckdb_resource: BackendDuckDBResource = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global duckdb_resource

    # Initialize DuckDB resource
    data_path = os.getenv("DATA_PATH", None)

    if not data_path:
        raise ValueError("DATA_PATH environment variable is not set")

    # Ensure the directory exists
    Path(data_path).mkdir(parents=True, exist_ok=True)

    db_path = Path(data_path) / "userdata.duckdb"
    duckdb_resource = BackendDuckDBResource(db_path)

    # Run database migrations
    run_migrations(db_path)

    # Initialize clients (they create tables on instantiation)
    user_store = UserStore(duckdb_resource)
    refuel_client = RefuelDataClient(duckdb_resource)
    data_point_client = DataPointClient(duckdb_resource)
    time_span_client = TimeSpanClient(duckdb_resource)
    car_client = CarClient(duckdb_resource)
    kilometer_client = KilometerClient(duckdb_resource)

    tankerkoenig_api_key = os.getenv("TANKERKOENIG_API_KEY")
    if not tankerkoenig_api_key:
        logger.warning("TANKERKOENIG_API_KEY not set")
        tankerkoenig_client = None

    tankerkoenig_client = TankerkoenigClient(tankerkoenig_api_key)

    # Initialize FuelStationClient for favorites (uses fueldata.duckdb)
    fuel_db_path = Path(data_path) / "fueldata.duckdb"

    fuel_duckdb_resource = DuckDBResource(database=str(fuel_db_path))
    fuel_station_client = FuelStationClient(fuel_duckdb_resource)
    aggregated_fuel_data_client = AggregatedFuelDataClient(fuel_duckdb_resource)

    logger.info(f"Fuel station client initialized at: {fuel_db_path}")
    logger.info(f"DuckDB initialized at: {db_path}")
    logger.info(f"Absolute path: {db_path.absolute()}")

    # Store clients in app state for dependency injection
    app.state.duckdb_resource = duckdb_resource
    app.state.user_store = user_store
    app.state.refuel_client = refuel_client
    app.state.data_point_client = data_point_client
    app.state.time_span_client = time_span_client
    app.state.car_client = car_client
    app.state.kilometer_client = kilometer_client
    app.state.tankerkoenig_client = tankerkoenig_client
    app.state.fuel_station_client = fuel_station_client
    app.state.aggregated_fuel_data_client = aggregated_fuel_data_client

    yield

    # Shutdown
    logger.info("Application shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Refuel Tracker",
    description="A fuel price tracking application with DuckDB storage",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS - allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost",
        "http://127.0.0.1",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://192.168.178.120:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request ID middleware
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID to each request for tracing"""
    request_id = str(uuid4())
    request_id_var.set(request_id)

    try:
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    except Exception:
        logger.error(
            "Unhandled exception in request",
            exc_info=True,
            extra={
                "path": request.url.path,
                "method": request.method,
                "request_id": request_id,
            },
        )
        raise


# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)

    # Prevent MIME type sniffing
    response.headers["X-Content-Type-Options"] = "nosniff"

    # Prevent clickjacking
    response.headers["X-Frame-Options"] = "DENY"

    # XSS protection (legacy, but still useful for older browsers)
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Content Security Policy (strict policy for security)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https: https://lh3.googleusercontent.com; "
        "font-src 'self'; "
        "connect-src 'self' https://accounts.google.com; "
        "frame-src 'self' https://accounts.google.com"
    )

    # HSTS (HTTP Strict Transport Security) - only in production
    if os.getenv("ENVIRONMENT") == "production":
        response.headers[
            "Strict-Transport-Security"
        ] = "max-age=31536000; includeSubDomains; preload"

    return response


# Exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with proper logging"""
    log_extra = {
        "status_code": exc.status_code,
        "path": request.url.path,
        "method": request.method,
        "detail": exc.detail,
        "request_id": request_id_var.get("no-request-id"),
    }

    # Use appropriate log level based on status code
    if exc.status_code >= 500:
        logger.error(f"HTTP {exc.status_code}: {exc.detail}", extra=log_extra)
    elif exc.status_code >= 400:
        logger.warning(f"HTTP {exc.status_code}: {exc.detail}", extra=log_extra)
    else:
        logger.info(f"HTTP {exc.status_code}: {exc.detail}", extra=log_extra)

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers={"X-Request-ID": request_id_var.get("no-request-id")},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(
        f"Unhandled exception: {str(exc)}",
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "request_id": request_id_var.get("no-request-id"),
        },
    )

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={"X-Request-ID": request_id_var.get("no-request-id")},
    )


# Include routers
app.include_router(cars.router, prefix="/api", tags=["cars"])
app.include_router(refuels.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(kilometers.router, prefix="/api", tags=["kilometers"])
app.include_router(data_points.router, prefix="/api", tags=["data-points"])
app.include_router(time_spans.router, prefix="/api", tags=["time-spans"])
app.include_router(fuel_prices.router, prefix="/api/fuel-prices", tags=["fuel-prices"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Refuel Tracker API",
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    global duckdb_resource

    if not duckdb_resource:
        raise HTTPException(status_code=503, detail="DuckDB resource not initialized")

    return {"status": "healthy", "data_store": "operational", "storage_type": "duckdb"}


# Authentication endpoint
@app.get("/api/auth/me")
async def get_current_user_info(user: CurrentUser):
    """Get current user information from OAuth2 Proxy headers"""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture_base64 if user.picture_base64 else user.picture_url,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
