# Tankerkoenig API Client

A Python client library for accessing the [Tankerkoenig API](https://creativecommons.tankerkoenig.de) to retrieve gas station price data in Germany.

## Overview

This client provides methods to query current fuel prices and details for gas stations in German using the Tankerkoenig API.

## Features

- Query prices for gas stations (up to 10 per request)
- Query gas stations for a given location
- Query details for a single gas station
- Structured data classes for easy data handling
- Error handling for API failures and invalid requests

## Usage

### Setup

```python
from tankerkoenig import TankerkoenigClient

# Initialize with your API key
client = TankerkoenigClient("your-api-key-here")
```

### Get Prices for Gas Stations

```python
station_ids = [
    "4429a7d9-fb2d-4c29-8cfe-2ca90323f9f8",
    "446bdcf5-9f75-47fc-9cfa-2c3d6fda1c3b"
]

prices = client.get_gas_station_prices(station_ids)

for price in prices:
    print(f"Station {price.station_id}: Status={price.status}")
    if price.diesel:
        print(f"  Diesel: €{price.diesel}")
```

#### Price Data Structure

The client returns a list of `GasStationPrice` objects with the following fields:

- `station_id`: UUID of the gas station
- `status`: Station status ("open", "closed", "no prices")
- `e5`: Super E5 price (€) or None if not available
- `e10`: Super E10 price (€) or None if not available
- `diesel`: Diesel price (€) or None if not available

### Search for Gas Stations

```python
# Search for stations within 5km radius
stations = client.search_gas_stations(
    lat=52.521,
    lng=13.438,
    rad=5.0,
    fuel_type="e5",  # Can be "e5", "e10", "diesel", or "all"
    sort_by="price"  # Can be "price" or "dist"
)

for station in stations:
    print(f"{station.name} - {station.brand}")
    print(f"  Distance: {station.dist}km")
    print(f"  Address: {station.street}, {station.post_code} {station.place}")
    print(f"  Price: €{station.price}")
```

#### Search Data Structure

When searching for a specific fuel type, the client returns a list of `GasStationOnePrice` objects with:

- `id`: UUID of the gas station
- `name`: Station name
- `brand`: Brand name
- `street`: Street address
- `place`: City name
- `lat`: Latitude
- `lng`: Longitude
- `dist`: Distance from search location (km)
- `price`: Price of requested fuel type (€)
- `is_open`: Whether station is currently open

When searching for all fuel types, returns `GasStationAllPrices` objects with e5, e10, and diesel prices instead of a single price field.

### Get Gas Station Details

```python
# Get detailed information including opening hours
station_id = "4429a7d9-fb2d-4c29-8cfe-2ca90323f9f8"
details = client.get_gas_station_detail(station_id)

print(f"{details.name} - {details.brand}")
print(f"Address: {details.street}, {details.post_code} {details.place}")
print(f"Open: {details.is_open}")
print(f"Opening times: {details.opening_times}")
```

#### Detail Data Structure

The `GasStationDetail` object contains comprehensive information:

- `id`: UUID of the gas station
- `name`: Station name
- `brand`: Brand name
- `street`: Street address
- `house_number`: House number
- `post_code`: Postal code
- `place`: City name
- `lat`: Latitude
- `lng`: Longitude
- `state`: State/region
- `is_open`: Whether station is currently open
- `opening_times`: List of opening hours per day
- `overrides`: Special opening hours (holidays, etc.)
- `whole_day`: Whether station is open 24/7

## API Key

You need to obtain an API key from the [Tankerkoenig website](https://creativecommons.tankerkoenig.de) to use this client.

## Limitations

- Maximum 10 station IDs per request
- Rate limiting applies as per API terms of service
- Data is provided under CC BY 4.0 license

## Dependencies

- `requests` for HTTP API calls
- `pydantic` for type validation
