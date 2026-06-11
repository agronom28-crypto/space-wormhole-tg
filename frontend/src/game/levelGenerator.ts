export interface PlanetDef {
  x: number
  y: number
  radius: number
  gravity: number  // positive = attract, negative = repel
}

export interface LevelData {
  start: { x: number; y: number }
  wormhole: { x: number; y: number }
  planets: PlanetDef[]
}

/** Seeded pseudo-random (mulberry32) */
function makeRng(seed: number) {
  return () => {
    seed += 0x6d2b79f5
    let t = seed
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function generateLevel(level: number): LevelData {
  const GLOBAL_SEED = 0xDEAD_BEEF
  const rng = makeRng(GLOBAL_SEED + level * 1337)

  const W = 480, H = 800
  const margin = 80

  // Start bottom-left zone, wormhole top-right zone (or random quadrant)
  const quadrant = Math.floor(rng() * 4)
  const positions = [
    { start: { x: margin, y: H - margin }, wormhole: { x: W - margin, y: margin } },
    { start: { x: W - margin, y: H - margin }, wormhole: { x: margin, y: margin } },
    { start: { x: margin, y: H / 2 }, wormhole: { x: W - margin, y: H / 2 } },
    { start: { x: W / 2, y: H - margin }, wormhole: { x: W / 2, y: margin } },
  ]
  const layout = positions[quadrant]

  const numPlanets = Math.min(2 + Math.floor(level / 2), 8)
  const planets: PlanetDef[] = []

  for (let i = 0; i < numPlanets; i++) {
    let x: number, y: number
    let tries = 0
    do {
      x = margin + rng() * (W - margin * 2)
      y = margin + rng() * (H - margin * 2)
      tries++
    } while (tries < 20 && (
      dist(x, y, layout.start.x, layout.start.y) < 100 ||
      dist(x, y, layout.wormhole.x, layout.wormhole.y) < 100
    ))

    const radius = 18 + rng() * 22  // 18..40
    const gravitySign = level < 3 ? 1 : (rng() > 0.25 ? 1 : -1)
    const gravityMag = (0.3 + rng() * 0.7) * (1 + level * 0.05)
    planets.push({ x, y, radius, gravity: gravitySign * gravityMag })
  }

  return { ...layout, planets }
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}
