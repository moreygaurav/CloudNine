import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// AQI calculation (simplified for PM2.5)
function calcAQIFromPM25(pm25) {
  if (pm25 == null) return null;
  if (pm25 <= 12) return Math.round((50 / 12) * pm25);
  if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51);
  if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101);
  if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151);
  if (pm25 <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (pm25 - 150.5) + 201);
  if (pm25 <= 350.4) return Math.round(((400 - 301) / (350.4 - 250.5)) * (pm25 - 250.5) + 301);
  if (pm25 <= 500.4) return Math.round(((500 - 401) / (500.4 - 350.5)) * (pm25 - 350.5) + 401);
  return 500;
}

// Weather code → condition
function weatherCodeToCondition(code) {
  if (code == null) return null;
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Clouds";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([85, 86].includes(code)) return "Snow showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

app.get("/api/weather", async (req, res) => {
  try {
    const query = (req.query.query || "").trim();
    if (!query) {
      return res.status(400).json({ error: "Missing ?query=<city or place>" });
    }

    // Step 1: Geocoding API
    const geoUrl = new URL("https://geocoding-api.open-meteo.com/v1/search");
    geoUrl.searchParams.set("name", query);
    geoUrl.searchParams.set("count", "5"); // fetch up to 5 matches
    geoUrl.searchParams.set("language", "en");

    const geoResp = await fetch(geoUrl.toString());
    const geoData = await geoResp.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: "Place not found." });
    }

    // Step 2: Pick best match
    const lowerQ = query.toLowerCase();
    let place = geoData.results.find(
      (r) =>
        lowerQ.includes(r.name.toLowerCase()) ||
        (r.admin1 && lowerQ.includes(r.admin1.toLowerCase())) ||
        (r.country && lowerQ.includes(r.country.toLowerCase()))
    );
    if (!place) {
      place = geoData.results[0]; // fallback if no close match
    }

    const { latitude, longitude, name, country, timezone, admin1 } = place;

    // Step 3: Weather API
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", latitude);
    weatherUrl.searchParams.set("longitude", longitude);
    weatherUrl.searchParams.set("current", "temperature_2m,wind_speed_10m,weather_code");
    weatherUrl.searchParams.set("hourly", "relative_humidity_2m");
    weatherUrl.searchParams.set("timezone", "auto");

    const wResp = await fetch(weatherUrl.toString());
    const wData = await wResp.json();

    const current = wData.current || {};
    const hourly = wData.hourly || {};
    let humidity = null;
    if (hourly.time && hourly.relative_humidity_2m) {
      const nowIso = current.time || new Date().toISOString().slice(0, 13) + ":00";
      const idx = hourly.time.indexOf(nowIso);
      humidity =
        idx !== -1
          ? hourly.relative_humidity_2m[idx]
          : hourly.relative_humidity_2m[hourly.relative_humidity_2m.length - 1];
    }

    // Step 4: Air Quality API
    const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    airUrl.searchParams.set("latitude", latitude);
    airUrl.searchParams.set("longitude", longitude);
    airUrl.searchParams.set(
      "hourly",
      "pm2_5,pm10,carbon_monoxide,ozone,nitrogen_dioxide,sulphur_dioxide"
    );
    airUrl.searchParams.set("timezone", "auto");

    const aResp = await fetch(airUrl.toString());
    const aData = await aResp.json();

    let pm25 = null,
      pm10 = null,
      ozone = null,
      no2 = null,
      so2 = null,
      co = null;
    if (aData && aData.hourly && aData.hourly.time) {
      const atimes = aData.hourly.time;
      const nowAirIdx = atimes.indexOf(current.time);
      const ix = nowAirIdx !== -1 ? nowAirIdx : aData.hourly.pm2_5.length - 1;
      pm25 = aData.hourly.pm2_5?.[ix] ?? null;
      pm10 = aData.hourly.pm10?.[ix] ?? null;
      ozone = aData.hourly.ozone?.[ix] ?? null;
      no2 = aData.hourly.nitrogen_dioxide?.[ix] ?? null;
      so2 = aData.hourly.sulphur_dioxide?.[ix] ?? null;
      co = aData.hourly.carbon_monoxide?.[ix] ?? null;
    }

    const aqi = pm25 != null ? calcAQIFromPM25(pm25) : null;

    const cond = weatherCodeToCondition(current.weather_code);
    if (!cond) {
      return res.status(422).json({ error: "Unsupported weather condition" });
    }

    // Step 5: Send response
    res.json({
      place: { name, country, admin1, latitude, longitude, timezone },
      current: {
        time: current.time,
        temperature: current.temperature_2m,
        wind_speed: current.wind_speed_10m,
        weather_code: current.weather_code,
        condition: cond,
        humidity,
      },
      air_quality: {
        pm2_5: pm25,
        pm10,
        ozone,
        nitrogen_dioxide: no2,
        sulphur_dioxide: so2,
        carbon_monoxide: co,
        aqi_pm25: aqi,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
