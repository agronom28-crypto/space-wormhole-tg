import Phaser from 'phaser'
import { TG_CONTEXT } from '../main'

export class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }) }

  create() {
    // Stop UIScene if it's running from a previous game
    if (this.scene.isActive('UIScene')) this.scene.stop('UIScene')
    if (this.scene.isActive('GameScene')) this.scene.stop('GameScene')

    const { width, height } = this.scale

    // Starfield
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, width)
      const y = Phaser.Math.Between(0, height)
      this.add.circle(x, y, Math.random() > 0.8 ? 2 : 1, 0xffffff, 0.3 + Math.random() * 0.7)
    }

    this.add.text(width / 2, height / 2 - 100, '🌌 WORMHOLE', {
      fontSize: '44px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5)

    this.add.text(width / 2, height / 2 - 45, 'Space gravity puzzle', {
      fontSize: '18px', color: '#6688aa'
    }).setOrigin(0.5)

    const name = TG_CONTEXT.uname !== 'Player' ? TG_CONTEXT.uname : ''
    if (name) {
      this.add.text(width / 2, height / 2 - 5, `👾 ${name}`, {
        fontSize: '20px', color: '#aaaaff'
      }).setOrigin(0.5)
    }

    const btn = this.add.text(width / 2, height / 2 + 65, '▶  PLAY', {
      fontSize: '32px', color: '#00ffcc',
      backgroundColor: '#001133',
      padding: { x: 28, y: 14 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true })

    btn.on('pointerdown', () => {
      this.scene.stop('MenuScene')
      this.scene.start('GameScene')
    })
    btn.on('pointerover', () => btn.setColor('#ffffff'))
    btn.on('pointerout', () => btn.setColor('#00ffcc'))

    this.add.text(width / 2, height - 50,
      'Drag back & release to launch the comet!',
      { fontSize: '14px', color: '#556677' }).setOrigin(0.5)

    this.add.text(width / 2, height - 28,
      'Use planet gravity to reach the wormhole',
      { fontSize: '13px', color: '#445566' }).setOrigin(0.5)
  }
}
