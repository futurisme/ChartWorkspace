export type NameField = 'semiconductor' | 'game' | 'software';

const SEMICONDUCTOR_PRIMARY = [
  'Nova', 'Quantum', 'Vertex', 'Neutron', 'Ion', 'Silica', 'Helix', 'Aether', 'Core', 'Pulse',
  'Cortex', 'Nimbus', 'Arc', 'Lumen', 'Forge', 'Axiom', 'Vector', 'Prime', 'Strata', 'Zenith',
  'Photon', 'Synapse', 'Volt', 'Circuit', 'Triad', 'Atlas', 'Orbit', 'Fusion', 'Catalyst', 'Nexa',
] as const;

const SEMICONDUCTOR_SECONDARY = [
  'Micro', 'Semicon', 'Compute', 'Logic', 'Foundry', 'Devices', 'Systems', 'Fabric', 'Circuits', 'Labs',
  'Dynamics', 'Modules', 'Signals', 'Engines', 'Platforms', 'Chips', 'Silicon', 'Accelerators', 'Nodes', 'Architectures',
] as const;

const GAME_PRIMARY = [
  'Starlit', 'Ironwood', 'Skybound', 'Red Harbor', 'Moonforge', 'Pixel Harbor', 'Dreamline', 'Arcadia', 'Silver Guild', 'Night Orchard',
  'Fableline', 'Riftlane', 'Sunset Relay', 'Blue Ember', 'Wildframe', 'North Echo', 'Prism Peak', 'Cloud Lantern', 'Riverbyte', 'Bright Anvil',
] as const;

const GAME_SECONDARY = [
  'Games', 'Studios', 'Interactive', 'Works', 'Publishing', 'Collective', 'Entertainment', 'Playhouse', 'Labs', 'Network',
  'Guild', 'Factory', 'House', 'Online', 'Digital', 'Play', 'Arcade', 'Realms', 'Universe', 'Ventures',
] as const;

const SOFTWARE_PRIMARY = [
  'Nimbus', 'Orbit', 'Atlas', 'Catalyst', 'Vector', 'Prism', 'Relay', 'Zen', 'Modular', 'Pulse',
  'Elevate', 'Aster', 'Lattice', 'Vertex', 'Nova', 'Cloudline', 'Openlane', 'Spark', 'Beacon', 'Kernel',
] as const;

const SOFTWARE_SECONDARY = [
  'Software', 'Systems', 'Platform', 'Apps', 'Suite', 'Stack', 'OS', 'Store', 'Services', 'Runtime',
  'Cloud', 'Labs', 'Works', 'Digital', 'Foundation', 'Engine', 'Network', 'Tools', 'Flow', 'Gateway',
] as const;

const TERTIARY = ['Group', 'Works', 'Labs', 'Collective', 'Hub', 'Division', 'Center', 'Network'] as const;

function randomFrom<T>(random: () => number, items: readonly T[]) {
  return items[Math.floor(random() * items.length)] as T;
}

export function generateCatalogCompanyName(params: {
  field: NameField;
  random: () => number;
  usedNames: Set<string>;
  usedWords: Set<string>;
}) {
  const { field, random, usedNames, usedWords } = params;
  const primary = field === 'game'
    ? GAME_PRIMARY
    : field === 'software'
      ? SOFTWARE_PRIMARY
      : SEMICONDUCTOR_PRIMARY;
  const secondary = field === 'game'
    ? GAME_SECONDARY
    : field === 'software'
      ? SOFTWARE_SECONDARY
      : SEMICONDUCTOR_SECONDARY;

  for (let attempt = 0; attempt < 180; attempt += 1) {
    const wordCountRoll = random();
    const wordCount = wordCountRoll < 0.34 ? 1 : (wordCountRoll < 0.9 ? 2 : 3);
    const first = randomFrom(random, primary);
    const second = randomFrom(random, secondary);
    const third = randomFrom(random, TERTIARY);
    const tokens = wordCount === 1 ? [first] : wordCount === 2 ? [first, second] : [first, second, third];
    const normalizedTokens = tokens.map((token) => token.toLowerCase());
    if (normalizedTokens.some((token) => usedWords.has(token))) continue;
    const candidate = tokens.join(' ').replace(/\s+/g, ' ').trim();
    if (usedNames.has(candidate.toLowerCase())) continue;
    return candidate;
  }

  const fallbackPrimary = randomFrom(random, primary);
  return `${fallbackPrimary} ${Math.floor(random() * 900 + 100)}`;
}
