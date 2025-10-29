import asyncio
import json
import uuid
from datetime import datetime
from pathlib import Path

from ..models import MetricDefinition, MetricDefinitionCreate, MetricDefinitionUpdate


class MetricDefinitionsStore:
    """JSON-based storage for metric definitions"""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.definitions_dir = self.data_dir / "metric_definitions"
        self.definitions_dir.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()

    def _get_definition_file_path(self, definition_id: str) -> Path:
        """Get file path for a metric definition"""
        return self.definitions_dir / f"{definition_id}.json"

    def _generate_id(self) -> str:
        """Generate a unique ID for a metric definition"""
        return str(uuid.uuid4())

    async def create_definition(
        self, definition_create: MetricDefinitionCreate
    ) -> MetricDefinition:
        """Create a new metric definition"""
        async with self._lock:
            now = datetime.now()
            definition_id = self._generate_id()

            definition = MetricDefinition(
                id=definition_id,
                title=definition_create.title,
                description=definition_create.description,
                category=definition_create.category,
                unit=definition_create.unit,
                fields=definition_create.fields,
                created_at=now,
                updated_at=now,
            )

            # Save to file
            file_path = self._get_definition_file_path(definition_id)
            with open(file_path, "w") as f:
                json.dump(definition.model_dump(mode="json"), f, indent=2)

            return definition

    async def get_definition(self, definition_id: str) -> MetricDefinition | None:
        """Get a metric definition by ID"""
        file_path = self._get_definition_file_path(definition_id)

        if not file_path.exists():
            return None

        try:
            with open(file_path) as f:
                data = json.load(f)

            # Convert datetime strings back to datetime objects
            data["created_at"] = datetime.fromisoformat(data["created_at"])
            data["updated_at"] = datetime.fromisoformat(data["updated_at"])

            return MetricDefinition(**data)
        except Exception as e:
            print(f"Error reading metric definition {definition_id}: {e}")
            return None

    async def get_all_definitions(self) -> list[MetricDefinition]:
        """Get all metric definitions"""
        definitions = []

        for file_path in self.definitions_dir.glob("*.json"):
            definition_id = file_path.stem
            definition = await self.get_definition(definition_id)
            if definition:
                definitions.append(definition)

        # Sort by title for consistent ordering
        return sorted(definitions, key=lambda x: x.title.lower())

    async def update_definition(
        self, definition_id: str, update_data: MetricDefinitionUpdate
    ) -> MetricDefinition | None:
        """Update a metric definition"""
        async with self._lock:
            existing = await self.get_definition(definition_id)
            if not existing:
                return None

            # Update fields
            update_dict = update_data.model_dump(exclude_unset=True)
            update_dict["updated_at"] = datetime.now()

            # Create updated definition
            updated_data = existing.model_dump()
            updated_data.update(update_dict)

            definition = MetricDefinition(**updated_data)

            # Save to file
            file_path = self._get_definition_file_path(definition_id)
            with open(file_path, "w") as f:
                json.dump(definition.model_dump(mode="json"), f, indent=2)

            return definition

    async def delete_definition(self, definition_id: str) -> bool:
        """Delete a metric definition"""
        async with self._lock:
            file_path = self._get_definition_file_path(definition_id)

            if not file_path.exists():
                return False

            try:
                file_path.unlink()
                return True
            except Exception as e:
                print(f"Error deleting metric definition {definition_id}: {e}")
                return False

    async def get_definitions_by_category(
        self, category: str
    ) -> list[MetricDefinition]:
        """Get all metric definitions for a specific category"""
        all_definitions = await self.get_all_definitions()
        return [d for d in all_definitions if d.category == category]

    async def get_categories(self) -> list[str]:
        """Get all unique categories"""
        all_definitions = await self.get_all_definitions()
        categories = list(set(d.category for d in all_definitions))
        return sorted(categories)

    async def definition_exists(self, definition_id: str) -> bool:
        """Check if a metric definition exists"""
        file_path = self._get_definition_file_path(definition_id)
        return file_path.exists()
