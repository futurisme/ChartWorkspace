'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { applyYjsSnapshot, getCurrentSnapshot } from '@/features/maps/shared/map-snapshot';

type YRecordMap = Y.Map<unknown>;

type ArchiveViewport = {
  x: number;
  y: number;
  zoom: number;
};

type WorkspaceArchiveFile = {
  magic: 'chartworkspace/archive';
  version: 1;
  exportedAt: string;
  sourceMapId: string;
  snapshot: string;
  viewport?: ArchiveViewport;
};

type EditableNode = {
  id: string;
  label: string;
  color?: string;
  position: { x: number; y: number };
};

type EditableEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

type EditableWorkspace = {
  meta: {
    sourceMapId: string;
    exportedAt: string;
    title?: string;
  };
  viewport?: ArchiveViewport;
  nodes: EditableNode[];
  edges: EditableEdge[];
};

const MAGIC = 'chartworkspace/archive';
const VERSION = 1;

function asNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function createEmptyDoc() {
  const doc = new Y.Doc();
  doc.getMap('nodes');
  doc.getMap('edges');
  doc.getMap('selected');
  doc.getText('title');
  return doc;
}

function workspaceToEditorJson(doc: Y.Doc, archive: WorkspaceArchiveFile): EditableWorkspace {
  const nodesMap = doc.getMap<YRecordMap>('nodes');
  const edgesMap = doc.getMap<YRecordMap>('edges');
  const titleText = doc.getText('title').toString();

  const nodes: EditableNode[] = [];
  nodesMap.forEach((nodeData, nodeId) => {
    const label = typeof nodeData.get('label') === 'string' ? String(nodeData.get('label')) : 'Node';
    const color = typeof nodeData.get('color') === 'string' ? String(nodeData.get('color')) : undefined;
    const positionRaw = nodeData.get('position');
    const positionObject = (positionRaw && typeof positionRaw === 'object') ? (positionRaw as { x?: unknown; y?: unknown }) : {};

    nodes.push({
      id: String(nodeId),
      label,
      color,
      position: {
        x: asNumber(positionObject.x, 0),
        y: asNumber(positionObject.y, 0),
      },
    });
  });

  const edges: EditableEdge[] = [];
  edgesMap.forEach((edgeData, edgeId) => {
    const source = edgeData.get('source');
    const target = edgeData.get('target');
    const label = edgeData.get('label');

    if (typeof source !== 'string' || typeof target !== 'string') {
      return;
    }

    edges.push({
      id: String(edgeId),
      source,
      target,
      label: typeof label === 'string' ? label : undefined,
    });
  });

  return {
    meta: {
      sourceMapId: archive.sourceMapId,
      exportedAt: archive.exportedAt,
      title: titleText || undefined,
    },
    viewport: archive.viewport,
    nodes,
    edges,
  };
}

function editorJsonToArchive(json: EditableWorkspace): WorkspaceArchiveFile {
  const doc = createEmptyDoc();
  const nodesMap = doc.getMap<YRecordMap>('nodes');
  const edgesMap = doc.getMap<YRecordMap>('edges');
  const title = doc.getText('title');

  json.nodes.forEach((node) => {
    const nodeData = new Y.Map<unknown>() as YRecordMap;
    nodeData.set('id', node.id);
    nodeData.set('label', node.label);
    nodeData.set('position', {
      x: asNumber(node.position?.x, 0),
      y: asNumber(node.position?.y, 0),
    });
    if (node.color && typeof node.color === 'string') {
      nodeData.set('color', node.color);
    }
    nodesMap.set(node.id, nodeData);
  });

  const knownNodeIds = new Set(json.nodes.map((node) => node.id));
  json.edges.forEach((edge) => {
    if (!knownNodeIds.has(edge.source) || !knownNodeIds.has(edge.target)) {
      throw new Error(`Edge ${edge.id} references unknown node.`);
    }

    const edgeData = new Y.Map<unknown>() as YRecordMap;
    edgeData.set('id', edge.id);
    edgeData.set('source', edge.source);
    edgeData.set('target', edge.target);
    if (edge.label && typeof edge.label === 'string') {
      edgeData.set('label', edge.label);
    }
    edgesMap.set(edge.id, edgeData);
  });

  if (json.meta.title && json.meta.title.trim()) {
    title.insert(0, json.meta.title.trim());
  }

  return {
    magic: MAGIC,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    sourceMapId: json.meta.sourceMapId || '0000',
    snapshot: getCurrentSnapshot(doc),
    viewport: json.viewport,
  };
}

