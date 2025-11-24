# Fuel Data Clients

Python clients for storing and retrieving fuel price data, station information, and daily aggregates using DuckDB.

## Installation

```bash
pip install metrics
```

For development:

```bash
pip install metrics[dev]
```

## Clients

### FuelPriceDataClient

Manages raw fuel price data in wide format (one row per timestamp and station).

**Methods:**

- `store_fuel_data(df)` - Store fuel price data from a DataFrame
- `read_fuel_data(start_date, end_date)` - Read fuel prices as DataFrame with optional date filters
- `get_fuel_data(start_date, end_date)` - Get fuel prices as list of PriceEntry objects

### AggregatedFuelDataClient

Handles daily aggregated statistics for fuel prices by station and fuel type.

**Methods:**

- `store_daily_aggregates(df)` - Store daily aggregate statistics
- `read_daily_aggregates(start_date, end_date)` - Read aggregates as DataFrame with optional date filters
- `get_daily_aggregates(start_date, end_date)` - Get aggregates as list of DailyAggregate objects

### FuelStationClient

Manages gas station information and user favorite stations.

**Methods:**

- `store_favorite_station(user_id, station_id)` - Mark a station as favorite for a user
- `delete_favorite_station(user_id, station_id)` - Remove a station from user's favorites
- `read_favorite_stations(user_id)` - Read favorite stations as DataFrame
- `get_favorite_stations(user_id)` - Get favorite stations as list of FavoriteStation objects
- `store_gas_station_info(stations)` - Store gas station details (name, location, brand)
- `read_gas_station_info(station_id)` - Read station information as DataFrame
- `get_gas_station_info(station_id)` - Get station information as list of GasStationInfo objects
- `delete_gas_station_info(station_id)` - Delete station information
