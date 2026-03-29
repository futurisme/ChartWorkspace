import dynamic from 'next/dynamic';
import { Container, Section, ThemeScope } from '@/lib/fadhilweblib';

const WorkspaceCommandHome = dynamic(
  () => import('@/features/workspace-home/WorkspaceCommandHome').then((mod) => mod.WorkspaceCommandHome),
  {
    ssr: false,
    loading: () => (
      <ThemeScope theme="game" style={{ minHeight: '100dvh', padding: '1rem', background: '#030816' }}>
        <Container maxWidth="sm">
          <Section
            surface
            eyebrow="/workspace"
            title="Loading workspace home"
            description="Initializing the command-home runtime."
          />
        </Container>
      </ThemeScope>
    ),
  }
);

export default function WorkspacePage() {
  return <WorkspaceCommandHome />;
}
