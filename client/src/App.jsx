import React, { useState } from "react";

/* ✅ IMPORT BACKGROUND IMAGES */
import sunny from "../images/sunny.png";
import cloud from "../images/cloud.png";
import fog from "../images/fog.png";
import rain from "../images/rain.png";
import snow from "../images/snow.png";
import thunder from "../images/thunder.png";
import winters from "../images/winters.png";

/* ---------- AQI ---------- */
function aqiCategory(aqi) {
  if (aqi == null) return { label: "Unknown", className: "" };
  if (aqi <= 50) return { label: "Good", className: "aqi good" };
  if (aqi <= 100) return { label: "Moderate", className: "aqi moderate" };
  if (aqi <= 150) return { label: "Unhealthy (Sensitive)", className: "aqi unhealthy" };
  if (aqi <= 200) return { label: "Unhealthy", className: "aqi unhealthy" };
  if (aqi <= 300) return { label: "Very Unhealthy", className: "aqi unhealthy" };
  return { label: "Hazardous", className: "aqi unhealthy" };
}

function cToF(c) {
  if (c == null) return null;
  return Math.round((c * 9) / 5 + 32);
}

/* ---------- WEATHER → IMAGE (FINAL, CORRECT) ---------- */
function getBackgroundImage(condition, tempC) {
  if (!condition && tempC == null) return sunny;

  const c = condition?.toLowerCase() || "";

  /* 🔥 1. EXTREME / SEVERE (HIGHEST PRIORITY) */
  if (
    c.includes("thunder") ||
    c.includes("storm") ||
    c.includes("blizzard")
  ) {
    return thunder;
  }

  /* ❄️ 2. SNOW */
  if (c.includes("snow")) {
    return snow;
  }

  /* 🌧 3. RAIN */
  if (
    c.includes("rain") ||
    c.includes("drizzle") ||
    c.includes("shower")
  ) {
    return rain;
  }

  /* 🌫 4. FOG / VISIBILITY */
  if (
    c.includes("fog") ||
    c.includes("mist") ||
    c.includes("haze")
  ) {
    return fog;
  }

  /* ☁️ 5. CLOUDS */
  if (
    c.includes("cloud") ||
    c.includes("overcast")
  ) {
    return cloud;
  }

  /* ❄️ 6. WINTERS (COLD BUT NO RAIN/SNOW/STORM) */
  if (tempC != null && tempC <= 5) {
    return winters;
  }

  /* ☀️ 7. SUNNY / WARM / CLEAR */
  if (
    c.includes("sun") ||
    c.includes("clear") ||
    c.includes("warm")
  ) {
    return sunny;
  }

  /* 🌤 DEFAULT */
  return sunny;
}

export default function App() {
  const [q, setQ] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function search() {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const resp = await fetch(`/api/weather?query=${encodeURIComponent(q.trim())}`);
      const json = await resp.json();

      if (!resp.ok) throw new Error(json.error || "Server error");
      setData(json);
    } catch (e) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const condition = data?.current?.condition ?? null;
  const tempC = data?.current?.temperature ?? null;
  const tempF = tempC != null ? cToF(tempC) : null;

  const isWinter =
    tempC != null &&
    tempC <= 5 &&
    !condition?.toLowerCase().includes("rain") &&
    !condition?.toLowerCase().includes("snow") &&
    !condition?.toLowerCase().includes("thunder");

  const bgImage = getBackgroundImage(condition, tempC);

  const aqi = data?.air_quality?.aqi_pm25 ?? null;
  const aqiInfo = aqiCategory(aqi);

  return (
    <div className="app">
      <div
        className="bg"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <header className="header">
        <div className="searchbar">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder='Search city, area, state or country (e.g., "Pune", "Chikhali Buldhana India")'
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button onClick={search}>{loading ? "Searching..." : "Search"}</button>
        </div>
      </header>

      <main className="content">
        {error && <div className="card" style={{ padding: 16 }}>{error}</div>}

        {!data && !error && (
          <div className="card" style={{ padding: 16 }}>
            Tip: try "Mumbai", "New York", or "Himalayas".
          </div>
        )}

        {data && !error && (
          <div className="card">
            <div className="top">
              <div>
                <div className="place">
                  <h1>
                    {data.place?.name ?? "Unknown"}
                    {data.place?.admin1 ? `, ${data.place.admin1}` : ""}
                    {data.place?.country ? `, ${data.place.country}` : ""}
                  </h1>
                  <span className="badge">
                    {data.current?.time
                      ? new Date(data.current.time).toLocaleString()
                      : "N/A"}
                  </span>
                </div>

                <div className="temp">
                  {tempC != null ? `${Math.round(tempC)}°C` : "N/A"}
                  {tempF != null ? ` / ${tempF}°F` : ""}
                </div>

                <div>
                  <span className="badge">
                    {isWinter ? "Winters" : (condition ?? "").toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="meta">
                <div className="item">
                  <strong>Humidity</strong>
                  <span>Relative</span>
                  <div>{data.current?.humidity ?? "N/A"}%</div>
                </div>

                <div className="item">
                  <strong>Wind Speed</strong>
                  <span>10m</span>
                  <div>{data.current?.wind_speed ?? "N/A"} km/h</div>
                </div>

                <div className="item">
                  <strong>AQI (PM2.5)</strong>
                  <span className={aqiInfo.className}>{aqiInfo.label}</span>
                  <div>{aqi ?? "N/A"}</div>
                </div>

                <div className="item">
                  <strong>Ozone (O3)</strong>
                  <span>µg/m³</span>
                  <div>{data.air_quality?.ozone ?? "N/A"}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
