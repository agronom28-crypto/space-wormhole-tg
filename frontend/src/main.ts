import Phaser from 'phaser'
import { GameScene } from './scenes/GameScene'
import { MenuScene } from './scenes/MenuScene'
import { UIScene } from './scenes/UIScene'

// Parse Telegram context from URL
export const TG_CONTEXT = (() => {
  const p = new URLSearchParams(window.location.search)
  return {
    uid: parseInt(p.get('uid') || '0'),
    uname: p.get('uname') || 'Player',
    imid: p.get('imid') || '',
    cid: parseInt(p.get('cid') || '0'),
    mid: parseInt(p.get('mid') || '0'),
  }
})()

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 480,
  height: 800,
  backgroundColor: '#050520',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [MenuScene, GameScene, UIScene],
}

new Phaser.Game(config)
