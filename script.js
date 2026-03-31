let map = L.map('map').setView([0, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
}).addTo(map);
let iss = L.marker([0, 0]).addTo(map);
let trail = [];
let trailLine = L.polyline(trail, {color: 'red'}).addTo(map);
let userLat = 0;
let userLon = 0;
let issLat = 0;
let issLon = 0;
let hasUserLocation = false;
let hasIssLocation = false;

const arrowEl = document.getElementById("arrow");
const directionEl = document.getElementById("direction");
const enableCompassBtn = document.getElementById("enableCompassBtn");

function setDirectionText(text) {
  if (directionEl) directionEl.innerText = text;
}

function normalizeDeg(deg) {
  return (deg % 360 + 360) % 360;
}

function setUserLocation(lat, lon) {
  userLat = lat;
  userLon = lon;
  hasUserLocation = true;
}

function setIssLocation(lat, lon) {
  issLat = lat;
  issLon = lon;
  hasIssLocation = true;
}

if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setUserLocation(pos.coords.latitude, pos.coords.longitude);
      L.marker([userLat, userLon]).addTo(map);
      map.setView([userLat, userLon], 3);
      setDirectionText("Enable compass to point to the station ;3");
    },
    () => {
      setDirectionText("Location blocked; compass needs your location!!!");
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
} else {
  setDirectionText("Geolocation not supported on this browser!!!");
}
async function moveISS() {
    try {
        let res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
        let data = await res.json();
        
        setIssLocation(data.latitude, data.longitude);
        iss.setLatLng([issLat, issLon]);
        
        trail.push([issLat, issLon]);
        if (trail.length > 100) trail.shift();
        trailLine.setLatLngs(trail);
    } catch(e) {}
    setTimeout(moveISS, 3000);
}

moveISS();

function getBearing(lat1, lon1, lat2, lon2) {
    let dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    let y = Math.sin(dLon) * Math.cos(lat2);
    let x = Math.cos(lat1) * Math.sin(lat2) - 
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    let brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
}

function updateCompassFromHeading(headingDeg) {
  if (!arrowEl || !directionEl) return;
  if (!hasUserLocation) {
    setDirectionText("Tracking your(!!!) location…");
    return;
  }
  if (!hasIssLocation) {
    setDirectionText("Tracking ISS location…");
    return;
  }

  const bearing = getBearing(userLat, userLon, issLat, issLon); 
  const heading = normalizeDeg(headingDeg); 
  const diff = normalizeDeg(bearing - heading); 

  arrowEl.style.transform = `rotate(${diff}deg)`;
  setDirectionText("ISS is this way ;3");
}

function headingFromDeviceOrientationEvent(e) {
  if (typeof e.webkitCompassHeading === "number") return e.webkitCompassHeading;


  if (typeof e.alpha === "number") return e.alpha;

  return null;
}

let compassListening = false;

async function startCompass() {
  if (!window.DeviceOrientationEvent) {
    setDirectionText("Device orientation not supported!!!");
    return;
  }

  if (!window.isSecureContext) {
    setDirectionText("Compass requires HTTPS (secure context) on iOS Safari");
    return;
  }


  if (typeof DeviceOrientationEvent?.requestPermission === "function") {
    try {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== "granted") {
        setDirectionText("Compass permission denied! (enable Motion & Orientation Access in Safari settings)");
        return;
      }
    } catch (_) {
      setDirectionText("You didnt give permission for compass!!!");
      return;
    }
  }


  if (typeof window.DeviceMotionEvent?.requestPermission === "function") {
    try {
      const res = await window.DeviceMotionEvent.requestPermission();
      if (res !== "granted") {
        setDirectionText("Motion permission denied! (enable Motion & Orientation Access in Safari settings)");
        return;
      }
    } catch (_) {
      setDirectionText("You didnt give permission for motion!!!");
      return;
    }
  }

  if (compassListening) return;
  compassListening = true;

  setDirectionText("Move your phone!!!");

  window.addEventListener(
    "deviceorientation",
    (e) => {
      const heading = headingFromDeviceOrientationEvent(e);
      if (heading === null) return;
      updateCompassFromHeading(heading);
    },
    true
  );
}

if (enableCompassBtn) {
  enableCompassBtn.addEventListener("click", startCompass);
} else {

  startCompass();
}