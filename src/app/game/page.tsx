import dynamic from 'next/dynamic';

const GameCommandDeck = dynamic(
  () => import('@/features/cpu-foundry/game-command-deck/GameCommandDeck').then((mod) => mod.GameCommandDeck),
  {
    ssr: false,
    loading: () => <div style={{ padding: 16 }}>Loading game simulator...</div>,
  }
);

export default function GamePage() {
  return <GameCommandDeck />;
}
