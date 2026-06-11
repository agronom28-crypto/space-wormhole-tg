export interface PlanetDef {
  x: number
  y: number
  radius: number
  gravity: number
}

export interface LevelData {
  start: { x: number; y: number }
  wormhole: { x: number; y: number }
  planets: PlanetDef[]
}

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
  const margin = 70

  // Fixed layouts — start and wormhole always in opposite corners
  const layouts = [
    { start: { x: 70,       y: H - 70  }, wormhole: { x: W - 70,  y: 70       } },
    { start: { x: W - 70,  y: H - 70  }, wormhole: { x: 70,       y: 70       } },
    { start: { x: 70,       y: H - 70  }, wormhole: { x: W - 70,  y: H / 2    } },
    { start: { x: W / 2,   y: H - 70  }, wormhole: { x: W / 2,   y: 70       } },
    { start: { x: 70,       y: H / 2   }, wormhole: { x: W - 70,  y: 70       } },
  ]
  const layout = layouts[Math.floor(rng() * layouts.length)]

  // Safe zone: planets must be this far from start AND wormhole
  // Early levels = bigger safe zone so player can aim freely
  const safeStart    = level <= 2 ? 180 : level <= 5 ? 140 : 110
  const safeWormhole = level <= 2 ? 120 : level <= 5 ? 100 : 80

  // Planet count: start with 1, ramp up slowly
  const numPlanets = level === 1 ? 1 : Math.min(1 + Math.floor((level - 1) / 2), 7)

  // Planet size: small on early levels
  const minRadius = level <= 2 ? 14 : level <= 5 ? 16 : 18
  const maxRadius = level <= 2 ? 22 : level <= 5 ? 28 : 36

  // Gravity strength: gentle early
  const gravBase = level <= 2 ? 0.25 : level <= 5 ? 0.35 : 0.45
  const gravRange = level <= 2 ? 0.2  : level <= 5 ? 0.35 : 0.55

  const planets: PlanetDef[] = []

  for (let i = 0; i < numPlanets; i++) {
    let x = 0, y = 0
    let placed = false

    for (let tries = 0; tries < 60; tries++) {
      x = margin + rng() * (W - margin * 2)
      y = margin + rng() * (H - margin * 2)

      const farFromStart    = dist(x, y, layout.start.x,    layout.start.y)    > safeStart
      const farFromWormhole = dist(x, y, layout.wormhole.x, layout.wormhole.y) > safeWormhole
      const farFromOthers   = planets.every(p => dist(x, y, p.x, p.y) > 90)

      if (farFromStart && farFromWormhole && farFromOthers) {
        placed = true
        break
      }
    }

    if (!placed) continue  // skip if can't place safely

    const radius = minRadius + rng() * (maxRadius - minRadius)

    // No repelling planets on level 1-2, rare on 3-4
    const canRepel = level >= 5
    const gravitySign = canRepel && rng() > 0.75 ? -1 : 1
    const gravityMag = (gravBase + rng() * gravRange) * (1 + level * 0.03)

    planets.push({ x, y, radius, gravity: gravitySign * gravityMag })
  }

  return { ...layout, planets }
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}
