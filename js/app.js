const form = document.getElementById("postcodeForm");
const postcodeInput = document.getElementById("postcode");
const radiusMilesInput = document.getElementById("radiusMiles");
const clock = document.getElementById("clock");
const locationPostcode = document.getElementById("locationPostcode");
const locationPlace = document.getElementById("locationPlace");
const locationCoords = document.getElementById("locationCoords");
const activeRadius = document.getElementById("activeRadius");
const flightCount = document.getElementById("flightCount");
const flightRows = document.getElementById("flightRows");
const flightDetail = document.getElementById("flightDetail");
const dataSource = document.getElementById("dataSource");
const apiStatus = document.getElementById("apiStatus");
const lastServerUpdate = document.getElementById("lastServerUpdate");
const latestServerMessage = document.getElementById("latestServerMessage");
const refreshFeed = document.getElementById("refreshFeed");

const IS_GITHUB_PAGES = window.location.hostname.endsWith("github.io");
const SERVER_BASE_URL = window.location.origin;

const postcodeLocations = {
  "SW1A1AA": { postcode: "SW1A 1AA", label: "London, United Kingdom", lat: 51.501, lon: -0.141 },
  "M11AE": { postcode: "M1 1AE", label: "Manchester, United Kingdom", lat: 53.479, lon: -2.245 },
  "B11BB": { postcode: "B1 1BB", label: "Birmingham, United Kingdom", lat: 52.479, lon: -1.902 },
  "EH11YZ": { postcode: "EH1 1YZ", label: "Edinburgh, United Kingdom", lat: 55.953, lon: -3.188 },
  "CF101EP": { postcode: "CF10 1EP", label: "Cardiff, United Kingdom", lat: 51.481, lon: -3.179 }
};

let flights = [
  { callsign: "BAW142", airline: "British Airways", from: "LHR", to: "JFK", fromName: "London Heathrow", toName: "New York JFK", aircraft: "Boeing 777", altitude: 36000, speed: 466, heading: 287, vertical: "+64 ft/min", squawk: "1234", lat: 51.72, lon: -1.45, origin: { lat: 51.47, lon: -0.454 }, destination: { lat: 40.6413, lon: -73.7781 } },
  { callsign: "EZY45KR", airline: "easyJet", from: "MAN", to: "BCN", fromName: "Manchester", toName: "Barcelona", aircraft: "Airbus A320", altitude: 28000, speed: 412, heading: 172, vertical: "-128 ft/min", squawk: "4561", lat: 53.12, lon: -2.72, origin: { lat: 53.35, lon: -2.274 }, destination: { lat: 41.2974, lon: 2.0833 } },
  { callsign: "RYR6QZP", airline: "Ryanair", from: "BHX", to: "DUB", fromName: "Birmingham", toName: "Dublin", aircraft: "Boeing 737", altitude: 34000, speed: 439, heading: 295, vertical: "+0 ft/min", squawk: "7312", lat: 52.68, lon: -2.35, origin: { lat: 52.4539, lon: -1.748 }, destination: { lat: 53.4213, lon: -6.2701 } },
  { callsign: "VIR27TY", airline: "Virgin Atlantic", from: "LHR", to: "DEL", fromName: "London Heathrow", toName: "Delhi", aircraft: "Airbus A350", altitude: 37000, speed: 478, heading: 96, vertical: "+256 ft/min", squawk: "2210", lat: 51.24, lon: 0.86, origin: { lat: 51.47, lon: -0.454 }, destination: { lat: 28.5562, lon: 77.1 } },
  { callsign: "DLH4MZ", airline: "Lufthansa", from: "FRA", to: "ORD", fromName: "Frankfurt", toName: "Chicago O'Hare", aircraft: "Boeing 747", altitude: 39000, speed: 488, heading: 302, vertical: "+0 ft/min", squawk: "5742", lat: 50.12, lon: 4.6, origin: { lat: 50.0379, lon: 8.5622 }, destination: { lat: 41.9742, lon: -87.9073 } },
  { callsign: "SAS87AB", airline: "SAS", from: "EDI", to: "CPH", fromName: "Edinburgh", toName: "Copenhagen", aircraft: "Airbus A320neo", altitude: 31000, speed: 421, heading: 81, vertical: "-64 ft/min", squawk: "3460", lat: 55.74, lon: -2.45, origin: { lat: 55.95, lon: -3.372 }, destination: { lat: 55.6181, lon: 12.6561 } },
  { callsign: "AFR1567", airline: "Air France", from: "CDG", to: "DUB", fromName: "Paris Charles de Gaulle", toName: "Dublin", aircraft: "Airbus A321", altitude: 38000, speed: 467, heading: 309, vertical: "+128 ft/min", squawk: "6621", lat: 50.7, lon: -1.28, origin: { lat: 49.0097, lon: 2.5479 }, destination: { lat: 53.4213, lon: -6.2701 } },
  { callsign: "TOM7KD", airline: "TUI Airways", from: "CWL", to: "PMI", fromName: "Cardiff", toName: "Palma", aircraft: "Boeing 737", altitude: 30000, speed: 447, heading: 149, vertical: "+320 ft/min", squawk: "2105", lat: 51.13, lon: -3.55, origin: { lat: 51.3967, lon: -3.3433 }, destination: { lat: 39.5517, lon: 2.7388 } }
];

