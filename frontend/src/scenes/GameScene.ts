import Phaser from 'phaser'
import { TG_CONTEXT } from '../main'
import { generateLevel, LevelData } from '../game/levelGenerator'
import { submitScore } from '../api/scoreApi'

const COMET_RADIUS = 10
const WORMHOLE_RADIUS = 30
const MAX_DRAG = 160      // bigger drag zone = easier to aim
const MAX_SPEED = 12
const PREDICT_STEPS = 90
const PREDICT_DT = 2.2

export class GameScene extends Phaser.Scene {
  private comet!: Phaser.GameObjects.Arc
  private cometTrail: Phaser.GameObjects.Arc[] = []
  private planets: { gravity: number; x: number; y: number; radius: number }[] = []
  private wormhole!: Phaser.GameObjects.Arc
  private wormholeGlow!: Phaser.GameObjects.Arc
  private aimGraphics!: Phaser.GameObjects.Graphics
  private scoreText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text

  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private isFlying = false
  private vx = 0
  private vy = 0

  private level = 1
  private score = 0
  private sessionStart = 0
  private levelData!: LevelData
  private shots = 0
  private maxShots = 3
  private gameOverShown = false

  constructor() { super({ key: 'GameScene' }) }

  create() {
    this.level = 1
    this.score = 0
    this.sessionStart = Date.now()
    this.gameOverShown = false
    this._loadLevel(this.level)
  }

  private _loadLevel(lvl: number) {
    this.children.removeAll(true)
    this.planets = []
    this.cometTrail = []
    this.isFlying = false
    this.isDragging = false
    this.gameOverShown = false
    this.shots = 0
    this.maxShots = Math.max(1, 4 - Math.floor(lvl / 3))
    this.input.removeAllListeners()

    this.levelData = generateLevel(lvl)
    const { width, height } = this.scale

    // Starfield
    for (let i = 0; i < 100; i++) {
      this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Math.random() > 0.85 ? 2 : 1,
        0xffffff, 0.3 + Math.random() * 0.7
      )
    }

    this.aimGraphics = this.add.graphics()

    // Planets
    for (const p of this.levelData.planets) {
      const color = p.gravity > 0 ? 0x3377ff : 0xff3333
      this.add.circle(p.x, p.y, p.radius * 2.5, color, 0.05)
      this.add.circle(p.x, p.y, p.radius * 1.5, color, 0.10)
      this.add.circle(p.x, p.y, p.radius, color, 0.9)
      this.add.circle(p.x - p.radius * 0.3, p.y - p.radius * 0.3, p.radius * 0.35, 0xffffff, 0.25)
      this.planets.push({ gravity: p.gravity, x: p.x, y: p.y, radius: p.radius })
    }

    // Wormhole
    const wp = this.levelData.wormhole
    this.add.circle(wp.x, wp.y, WORMHOLE_RADIUS * 2.2, 0x00ffcc, 0.07)
    this.add.circle(wp.x, wp.y, WORMHOLE_RADIUS * 1.5, 0x00ffcc, 0.14)
    this.wormholeGlow = this.add.circle(wp.x, wp.y, WORMHOLE_RADIUS, 0x00ffcc, 0.4)
    this.wormhole = this.add.circle(wp.x, wp.y, WORMHOLE_RADIUS - 10, 0x001a15, 1)
    this.add.circle(wp.x, wp.y, 6, 0x00ffcc, 1)

    // Comet
    const sp = this.levelData.start
    this.comet = this.add.circle(sp.x, sp.y, COMET_RADIUS, 0xffee00, 1)
    this.add.circle(sp.x, sp.y, COMET_RADIUS + 7, 0xffcc00, 0.2)

    // HUD
    this.scoreText = this.add.text(16, 16, `SCORE: ${this.score}`, {
      fontSize: '18px', color: '#ffffff'
    }).setDepth(10)
    this.levelText = this.add.text(16, 42, `LEVEL: ${lvl}  SHOTS: ${this.maxShots}`, {
      fontSize: '15px', color: '#aaccee'
    }).setDepth(10)

