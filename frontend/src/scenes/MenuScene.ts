import Phaser from 'phaser'
import { TG_CONTEXT } from '../main'

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }) }

  create() {
    const { width, height } = this.scale

    for (let i = 0; i < 80; i++) {
      this.add.circle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Math.random() > 0.8 ? 2 : 1,
        0xffffff,
        0.3 + Math.random() * 0.7
      )
    }

    this.add.text(width / 2, height / 2 - 100, '🌌 WORMHOLE', {
      fontSize: '44px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(width / 2, height / 2 - 48, 'Space gravity puzzle', {
      fontSize: '18px', color: '#6688aa'
    }).setOrigin(0.5)

    const name = TG_CONTEXT.uname !== 'Player' ? TG_CONTEXT.uname : ''
    if (name) {
      this.add.text(width / 2, height / 2 - 8, `👾 ${name}`, {
        fontSize: '20px', color: '#aaaaff'
      }).setOrigin(0.5)
    }

    const btn = this.add.text(width / 2, height / 2 + 65, '▶  PLAY', {
      fontSize: '32px', color: '#00ffcc',
      backgroundColor: '#001133',
      padding: { x: 28, y: 14 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    btn.on('pointerdown', () => {
      this.scene.start('GameScene')
    })
    btn.on('pointerover', () => btn.setColor('#ffffff'))
    btn.on('pointerout', () => btn.setColor('#00ffcc'))

    this.add.text(width / 2, height - 40,
      'Drag back & release to launch the comet',
      { fontSize: '14px', color: '#445566' }).setOrigin(0.5)
  }
}
