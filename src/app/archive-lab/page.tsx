'use client';

import { useCallback, useRef, useState } from 'react';
import * as Y from 'yjs';
import { applyYjsSnapshot, getCurrentSnapshot } from '@/features/maps/shared/map-snapshot';
import { decodeFadhilArchive, encodeFadhilArchive } from '@/features/maps/shared/fadhil-archive';

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


  const handleLoadArchiveFile = useCallback(async (file: File) => {
    const raw = await file.text();

    const decoded = await decodeFadhilArchive(raw);
    if (decoded.contentType !== 'workspace-archive') {
      throw new Error('File .fAdHiL ini bukan arsip workspace editor.');
    }

    const parsed = decoded.payload as Partial<WorkspaceArchiveFile>;

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

    setArchiveJson(raw);
    setEditorJson(JSON.stringify(editable, null, 2));
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
      console.error(err);
    }
  }, [handleLoadArchiveFile]);

  const handleDecryptFromTextarea = useCallback(async () => {
    try {
        const decoded = await decodeFadhilArchive(archiveJson.trim());
      if (decoded.contentType !== 'workspace-archive') {
        throw new Error('Input bukan arsip workspace .fAdHiL.');
      }

      const parsed = decoded.payload as Partial<WorkspaceArchiveFile>;
      if (parsed.magic !== MAGIC || parsed.version !== VERSION || !parsed.snapshot) {
        throw new Error('Payload archive tidak valid. Pastikan magic/version/snapshot benar.');
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
      setArchiveJson(archiveJson.trim());
      setEditorJson(JSON.stringify(workspaceToEditorJson(doc, archive), null, 2));
    } catch (err) {
      console.error(err);
    }
  }, [archiveJson]);

  const handleEncrypt = useCallback(async () => {
    try {
        const parsed = JSON.parse(editorJson) as EditableWorkspace;
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges) || !parsed.meta) {
        throw new Error('Editable JSON invalid.');
      }

      const archive = editorJsonToArchive(parsed);
      const encoded = await encodeFadhilArchive(archive, 'workspace-archive');
      setArchiveJson(encoded);
    } catch (err) {
      console.error(err);
    }
  }, [editorJson]);

  const handleDownloadArchive = useCallback(async () => {
    try {
        const decoded = await decodeFadhilArchive(archiveJson.trim());
      if (decoded.contentType !== 'workspace-archive') {
        throw new Error('Data textarea bukan arsip workspace .fAdHiL.');
      }
      const parsed = decoded.payload as Partial<WorkspaceArchiveFile>;
      if (parsed.magic !== MAGIC || parsed.version !== VERSION || !parsed.snapshot) {
        throw new Error('Payload archive belum valid untuk diunduh.');
      }

      const sourceMapId = typeof parsed.sourceMapId === 'string' ? parsed.sourceMapId : '0000';
      const blob = new Blob([archiveJson.trim()], { type: 'application/x-fadhil-archive' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `archive-lab-${sourceMapId}-${Date.now()}.fAdHiL`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  }, [archiveJson]);


  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#0b1120,_#020617_60%,_#02030a)] p-2 text-slate-100 sm:p-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:gap-4">
        <header className="rounded-2xl border border-fuchsia-400/30 bg-slate-900/70 p-3 shadow-[0_0_32px_rgba(217,70,239,0.25)] sm:p-5">
          <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full rounded border border-cyan-300 bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500 sm:w-auto sm:py-1 sm:text-sm"
            >
              Upload .fAdHiL
            </button>
            <button
              type="button"
              onClick={handleDecryptFromTextarea}
              className="w-full rounded border border-violet-300 bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-500 sm:w-auto sm:py-1 sm:text-sm"
            >
              Decrypt .fAdHiL String
            </button>
            <button
              type="button"
              onClick={handleEncrypt}
              className="w-full rounded border border-emerald-300 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 sm:w-auto sm:py-1 sm:text-sm"
            >
              Encrypt Futuristic Payload
            </button>
            <button
              type="button"
              onClick={() => { void handleDownloadArchive(); }}
              className="w-full rounded border border-amber-300 bg-amber-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 sm:w-auto sm:py-1 sm:text-sm"
            >
              Download .fAdHiL
            </button>
          </div>
          <input ref={fileRef} type="file" accept=".fAdHiL" className="hidden" onChange={handlePickFile} />
        </header>

        <section className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2 sm:p-3">
            <textarea
              value={archiveJson}
              onChange={(event) => setArchiveJson(event.target.value)}
              className="h-[38vh] w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-[11px] text-slate-100 focus:border-cyan-500 focus:outline-none sm:h-[65vh] sm:text-xs"
              spellCheck={false}
            />
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-2 sm:p-3">
            <textarea
              value={editorJson}
              onChange={(event) => setEditorJson(event.target.value)}
              className="h-[38vh] w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-[11px] text-slate-100 focus:border-emerald-500 focus:outline-none sm:h-[65vh] sm:text-xs"
              spellCheck={false}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
