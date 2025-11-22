# Fuel Data Client

A Python client for storing and retrieving fuel price data using DuckDB.

## Installation

```bash
pip install fueldataclient
```

For development:

```bash
pip install fueldataclient[dev]
```

## Usage

### Basic Setup

```python
from fueldataclient import FuelDataClient
import duckdb

# Connect to DuckDB
con = duckdb.connect('fuel_prices.duckdb')

# Initialize client
client = FuelDataClient(con)
```

### Storing Fuel Data

```python
import pandas as pd
from datetime import datetime

# Create DataFrame with price entries
df = pd.DataFrame([
    {
        "timestamp": datetime.now(),
        "station_id": "12345",
        "type": "e5",
        "price": 1.599
    },
    {
        "timestamp": datetime.now(),
        "station_id": "12345",
        "type": "diesel",
        "price": 1.499
    }
])

# Store in database
client.store_fuel_data(df)
```

### Reading Fuel Data

The client provides two ways to read fuel data:

#### As DataFrame

```python
from datetime import datetime, timedelta

# Read all data as DataFrame
all_prices = client.read_fuel_data()

# Read with date filters
start = datetime.now() - timedelta(days=7)
end = datetime.now()
recent_prices = client.read_fuel_data(start_date=start, end_date=end)
```

#### As PriceEntry Objects

```python
from datetime import datetime, timedelta

# Get all data as list of PriceEntry objects
all_prices = client.get_fuel_data()

# Get with date filters
start = datetime.now() - timedelta(days=7)
end = datetime.now()
recent_prices = client.get_fuel_data(start_date=start, end_date=end)
```

### Working with Daily Aggregates

The client also supports storing and retrieving daily aggregate statistics.

#### Storing Daily Aggregates

```python
import pandas as pd
from datetime import date, datetime

# Create DataFrame with daily aggregates
df = pd.DataFrame([
    {
        "date": date.today(),
        "station_id": "12345",
        "type": "e5",
        "n_samples": 48,
        "price_mean": 1.599,
        "price_min": 1.579,
        "price_max": 1.619,
        "price_std": 0.012,
        "ts_min": datetime(2025, 11, 22, 0, 0, 0),
        "ts_max": datetime(2025, 11, 22, 23, 30, 0)
    }
])

# Store in database
client.store_daily_aggregates(df)
```

#### Reading Daily Aggregates

```python
from datetime import datetime, timedelta

# Read all aggregates as DataFrame
all_aggregates = client.read_daily_aggregates()

# Read with date filters
start = datetime.now() - timedelta(days=30)
end = datetime.now()
recent_aggregates = client.read_daily_aggregates(start_date=start, end_date=end)

# Get as list of DailyAggregate objects
aggregates = client.get_daily_aggregates(start_date=start, end_date=end)
```

## Data Models

### PriceEntry

Represents a fuel price at a specific station and time.

**Fields:**

- `timestamp` (datetime): When the price was recorded
- `station_id` (str): Unique identifier for the gas station
- `type` (str): Fuel type (e.g., "e5", "e10", "diesel")
- `price` (float): Price per liter

### DailyAggregate

Represents daily aggregated fuel price data for a station.

**Fields:**

- `date` (date): The date for the aggregated data
- `station_id` (str): Unique identifier for the gas station
- `type` (str): Fuel type (e.g., "e5", "e10", "diesel")
- `n_samples` (int): Number of price samples collected that day
- `price_mean` (float): Mean price for the day
- `price_min` (float): Minimum price observed
- `price_max` (float): Maximum price observed
- `price_std` (float): Standard deviation of prices
- `ts_min` (datetime): Timestamp of the earliest sample
- `ts_max` (datetime): Timestamp of the latest sample

## Database Schema

The client creates two tables:

### raw_fuel_prices

```sql
CREATE TABLE raw_fuel_prices (
    timestamp TIMESTAMP,
    station_id VARCHAR,
    type VARCHAR,
    price DOUBLE
)
```

### daily_aggregates

```sql
CREATE TABLE daily_aggregates (
    date DATE,
    station_id VARCHAR,
    type VARCHAR,
    n_samples INTEGER,
    price_mean DOUBLE,
    price_min DOUBLE,
    price_max DOUBLE,
    price_std DOUBLE,
    ts_min TIMESTAMP,
    ts_max TIMESTAMP,
    PRIMARY KEY (date, station_id, type)
)
```
