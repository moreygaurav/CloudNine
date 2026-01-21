# Weather App (MERN + React)

Fully functional weather app with Open‑Meteo APIs (no API key). Search any city or village in the world.
Responsive UI with dynamic backgrounds (sunny, cloudy, rain, snow/winter, fog, thunder). Shows temperature,
humidity, wind speed, and PM2.5‑based AQI (plus PM10 and ozone).

## Tech
- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **DB (optional):** MongoDB (stores search logs if `MONGODB_URI` is set)
- **APIs:** Open‑Meteo Geocoding, Weather, and Air Quality

## Local Setup

### 1) Backend
```bash
cd server
cp .env.example .env   # edit if needed
npm install
npm run dev            # starts at http://localhost:5000
```

### 2) Frontend
```bash
cd ../client
npm install
npm run dev            # opens http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend (see `vite.config.js`).

## Build for Production
```bash
# build frontend
cd client && npm run build

# serve backend (adjust to serve static if you deploy together)
cd ../server && npm start
```

## Notes
- AQI is calculated from PM2.5 using US EPA breakpoints. This is an approximation and may differ from official AQI.
- Background switches to a winter theme if temperature ≤ 5°C or weather indicates snow.
- No API keys required.
- To enable Mongo logging, run MongoDB locally and set `MONGODB_URI` in `server/.env`.
