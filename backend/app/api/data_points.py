from datetime import datetime
from pathlib import Path

import polars as pl
from fastapi import APIRouter, HTTPException, Query

from ..models import DataPointCreate, DataPointResponse, DataSummaryResponse
from ..storage.parquet_store import ParquetDataStore

router = APIRouter()

# Global data store instance
data_store: ParquetDataStore | None = None


def set_data_store(store: ParquetDataStore):
    """Inject the data store dependency"""
    global data_store
    data_store = store


def _ensure_data_store():
    """Ensure data store is available"""
    if data_store is None:
        raise HTTPException(status_code=500, detail="Data store not initialized")
    return data_store


@router.post("/data-points", response_model=DataPointResponse)
async def create_data_point(data_point: DataPointCreate):
    """Create a new data point"""
    store = _ensure_data_store()

    try:
        # Generate ID based on timestamp and label hash
        point_id = f"{data_point.timestamp.isoformat()}_{abs(hash(data_point.label))}"

        # Create dataframe row
        new_row = pl.DataFrame(
            {
                "id": [point_id],
                "timestamp": [data_point.timestamp.isoformat()],
                "value": [data_point.value],
                "label": [data_point.label],
                "notes": [data_point.notes or ""],
            }
        )

        # Store in parquet file
        data_points_path = Path(store.base_path) / "data_points"
        data_points_path.mkdir(exist_ok=True)

        parquet_file = data_points_path / "data_points.parquet"

        # Read existing data if file exists
        if parquet_file.exists():
            existing_df = pl.read_parquet(parquet_file)
            # Append new row
            combined_df = pl.concat([existing_df, new_row])
        else:
            combined_df = new_row

        # Write back to parquet
        combined_df.write_parquet(parquet_file)

        return DataPointResponse(
            id=point_id,
            timestamp=data_point.timestamp,
            value=data_point.value,
            label=data_point.label,
            notes=data_point.notes,
        )

    except Exception as e:
        print(f"Error creating data point: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to create data point: {str(e)}"
        )


@router.get("/data-points", response_model=list[DataPointResponse])
async def get_data_points(
    start_date: str | None = Query(None, description="Start date filter (ISO format)"),
    end_date: str | None = Query(None, description="End date filter (ISO format)"),
    label: str | None = Query(None, description="Filter by label"),
    limit: int | None = Query(None, description="Limit number of results"),
):
    """Get data points with optional filtering"""
    store = _ensure_data_store()

    try:
        data_points_path = Path(store.base_path) / "data_points" / "data_points.parquet"

        if not data_points_path.exists():
            return []

        # Read data
        df = pl.read_parquet(data_points_path)

        # Apply filters
        if start_date:
            start_dt = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            df = df.filter(pl.col("timestamp") >= start_dt)

        if end_date:
            end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            df = df.filter(pl.col("timestamp") <= end_dt)

        if label:
            df = df.filter(
                pl.col("label").str.to_lowercase().str.contains(label.lower())
            )

        # Sort by timestamp descending
        df = df.sort("timestamp", descending=True)

        # Apply limit
        if limit:
            df = df.head(limit)

        # Convert to response models
        results = []
        for row in df.iter_rows(named=True):
            results.append(
                DataPointResponse(
                    id=str(row["id"]),
                    timestamp=row["timestamp"],
                    value=float(row["value"]),
                    label=str(row["label"]),
                    notes=str(row["notes"])
                    if row["notes"] and row["notes"] != ""
                    else None,
                )
            )

        return results

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve data points: {str(e)}"
        )


@router.delete("/data-points/{point_id}")
async def delete_data_point(point_id: str):
    """Delete a data point by ID"""
    store = _ensure_data_store()

    try:
        data_points_path = Path(store.base_path) / "data_points" / "data_points.parquet"

        if not data_points_path.exists():
            raise HTTPException(status_code=404, detail="Data point not found")

        # Read existing data
        df = pl.read_parquet(data_points_path)

        # Check if point exists
        if not df.filter(pl.col("id") == point_id).height:
            raise HTTPException(status_code=404, detail="Data point not found")

        # Remove the point
        df = df.filter(pl.col("id") != point_id)

        # Write back to parquet
        if df.height > 0:
            df.write_parquet(data_points_path)
        else:
            # If no data left, remove the file
            data_points_path.unlink()

        return {"status": "success", "message": "Data point deleted"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete data point: {str(e)}"
        )


@router.get("/data-points/labels", response_model=list[str])
async def get_existing_labels():
    """Get all unique labels from existing data points"""
    store = _ensure_data_store()

    try:
        data_points_path = Path(store.base_path) / "data_points" / "data_points.parquet"

        if not data_points_path.exists():
            return []

        # Read data
        df = pl.read_parquet(data_points_path)

        # Get unique labels, sorted
        labels = sorted(df["label"].unique().to_list())

        return labels

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to retrieve labels: {str(e)}"
        )


@router.get("/data-points/summary", response_model=DataSummaryResponse)
async def get_data_summary():
    """Get summary statistics for data points"""
    store = _ensure_data_store()

    try:
        data_points_path = Path(store.base_path) / "data_points" / "data_points.parquet"

        if not data_points_path.exists():
            return DataSummaryResponse(
                total_entries=0,
                unique_labels=0,
                date_range={"earliest": None, "latest": None},
                value_stats={"min": None, "max": None, "average": None},
            )

        # Read data
        df = pl.read_parquet(data_points_path)

        if df.height == 0:
            return DataSummaryResponse(
                total_entries=0,
                unique_labels=0,
                date_range={"earliest": None, "latest": None},
                value_stats={"min": None, "max": None, "average": None},
            )

        # Calculate statistics
        total_entries = df.height
        unique_labels = df["label"].n_unique()

        # Date range
        earliest_date = df["timestamp"].min()
        latest_date = df["timestamp"].max()

        # Value statistics
        min_value = float(df["value"].min())
        max_value = float(df["value"].max())
        avg_value = float(df["value"].mean())

        return DataSummaryResponse(
            total_entries=total_entries,
            unique_labels=unique_labels,
            date_range={"earliest": earliest_date, "latest": latest_date},
            value_stats={"min": min_value, "max": max_value, "average": avg_value},
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to generate summary: {str(e)}"
        )
