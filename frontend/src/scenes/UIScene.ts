import Phaser from 'phaser'

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text
  private levelText!: Phaser.GameObjects.Text

  constructor() { super({ key: 'UIScene' }) }

  create() {
    this.scoreText = this.add.text(16, 16, 'SCORE: 0', {
      fontSize: '18px', color: '#ffffff'
    })
    this.levelText = this.add.text(16, 40, 'LEVEL: 1', {
      fontSize: '16px', color: '#aaaacc'
    })
  }

  updateScore(score: number, level: number) {
    this.scoreText.setText(`SCORE: ${score}`)
    this.levelText.setText(`LEVEL: ${level}`)
  }
}
