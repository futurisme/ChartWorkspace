import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export type FadhilAiFinding = {
  severity: 'high' | 'medium' | 'low';
  file: string;
  line: number;
  rule: string;
  snippet: string;
};

export type FadhilAiScanReport = {
  ok: boolean;
  summary: string;
  scannedFiles: string[];
  recentCommits: string[];
  findings: FadhilAiFinding[];
};

const RULES: Array<{ rule: string; severity: 'high' | 'medium' | 'low'; pattern: RegExp }> = [
  { rule: 'hardcoded-token', severity: 'high', pattern: /github_pat_[A-Za-z0-9_]+/ },
  { rule: 'eval-usage', severity: 'high', pattern: /\beval\s*\(/ },
  { rule: 'function-constructor', severity: 'high', pattern: /new\s+Function\s*\(/ },
  { rule: 'dangerous-innerhtml', severity: 'medium', pattern: /dangerouslySetInnerHTML/ },
  { rule: 'exec-shell', severity: 'medium', pattern: /execSync\(|spawn\(|exec\(/ },
  { rule: 'empty-catch-block', severity: 'medium', pattern: /catch\s*\{\s*(?:\/\/.*)?\s*\}/ },
  { rule: 'debugger-leftover', severity: 'medium', pattern: /\bdebugger\b/ },
  { rule: 'blocking-loop-risk', severity: 'low', pattern: /while\s*\(\s*true\s*\)/ },
];

const SCANNABLE_PATTERN = /\.(ts|tsx|js|mjs|cjs|json|md|css|sql)$/i;

function severityRank(level: FadhilAiFinding['severity']) {
  if (level === 'high') return 3;
  if (level === 'medium') return 2;
  return 1;
}

function getRecentCommits(limit = 8): string[] {
  try {
    const out = execSync(`git log --oneline -n ${limit}`, { encoding: 'utf8' }).trim();
    return out ? out.split('\n') : [];
  } catch {
    return [];
  }
}

function getChangedFiles(limit = 8): string[] {
  try {
    const out = execSync(`git log --name-only --pretty=format: -n ${limit}`, { encoding: 'utf8' }).trim();
    const files = out
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.startsWith('.git'));
    return Array.from(new Set(files));
  } catch {
    return [];
  }
}

export function runFadhilAiScan(repoRoot: string): FadhilAiScanReport {
  const recentCommits = getRecentCommits(8);
  const changedFiles = getChangedFiles(8);
  const scannedFiles = changedFiles.filter((file) => SCANNABLE_PATTERN.test(file));

  const findings: FadhilAiFinding[] = [];
  const hashToFiles = new Map<string, string[]>();

  for (const file of scannedFiles) {
    const fullPath = join(repoRoot, file);
    if (!existsSync(fullPath)) continue;

    let content = '';
    try {
      content = readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const normalizedHash = createHash('sha1')
      .update(content.replace(/\s+/g, ' ').trim())
      .digest('hex');

    const duplicates = hashToFiles.get(normalizedHash) ?? [];
    duplicates.push(file);
    hashToFiles.set(normalizedHash, duplicates);

    if (content.length > 220_000 && !/package-lock\.json|migration\.sql/i.test(file)) {
      findings.push({
        severity: 'low',
        file,
        line: 1,
        rule: 'resource-waste-large-file',
        snippet: `Large file in recent push (${Math.round(content.length / 1024)} KB). Consider splitting to reduce review/load costs.`,
      });
    }

    const lines = content.split('\n');
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          findings.push({
            severity: rule.severity,
            file,
            line: index + 1,
            rule: rule.rule,
            snippet: line.trim().slice(0, 180),
          });
        }
      }
    });
  }

  for (const files of hashToFiles.values()) {
    if (files.length < 2) continue;
    files.forEach((file) => {
      findings.push({
        severity: 'medium',
        file,
        line: 1,
        rule: 'duplicate-content-in-push',
        snippet: `Potential duplicate implementation across changed files: ${files.join(', ')}`,
      });
    });
  }

  findings.sort((a, b) => {
    const sev = severityRank(b.severity) - severityRank(a.severity);
    if (sev !== 0) return sev;
    const fileSort = a.file.localeCompare(b.file);
    if (fileSort !== 0) return fileSort;
    return a.line - b.line;
  });

  const hasHigh = findings.some((f) => f.severity === 'high');
  const summary = hasHigh
    ? 'FadhilAiEngine blocked push candidate: high-risk patterns found. Run remediation before push.'
    : findings.length > 0
      ? 'FadhilAiEngine scan completed: warnings found, review recommended before push.'
      : 'FadhilAiEngine scan passed: no risky patterns detected in recent push files.';

  return {
    ok: !hasHigh,
    summary,
    scannedFiles,
    recentCommits,
    findings,
  };
}
