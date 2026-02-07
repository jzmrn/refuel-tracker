# Refuel Tracker — Backend

FastAPI backend for tracking refuels, managing cars, and querying gas station fuel prices. Uses DuckDB for storage and Google OAuth2 for authentication.

## Tech Stack

- **FastAPI** with async support and dependency injection
- **DuckDB** for data storage (two databases: `userdata.duckdb`, `fueldata.duckdb`)
- **Pydantic v2** for request/response validation
- **Google OAuth2** token validation (via `google-auth`)
- **Tankerkönig API** client for live fuel price search
- **Structured logging** with request ID tracing and extra context

## Quick Start

```bash
# Install dependencies
uv sync --group dev

# Start development server
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Or from the project root:

```bash
just dev-backend
```

API docs available at <http://localhost:8000/docs>.

## Environment Variables

| Variable               | Description                                           |
| ---------------------- | ----------------------------------------------------- |
| `DATA_PATH`            | Directory containing DuckDB database files (required) |
| `GOOGLE_CLIENT_ID`     | Google OAuth2 client ID for token validation          |
| `TANKERKOENIG_API_KEY` | Tankerkönig API key for station search                |
| `ENVIRONMENT`          | Set to `production` to enable HSTS headers            |
| `LOG_LEVEL`            | Root log level (default: `INFO`)                      |
| `LOG_LEVEL_API`        | Log level for `app.api` (default: `INFO`)             |
| `LOG_LEVEL_STORAGE`    | Log level for `app.storage` (default: `INFO`)         |
| `LOG_LEVEL_AUTH`       | Log level for `app.auth` (default: `INFO`)            |

## API Endpoints

### Cars (`/api/cars`)

| Method   | Path                         | Description                       |
| -------- | ---------------------------- | --------------------------------- |
| `POST`   | `/cars`                      | Create a car                      |
| `GET`    | `/cars`                      | List user's cars (owned + shared) |
| `GET`    | `/cars/{id}`                 | Get car by ID                     |
| `PATCH`  | `/cars/{id}`                 | Update car                        |
| `DELETE` | `/cars/{id}`                 | Delete car                        |
| `POST`   | `/cars/{id}/share`           | Share car with another user       |
| `DELETE` | `/cars/{id}/share/{user_id}` | Revoke car sharing                |
| `GET`    | `/cars/{id}/shared-users`    | List users with access            |
| `GET`    | `/cars/{id}/statistics`      | Car-level refuel statistics       |
| `GET`    | `/users/search`              | Search users (for sharing)        |

### Refuels (`/api/metrics`)

| Method | Path                             | Description                      |
| ------ | -------------------------------- | -------------------------------- |
| `POST` | `/refuel`                        | Log a refuel entry               |
| `GET`  | `/refuel`                        | List refuels (filterable by car) |
| `GET`  | `/refuel/statistics`             | Cost stats and price trends      |
| `GET`  | `/refuel/monthly/{year}/{month}` | Monthly summary                  |
| `GET`  | `/refuel/favorite-stations`      | Stations used in refuels         |

### Kilometers (`/api/kilometers`)

| Method   | Path               | Description                       |
| -------- | ------------------ | --------------------------------- |
| `POST`   | `/kilometers`      | Log odometer reading              |
| `GET`    | `/kilometers`      | List readings (filterable by car) |
| `DELETE` | `/kilometers/{id}` | Delete reading                    |

### Fuel Prices (`/api/fuel-prices`)

| Method   | Path                                     | Description                                |
| -------- | ---------------------------------------- | ------------------------------------------ |
| `POST`   | `/search`                                | Search nearby stations (Tankerkönig)       |
| `POST`   | `/favorites`                             | Add favorite station                       |
| `GET`    | `/favorites`                             | List favorite stations with current prices |
| `DELETE` | `/favorites/{id}`                        | Remove favorite station                    |
| `GET`    | `/stations/{id}`                         | Station metadata                           |
| `GET`    | `/stations/{id}/prices/{fuel_type}`      | Compressed price history                   |
| `GET`    | `/stations/{id}/daily-stats/{fuel_type}` | Daily price aggregates                     |

### Data Points (`/api/data-points`)

| Method   | Path                   | Description          |
| -------- | ---------------------- | -------------------- |
| `POST`   | `/data-points`         | Add data point       |
| `GET`    | `/data-points`         | Query with filters   |
| `DELETE` | `/data-points/{id}`    | Delete data point    |
| `GET`    | `/data-points/labels`  | List distinct labels |
| `GET`    | `/data-points/summary` | Summary statistics   |

### Time Spans (`/api/time-spans`)

| Method   | Path                  | Description          |
| -------- | --------------------- | -------------------- |
| `POST`   | `/time-spans`         | Create time span     |
| `GET`    | `/time-spans`         | Query with filters   |
| `PUT`    | `/time-spans/{id}`    | Update time span     |
| `DELETE` | `/time-spans/{id}`    | Delete time span     |
| `GET`    | `/time-spans/labels`  | List distinct labels |
| `GET`    | `/time-spans/groups`  | List distinct groups |
| `GET`    | `/time-spans/summary` | Summary statistics   |

### Other

| Method | Path           | Description            |
| ------ | -------------- | ---------------------- |
| `GET`  | `/`            | Health check           |
| `GET`  | `/health`      | Detailed health status |
| `GET`  | `/api/auth/me` | Current user info      |

## Auth

The backend validates Google OAuth2 ID tokens from the `IdToken` cookie (set by Envoy's OAuth2 filter). On each request it:

1. Reads the `IdToken` cookie
2. Verifies the JWT against Google's public keys and the configured `GOOGLE_CLIENT_ID`
3. Extracts user info (`sub`, `email`, `name`, `picture`)
4. Creates or updates the user record in DuckDB (including fetching and base64-encoding the profile picture)

All API routes receive the authenticated user via the `CurrentUser` dependency.

## Project Structure

```text
app/
├── main.py              # FastAPI app, lifespan, middleware, routers
├── auth.py              # Google OAuth2 token validation
├── models.py            # Pydantic request/response models
├── migrations.py        # DuckDB schema migrations
├── api/                 # Route handlers
│   ├── cars.py
│   ├── refuels.py
│   ├── kilometers.py
│   ├── fuel_prices.py
│   ├── data_points.py
│   └── time_spans.py
├── storage/             # DuckDB data access clients
│   ├── duckdb_resource.py
│   ├── user_store.py
│   ├── car_client.py
│   ├── refuel_client.py
│   ├── kilometer_client.py
│   ├── data_point_client.py
│   └── time_span_client.py
└── utils/
    └── date_helpers.py
```

## Development

```bash
# Run tests
uv run pytest

# Format
uv run black app/

# Lint
uv run ruff app/
```