let currentLocation = postcodeLocations.SW1A1AA;
let visibleFlights = [];
let selectedFlight = null;
let viewer = null;
let flightEntities = new Map();
let eventStreamController = null;
let postcodeSearchActive = false;
let currentRadiusMiles = Number(radiusMilesInput.value);
let selectedImageRequest = 0;

function normalisePostcode(value) {
  return value.replace(/\s+/g, "").toUpperCase();
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function distanceMiles(a, b) {
  const radius = 3958.8;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function getNearbyFlights() {
  return flights
    .map((flight) => ({ ...flight, distance: distanceMiles(currentLocation, flight) }))
    .filter((flight) => flight.distance <= currentRadiusMiles)
    .sort((a, b) => a.distance - b.distance);
}

function getRadiusMiles() {
  const value = Number(radiusMilesInput.value);
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.min(Math.max(value, 5), 150);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatCoord(value, positive, negative) {
  return `${Math.abs(value).toFixed(4)} ${value >= 0 ? positive : negative}`;
}

function radiusMetres() {
  return currentRadiusMiles * 1609.34;
}

function formatServerTime(timestamp) {
  if (!timestamp) {
    return "Waiting";
  }

  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Unavailable";
  }

  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function normaliseFlight(rawFlight) {
  const callsign = rawFlight.callsign || rawFlight.flight || rawFlight.icao24 || "UNKNOWN";
  const lat = Number(rawFlight.lat ?? rawFlight.latitude);
  const lon = Number(rawFlight.lon ?? rawFlight.lng ?? rawFlight.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const icao24 = rawFlight.icao24 || rawFlight.aircraft?.replace("ICAO24 ", "") || "Unknown";

  return {
    callsign,
    airline: rawFlight.airline || rawFlight.operator || "Live Aircraft",
    from: rawFlight.from || rawFlight.origin_code || null,
    to: rawFlight.to || rawFlight.destination_code || null,
    fromName: rawFlight.fromName || rawFlight.origin_name || null,
    toName: rawFlight.toName || rawFlight.destination_name || null,
    originCountry: rawFlight.origin_country || rawFlight.originCountry || rawFlight.airline || "Unknown",
    aircraft: rawFlight.aircraft || rawFlight.type || `ICAO24 ${icao24}`,
    registration: rawFlight.registration || null,
    manufacturer: rawFlight.manufacturer || null,
    model: rawFlight.model || null,
    icaoType: rawFlight.icao_type || rawFlight.icaoType || null,
    altitude: Number(rawFlight.altitude ?? rawFlight.alt_baro ?? 0),
    speed: Number(rawFlight.speed ?? rawFlight.groundspeed ?? rawFlight.velocity ?? 0),
    heading: Number(rawFlight.heading ?? rawFlight.track ?? 0),
    vertical: rawFlight.vertical || `${Number(rawFlight.vertical_rate ?? 0)} ft/min`,
    squawk: rawFlight.squawk || "----",
    lat,
    lon,
    origin: rawFlight.origin || { lat, lon },
    destination: rawFlight.destination || { lat, lon },
    icao24,
    timePosition: rawFlight.time_position || rawFlight.timePosition || null,
    lastContact: rawFlight.last_contact || rawFlight.lastContact || null,
    onGround: Boolean(rawFlight.on_ground ?? rawFlight.onGround ?? false),
    totalFlightTime: rawFlight.total_flight_time || rawFlight.totalFlightTime || null,
    takeoffTime: rawFlight.takeoff_time || rawFlight.takeoffTime || null,
    landingTime: rawFlight.landing_time || rawFlight.landingTime || null
  };
}

function updateApiStatus(status, message) {
  apiStatus.textContent = status;
  if (message) {
    latestServerMessage.textContent = message;
  }
}

function applyServerPayload(payload) {
  const data = payload.data || {};

  if (postcodeSearchActive && payload.type === "flight_update" && !data.location) {
    return;
  }

  dataSource.textContent = data.source || "FastAPI Live Feed";
  lastServerUpdate.textContent = formatServerTime(payload.received_at);

  if (data.message) {
    latestServerMessage.textContent = data.message;
  }

  if (data.location) {
    const lat = Number(data.location.lat ?? data.location.latitude);
    const lon = Number(data.location.lon ?? data.location.lng ?? data.location.longitude);

    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      currentLocation = {
        postcode: data.location.postcode || currentLocation.postcode,
        label: data.location.label || data.location.place || currentLocation.label,
        lat,
        lon
      };
    }
  }

  if (Array.isArray(data.flights)) {
    const liveFlights = data.flights
      .map(normaliseFlight)
      .filter(Boolean);

    flights = liveFlights;
  }

  updateLocation(currentLocation);
}

async function searchPostcodeFlights(postcode, radiusMiles) {
  if (IS_GITHUB_PAGES) {
    throw new Error("Open the ngrok URL to search live flights.");
  }

  const response = await fetch(
    `${SERVER_BASE_URL}/api/flights/near?postcode=${encodeURIComponent(postcode)}&radius_miles=${radiusMiles}&ts=${Date.now()}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || `Postcode search failed with ${response.status}`);
  }

  postcodeSearchActive = true;
  applyServerPayload(await response.json());
}

async function loadInitialServerState() {
  if (IS_GITHUB_PAGES) {
    throw new Error("Open the ngrok URL for live data.");
  }

  const response = await fetch(`${SERVER_BASE_URL}/api/state?ts=${Date.now()}`, {
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`State request failed with ${response.status}`);
  }

  applyServerPayload(await response.json());
}

async function refreshServerState() {
  refreshFeed.disabled = true;
  updateApiStatus("Refreshing", "Fetching latest server state.");

  try {
    await loadInitialServerState();
    updateApiStatus("Live", "Feed refreshed from server.");
  } catch (error) {
    console.error("Feed refresh failed", error);
    updateApiStatus("Unavailable", error.message || "Could not refresh the server feed.");
  } finally {
    refreshFeed.disabled = false;
  }
}

async function connectServerEvents() {
  if (IS_GITHUB_PAGES) {
    updateApiStatus("Preview Mode", "Open the ngrok URL for live data.");
    return;
  }

  eventStreamController = new AbortController();
  updateApiStatus("Connecting", "Opening live server feed.");

  try {
    const response = await fetch(`${SERVER_BASE_URL}/api/events/stream`, {
      cache: "no-store",
      signal: eventStreamController.signal
    });

    if (!response.ok || !response.body) {
      throw new Error(`Stream request failed with ${response.status}`);
    }

    updateApiStatus("Live", "Connected to server.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const messages = buffer.split("\n\n");
      buffer = messages.pop() || "";

      messages.forEach((message) => {
        const dataLine = message
          .split("\n")
          .find((line) => line.startsWith("data: "));

        if (!dataLine) {
          return;
        }

        try {
          updateApiStatus("Live");
          applyServerPayload(JSON.parse(dataLine.slice(6)));
        } catch {
          updateApiStatus("Live", "Received an unreadable server message.");
        }
      });
    }
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    console.error("Feed stream failed", error);
    updateApiStatus("Disconnected", error.message || "Waiting for server connection.");
    setTimeout(connectServerEvents, 5000);
  }
}

async function initCesium() {
  if (!window.Cesium) {
    return;
  }

  const imageryLayer = await Cesium.ImageryLayer.fromProviderAsync(
    Cesium.ArcGisMapServerImageryProvider.fromUrl(
      "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
    )
  );

  viewer = new Cesium.Viewer("cesiumContainer", {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    navigationHelpButton: false,
    shouldAnimate: true,
    baseLayer: imageryLayer,
    terrainProvider: new Cesium.EllipsoidTerrainProvider()
  });

  viewer.scene.globe.enableLighting = false;
  viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#1f5ea8");
  viewer.scene.skyAtmosphere.show = true;
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#02070d");
  viewer.scene.globe.depthTestAgainstTerrain = false;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance = 300000;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 14000000;

  const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction((movement) => {
    const picked = viewer.scene.pick(movement.position);
    if (Cesium.defined(picked) && picked.id && picked.id.properties && picked.id.properties.callsign) {
      const callsign = picked.id.properties.callsign.getValue();
      const flight = visibleFlights.find((item) => item.callsign === callsign);
      if (flight) {
        selectedFlight = flight;
        renderFlights();
        renderCesiumEntities();
      }
    }
  }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function cameraToLocation() {
  if (!viewer) {
    return;
  }

  const target = Cesium.Cartesian3.fromDegrees(currentLocation.lon, currentLocation.lat, 0);
  const range = Math.max(radiusMetres() * 4.2, 420000);

  viewer.camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(target, radiusMetres()),
    {
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(18),
        Cesium.Math.toRadians(-72),
        range
      ),
      duration: 1.2
    }
  );
}

function routePositions(flight) {
  return Cesium.Cartesian3.fromDegreesArrayHeights([
    flight.origin.lon, flight.origin.lat, 12000,
    flight.lon, flight.lat, flight.altitude * 0.3048,
    flight.destination.lon, flight.destination.lat, 12000
  ]);
}

function renderCesiumEntities() {
  if (!viewer) {
    return;
  }

  viewer.entities.removeAll();
  flightEntities = new Map();

  viewer.entities.add({
    id: "search-location",
    name: currentLocation.postcode,
    position: Cesium.Cartesian3.fromDegrees(currentLocation.lon, currentLocation.lat, 1200),
    point: {
      pixelSize: 16,
      color: Cesium.Color.DODGERBLUE,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 3,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    label: {
      text: currentLocation.postcode,
      font: "700 14px sans-serif",
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset: new Cesium.Cartesian2(0, -34),
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    ellipse: {
      semiMajorAxis: radiusMetres(),
      semiMinorAxis: radiusMetres(),
      material: Cesium.Color.DODGERBLUE.withAlpha(0.08),
      outline: true,
      outlineColor: Cesium.Color.LIGHTSKYBLUE.withAlpha(0.75),
      height: 0
    }
  });

  visibleFlights.forEach((flight) => {
    const isSelected = selectedFlight && selectedFlight.callsign === flight.callsign;

    viewer.entities.add({
      id: `${flight.callsign}-route`,
      polyline: {
        positions: routePositions(flight),
        width: isSelected ? 4 : 2,
        arcType: Cesium.ArcType.GEODESIC,
        material: isSelected ? Cesium.Color.WHITE.withAlpha(0.82) : Cesium.Color.LIGHTSKYBLUE.withAlpha(0.38)
      }
    });

    const entity = viewer.entities.add({
      id: flight.callsign,
      name: flight.callsign,
      position: Cesium.Cartesian3.fromDegrees(flight.lon, flight.lat, flight.altitude * 0.3048),
      properties: {
        callsign: flight.callsign
      },
      point: {
        pixelSize: isSelected ? 17 : 13,
        color: Cesium.Color.fromCssColorString("#ffc640"),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      },
      label: {
        text: "✈",
        font: "900 28px sans-serif",
        fillColor: Cesium.Color.fromCssColorString("#ffc640"),
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -18),
        rotation: Cesium.Math.toRadians(flight.heading - 90),
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    });

    flightEntities.set(flight.callsign, entity);
  });
}

function renderFlights() {
  flightCount.textContent = visibleFlights.length;
  if (!visibleFlights.length) {
    flightRows.innerHTML = `<div class="flight-row"><div></div><div><p class="flight-id">No aircraft found</p><p class="airline">No live aircraft are inside ${currentRadiusMiles} miles.</p></div></div>`;
    return;
  }

  flightRows.innerHTML = visibleFlights.map((flight) => `
    <div class="flight-row ${selectedFlight && selectedFlight.callsign === flight.callsign ? "active" : ""}" data-callsign="${escapeHtml(flight.callsign)}">
      <div class="plane" aria-hidden="true">&#9992;</div>
      <div>
        <p class="flight-id">${escapeHtml(flight.callsign)}</p>
        <p class="airline">${escapeHtml(flight.airline)}</p>
      </div>
      <div class="flight-values">
        <strong>${flight.altitude.toLocaleString()} ft</strong>
        <span>${flight.speed} kts - ${flight.distance.toFixed(1)} mi</span>
      </div>
    </div>
  `).join("");
}

function renderFlightDetail() {
  if (!selectedFlight) {
    flightDetail.innerHTML = `<p class="detail-empty">Select an aircraft to view live flight data.</p>`;
    return;
  }

  flightDetail.innerHTML = `
    <div class="aircraft-photo" id="aircraftPhoto">
      <span>Loading aircraft image...</span>
    </div>
    <div class="detail-heading">
      <div>
        <p class="flight-id">${escapeHtml(selectedFlight.callsign)}</p>
        <p class="airline">${escapeHtml(selectedFlight.airline)}</p>
      </div>
      <strong>${selectedFlight.distance.toFixed(1)} mi</strong>
    </div>
    <dl class="detail-grid">
      <div><dt>Altitude</dt><dd>${selectedFlight.altitude.toLocaleString()} ft</dd></div>
      <div><dt>Speed</dt><dd>${selectedFlight.speed} kts</dd></div>
      <div><dt>Heading</dt><dd>${selectedFlight.heading} deg</dd></div>
      <div><dt>Vertical</dt><dd>${escapeHtml(selectedFlight.vertical)}</dd></div>
      <div><dt>Squawk</dt><dd>${escapeHtml(selectedFlight.squawk)}</dd></div>
      <div><dt>Aircraft</dt><dd>${escapeHtml(selectedFlight.aircraft)}</dd></div>
      <div><dt>Registration</dt><dd>${escapeHtml(selectedFlight.registration || "Unavailable")}</dd></div>
      <div><dt>Type code</dt><dd>${escapeHtml(selectedFlight.icaoType || "Unavailable")}</dd></div>
      <div><dt>Origin country</dt><dd>${escapeHtml(selectedFlight.originCountry)}</dd></div>
      <div><dt>Last position</dt><dd>${formatTimestamp(selectedFlight.timePosition)}</dd></div>
      <div><dt>Last contact</dt><dd>${formatTimestamp(selectedFlight.lastContact)}</dd></div>
      <div><dt>Status</dt><dd>${selectedFlight.onGround ? "On ground" : "Airborne"}</dd></div>
      <div><dt>Position</dt><dd>${formatCoord(selectedFlight.lat, "N", "S")}, ${formatCoord(selectedFlight.lon, "E", "W")}</dd></div>
    </dl>
  `;

  loadSelectedAircraftImage(selectedFlight);
}

async function loadSelectedAircraftImage(flight) {
  const requestId = ++selectedImageRequest;
  const imageSlot = document.getElementById("aircraftPhoto");
  const aircraftQuery = [flight.manufacturer, flight.model, flight.icaoType, flight.aircraft]
    .filter(Boolean)
    .join(" ");
  const companyQuery = [flight.airline, aircraftQuery]
    .filter(Boolean)
    .join(" ");

  if (!imageSlot || !aircraftQuery.trim() || aircraftQuery.includes("ICAO24")) {
    if (imageSlot) {
      imageSlot.innerHTML = "<span>No aircraft image available.</span>";
    }
    return;
  }

  try {
    const params = new URLSearchParams({
      query: companyQuery,
      fallback_query: aircraftQuery,
      ts: String(Date.now())
    });
    const response = await fetch(
      `${SERVER_BASE_URL}/api/aircraft/image?${params}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      throw new Error("No aircraft image found.");
    }

    const image = await response.json();
    if (requestId !== selectedImageRequest) {
      return;
    }

    imageSlot.innerHTML = `
      <img src="${escapeHtml(image.thumbnail_url)}" alt="${escapeHtml(flight.aircraft)}">
      <a href="${escapeHtml(image.source_url)}" target="_blank" rel="noopener">Image: Wikimedia Commons</a>
    `;
  } catch {
    if (requestId === selectedImageRequest && imageSlot) {
      imageSlot.innerHTML = "<span>No aircraft image available.</span>";
    }
  }
}

function updateLocation(nextLocation) {
  currentLocation = nextLocation;
  visibleFlights = getNearbyFlights();
  selectedFlight = visibleFlights[0] || null;
  locationPostcode.textContent = currentLocation.postcode;
  locationPlace.textContent = currentLocation.label;
  locationCoords.textContent = `${formatCoord(currentLocation.lat, "N", "S")}, ${formatCoord(currentLocation.lon, "E", "W")}`;
  activeRadius.textContent = `${currentRadiusMiles} miles`;
  renderFlights();
  renderFlightDetail();
  renderCesiumEntities();
  cameraToLocation();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const key = normalisePostcode(postcodeInput.value);
  const nextLocation = postcodeLocations[key];

  postcodeInput.setCustomValidity("");

  try {
    currentRadiusMiles = getRadiusMiles();
    radiusMilesInput.value = currentRadiusMiles;
    updateApiStatus("Searching", "Looking up postcode and nearby aircraft.");
    await searchPostcodeFlights(postcodeInput.value, currentRadiusMiles);
    updateApiStatus("Live", "Showing aircraft near searched postcode.");
  } catch (error) {
    console.error("Postcode search failed", error);

    if (nextLocation) {
      updateLocation(nextLocation);
      updateApiStatus("Demo Mode", error.message || "Using local postcode demo data.");
      return;
    }

    postcodeInput.setCustomValidity(error.message || "Enter a valid UK postcode.");
    postcodeInput.reportValidity();
    updateApiStatus("Unavailable", "Postcode search failed.");
  }
});

flightRows.addEventListener("click", (event) => {
  const row = event.target.closest(".flight-row");
  if (!row || !row.dataset.callsign) {
    return;
  }
  const flight = visibleFlights.find((item) => item.callsign === row.dataset.callsign);
  if (flight) {
    selectedFlight = flight;
    renderFlights();
    renderFlightDetail();
    renderCesiumEntities();
  }
});

refreshFeed.addEventListener("click", refreshServerState);

function updateClock() {
  clock.textContent = `${new Date().toISOString().slice(11, 19)} UTC`;
}

async function startApp() {
  await initCesium();
  updateLocation(currentLocation);
  updateClock();
  setInterval(updateClock, 1000);
  loadInitialServerState()
    .then(() => updateApiStatus("Live"))
    .catch(() => updateApiStatus("Demo Mode", "Using local mock data."));
  connectServerEvents();
}

startApp();
