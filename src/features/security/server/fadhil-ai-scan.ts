import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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
];

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
  const scannedFiles = changedFiles.filter((file) => /\.(ts|tsx|js|mjs|cjs|json|md)$/i.test(file));

  const findings: FadhilAiFinding[] = [];

  for (const file of scannedFiles) {
    const fullPath = join(repoRoot, file);
    if (!existsSync(fullPath)) continue;

    let content = '';
    try {
      content = readFileSync(fullPath, 'utf8');
    } catch {
      continue;
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
