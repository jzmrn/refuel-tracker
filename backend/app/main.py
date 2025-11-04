from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from pathlib import Path

from app.storage.parquet_store import ParquetDataStore
from app.storage.backup_manager import BackupManager
from app.storage.metric_definitions_store import MetricDefinitionsStore
from app.storage.metric_registry import MetricRegistry
from app.api import (
    transactions,
    analytics,
    metrics,
    metric_definitions,
    units,
    categories,
)

# Global instances
data_store: ParquetDataStore = None
backup_manager: BackupManager = None
definitions_store: MetricDefinitionsStore = None
metric_registry: MetricRegistry = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global data_store, backup_manager, definitions_store, metric_registry

    # Initialize data store
    # Get the directory where this main.py file is located
    current_dir = Path(__file__).parent.parent  # Go up from app/ to backend/
    data_path = os.getenv("DATA_PATH", None)

    if not data_path:
        raise ValueError("DATA_PATH environment variable is not set")

    default_backup_path = current_dir / "backups"
    backup_path = os.getenv("BACKUP_PATH", str(default_backup_path))

    data_store = ParquetDataStore(data_path)
    definitions_store = MetricDefinitionsStore(data_path)
    metric_registry = MetricRegistry(data_path)
    backup_manager = BackupManager(
        data_path=Path(data_path), backup_path=Path(backup_path)
    )

    # Inject data store into API modules
    transactions.set_data_store(data_store)
    analytics.set_data_store(data_store)
    metrics.set_data_store(data_store)
    metrics.set_definitions_store(definitions_store)
    metrics.set_metric_registry(metric_registry)
    metric_definitions.set_definitions_store(definitions_store)
    metric_definitions.set_data_store(data_store)
    units.set_data_store(data_store)
    units.set_definitions_store(definitions_store)
    categories.set_data_store(data_store)

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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(transactions.router)
app.include_router(analytics.router)
app.include_router(metrics.router, prefix="/api/metrics", tags=["metrics"])
app.include_router(
    metric_definitions.router,
    prefix="/api/metric-definitions",
    tags=["metric-definitions"],
)
app.include_router(units.router, prefix="/api/units", tags=["units"])
app.include_router(categories.router, prefix="/api/categories", tags=["categories"])


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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
