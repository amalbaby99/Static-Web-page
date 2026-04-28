const form = document.getElementById("postcodeForm");
const postcodeInput = document.getElementById("postcode");
const clock = document.getElementById("clock");
const locationPostcode = document.getElementById("locationPostcode");
const locationPlace = document.getElementById("locationPlace");
const locationCoords = document.getElementById("locationCoords");
const flightCount = document.getElementById("flightCount");
const flightRows = document.getElementById("flightRows");

const postcodeLocations = {
  "SW1A1AA": { postcode: "SW1A 1AA", label: "London, United Kingdom", lat: 51.501, lon: -0.141 },
  "M11AE": { postcode: "M1 1AE", label: "Manchester, United Kingdom", lat: 53.479, lon: -2.245 },
  "B11BB": { postcode: "B1 1BB", label: "Birmingham, United Kingdom", lat: 52.479, lon: -1.902 },
  "EH11YZ": { postcode: "EH1 1YZ", label: "Edinburgh, United Kingdom", lat: 55.953, lon: -3.188 },
  "CF101EP": { postcode: "CF10 1EP", label: "Cardiff, United Kingdom", lat: 51.481, lon: -3.179 }
};

const flights = [
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
    .filter((flight) => flight.distance <= 100)
    .sort((a, b) => a.distance - b.distance);
}

function formatCoord(value, positive, negative) {
  return `${Math.abs(value).toFixed(4)} ${value >= 0 ? positive : negative}`;
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
  const range = 2400000;

  viewer.camera.flyToBoundingSphere(
    new Cesium.BoundingSphere(target, 160934),
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
      semiMajorAxis: 160934,
      semiMinorAxis: 160934,
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
        text: ">",
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
    flightRows.innerHTML = `<div class="flight-row"><div></div><div><p class="flight-id">No aircraft found</p><p class="airline">No mock flights are inside 100 miles.</p></div></div>`;
    return;
  }

  flightRows.innerHTML = visibleFlights.map((flight) => `
    <div class="flight-row ${selectedFlight && selectedFlight.callsign === flight.callsign ? "active" : ""}" data-callsign="${flight.callsign}">
      <div class="plane" aria-hidden="true">&gt;</div>
      <div>
        <p class="flight-id">${flight.callsign}</p>
        <p class="airline">${flight.airline}</p>
      </div>
      <div class="flight-values">
        <strong>${flight.altitude.toLocaleString()} ft</strong>
        <span>${flight.speed} kts - ${flight.distance.toFixed(1)} mi</span>
      </div>
    </div>
  `).join("");
}

function updateLocation(nextLocation) {
  currentLocation = nextLocation;
  visibleFlights = getNearbyFlights();
  selectedFlight = visibleFlights[0] || { ...flights[0], distance: distanceMiles(currentLocation, flights[0]) };
  locationPostcode.textContent = currentLocation.postcode;
  locationPlace.textContent = currentLocation.label;
  locationCoords.textContent = `${formatCoord(currentLocation.lat, "N", "S")}, ${formatCoord(currentLocation.lon, "E", "W")}`;
  renderFlights();
  renderCesiumEntities();
  cameraToLocation();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const key = normalisePostcode(postcodeInput.value);
  const nextLocation = postcodeLocations[key];

  if (!nextLocation) {
    postcodeInput.setCustomValidity("Try SW1A 1AA, M1 1AE, B1 1BB, EH1 1YZ, or CF10 1EP.");
    postcodeInput.reportValidity();
    return;
  }

  postcodeInput.setCustomValidity("");
  updateLocation(nextLocation);
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
    renderCesiumEntities();
  }
});

function updateClock() {
  clock.textContent = `${new Date().toISOString().slice(11, 19)} UTC`;
}

async function startApp() {
  await initCesium();
  updateLocation(currentLocation);
  updateClock();
  setInterval(updateClock, 1000);
}

startApp();
