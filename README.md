# Refuel Tracker

A self-hosted application for tracking refueling events and monitoring gas station fuel prices in Germany, powered by the [Tankerkönig API](https://creativecommons.tankerkoenig.de).

## Features

- **Refuel Logging** — Record price per liter, amount, distance driven, and fuel consumption per car
- **Multi-Car Support** — Manage multiple vehicles with car sharing between users
- **Live Fuel Prices** — Search and monitor real-time E5, E10, and Diesel prices from German gas stations
- **Favorite Stations** — Save stations and automatically track their price history
- **Price Analytics** — Daily aggregates, compression of raw price data, and historical price charts
- **Consumption Statistics** — Monthly summaries, cost breakdowns, and efficiency trends
- **Odometer Tracking** — Log kilometer readings per car with charts and stats
- **Google OAuth** — Authentication via Google with user allowlist authorization (OPA)
- **Mobile-First UI** — Responsive design with bottom navigation, FABs, and modal forms

## Architecture

```text
       ┌────────────────────────────────────────────────┐
       │                 Envoy Proxy                    │
       │  (Google OAuth2 · JWT validation · routing)    │
       └──┬─────────────┬─────────────┬───────────┬──--─┘
          │             │             │           │
      ┌───▼--─────┐ ┌───▼─--───┐ ┌────▼───--─┐ ┌──▼──--──┐
      │  Frontend │ │ Backend  │ │  Dagster  │ │   OPA   │
      │  Next.js  │ │ FastAPI  │ │ Analytics │ │Allowlist│
      └───────────┘ └────┬─────┘ └─────┬─────┘ └─────────┘
                         │             │
                         │      Tankerkönig API
                         │
                  ┌──────▼──────┐
                  │   DuckDB    │
                  │ userdata.db │
                  │ fueldata.db │
                  └─────────────┘
```

### Tech Stack

| Layer     | Technology                                                      |
| --------- | --------------------------------------------------------------- |
| Backend   | Python 3.11+, FastAPI, Pydantic v2, DuckDB                      |
| Frontend  | Next.js 14, React 18, TypeScript, MUI 7, Tailwind CSS, Recharts |
| Analytics | Dagster, Pandas, DuckDB                                         |
| Auth      | Google OAuth2 (via Envoy), OPA user allowlist                   |
| Proxy     | Envoy Proxy (OAuth2 flow, JWT validation, routing)              |
| Storage   | DuckDB (`userdata.duckdb`, `fueldata.duckdb`)                   |
| Build     | `just`, `uv` (Python), npm, Docker Compose                      |

### Data Storage

Two DuckDB databases in the `data/` directory:

- **`userdata.duckdb`** — Refuels, cars, kilometer readings, users
- **`fueldata.duckdb`** — Raw fuel prices, compressed price changes, daily aggregates, favorite stations, gas station metadata

## Quick Start

### Prerequisites

- Docker and Docker Compose
- [just](https://github.com/casey/just) command runner
- A [Tankerkönig API key](https://creativecommons.tankerkoenig.de) (for fuel price fetching)
- Google OAuth2 credentials (for authentication)

### Configuration

1. **Render Envoy configuration** from templates:

   ```bash
   just render-envoy-config app development
   just render-envoy-config analytics development
   ```

   Config variables are defined in `config/variables.*.yaml` files. Jinja2 templates in `config/templates/` generate Envoy, OPA, and secret configs.

2. **Set up environment variables** — See the per-stack compose files for required env vars (Tankerkönig API key, Google OAuth client ID/secret, etc.).

### Running

```bash
# Start the main app (frontend + backend + envoy + opa)
just up app

# Start the analytics pipeline (dagster + envoy + opa)
just up analytics

# Or run both
just up app && just up analytics
```

**Access points:**

| Service                         | URL                          |
| ------------------------------- | ---------------------------- |
| App (via Envoy)                 | <http://localhost:9090>      |
| Analytics / Dagster (via Envoy) | <http://localhost:8080>      |
| Backend API (direct, dev only)  | <http://localhost:8000>      |
| API Docs                        | <http://localhost:8000/docs> |

### Development Setup

```bash
# Backend
cd backend
uv sync --group dev
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Analytics
cd analytics
uv sync
dagster dev
```

Or use the `just` shortcuts:

```bash
just dev            # Run backend + frontend
just dev-backend    # Backend only
just dev-frontend   # Frontend only
just dev-analytics  # Dagster dev
```

## Analytics Pipeline

The Dagster pipeline fetches and processes fuel price data on a schedule:

| Schedule                 | Frequency     | Description                                                         |
| ------------------------ | ------------- | ------------------------------------------------------------------- |
| `fetch_fuel_prices`      | Every 10 min  | Fetch live prices from Tankerkönig for all favorite stations        |
| `compressed_fuel_prices` | Daily 6:00 AM | Deduplicate consecutive identical prices (~80% compression)         |
| `daily_aggregates`       | Daily 7:00 AM | Compute per-station per-fuel-type daily stats (mean, min, max, std) |
| `cleanup_raw_fuel_data`  | Daily 8:00 AM | Delete raw data older than 28 days (after compression is verified)  |

## API Endpoints

| Resource    | Prefix             | Key Operations                                                |
| ----------- | ------------------ | ------------------------------------------------------------- |
| Cars        | `/api/cars`        | CRUD, share with other users                                  |
| Refuels     | `/api/metrics`     | Log refuels, statistics, monthly summaries, favorite stations |
| Kilometers  | `/api/kilometers`  | Log odometer readings                                         |
| Fuel Prices | `/api/fuel-prices` | Search stations, manage favorites, price history, daily stats |
| Auth        | `/api/auth`        | Current user info                                             |

## Project Structure

```text
refuel-tracker/
├── analytics/    # Dagster pipeline for fuel price ingestion and aggregation
├── backend/      # FastAPI application with DuckDB storage
├── config/       # Envoy, OPA, and secret templates per environment
├── data/         # DuckDB databases (runtime, git-ignored)
├── frontend/     # Next.js application (React, TypeScript, MUI)
└── lib/          # Shared Python packages (Tankerkönig client, fuel data clients)
```

## Auth Flow

1. User hits the app through Envoy proxy
2. Envoy redirects to Google OAuth2 login (if no valid session)
3. On success, Envoy sets `IdToken` and `BearerToken` cookies
4. Envoy's JWT filter validates the token on each request
5. OPA checks the user's Google `sub` claim against the allowlist
6. Backend reads the `IdToken` cookie, verifies it with Google's public keys, and upserts the user in DuckDB

## Development

```bash
# Run tests
just test

# Lint & format
just lint
just format

# Build Docker images
just build app
just build analytics
```

## License

This project is open source and available under the [MIT License](LICENSE).
