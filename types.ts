export interface Vector2 {
  x: number;
  y: number;
}

export interface MirrorEntity {
  id: number;
  position: Vector2;
  angle: number; // In radians, 0 is horizontal
  width: number;
  isSelected: boolean;
  efficiency: number; // 0 to 1, how perfectly it's hitting the target
}

export interface GameState {
  score: number;
  energy: number; // Current level energy accumulation
  maxEnergy: number; // Target to pass level
  level: number;
  timeOfDay: number; // 0 (Dawn) to 1 (Dusk)
  isPlaying: boolean;
  gameOver: boolean;
  victory: boolean;
}

export interface TowerEntity {
  position: Vector2;
  height: number;
  receiverRadius: number;
  receiverOffset: number; // Height from ground
}
