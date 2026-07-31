const REGION_LATLNG: Record<string, [number, number]> = {
  "us-central1": [41.26, -95.86],
  "us-east1": [33.2, -79.9],
  "us-east4": [39.0, -77.5],
  "us-west1": [45.6, -121.2],
  "us-west2": [34.05, -118.24],
  "us-south1": [29.4, -95.0],
  "northamerica-northeast1": [45.5, -73.6],
  "southamerica-east1": [-23.5, -46.6],
  "europe-west1": [50.45, 3.82],
  "europe-west2": [51.5, -0.12],
  "europe-west3": [50.1, 8.68],
  "europe-west4": [53.4, 6.8],
  "europe-north1": [60.57, 27.19],
  "asia-south1": [19.08, 72.88],
  "asia-south2": [28.6, 77.2],
  "asia-southeast1": [1.35, 103.82],
  "asia-southeast2": [-6.2, 106.8],
  "asia-east1": [24.05, 120.5],
  "asia-east2": [22.3, 114.2],
  "asia-northeast1": [35.68, 139.69],
  "australia-southeast1": [-33.87, 151.21],
  "me-west1": [32.08, 34.78],
}

export function regionLatLng(region: string): [number, number] {
  return REGION_LATLNG[region] ?? [0, 0]
}

export function latLngToVec3(lat: number, lng: number, radius: number): [number, number, number] {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lng + 180) * Math.PI) / 180
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ]
}
