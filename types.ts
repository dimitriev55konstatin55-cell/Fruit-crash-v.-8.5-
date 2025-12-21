
export type CandyColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export interface Candy {
  id: string;
  color: CandyColor;
}

export interface TargetFruit {
  color: CandyColor;
  current: number;
  target: number;
}

export interface Achievement {
  id: string;
  groupId: string; // ID группы (например, 'red_collection')
  level: number;   // Уровень достижения (1-5)
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  unlocked: boolean;
  claimed: boolean; // Получена ли награда
  requirement: number;
  current: number;
  reward: number;
}

export interface Inventory {
  smallPack: number;   // +3 хода
  mediumPack: number;  // +10 ходов
  largePack: number;   // +20 ходов
  magicSnowflake: number; // +50% к случайной банке
  santaBag: number;    // +25% ко всем банкам
}

export interface AppSettings {
  maxDailyMinutes: number | null;
  soundEnabled: boolean;
  musicEnabled: boolean; 
  hintsEnabled: boolean; // Включение/отключение подсказок
  language: 'ru' | 'en'; // Язык
}

export interface GameStats {
  red: number;
  blue: number;
  green: number;
  yellow: number;
  purple: number;
  orange: number;
}

export type LevelType = 'score' | 'collect';

export interface GameState {
  board: (Candy | null)[];
  score: number;
  moves: number;
  level: number;
  levelType: LevelType;
  objective: string;
  objectiveEn?: string;
  storySegment: string;
  storyEn?: string;
  targetScore: number;
  targetFruits: TargetFruit[];
  jars: Record<CandyColor, number>;
  isProcessing: boolean;
  screen: 'menu' | 'game' | 'achievements' | 'story' | 'loading' | 'map' | 'shop' | 'settings' | 'blocked';
  totalScore: number;
  totalJarsUsed: number;
  totalMoves: number; 
  maxCombo: number;
  tick: number;
  coinsFromLevels: number;
  lastLevelReward: number;
  inventory: Inventory;
  tutorialSeen: boolean;
  settings: AppSettings;
  minutesPlayedToday: number;
  lastPlayedDate: string;
  stats: GameStats; 
}
