import type { PanelProps } from '../core/types';
import { Surface } from './layout/Surface';

export function Panel(props: PanelProps) {
  return <Surface {...props} data-slot={(props as Record<string, unknown>)['data-slot'] ?? 'panel'} />;
}
