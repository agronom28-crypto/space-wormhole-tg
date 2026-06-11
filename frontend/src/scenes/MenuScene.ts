import Phaser from 'phaser'
import { TG_CONTEXT } from '../main'

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }) }

  create() {
    const { width, height } = this.scale
    this.add.text(width / 2, height / 2 - 80, '🌌 WORMHOLE', {
      fontSize: '42px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5)

    const name = TG_CONTEXT.uname !== 'Player' ? TG_CONTEXT.uname : ''
    if (name) {
      this.add.text(width / 2, height / 2 - 20, `Hello, ${name}!`, {
        fontSize: '20px', color: '#aaaaff'
      }).setOrigin(0.5)
    }

    const btn = this.add.text(width / 2, height / 2 + 60, '▶  PLAY', {
      fontSize: '32px', color: '#00ffcc',
      backgroundColor: '#001133',
      padding: { x: 24, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    btn.on('pointerdown', () => this.scene.start('GameScene'))
    btn.on('pointerover', () => btn.setColor('#ffffff'))
    btn.on('pointerout', () => btn.setColor('#00ffcc'))

    this.add.text(width / 2, height - 40,
      'Guide the comet through the wormhole!',
      { fontSize: '14px', color: '#666688' }).setOrigin(0.5)
  }
}
