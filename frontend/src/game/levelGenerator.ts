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
  const rng = makeRng(0xDEAD_BEEF + level * 1337)

  const W = 480, H = 800
  const margin = 70

  const layouts = [
    { start: { x: 70,      y: H - 70  }, wormhole: { x: W - 70, y: 70      } },
    { start: { x: W - 70, y: H - 70  }, wormhole: { x: 70,      y: 70      } },
    { start: { x: 70,      y: H - 70  }, wormhole: { x: W - 70, y: H / 2   } },
    { start: { x: W / 2,  y: H - 70  }, wormhole: { x: W / 2,  y: 70      } },
    { start: { x: 70,      y: H / 2   }, wormhole: { x: W - 70, y: 70      } },
  ]
  const layout = layouts[Math.floor(rng() * layouts.length)]

  const safeStart    = level <= 2 ? 200 : level <= 5 ? 160 : 120
  const safeWormhole = level <= 2 ? 130 : level <= 5 ? 110 : 90
  const numPlanets   = level === 1 ? 1 : Math.min(1 + Math.floor((level - 1) / 2), 6)
  const minRadius    = level <= 2 ? 14 : level <= 5 ? 16 : 18
  const maxRadius    = level <= 2 ? 20 : level <= 5 ? 26 : 32

  // GRAVITY: very weak, just enough to bend trajectory slightly
  // level 1-2: 0.04-0.08,  level 3-5: 0.06-0.14,  level 6+: 0.10-0.22
  const gravBase  = level <= 2 ? 0.04 : level <= 5 ? 0.06 : 0.10
  const gravRange = level <= 2 ? 0.04 : level <= 5 ? 0.08 : 0.12

  const planets: PlanetDef[] = []

  for (let i = 0; i < numPlanets; i++) {
    let x = 0, y = 0
    let placed = false
    for (let tries = 0; tries < 60; tries++) {
      x = margin + rng() * (W - margin * 2)
      y = margin + rng() * (H - margin * 2)
      if (
        dist(x, y, layout.start.x,    layout.start.y)    > safeStart &&
        dist(x, y, layout.wormhole.x, layout.wormhole.y) > safeWormhole &&
        planets.every(p => dist(x, y, p.x, p.y) > 100)
      ) { placed = true; break }
    }
    if (!placed) continue

    const radius = minRadius + rng() * (maxRadius - minRadius)
    const canRepel = level >= 6
    const sign = canRepel && rng() > 0.75 ? -1 : 1
    const mag  = gravBase + rng() * gravRange
    planets.push({ x, y, radius, gravity: sign * mag })
  }

  return { ...layout, planets }
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}
