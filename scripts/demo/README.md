# Demo data & screenshots

Local-only tooling to produce the README screenshots without touching the real
`data/` directory and without running the Dagster pipeline or calling the
Tankerkönig API.

## 1. Generate the demo dataset

```bash
cd backend
uv run python ../scripts/demo/generate_demo_data.py      # writes ../data-demo
```

It creates a complete data directory:

| Artefact                                     | Content                                                     |
| -------------------------------------------- | ----------------------------------------------------------- |
| `userdata.sqlite`                            | demo user, 2 cars, ~60 refuels, odometer log, 10 favourites |
| `fueldata.sqlite`                            | raw 10-minute price samples for the last 3 weeks            |
| `compressed_fuel_prices/`                    | ~160k price changes over 15 months (10 Berlin stations)     |
| `daily_aggregates/`, `daily_agg_price_by_*/` | per station / brand / city daily statistics                 |
| `monthly_agg_price_by_*/`                    | monthly statistics used by the stats pages                  |

Prices follow a realistic model: yearly seasonality, a slow random walk, brand
positioning (ARAL/Shell premium, Sprint cheapest) and the typical German
intraday cycle (expensive in the morning, cheapest around 8 p.m.).

## 2. Run the app against the demo data

```bash
# backend (any free port, CORS allows 3000/3001)
cd backend
DATA_PATH="$PWD/../data-demo" ENVIRONMENT=development \
  DEV_USER_ID=104608675968934509626 DEV_USER_EMAIL=demo@refuel-tracker.app \
  TANKERKOENIG_API_KEY=demo-offline-key \
  uv run uvicorn app.main:app --port 8011

# frontend
cd frontend
NEXT_PUBLIC_API_URL=http://localhost:8011 npm run dev -- -p 3001
```

The dummy Tankerkönig key is only needed so the station endpoint is enabled; all
data is served from the local demo files.

## 3. Take the screenshots

```bash
npm i playwright && npx playwright install chromium

CAR_ID=$(sqlite3 data-demo/userdata.sqlite "select id from cars where name='VW Golf VII'") \
STATION_ID=8a1b0c31-3333-4a03-9c03-000000000003 \
node scripts/demo/screenshots.js
```

Output lands in `docs/screenshots/`: four portrait mobile shots plus the desktop
refuel list. Screenshots are best taken against a production build
(`npx next build && npx next start -p 3001`) so the dev overlay stays out of the
picture.

Afterwards simply start the app with the normal `DATA_PATH=data` again — the
demo dataset lives entirely in `data-demo/` (git-ignored).
