import { NextResponse } from 'next/server';
import { runFadhilAiScan } from '@/features/security/server/fadhil-ai-scan';

export async function GET() {
  try {
    const report = runFadhilAiScan(process.cwd());
    return NextResponse.json(report, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        ok: false,
        summary: 'FadhilAiEngine scan failed to execute.',
        scannedFiles: [],
        recentCommits: [],
        findings: [
          {
            severity: 'high',
            file: 'runtime',
            line: 0,
            rule: 'scan-runtime-error',
            snippet: message,
          },
        ],
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
