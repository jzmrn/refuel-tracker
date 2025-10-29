from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import Optional, List
from ..models import Transaction, TransactionCreate
from ..storage.parquet_store import ParquetDataStore

router = APIRouter(prefix="/transactions", tags=["transactions"])

# This will be injected by main.py
data_store: Optional[ParquetDataStore] = None


@router.post("/")
async def add_transaction(transaction_data: TransactionCreate):
    """Add a new transaction"""
    if not data_store:
        raise HTTPException(status_code=500, detail="Data store not initialized")

    transaction = Transaction(timestamp=datetime.now(), **transaction_data.model_dump())

    success = await data_store.add_transaction(transaction)
    if success:
        return {"status": "success", "message": "Transaction added"}
    else:
        raise HTTPException(status_code=500, detail="Failed to add transaction")


@router.get("/")
async def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    account_id: Optional[str] = None,
    category: Optional[str] = None,
    limit: Optional[int] = 100,
):
    """Get transactions with optional filters"""
    if not data_store:
        raise HTTPException(status_code=500, detail="Data store not initialized")

    # Parse dates
    start_dt = None
    end_dt = None

    try:
        if start_date:
            start_dt = datetime.fromisoformat(start_date)
        if end_date:
            end_dt = datetime.fromisoformat(end_date)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")

    df = await data_store.get_transactions(
        start_dt, end_dt, account_id, category, limit
    )
    return df.to_dicts()


@router.post("/bulk")
async def add_transactions_bulk(transactions: List[TransactionCreate]):
    """Add multiple transactions at once"""
    if not data_store:
        raise HTTPException(status_code=500, detail="Data store not initialized")

    transaction_objects = [
        Transaction(timestamp=datetime.now(), **t.model_dump()) for t in transactions
    ]

    success = await data_store.add_transactions(transaction_objects)
    if success:
        return {
            "status": "success",
            "message": f"Added {len(transactions)} transactions",
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to add transactions")


def set_data_store(store: ParquetDataStore):
    """Set the data store instance"""
    global data_store
    data_store = store
