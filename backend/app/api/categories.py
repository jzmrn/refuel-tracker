import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException

from ..models import Category, CategoryCreate, CategoryUpdate
from ..storage.parquet_store import ParquetDataStore

router = APIRouter()
data_store: ParquetDataStore = None


def set_data_store(store: ParquetDataStore):
    """Set the data store instance"""
    global data_store
    data_store = store


@router.post("/", response_model=Category)
async def create_category(category_create: CategoryCreate) -> Category:
    """Create a new category"""
    now = datetime.now()
    category = Category(
        id=str(uuid.uuid4()),
        name=category_create.name,
        description=category_create.description,
        color=category_create.color,
        created_at=now,
        updated_at=now,
    )

    success = await data_store.add_category(category)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to create category")

    return category


@router.get("/", response_model=list[Category])
async def get_categories() -> list[Category]:
    """Get all categories"""
    return await data_store.get_categories()


@router.get("/{category_id}", response_model=Category)
async def get_category(category_id: str) -> Category:
    """Get a specific category by ID"""
    category = await data_store.get_category_by_id(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@router.put("/{category_id}", response_model=Category)
async def update_category(
    category_id: str, category_update: CategoryUpdate
) -> Category:
    """Update an existing category"""
    existing_category = await data_store.get_category_by_id(category_id)
    if not existing_category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Update only the fields that are provided
    updated_category = existing_category.model_copy(
        update={
            k: v
            for k, v in category_update.model_dump(exclude_unset=True).items()
            if v is not None
        }
        | {"updated_at": datetime.now()}
    )

    success = await data_store.update_category(category_id, updated_category)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update category")

    return updated_category


@router.delete("/{category_id}")
async def delete_category(category_id: str) -> dict:
    """Delete a category"""
    existing_category = await data_store.get_category_by_id(category_id)
    if not existing_category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Check if there are any metric definitions using this category
    from ..storage.metric_definitions_store import MetricDefinitionsStore

    definitions_store = MetricDefinitionsStore()
    definitions_with_category = await definitions_store.get_definitions_by_category(
        category_id
    )

    if definitions_with_category:
        metric_titles = [d.title for d in definitions_with_category]
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category '{existing_category.name}' because it is used by {len(definitions_with_category)} metric definition(s): {', '.join(metric_titles[:3])}{'...' if len(metric_titles) > 3 else ''}",
        )

    # Check if there are any metric values using this category
    metrics_with_category = await data_store.get_metrics(
        category=existing_category.name
    )

    if metrics_with_category:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete category '{existing_category.name}' because it has {len(metrics_with_category)} metric value(s) assigned to it. Please delete or reassign these metrics first.",
        )

    success = await data_store.delete_category(category_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete category")

    return {"message": "Category deleted successfully"}


@router.post("/initialize-defaults")
async def initialize_default_categories() -> dict:
    """Initialize default categories if none exist"""
    existing_categories = await data_store.get_categories()
    if existing_categories:
        return {
            "message": "Categories already exist",
            "count": len(existing_categories),
        }

    # Create default categories
    now = datetime.now()
    default_categories = [
        Category(
            id=str(uuid.uuid4()),
            name="Health",
            description="Health and medical tracking",
            color="#10B981",  # Green
            created_at=now,
            updated_at=now,
        ),
        Category(
            id=str(uuid.uuid4()),
            name="Fitness",
            description="Exercise and physical activity",
            color="#F59E0B",  # Yellow
            created_at=now,
            updated_at=now,
        ),
        Category(
            id=str(uuid.uuid4()),
            name="Finance",
            description="Money and financial tracking",
            color="#3B82F6",  # Blue
            created_at=now,
            updated_at=now,
        ),
        Category(
            id=str(uuid.uuid4()),
            name="Work",
            description="Professional and career related",
            color="#8B5CF6",  # Purple
            created_at=now,
            updated_at=now,
        ),
        Category(
            id=str(uuid.uuid4()),
            name="Personal",
            description="Personal development and habits",
            color="#EC4899",  # Pink
            created_at=now,
            updated_at=now,
        ),
        Category(
            id=str(uuid.uuid4()),
            name="Learning",
            description="Education and skill development",
            color="#06B6D4",  # Cyan
            created_at=now,
            updated_at=now,
        ),
        Category(
            id=str(uuid.uuid4()),
            name="Lifestyle",
            description="Daily life and general activities",
            color="#84CC16",  # Lime
            created_at=now,
            updated_at=now,
        ),
    ]

    success = await data_store.add_categories(default_categories)
    if not success:
        raise HTTPException(
            status_code=500, detail="Failed to create default categories"
        )

    return {
        "message": "Default categories created successfully",
        "count": len(default_categories),
        "categories": [{"name": c.name, "color": c.color} for c in default_categories],
    }
