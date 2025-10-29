from fastapi import APIRouter, HTTPException
from datetime import datetime
from ..storage.parquet_store import ParquetDataStore
from typing import Optional

router = APIRouter(prefix="/analytics", tags=["analytics"])

# This will be injected by main.py
data_store: Optional[ParquetDataStore] = None


@router.get("/spending-by-category")
async def spending_by_category(start_date: str, end_date: str):
    """Get spending aggregated by category"""
    if not data_store:
        raise HTTPException(status_code=500, detail="Data store not initialized")

    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")

    df = await data_store.get_spending_by_category(start_dt, end_dt)
    return df.to_dicts()


@router.get("/monthly-summary/{year}/{month}")
async def monthly_summary(year: int, month: int):
    """Get monthly financial summary"""
    if not data_store:
        raise HTTPException(status_code=500, detail="Data store not initialized")

    if not (1 <= month <= 12):
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

    if year < 2000 or year > 2100:
        raise HTTPException(
            status_code=400, detail="Year must be between 2000 and 2100"
        )

    summary = await data_store.get_monthly_summary(year, month)
    return summary


@router.get("/account-balance-history/{account_id}")
async def account_balance_history(account_id: str, days: int = 30):
    """Get account balance history"""
    if not data_store:
        raise HTTPException(status_code=500, detail="Data store not initialized")

    if days < 1 or days > 365:
        raise HTTPException(status_code=400, detail="Days must be between 1 and 365")

    df = await data_store.get_account_balance_history(account_id, days)
    return df.to_dicts()


def set_data_store(store: ParquetDataStore):
    """Set the data store instance"""
    global data_store
    data_store = store
