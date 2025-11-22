"""
Dagster definitions for the analytics pipeline.
"""

from dagster import ConfigurableResource
from tankerkoenig import TankerkoenigClient


class TankerkoenigResource(ConfigurableResource):
    """Dagster resource for Tankerkönig API client."""

    api_key: str

    def get_client(self) -> TankerkoenigClient:
        """Get a configured Tankerkönig client."""
        return TankerkoenigClient(api_key=self.api_key)
