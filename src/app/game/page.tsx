import dynamic from 'next/dynamic';

const CpuFoundrySim = dynamic(
  () => import('@/features/cpu-foundry/cpu-foundry-sim').then((mod) => mod.CpuFoundrySim),
  {
    ssr: false,
    loading: () => <div style={{ padding: 16 }}>Loading game simulator…</div>,
  }
);

export default function GamePage() {
  return <CpuFoundrySim />;
}
