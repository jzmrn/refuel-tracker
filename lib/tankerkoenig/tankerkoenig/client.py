"""
Tankerkoenig API client for fetching gas station prices and details.
"""

import requests

from .models import (
    DetailResponseAdapter,
    FuelType,
    GasStationAllPrices,
    GasStationDetail,
    GasStationOnePrice,
    GasStationPrice,
    PriceResponseAdapter,
    SearchResponseAdapter,
    SortBy,
)


class TankerkoenigClient:
    """Client for interacting with the Tankerkoenig API."""

    BASE_URL = "https://creativecommons.tankerkoenig.de/json"

    def __init__(self, api_key: str):
        """
        Initialize the Tankerkoenig client.

        Args:
            api_key: Your personal API key for the Tankerkoenig API
        """
        self._api_key = api_key
        self._session = requests.Session()

    def get_gas_station_prices(self, station_ids: list[str]) -> list[GasStationPrice]:
        """
        Get current prices for one or more gas stations.

        Args:
            station_ids: List of station IDs (max 10)

        Returns:
            List of GasStationPrice objects with price information

        Raises:
            ValueError: If more than 10 station IDs are provided
            requests.RequestException: If the API request fails
        """

        if len(station_ids) > 10:
            raise ValueError("Maximum 10 station IDs allowed per request")

        params = {"ids": ",".join(station_ids), "apikey": self._api_key}
        response = self._session.get(url=f"{self.BASE_URL}/prices.php", params=params)

        response.raise_for_status()
        data = PriceResponseAdapter.validate_python(response.json())

        if data.ok is False:
            raise requests.RequestException(f"API returned error: {data.message}")

        return [
            GasStationPrice.from_gas_station_data(station_id, price_data)
            for station_id, price_data in data.prices.items()
        ]

    def get_single_station_price(self, station_id: str) -> GasStationPrice:
        """
        Get current prices for a single gas station.

        Args:
            station_id: UUID of the gas station

        Returns:
            GasStationPrice object with price information

        Raises:
            requests.RequestException: If the API request fails
            ValueError: If station not found in response
        """

        prices = self.get_gas_station_prices(station_id)

        if not prices:
            raise ValueError(f"No price data found for station ID: {station_id}")

        return prices[0]

    def search_gas_stations(
        self,
        lat: float,
        lng: float,
        rad: float,
        fuel_type: FuelType = FuelType.ALL,
        sort_by: SortBy = SortBy.DIST,
    ) -> list[GasStationOnePrice] | list[GasStationAllPrices]:
        """
        Search for gas stations within a radius around a given location.

        Args:
            lat: Latitude of the location
            lng: Longitude of the location
            rad: Search radius in km (max: 25)
            fuel_type: Type of fuel to search for ('e5', 'e10', 'diesel', 'all')
            sort_by: Sort results by 'price' or 'dist' (distance)

        Returns:
            List of Station objects with station information and prices

        Raises:
            ValueError: If radius exceeds 25km
            requests.RequestException: If the API request fails
        """

        if rad > 25:
            raise ValueError("Maximum search radius is 25km")

        params = {
            "lat": lat,
            "lng": lng,
            "rad": rad,
            "type": fuel_type.value,
            "apikey": self._api_key,
        }

        if fuel_type != FuelType.ALL:
            params["sort"] = sort_by.value

        response = self._session.get(url=f"{self.BASE_URL}/list.php", params=params)

        response.raise_for_status()
        data = SearchResponseAdapter.validate_python(response.json())

        if data.ok is False:
            raise requests.RequestException(f"API returned error: {data.message}")

        return data.stations

    def get_gas_station_detail(self, station_id: str) -> GasStationDetail:
        """
        Get detailed information for a single gas station.

        This method retrieves additional information not available in search results,
        including opening hours, overrides, and state information.

        Args:
            station_id: UUID of the gas station

        Returns:
            GasStationDetail object with detailed station information

        Raises:
            requests.RequestException: If the API request fails
        """

        params = {"id": station_id, "apikey": self._api_key}
        response = self._session.get(url=f"{self.BASE_URL}/detail.php", params=params)

        response.raise_for_status()
        data = DetailResponseAdapter.validate_python(response.json())

        if data.ok is False:
            raise requests.RequestException(f"API returned error: {data.message}")

        return data.station
