import Phaser from 'phaser'
import { TG_CONTEXT } from '../main'
import { generateLevel, LevelData } from '../game/levelGenerator'
import { submitScore } from '../api/scoreApi'

const COMET_RADIUS = 10
const WORMHOLE_RADIUS = 30
const MAX_DRAG = 120       // max pixels drag distance
const MAX_SPEED = 14       // max launch speed
const PREDICT_STEPS = 80   // dots in trajectory preview
const PREDICT_DT = 2.5     // simulation step for preview

export class GameScene extends Phaser.Scene {
  private comet!: Phaser.GameObjects.Arc
  private cometTrail: Phaser.GameObjects.Arc[] = []
  private planets: { obj: Phaser.GameObjects.Arc; gravity: number; x: number; y: number; radius: number }[] = []
  private wormhole!: Phaser.GameObjects.Arc
  private wormholeGlow!: Phaser.GameObjects.Arc
  private aimGraphics!: Phaser.GameObjects.Graphics
  private trailGraphics!: Phaser.GameObjects.Graphics

  // Slingshot state
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private isFlying = false
  private vx = 0
  private vy = 0

  private level = 1
  private score = 0
  private sessionStart = Date.now()
  private levelData!: LevelData
  private uiScene?: any
  private shots = 0
  private maxShots = 3

  constructor() { super({ key: 'GameScene' }) }

  create() {
    this.scene.launch('UIScene')
    this.uiScene = this.scene.get('UIScene') as any
    this._loadLevel(this.level)
  }

  private _loadLevel(lvl: number) {
    this.children.removeAll(true)
    this.planets = []
    this.cometTrail = []
    this.isFlying = false
    this.isDragging = false
    this.shots = 0
    this.maxShots = Math.max(1, 4 - Math.floor(lvl / 3))

    this.input.removeAllListeners()

    this.levelData = generateLevel(lvl)
    const { width, height } = this.scale

    // Starfield
    for (let i = 0; i < 100; i++) {
      const x = Phaser.Math.Between(0, width)
      const y = Phaser.Math.Between(0, height)
      const r = Math.random() > 0.85 ? 2 : 1
      const a = 0.3 + Math.random() * 0.7
      this.add.circle(x, y, r, 0xffffff, a)
    }

    // Aim + trail graphics (always on top)
    this.trailGraphics = this.add.graphics()
    this.aimGraphics = this.add.graphics()

    // Planets
    for (const p of this.levelData.planets) {
      const color = p.gravity > 0 ? 0x3377ff : 0xff3333
      // Gravity field ring
      this.add.circle(p.x, p.y, p.radius * 2.5, color, 0.06)
      this.add.circle(p.x, p.y, p.radius * 1.5, color, 0.12)
      const obj = this.add.circle(p.x, p.y, p.radius, color, 0.9)
      // Highlight
      this.add.circle(p.x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.35, 0xffffff, 0.25)
      this.planets.push({ obj, gravity: p.gravity, x: p.x, y: p.y, radius: p.radius })
    }

    // Wormhole
    const wp = this.levelData.wormhole
    this.add.circle(wp.x, wp.y, WORMHOLE_RADIUS * 2, 0x00ffcc, 0.08)
    this.add.circle(wp.x, wp.y, WORMHOLE_RADIUS * 1.4, 0x00ffcc, 0.15)
    this.wormholeGlow = this.add.circle(wp.x, wp.y, WORMHOLE_RADIUS, 0x00ffcc, 0.4)
    this.wormhole = this.add.circle(wp.x, wp.y, WORMHOLE_RADIUS - 10, 0x001a15, 1)
    this.add.circle(wp.x, wp.y, 6, 0x00ffcc, 0.9)

    // Shots indicator
    this.add.text(width / 2, height - 28, `Shots: ${this.maxShots}`, {
      fontSize: '15px', color: '#aaffee'
    }).setOrigin(0.5).setName('shotsText')

    // Comet
    const sp = this.levelData.start
    this.comet = this.add.circle(sp.x, sp.y, COMET_RADIUS, 0xffee00, 1)
    // Glow ring
    this.add.circle(sp.x, sp.y, COMET_RADIUS + 7, 0xffcc00, 0.2).setName('cometGlow')

    // Hint on level 1
    if (lvl === 1) {
      const hint = this.add.text(sp.x, sp.y - 40,
        'Drag back & release!', {
          fontSize: '15px', color: '#ffffff',
          backgroundColor: '#00000088',
          padding: { x: 8, y: 4 }
        }).setOrigin(0.5)
      this.time.delayedCall(3000, () => hint.destroy())
    }

    this._setupInput()
    this.uiScene?.updateScore(this.score, this.level)
  }

