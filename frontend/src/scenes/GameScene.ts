import Phaser from 'phaser'
import { TG_CONTEXT } from '../main'
import { generateLevel, LevelData } from '../game/levelGenerator'
import { submitScore } from '../api/scoreApi'

const COMET_RADIUS = 10
const WORMHOLE_RADIUS = 28

export class GameScene extends Phaser.Scene {
  private comet!: Phaser.GameObjects.Arc
  private planets: { obj: Phaser.GameObjects.Arc; gravity: number; x: number; y: number }[] = []
  private wormhole!: Phaser.GameObjects.Arc
  private aimLine?: Phaser.GameObjects.Graphics
  private isFlying = false
  private vx = 0
  private vy = 0
  private level = 1
  private score = 0
  private sessionStart = Date.now()
  private levelData!: LevelData
  private uiScene?: any

  constructor() { super({ key: 'GameScene' }) }

  create() {
    this.scene.launch('UIScene')
    this.uiScene = this.scene.get('UIScene') as any
    this._loadLevel(this.level)
    this._setupInput()
  }

  private _loadLevel(lvl: number) {
    this.children.removeAll(true)
    this.planets = []
    this.isFlying = false

    this.levelData = generateLevel(lvl)
    const { width, height } = this.scale

    // Starfield background
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, width)
      const y = Phaser.Math.Between(0, height)
      const r = Math.random() > 0.8 ? 2 : 1
      this.add.circle(x, y, r, 0xffffff, 0.4 + Math.random() * 0.6)
    }

    // Planets
    for (const p of this.levelData.planets) {
      const color = p.gravity > 0 ? 0x4488ff : 0xff4444
      const obj = this.add.circle(p.x, p.y, p.radius, color, 0.85)
      this.add.circle(p.x, p.y, p.radius + 4, color, 0.15) // glow
      this.planets.push({ obj, gravity: p.gravity, x: p.x, y: p.y })
    }

    // Wormhole
    const wp = this.levelData.wormhole
    this.wormhole = this.add.circle(wp.x, wp.y, WORMHOLE_RADIUS, 0x00ffcc, 0.3)
    this.add.circle(wp.x, wp.y, WORMHOLE_RADIUS - 8, 0x00ffcc, 0.6)
    this.add.text(wp.x, wp.y, '⬤', {
      fontSize: '14px', color: '#00ffcc'
    }).setOrigin(0.5).setAlpha(0.9)

    // Comet
    const sp = this.levelData.start
    this.comet = this.add.circle(sp.x, sp.y, COMET_RADIUS, 0xffee00)
    this.add.circle(sp.x, sp.y, COMET_RADIUS + 6, 0xffee00, 0.2)

    this.aimLine = this.add.graphics()
  }

  private _setupInput() {
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.isFlying) return
      const dx = ptr.x - this.comet.x
      const dy = ptr.y - this.comet.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const speed = Math.min(dist * 0.04, 8)
      this.vx = (dx / dist) * speed
      this.vy = (dy / dist) * speed
      this.isFlying = true
      this.aimLine?.clear()
    })

    // Drag aim preview
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.isFlying || !ptr.isDown) return
      this.aimLine?.clear()
      this.aimLine?.lineStyle(2, 0xffffff, 0.4)
      this.aimLine?.beginPath()
      this.aimLine?.moveTo(this.comet.x, this.comet.y)
      this.aimLine?.lineTo(ptr.x, ptr.y)
      this.aimLine?.strokePath()
    })
  }

  update(_time: number, delta: number) {
    if (!this.isFlying) return
    const dt = delta / 16.67

    // Apply planet gravity
    for (const planet of this.planets) {
      const dx = planet.x - this.comet.x
      const dy = planet.y - this.comet.y
      const d2 = dx * dx + dy * dy + 100
      const force = (planet.gravity * 400) / d2
      this.vx += dx * force * dt
      this.vy += dy * force * dt
    }

    // Clamp max speed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > 12) { this.vx = (this.vx / speed) * 12; this.vy = (this.vy / speed) * 12 }

    this.comet.x += this.vx * dt
    this.comet.y += this.vy * dt

    // Check wormhole collision
    const wx = this.wormhole.x, wy = this.wormhole.y
    const dcx = this.comet.x - wx, dcy = this.comet.y - wy
    if (Math.sqrt(dcx * dcx + dcy * dcy) < WORMHOLE_RADIUS + COMET_RADIUS) {
      this._onLevelComplete()
      return
    }

    // Check out of bounds
    const { width, height } = this.scale
    if (this.comet.x < -50 || this.comet.x > width + 50 ||
        this.comet.y < -50 || this.comet.y > height + 50) {
      this._onLevelFail()
    }
  }

  private _onLevelComplete() {
    this.isFlying = false
    const levelScore = Math.max(0, 1000 - this.level * 50 + 200)
    this.score += levelScore
    this.level++
    this.uiScene?.updateScore(this.score, this.level)

    this.cameras.main.flash(300, 0, 255, 200)
    this.time.delayedCall(600, () => this._loadLevel(this.level))
  }

  private _onLevelFail() {
    this.isFlying = false
    this._showGameOver()
  }

  private async _showGameOver() {
    const { width, height } = this.scale
    this.add.rectangle(width / 2, height / 2, 320, 200, 0x000000, 0.8)
    this.add.text(width / 2, height / 2 - 60, 'GAME OVER', {
      fontSize: '32px', color: '#ff4444', fontStyle: 'bold'
    }).setOrigin(0.5)
    this.add.text(width / 2, height / 2 - 10, `Score: ${this.score}`, {
      fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5)
    this.add.text(width / 2, height / 2 + 25, `Level reached: ${this.level}`, {
      fontSize: '18px', color: '#aaaacc'
    }).setOrigin(0.5)

    // Submit score
    await submitScore({
      score: this.score,
      level_reached: this.level,
      session_seconds: Math.floor((Date.now() - this.sessionStart) / 1000),
    })

    const restart = this.add.text(width / 2, height / 2 + 70, '🔄 Restart', {
      fontSize: '22px', color: '#00ffcc',
      backgroundColor: '#001133',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })
    restart.on('pointerdown', () => {
      this.score = 0
      this.level = 1
      this.sessionStart = Date.now()
      this._loadLevel(this.level)
    })
  }
}
