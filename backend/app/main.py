import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api import (
    data_points,
    refuels,
    time_spans,
)
from app.auth import CurrentUser
from app.storage.metric_store import DataPointStore
from app.storage.parquet_store import ParquetDataStore
from app.storage.refuel_store import RefuelStore
from app.storage.time_span_store import TimeSpanStore

# Global instances
data_store: ParquetDataStore = None
refuel_store: RefuelStore = None
data_point_store: DataPointStore = None
time_span_store: TimeSpanStore = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global data_store, refuel_store, data_point_store, time_span_store

    # Initialize data store
    # Get the directory where this main.py file is located
    data_path = os.getenv("DATA_PATH", None)

    if not data_path:
        raise ValueError("DATA_PATH environment variable is not set")

    data_store = ParquetDataStore(data_path)

    # Initialize stores
    refuel_store = RefuelStore(data_store)
    data_point_store = DataPointStore(data_store)
    time_span_store = TimeSpanStore(data_store)

    # Inject stores into API modules
    refuels.set_refuel_store(refuel_store)
    data_points.set_data_point_store(data_point_store)
    time_spans.set_time_span_store(time_span_store)

    print(f"Data store initialized with path: {data_path}")
    print(f"Absolute data path: {Path(data_path).absolute()}")

    yield

    # Shutdown
    print("Application shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Personal Data Tracker",
    description="A personal finance and metrics tracking application with Parquet storage",
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
app.include_router(refuels.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(data_points.router, prefix="/api", tags=["data-points"])
app.include_router(time_spans.router, prefix="/api", tags=["time-spans"])


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
    global data_store

    if not data_store:
        raise HTTPException(status_code=503, detail="Data store not initialized")

    return {"status": "healthy", "data_store": "operational", "storage_type": "parquet"}


# Authentication endpoint
@app.get("/api/auth/me")
async def get_current_user_info(user: CurrentUser):
    """Get current user information from OAuth2 Proxy headers"""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