export default function ArchiveLabPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [archiveJson, setArchiveJson] = useState('');
  const [editorJson, setEditorJson] = useState('');
  const [status, setStatus] = useState('Drop arsip .cws lalu decrypt untuk edit.');
  const [error, setError] = useState('');

  const parsedCounts = useMemo(() => {
    try {
      if (!editorJson.trim()) {
        return null;
      }
      const payload = JSON.parse(editorJson) as EditableWorkspace;
      return {
        nodes: Array.isArray(payload.nodes) ? payload.nodes.length : 0,
        edges: Array.isArray(payload.edges) ? payload.edges.length : 0,
      };
    } catch {
      return null;
    }
  }, [editorJson]);

  const handleLoadArchiveFile = useCallback(async (file: File) => {
    setError('');
    const raw = await file.text();
    const parsed = JSON.parse(raw) as Partial<WorkspaceArchiveFile>;

    if (parsed.magic !== MAGIC) {
      throw new Error('Format tidak valid. magic mismatch.');
    }
    if (parsed.version !== VERSION) {
      throw new Error(`Versi arsip tidak didukung: ${String(parsed.version)}`);
    }
    if (!parsed.snapshot || typeof parsed.snapshot !== 'string') {
      throw new Error('Snapshot tidak ditemukan.');
    }

    const archive: WorkspaceArchiveFile = {
      magic: MAGIC,
      version: VERSION,
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
      sourceMapId: typeof parsed.sourceMapId === 'string' ? parsed.sourceMapId : '0000',
      snapshot: parsed.snapshot,
      viewport: parsed.viewport,
    };

    const doc = createEmptyDoc();
    applyYjsSnapshot(doc, archive.snapshot);
    const editable = workspaceToEditorJson(doc, archive);

    setArchiveJson(JSON.stringify(archive, null, 2));
    setEditorJson(JSON.stringify(editable, null, 2));
    setStatus('Decrypt sukses. Silakan edit JSON manusiawi, lalu encrypt lagi.');
  }, []);

  const handlePickFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }
      await handleLoadArchiveFile(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [handleLoadArchiveFile]);

  const handleDecryptFromTextarea = useCallback(() => {
    try {
      setError('');
      const parsed = JSON.parse(archiveJson) as Partial<WorkspaceArchiveFile>;
      if (parsed.magic !== MAGIC || parsed.version !== VERSION || !parsed.snapshot) {
        throw new Error('Archive JSON invalid. Pastikan magic/version/snapshot benar.');
      }

      const archive: WorkspaceArchiveFile = {
        magic: MAGIC,
        version: VERSION,
        exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
        sourceMapId: typeof parsed.sourceMapId === 'string' ? parsed.sourceMapId : '0000',
        snapshot: parsed.snapshot,
        viewport: parsed.viewport,
      };

      const doc = createEmptyDoc();
      applyYjsSnapshot(doc, archive.snapshot);
      setEditorJson(JSON.stringify(workspaceToEditorJson(doc, archive), null, 2));
      setStatus('Decrypt dari textarea berhasil.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [archiveJson]);

  const handleEncrypt = useCallback(() => {
    try {
      setError('');
      const parsed = JSON.parse(editorJson) as EditableWorkspace;
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges) || !parsed.meta) {
        throw new Error('Editable JSON invalid.');
      }

      const archive = editorJsonToArchive(parsed);
      setArchiveJson(JSON.stringify(archive, null, 2));
      setStatus('Encrypt sukses. Unduh file .cws untuk dipakai di workspace lain.');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [editorJson]);

  const handleDownloadArchive = useCallback(() => {
    try {
      setError('');
      const parsed = JSON.parse(archiveJson) as Partial<WorkspaceArchiveFile>;
      if (parsed.magic !== MAGIC || parsed.version !== VERSION || !parsed.snapshot) {
        throw new Error('Archive JSON belum valid untuk diunduh.');
      }

      const sourceMapId = typeof parsed.sourceMapId === 'string' ? parsed.sourceMapId : '0000';
      const blob = new Blob([JSON.stringify(parsed)], { type: 'application/x-chartworkspace+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive-lab-${sourceMapId}-${Date.now()}.cws`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [archiveJson]);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-lg border border-cyan-500/30 bg-slate-900/70 p-4">
          <h1 className="text-xl font-bold text-cyan-200">Archive Lab (.cws) — Decrypt / Modify / Encrypt</h1>
          <p className="mt-1 text-sm text-slate-300">
            Halaman terpisah untuk menerjemahkan arsip workspace ke JSON manusiawi (nama node, position, color, koneksi),
            lalu re-encrypt kembali agar bisa di-load ke editor.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded border border-cyan-300 bg-cyan-600 px-3 py-1 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Upload .cws
            </button>
            <button
              type="button"
              onClick={handleDecryptFromTextarea}
              className="rounded border border-violet-300 bg-violet-600 px-3 py-1 text-sm font-semibold text-white hover:bg-violet-500"
            >
              Decrypt Archive JSON
            </button>
            <button
              type="button"
              onClick={handleEncrypt}
              className="rounded border border-emerald-300 bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Encrypt from Editable JSON
            </button>
            <button
              type="button"
              onClick={handleDownloadArchive}
              className="rounded border border-amber-300 bg-amber-500 px-3 py-1 text-sm font-semibold text-slate-950 hover:bg-amber-400"
            >
              Download .cws
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".cws,application/json" className="hidden" onChange={handlePickFile} />
          <p className="mt-3 text-xs text-cyan-100">Status: {status}</p>
          {parsedCounts && <p className="text-xs text-cyan-100">Parsed nodes: {parsedCounts.nodes} • edges: {parsedCounts.edges}</p>}
          {error && <p className="mt-2 rounded bg-red-900/40 px-2 py-1 text-xs text-red-200">Error: {error}</p>}
        </header>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <h2 className="mb-2 text-sm font-semibold text-cyan-100">Archive JSON (encrypted snapshot)</h2>
            <textarea
              value={archiveJson}
              onChange={(event) => setArchiveJson(event.target.value)}
              className="h-[65vh] w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              spellCheck={false}
            />
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
            <h2 className="mb-2 text-sm font-semibold text-emerald-100">Editable Workspace JSON (human-readable)</h2>
            <textarea
              value={editorJson}
              onChange={(event) => setEditorJson(event.target.value)}
              className="h-[65vh] w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
              spellCheck={false}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
