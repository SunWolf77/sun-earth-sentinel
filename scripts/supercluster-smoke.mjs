/**
 * Smoke: Supercluster prototype vs greedy km on live USGS 4.5_week.
 * Run: node scripts/supercluster-smoke.mjs
 */
import Supercluster from "supercluster";

const FEED =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson";

function cameraRadiusToClusterZoom(cameraRadius) {
  const r = Math.max(1.2, Math.min(6, cameraRadius));
  return Math.max(0, Math.min(16, Math.round(18 - r * 4.2)));
}

function fairSample(points, maxTotal, cellDeg = 15, perCell = 8) {
  if (points.length <= maxTotal) return points;
  const cells = new Map();
  for (const p of points) {
    const gx = Math.floor((p.lon + 180) / cellDeg);
    const gy = Math.floor((p.lat + 90) / cellDeg);
    const k = `${gx}:${gy}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(p);
  }
  const picked = [];
  for (const arr of cells.values()) {
    arr.sort((a, b) => b.mag - a.mag || b.time - a.time);
    picked.push(...arr.slice(0, perCell));
  }
  picked.sort((a, b) => b.mag - a.mag);
  return picked.slice(0, maxTotal);
}

function americasCount(list) {
  return list.filter((p) => p.lat > -60 && p.lat < 75 && p.lon > -130 && p.lon < -30)
    .length;
}

const j = await fetch(FEED).then((r) => r.json());
const all = j.features
  .map((f) => {
    const [lon, lat] = f.geometry.coordinates;
    return {
      lat,
      lon,
      mag: f.properties.mag ?? 0,
      time: f.properties.time ?? 0,
      id: f.id,
    };
  })
  .filter((p) => p.mag >= 3.5);

const newestCap = [...all].sort((a, b) => b.time - a.time).slice(0, 320);
const fair = fairSample(all, 320);

console.log("--- sample strategies (cap 320, M≥3.5, 2.5_month) ---");
console.log({
  total: all.length,
  newestCap_americas: americasCount(newestCap),
  fairSample_americas: americasCount(fair),
  newestCap_n: newestCap.length,
  fair_n: fair.length,
});

function runSc(points, camR) {
  const index = new Supercluster({
    radius: 52,
    maxZoom: 16,
    minPoints: 2,
    map: (props) => ({ maxMag: props.mag, mag: props.mag }),
    reduce: (acc, props) => {
      acc.maxMag = Math.max(acc.maxMag, props.maxMag);
    },
  });
  index.load(
    points.map((p, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lon, p.lat] },
      properties: { mag: p.mag, maxMag: p.mag, index: i },
    })),
  );
  const z = cameraRadiusToClusterZoom(camR);
  const clusters = index.getClusters([-180, -85, 180, 85], z);
  const nCl = clusters.filter((c) => c.properties.cluster).length;
  const nSi = clusters.length - nCl;
  const americas = clusters.filter((c) => {
    const [lon, lat] = c.geometry.coordinates;
    return lat > -60 && lat < 75 && lon > -130 && lon < -30;
  }).length;
  return { camR, z, drawables: clusters.length, nCl, nSi, americas };
}

console.log("--- Supercluster home vs close (fair sample) ---");
console.log(runSc(fair, 2.85));
console.log(runSc(fair, 1.6));
console.log(runSc(fair, 4.5));

console.log("--- Supercluster newest-only sample (old bias) ---");
console.log(runSc(newestCap, 2.85));

console.log("ok");
