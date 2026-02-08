# Refuel Tracker — Frontend

Next.js application for tracking refuels, managing cars, and monitoring gas station fuel prices. Mobile-first responsive design with MUI, Tailwind CSS, and Recharts.

## Tech Stack

- **Next.js 14** (Pages Router, standalone output)
- **React 18** with TypeScript
- **MUI 7** (Material UI) for component library
- **Tailwind CSS** for utility styling
- **Recharts** for data visualization (price, consumption, distance charts)
- **React Query** (`@tanstack/react-query`) for server state management
- **Framer Motion** for page transitions and animations
- **Axios** for API communication
- **i18n** — English and German translations
- **Theming** — Light/dark mode with system preference detection

## Quick Start

```bash
npm install
npm run dev
```

Or from the project root:

```bash
just dev-frontend
```

The app runs at <http://localhost:3000>.

## Environment Variables

| Variable                       | Description             | Default                 |
| ------------------------------ | ----------------------- | ----------------------- |
| `NEXT_PUBLIC_API_URL`          | Backend API base URL    | `http://localhost:8000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth2 client ID | —                       |

## Pages

| Route                        | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| `/`                          | Dashboard / home                                     |
| `/cars`.                     | Car list for car-specific views                      |
| `/cars/[id]`.                | Individual car detail (refuels, kilometers, sharing) |
| `/fuel-prices`               | Favorite stations with live prices                   |
| `/fuel-prices/stations`      | Station search                                       |
| `/fuel-prices/stations/[id]` | Station detail with price history and daily stats    |
| `/settings`                  | Theme, language, and app settings                    |

## Project Structure

```text
src/
├── pages/                    # Next.js pages (routes)
├── components/
│   ├── auth/                 # UserProfile
│   ├── cars/                 # CarCard, CarList, CarDetails, KilometerChart, sharing
│   ├── refuels/              # AddRefuelForm, RefuelList, RefuelStats, charts
│   ├── fuel-prices/          # FavoriteStationsList, SearchStationsForm, StationCard, PriceStatistics
│   ├── common/               # Layout, Panel, GridLayout, FAB, dialogs, snackbar, loading
├── lib/
│   ├── api.ts                # Typed Axios API client (all backend endpoints)
│   ├── auth.ts               # Auth utilities
│   ├── auth/                 # UserContext provider
│   ├── hooks/                # useCars, useFuelPrices, useDebounce, etc.
│   ├── i18n/                 # LanguageContext, translations (en, de)
│   ├── theme/                # ThemeContext, dark/light mode, chart theming
│   ├── chartConfig.tsx       # Shared Recharts configuration
│   └── formatPrice.tsx       # Price formatting utilities
└── styles/
    └── globals.css           # Tailwind base styles
```

## Mobile-First Design

The app provides distinct experiences based on screen size:

- **Mobile** (`< md`): Bottom navigation bar, floating action button for adding entries, modal forms, single-column scrollable layouts
- **Desktop** (`≥ md`): Sidebar navigation, tabbed interfaces, side-by-side panel layouts

## Development

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Type checking
npm run type-check

# Lint
npm run lint
```
