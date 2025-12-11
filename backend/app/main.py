import os
from contextlib import asynccontextmanager
from pathlib import Path

from dagster_duckdb import DuckDBResource
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fueldata.stations import FuelStationClient
from tankerkoenig.client import TankerkoenigClient

from app.api import (
    cars,
    data_points,
    fuel_prices,
    refuels,
    time_spans,
)
from app.auth import CurrentUser
from app.migrations import run_migrations
from app.storage.car_client import CarClient
from app.storage.data_point_client import DataPointClient
from app.storage.duckdb_resource import BackendDuckDBResource
from app.storage.refuel_client import RefuelDataClient
from app.storage.time_span_client import TimeSpanClient
from app.storage.user_store import UserStore

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

    tankerkoenig_api_key = os.getenv("TANKERKOENIG_API_KEY")
    if not tankerkoenig_api_key:
        print("WARNING: TANKERKOENIG_API_KEY not set")
        tankerkoenig_client = None

    tankerkoenig_client = TankerkoenigClient(tankerkoenig_api_key)

    # Initialize FuelStationClient for favorites (uses fueldata.duckdb)
    fuel_db_path = Path(data_path) / "fueldata.duckdb"

    fuel_duckdb_resource = DuckDBResource(database=str(fuel_db_path))
    fuel_station_client = FuelStationClient(fuel_duckdb_resource)
    print(f"Fuel station client initialized at: {fuel_db_path}")

    print(f"DuckDB initialized at: {db_path}")
    print(f"Absolute path: {db_path.absolute()}")

    # Store clients in app state for dependency injection
    app.state.duckdb_resource = duckdb_resource
    app.state.user_store = user_store
    app.state.refuel_client = refuel_client
    app.state.data_point_client = data_point_client
    app.state.time_span_client = time_span_client
    app.state.car_client = car_client
    app.state.tankerkoenig_client = tankerkoenig_client
    app.state.fuel_station_client = fuel_station_client

    yield

    # Shutdown
    print("Application shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Personal Data Tracker",
    description="A personal finance and metrics tracking application with DuckDB storage",
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


# Include routers
app.include_router(cars.router, prefix="/api", tags=["cars"])
app.include_router(refuels.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(data_points.router, prefix="/api", tags=["data-points"])
app.include_router(time_spans.router, prefix="/api", tags=["time-spans"])
app.include_router(fuel_prices.router, prefix="/api/fuel-prices", tags=["fuel-prices"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Personal Data Tracker API",
        "version": "1.0.0",
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