    // Hint
    if (lvl === 1) {
      const hint = this.add.text(sp.x, sp.y - 44,
        'Drag toward target & release',
        { fontSize: '15px', color: '#fff', backgroundColor: '#00000099', padding: { x: 8, y: 4 } }
      ).setOrigin(0.5).setDepth(10)
      this.time.delayedCall(4000, () => hint?.destroy())
    }

    this._setupInput()
  }

  private _setupInput() {
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.isFlying || this.gameOverShown) return
      this.isDragging = true
      this.dragStartX = ptr.x
      this.dragStartY = ptr.y
    })

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isFlying) return
      this._drawAim(ptr.x, ptr.y)
    })

    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.isFlying || this.gameOverShown) return
      this.isDragging = false
      this.aimGraphics.clear()

      // JOYSTICK: drag toward target = fly that direction
      const dx = ptr.x - this.dragStartX
      const dy = ptr.y - this.dragStartY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 8) return

      const clamped = Math.min(dist, MAX_DRAG)
      const speed = (clamped / MAX_DRAG) * MAX_SPEED
      this.vx = (dx / dist) * speed
      this.vy = (dy / dist) * speed
      this.isFlying = true
      this.shots++
      this.levelText.setText(`LEVEL: ${this.level}  SHOTS: ${this.maxShots - this.shots}`)
    })
  }

  private _drawAim(ptrX: number, ptrY: number) {
    this.aimGraphics.clear()

    // Direction: FROM dragStart TO pointer = launch direction
    const dx = ptrX - this.dragStartX
    const dy = ptrY - this.dragStartY
    const rawDist = Math.sqrt(dx * dx + dy * dy)
    if (rawDist < 4) return

    const clamped = Math.min(rawDist, MAX_DRAG)
    const speed = (clamped / MAX_DRAG) * MAX_SPEED
    const nx = dx / rawDist, ny = dy / rawDist
    let pvx = nx * speed, pvy = ny * speed
    let px = this.comet.x, py = this.comet.y

    // Arrow line from comet in launch direction
    const power = clamped / MAX_DRAG
    const col = power > 0.7 ? 0xff4444 : power > 0.4 ? 0xffaa00 : 0x44ff88

    this.aimGraphics.lineStyle(3, col, 0.8)
    this.aimGraphics.beginPath()
    this.aimGraphics.moveTo(this.comet.x, this.comet.y)
    this.aimGraphics.lineTo(
      this.comet.x + nx * clamped * 0.5,
      this.comet.y + ny * clamped * 0.5
    )
    this.aimGraphics.strokePath()

    // Power dot at pointer
    this.aimGraphics.fillStyle(col, 0.9)
    this.aimGraphics.fillCircle(ptrX, ptrY, 10)

    // Power ring around comet
    this.aimGraphics.lineStyle(2, col, 0.5)
    this.aimGraphics.strokeCircle(this.comet.x, this.comet.y, 16 + power * 12)

    // Trajectory dots
    for (let i = 0; i < PREDICT_STEPS; i++) {
      for (const planet of this.planets) {
        const ddx = planet.x - px, ddy = planet.y - py
        const d2 = ddx * ddx + ddy * ddy + 100
        pvx += ddx * (planet.gravity * 400 / d2) * PREDICT_DT
        pvy += ddy * (planet.gravity * 400 / d2) * PREDICT_DT
      }
      const spd = Math.sqrt(pvx * pvx + pvy * pvy)
      if (spd > MAX_SPEED * 1.5) { pvx = pvx / spd * MAX_SPEED * 1.5; pvy = pvy / spd * MAX_SPEED * 1.5 }
      px += pvx * PREDICT_DT
      py += pvy * PREDICT_DT

      this.aimGraphics.fillStyle(0xffffff, 0.65 * (1 - i / PREDICT_STEPS))
      this.aimGraphics.fillCircle(px, py, i % 3 === 0 ? 3 : 1.5)

      const wdx = px - this.wormhole.x, wdy = py - this.wormhole.y
      if (Math.sqrt(wdx * wdx + wdy * wdy) < WORMHOLE_RADIUS) {
        this.aimGraphics.fillStyle(0x00ffcc, 1)
        this.aimGraphics.fillCircle(px, py, 12)
        break
      }
    }
  }

  update(time: number, delta: number) {
    if (this.wormholeGlow) {
      this.wormholeGlow.setAlpha(0.3 + 0.15 * Math.sin(time / 400))
    }
    if (!this.isFlying) return

    const dt = delta / 16.67

    for (const planet of this.planets) {
      const dx = planet.x - this.comet.x
      const dy = planet.y - this.comet.y
      const d2 = dx * dx + dy * dy
      this.vx += dx * (planet.gravity * 400 / (d2 + 100)) * dt
      this.vy += dy * (planet.gravity * 400 / (d2 + 100)) * dt
      if (Math.sqrt(d2) < planet.radius + COMET_RADIUS) {
        this._onFail(); return
      }
    }

    const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (spd > MAX_SPEED * 1.5) { this.vx = this.vx / spd * MAX_SPEED * 1.5; this.vy = this.vy / spd * MAX_SPEED * 1.5 }

    this.comet.x += this.vx * dt
    this.comet.y += this.vy * dt
    this._addTrail()

    const wdx = this.comet.x - this.wormhole.x
    const wdy = this.comet.y - this.wormhole.y
    if (Math.sqrt(wdx * wdx + wdy * wdy) < WORMHOLE_RADIUS + COMET_RADIUS) {
      this._onWin(); return
    }

    const { width, height } = this.scale
    if (this.comet.x < -60 || this.comet.x > width + 60 ||
        this.comet.y < -60 || this.comet.y > height + 60) {
      if (this.shots < this.maxShots) {
        this.isFlying = false
        this.comet.setPosition(this.levelData.start.x, this.levelData.start.y)
        this.cometTrail.forEach(d => d.destroy())
        this.cometTrail = []
      } else {
        this._onFail()
      }
    }
  }

  private _addTrail() {
    const dot = this.add.circle(this.comet.x, this.comet.y, 3, 0xffcc44, 0.6)
    this.cometTrail.push(dot)
    for (let i = 0; i < this.cometTrail.length; i++) {
      this.cometTrail[i].setAlpha((i / this.cometTrail.length) * 0.55)
    }
    if (this.cometTrail.length > 30) this.cometTrail.shift()?.destroy()
  }

  private _onWin() {
    this.isFlying = false
    const bonus = Math.max(0, this.maxShots - this.shots + 1) * 300
    this.score += 500 + bonus
    this.scoreText?.setText(`SCORE: ${this.score}`)
    this.cameras.main.flash(400, 0, 255, 180)
    this.cameras.main.shake(200, 0.01)
    this.time.delayedCall(700, () => this._loadLevel(++this.level))
  }

  private _onFail() {
    if (this.gameOverShown) return
    this.gameOverShown = true
    this.isFlying = false
    this.isDragging = false
    this.input.removeAllListeners()
    this._showGameOver()
  }

  private async _showGameOver() {
    const { width, height } = this.scale
    this.add.rectangle(width / 2, height / 2, 340, 260, 0x000011, 0.93).setDepth(20)
    this.add.text(width / 2, height / 2 - 90, 'GAME OVER', {
      fontSize: '36px', color: '#ff4444', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(21)
    this.add.text(width / 2, height / 2 - 35, `Score: ${this.score}`, {
      fontSize: '30px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(21)
    this.add.text(width / 2, height / 2 + 12, `Level: ${this.level}`, {
      fontSize: '20px', color: '#aaaacc'
    }).setOrigin(0.5).setDepth(21)

    await submitScore({
      score: this.score,
      level_reached: this.level,
      session_seconds: Math.floor((Date.now() - this.sessionStart) / 1000),
    })

    const restart = this.add.text(width / 2, height / 2 + 72, '🔄  Play Again', {
      fontSize: '24px', color: '#00ffcc',
      backgroundColor: '#001133',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(21)

    const menu = this.add.text(width / 2, height / 2 + 118, '← Menu', {
      fontSize: '18px', color: '#667788'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(21)

    restart.on('pointerover', () => restart.setColor('#ffffff'))
    restart.on('pointerout', () => restart.setColor('#00ffcc'))
    restart.on('pointerdown', () => this.scene.restart())
    menu.on('pointerdown', () => this.scene.start('MenuScene'))
  }
}
