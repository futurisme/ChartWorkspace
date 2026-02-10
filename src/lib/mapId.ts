const MAP_ID_WIDTH = 4;

export function formatMapId(id: number): string {
  return id.toString().padStart(MAP_ID_WIDTH, '0');
}

export function parseMapId(raw: string): number | null {
  if (!raw || !/^\d+$/.test(raw)) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}
