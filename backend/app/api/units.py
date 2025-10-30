from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid
from ..models import Unit, UnitCreate, UnitUpdate
from ..storage.parquet_store import ParquetDataStore
from ..storage.metric_definitions_store import MetricDefinitionsStore

router = APIRouter()
data_store: ParquetDataStore = None
definitions_store: MetricDefinitionsStore = None


def set_data_store(store: ParquetDataStore):
    """Set the data store instance"""
    global data_store
    data_store = store


def set_definitions_store(store: MetricDefinitionsStore):
    """Set the definitions store instance"""
    global definitions_store
    definitions_store = store


@router.post("/", response_model=Unit)
async def create_unit(unit_create: UnitCreate) -> Unit:
    """Create a new unit"""
    now = datetime.now()
    unit = Unit(
        id=str(uuid.uuid4()),
        name=unit_create.name,
        symbol=unit_create.symbol,
        type=unit_create.type,
        description=unit_create.description,
        created_at=now,
        updated_at=now,
    )

    success = await data_store.add_unit(unit)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create unit")

    return unit


@router.get("/", response_model=list[Unit])
async def get_units() -> list[Unit]:
    """Get all units"""
    return await data_store.get_units()


@router.get("/{unit_id}", response_model=Unit)
async def get_unit(unit_id: str) -> Unit:
    """Get a specific unit by ID"""
    unit = await data_store.get_unit_by_id(unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return unit


@router.put("/{unit_id}", response_model=Unit)
async def update_unit(unit_id: str, unit_update: UnitUpdate) -> Unit:
    """Update an existing unit"""
    existing_unit = await data_store.get_unit_by_id(unit_id)
    if not existing_unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Update only the fields that are provided
    updated_unit = existing_unit.model_copy(
        update={
            k: v
            for k, v in unit_update.model_dump(exclude_unset=True).items()
            if v is not None
        }
        | {"updated_at": datetime.now()}
    )

    success = await data_store.update_unit(unit_id, updated_unit)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update unit")

    return updated_unit


@router.delete("/{unit_id}")
async def delete_unit(unit_id: str) -> dict:
    """Delete a unit"""
    existing_unit = await data_store.get_unit_by_id(unit_id)
    if not existing_unit:
        raise HTTPException(status_code=404, detail="Unit not found")

    # Check if there are any metric definitions using this unit
    all_definitions = await definitions_store.get_all_definitions()

    definitions_using_unit = []
    for definition in all_definitions:
        for field in definition.fields:
            if field.unit_id == unit_id:
                definitions_using_unit.append(definition)
                break  # No need to check other fields in the same definition

    if definitions_using_unit:
        definition_titles = [d.title for d in definitions_using_unit]
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete unit '{existing_unit.name}' because it is used by {len(definitions_using_unit)} metric definition(s): {', '.join(definition_titles[:3])}{'...' if len(definition_titles) > 3 else ''}. Please update or delete these metric definitions first.",
        )

    success = await data_store.delete_unit(unit_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete unit")

    return {"message": "Unit deleted successfully"}


@router.post("/initialize-defaults")
async def initialize_default_units() -> dict:
    """Initialize default units if none exist"""
    existing_units = await data_store.get_units()
    if existing_units:
        return {"message": "Units already exist", "count": len(existing_units)}

    # Create default units
    now = datetime.now()
    default_units = [
        Unit(
            id=str(uuid.uuid4()),
            name="Text",
            symbol="",
            type="text",
            description="Free text input",
            created_at=now,
            updated_at=now,
        ),
        Unit(
            id=str(uuid.uuid4()),
            name="Number",
            symbol="#",
            type="number",
            description="Numeric value",
            created_at=now,
            updated_at=now,
        ),
        Unit(
            id=str(uuid.uuid4()),
            name="Currency",
            symbol="$",
            type="number",
            description="Monetary value",
            created_at=now,
            updated_at=now,
        ),
        Unit(
            id=str(uuid.uuid4()),
            name="Percentage",
            symbol="%",
            type="number",
            description="Percentage value",
            created_at=now,
            updated_at=now,
        ),
        Unit(
            id=str(uuid.uuid4()),
            name="Weight (kg)",
            symbol="kg",
            type="number",
            description="Weight in kilograms",
            created_at=now,
            updated_at=now,
        ),
        Unit(
            id=str(uuid.uuid4()),
            name="Time (minutes)",
            symbol="min",
            type="number",
            description="Duration in minutes",
            created_at=now,
            updated_at=now,
        ),
        Unit(
            id=str(uuid.uuid4()),
            name="Rating (1-10)",
            symbol="⭐",
            type="number",
            description="Rating scale from 1 to 10",
            created_at=now,
            updated_at=now,
        ),
        Unit(
            id=str(uuid.uuid4()),
            name="Yes/No",
            symbol="✓",
            type="boolean",
            description="Boolean true/false value",
            created_at=now,
            updated_at=now,
        ),
    ]

    success = await data_store.add_units(default_units)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create default units")

    return {
        "message": "Default units created successfully",
        "count": len(default_units),
        "units": [
            {"name": u.name, "symbol": u.symbol, "type": u.type} for u in default_units
        ],
    }
