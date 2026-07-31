interface Landmass {
  lon: number
  lat: number
  rlon: number
  rlat: number
}

const LAND: Landmass[] = [
  { lon: -100, lat: 45, rlon: 32, rlat: 22 }, // North America
  { lon: -85, lat: 62, rlon: 30, rlat: 12 }, // Canada north
  { lon: -42, lat: 72, rlon: 13, rlat: 9 }, // Greenland
  { lon: -60, lat: -18, rlon: 15, rlat: 24 }, // South America
  { lon: 16, lat: 50, rlon: 22, rlat: 12 }, // Europe
  { lon: 20, lat: 2, rlon: 22, rlat: 32 }, // Africa
  { lon: 90, lat: 50, rlon: 55, rlat: 25 }, // Asia
  { lon: 78, lat: 22, rlon: 13, rlat: 16 }, // India
  { lon: 115, lat: 0, rlon: 20, rlat: 11 }, // SE Asia
  { lon: 134, lat: -25, rlon: 19, rlat: 12 }, // Australia
]

const wrap180 = (deg: number) => (((deg + 180) % 360) + 360) % 360 - 180

export function isLand(lat: number, lon: number): boolean {
  const L = wrap180(lon)
  for (const m of LAND) {
    const a = wrap180(L - m.lon) / m.rlon
    const b = (lat - m.lat) / m.rlat
    if (a * a + b * b <= 1) return true
  }
  return false
}
