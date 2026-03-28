export type GameReleaseCard = {
  id: string;
  name: string;
  genre: string;
  releaseDate: string;
  popularity: number;
  communities: string[];
};

export type GameNameDatasetEntry = {
  name: string;
  genre: string;
  era: string;
  theme: string;
};

export const GAME_NAME_DATASET: GameNameDatasetEntry[] = [
  { name: 'Neon Drift 2088', genre: 'Cyberpunk Racing', era: 'Future', theme: 'Urban Neon' },
  { name: 'Kingdoms of Emberfall', genre: 'Strategy RPG', era: 'Medieval', theme: 'High Fantasy' },
  { name: 'Project Tundra Zero', genre: 'Survival Shooter', era: 'Modern', theme: 'Arctic Conflict' },
  { name: 'Lotus Blade Chronicle', genre: 'Action Adventure', era: 'Feudal', theme: 'Mythic East' },
  { name: 'Astrolane Command', genre: '4X Grand Strategy', era: 'Space Age', theme: 'Galactic Empire' },
  { name: 'Pixel Harbor Stories', genre: 'Life Simulation', era: 'Retro', theme: 'Coastal Town' },
  { name: 'Eclipse Protocol', genre: 'Stealth Thriller', era: 'Near Future', theme: 'Corporate Espionage' },
  { name: 'Runes of Asteria', genre: 'MMO RPG', era: 'Ancient', theme: 'Arcane Civilizations' },
  { name: 'Velocity Kart Legends', genre: 'Arcade Racing', era: 'Contemporary', theme: 'Global Circuits' },
  { name: 'Ghostline Frontier', genre: 'Open World', era: 'Post-Apocalypse', theme: 'Wasteland Rebuild' },
  { name: 'Verdant Colony', genre: 'City Builder', era: 'Solarpunk', theme: 'Eco Megacity' },
  { name: 'Iron Arena Genesis', genre: 'Competitive Arena', era: 'Sci-Fi', theme: 'Mech Combat' },
  { name: 'Saffron Detective Files', genre: 'Narrative Mystery', era: '1990s', theme: 'Noir Metropolis' },
  { name: 'Crimson Tide Armada', genre: 'Naval Strategy', era: 'Industrial', theme: 'Ocean Warfare' },
  { name: 'Fable Circuit', genre: 'Co-op Puzzle', era: 'Timeless', theme: 'Whimsical Tech' },
  { name: 'Orbital Cricket League', genre: 'Sports Sim', era: 'Future', theme: 'Interplanetary Tournament' },
];

export const APPSTORE_ICON_SET = ['🎮', '🕹️', '🏎️', '⚔️', '🧩', '🚀', '🏰', '🌌', '🐉', '🤖', '🏟️', '🎯'] as const;
