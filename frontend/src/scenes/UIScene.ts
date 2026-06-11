// UIScene removed - UI is now inline in GameScene
import Phaser from 'phaser'
export class UIScene extends Phaser.Scene {
  constructor() { super({ key: 'UIScene' }) }
  create() {}
  updateScore(_score: number, _level: number) {}
}
