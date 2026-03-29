import dynamic from 'next/dynamic';
import { Container, Section, ThemeScope } from '@/lib/fadhilweblib';

const WorkspaceCommandHome = dynamic(
  () => import('@/features/workspace-home/WorkspaceCommandHome').then((mod) => mod.WorkspaceCommandHome),
  {
    ssr: false,
    loading: () => (
      <ThemeScope theme="game" style={{ minHeight: '100dvh', padding: '0.75rem', background: '#030816' }}>
        <Container maxWidth="26rem">
          <Section
            surface
            eyebrow="/workspace"
            density="compact"
            title="Loading Android workspace deck"
            description="Initializing the compact phone layout."
          />
        </Container>
      </ThemeScope>
    ),
  }
);

export default function WorkspacePage() {
  return <WorkspaceCommandHome />;
}
