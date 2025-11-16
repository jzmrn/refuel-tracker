import os
import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from starlette.middleware.sessions import SessionMiddleware

from app.api import (
    data_points,
    refuels,
    time_spans,
)
from app.auth import init_auth_service
from app.storage.backup_manager import BackupManager
from app.storage.metric_registry import MetricRegistry
from app.storage.parquet_store import ParquetDataStore
from app.storage.user_store import UserStore

from .auth import CurrentUser

# Global instances
data_store: ParquetDataStore = None
backup_manager: BackupManager = None
metric_registry: MetricRegistry = None
user_store: UserStore = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global data_store, backup_manager, definitions_store, metric_registry, user_store

    # Initialize data store
    # Get the directory where this main.py file is located
    current_dir = Path(__file__).parent.parent  # Go up from app/ to backend/
    data_path = os.getenv("DATA_PATH", None)

    if not data_path:
        raise ValueError("DATA_PATH environment variable is not set")

    default_backup_path = current_dir / "backups"
    backup_path = os.getenv("BACKUP_PATH", str(default_backup_path))

    data_store = ParquetDataStore(data_path)
    metric_registry = MetricRegistry(data_path)
    backup_manager = BackupManager(
        data_path=Path(data_path), backup_path=Path(backup_path)
    )
    user_store = UserStore(data_path)

    # Initialize auth service with user store
    init_auth_service(user_store)

    # Inject data store into API modules
    refuels.set_data_store(data_store)
    refuels.set_metric_registry(metric_registry)
    data_points.set_data_store(data_store)
    time_spans.set_data_store(data_store)

    print(f"Data store initialized with path: {data_path}")
    print(f"Absolute data path: {Path(data_path).absolute()}")
    print(f"Backup manager initialized with path: {backup_path}")

    # Debug: Check if metrics files exist
    metrics_path = Path(data_path) / "metrics"
    print(f"Metrics path: {metrics_path.absolute()}")
    print(f"Metrics path exists: {metrics_path.exists()}")
    if metrics_path.exists():
        parquet_files = list(metrics_path.glob("*.parquet"))
        print(f"Found parquet files: {[f.name for f in parquet_files]}")

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

# Add SessionMiddleware for OAuth2 flow (must be before CORS)
app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET_KEY", secrets.token_urlsafe(32)),
    session_cookie="session",
    max_age=24 * 60 * 60,  # 24 hours
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


@app.post("/backup")
async def create_backup():
    """Create a manual backup"""
    global backup_manager

    if not backup_manager:
        raise HTTPException(status_code=503, detail="Backup manager not initialized")

    try:
        backup_file = await backup_manager.create_backup()
        return {
            "status": "success",
            "backup_file": backup_file,
            "message": "Backup created successfully",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")


# OAuth endpoints
@app.get("/oauth/authorize")
async def oauth_authorize(request: Request):
    """Start OAuth2 flow with Google"""
    from app.auth import auth_service

    if not auth_service:
        raise HTTPException(status_code=500, detail="Auth service not initialized")

    redirect_uri = request.url_for("oauth_callback")
    return await auth_service.get_oauth_client().authorize_redirect(
        request, str(redirect_uri)
    )


@app.get("/oauth/callback")
async def oauth_callback(request: Request):
    """OAuth2 callback from Google"""
    from app.auth import auth_service

    if not auth_service:
        raise HTTPException(status_code=500, detail="Auth service not initialized")

    try:
        # Get the token from the callback
        token = await auth_service.get_oauth_client().authorize_access_token(request)

        # Debug: Log the token structure
        print(f"Token received from Google: {token}")
        print(f"Token keys: {token.keys()}")

        # Handle OAuth callback and create/update user
        user_data, session_token = auth_service.handle_oauth_callback(token)

        # Redirect to frontend root (will use current host through nginx)
        response = RedirectResponse(url="/", status_code=302)

        # Set secure session cookie with user ID
        response.set_cookie(
            key="user_id",
            value=user_data.sub,
            httponly=True,
            secure=os.getenv("ENVIRONMENT") == "production",
            samesite="lax",
            max_age=24 * 60 * 60,  # 24 hours
        )

        return response
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth callback failed: {str(e)}")


@app.post("/oauth/logout")
async def oauth_logout():
    """Logout endpoint - clear session cookie"""
    response = RedirectResponse(url="/", status_code=302)
    response.delete_cookie("user_id")
    return response


# Authentication endpoint
@app.get("/api/auth/me")
async def get_current_user_info(current_user: "CurrentUser"):
    """Get current user information"""

    return {
        "id": current_user.sub,
        "email": current_user.email,
        "name": current_user.name,
        "picture": current_user.picture,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