  private _setupInput() {
    // Pointerdown: start drag only near comet
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.isFlying) return
      this.isDragging = true
      this.dragStartX = ptr.x
      this.dragStartY = ptr.y
    })

    // Pointermove: show slingshot rubber band + trajectory
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isFlying) return
      this._drawAim(ptr.x, ptr.y)
    })

    // Pointerup: launch!
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isFlying) return
      this.isDragging = false
      this.aimGraphics.clear()

      // Drag vector: from pointer back to comet start = slingshot
      const dx = this.dragStartX - ptr.x
      const dy = this.dragStartY - ptr.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < 8) return  // too small drag = ignore

      const clamped = Math.min(dist, MAX_DRAG)
      const speed = (clamped / MAX_DRAG) * MAX_SPEED
      this.vx = (dx / dist) * speed
      this.vy = (dy / dist) * speed
      this.isFlying = true
      this.shots++
    })
  }

  private _drawAim(ptrX: number, ptrY: number) {
    this.aimGraphics.clear()

    const dx = this.dragStartX - ptrX
    const dy = this.dragStartY - ptrY
    const dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DRAG)
    if (dist < 4) return

    const clamped = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DRAG)
    const speed = (clamped / MAX_DRAG) * MAX_SPEED
    const nx = dx / Math.sqrt(dx * dx + dy * dy)
    const ny = dy / Math.sqrt(dx * dx + dy * dy)
    const vx0 = nx * speed
    const vy0 = ny * speed

    // Rubber band lines (two strings)
    this.aimGraphics.lineStyle(2, 0xffcc00, 0.7)
    this.aimGraphics.beginPath()
    this.aimGraphics.moveTo(ptrX - 6, ptrY - 6)
    this.aimGraphics.lineTo(this.comet.x, this.comet.y)
    this.aimGraphics.lineTo(ptrX + 6, ptrY + 6)
    this.aimGraphics.strokePath()

    // Power indicator circle at drag point
    const power = clamped / MAX_DRAG
    const col = power > 0.7 ? 0xff4444 : power > 0.4 ? 0xffaa00 : 0x44ff88
    this.aimGraphics.fillStyle(col, 0.9)
    this.aimGraphics.fillCircle(ptrX, ptrY, 8)

    // Trajectory prediction dots
    let px = this.comet.x, py = this.comet.y
    let pvx = vx0, pvy = vy0
    for (let i = 0; i < PREDICT_STEPS; i++) {
      // gravity
      for (const planet of this.planets) {
        const ddx = planet.x - px
        const ddy = planet.y - py
        const d2 = ddx * ddx + ddy * ddy + 100
        const force = (planet.gravity * 400) / d2
        pvx += ddx * force * PREDICT_DT
        pvy += ddy * force * PREDICT_DT
      }
      const spd = Math.sqrt(pvx * pvx + pvy * pvy)
      if (spd > MAX_SPEED * 1.5) { pvx = pvx / spd * MAX_SPEED * 1.5; pvy = pvy / spd * MAX_SPEED * 1.5 }
      px += pvx * PREDICT_DT
      py += pvy * PREDICT_DT

      // Fade out dots
      const alpha = 0.7 * (1 - i / PREDICT_STEPS)
      const dotR = i % 3 === 0 ? 3 : 2
      this.aimGraphics.fillStyle(0xffffff, alpha)
      this.aimGraphics.fillCircle(px, py, dotR)

      // Stop prediction if hit wormhole
      const wdx = px - this.wormhole.x, wdy = py - this.wormhole.y
      if (Math.sqrt(wdx * wdx + wdy * wdy) < WORMHOLE_RADIUS) {
        this.aimGraphics.fillStyle(0x00ffcc, 0.9)
        this.aimGraphics.fillCircle(px, py, 8)
        break
      }
    }
  }

  update(_time: number, delta: number) {
    // Wormhole pulse
    if (this.wormholeGlow) {
      const pulse = 0.3 + 0.15 * Math.sin(_time / 400)
      this.wormholeGlow.setAlpha(pulse)
    }

    if (!this.isFlying) return
    const dt = delta / 16.67

    // Gravity
    for (const planet of this.planets) {
      const dx = planet.x - this.comet.x
      const dy = planet.y - this.comet.y
      const d2 = dx * dx + dy * dy + 100
      const force = (planet.gravity * 400) / d2
      this.vx += dx * force * dt
      this.vy += dy * force * dt

      // Crash into planet
      if (Math.sqrt(d2 - 100) < planet.radius + COMET_RADIUS) {
        this._onLevelFail()
        return
      }
    }

    // Speed clamp
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > MAX_SPEED * 1.5) { this.vx = this.vx / speed * MAX_SPEED * 1.5; this.vy = this.vy / speed * MAX_SPEED * 1.5 }

    this.comet.x += this.vx * dt
    this.comet.y += this.vy * dt

    // Comet trail
    this._addTrailDot()

    // Wormhole hit
    const wdx = this.comet.x - this.wormhole.x
    const wdy = this.comet.y - this.wormhole.y
    if (Math.sqrt(wdx * wdx + wdy * wdy) < WORMHOLE_RADIUS + COMET_RADIUS) {
      this._onLevelComplete()
      return
    }

    // Out of bounds
    const { width, height } = this.scale
    if (this.comet.x < -60 || this.comet.x > width + 60 ||
        this.comet.y < -60 || this.comet.y > height + 60) {
      if (this.shots < this.maxShots) {
        // Respawn comet for next shot
        this.isFlying = false
        this.comet.setPosition(this.levelData.start.x, this.levelData.start.y)
        this.trailGraphics.clear()
      } else {
        this._onLevelFail()
      }
    }
  }

  private _addTrailDot() {
    const dot = this.add.circle(this.comet.x, this.comet.y, 3, 0xffcc44, 0.6)
    this.cometTrail.push(dot)
    // Fade old dots
    for (let i = 0; i < this.cometTrail.length; i++) {
      const a = (i / this.cometTrail.length) * 0.6
      this.cometTrail[i].setAlpha(a)
    }
    if (this.cometTrail.length > 30) {
      this.cometTrail.shift()?.destroy()
    }
  }

  private _onLevelComplete() {
    this.isFlying = false
    // Bonus for fewer shots
    const bonus = Math.max(0, (this.maxShots - this.shots + 1)) * 300
    const levelScore = 500 + bonus
    this.score += levelScore
    this.level++
    this.uiScene?.updateScore(this.score, this.level)

    this.cameras.main.flash(400, 0, 255, 180)
    this.cameras.main.shake(200, 0.01)
    this.time.delayedCall(700, () => this._loadLevel(this.level))
  }

  private _onLevelFail() {
    this.isFlying = false
    this.isDragging = false
    this.input.removeAllListeners()
    this._showGameOver()
  }

  private async _showGameOver() {
    const { width, height } = this.scale
    this.add.rectangle(width / 2, height / 2, 340, 240, 0x000011, 0.92)
    this.add.text(width / 2, height / 2 - 80, 'GAME OVER', {
      fontSize: '36px', color: '#ff4444', fontStyle: 'bold'
    }).setOrigin(0.5)
    this.add.text(width / 2, height / 2 - 25, `Score: ${this.score}`, {
      fontSize: '28px', color: '#ffffff'
    }).setOrigin(0.5)
    this.add.text(width / 2, height / 2 + 15, `Level: ${this.level}`, {
      fontSize: '20px', color: '#aaaacc'
    }).setOrigin(0.5)

    await submitScore({
      score: this.score,
      level_reached: this.level,
      session_seconds: Math.floor((Date.now() - this.sessionStart) / 1000),
    })

    const restart = this.add.text(width / 2, height / 2 + 75, '🔄  Play Again', {
      fontSize: '24px', color: '#00ffcc',
      backgroundColor: '#001133',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    restart.on('pointerdown', () => {
      this.score = 0
      this.level = 1
      this.sessionStart = Date.now()
      this._loadLevel(this.level)
    })
    restart.on('pointerover', () => restart.setColor('#ffffff'))
    restart.on('pointerout', () => restart.setColor('#00ffcc'))
  }
}
