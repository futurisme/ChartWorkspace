import { runFadhilAiScan } from '../src/features/security/server/fadhil-ai-scan';

const report = runFadhilAiScan(process.cwd());
console.log('\n=== FadhilAiEngine Pre-Push Scan ===');
console.log('Policy: You must run FadhilAiEngine scan before push.');
console.log(`Result: ${report.ok ? 'PASS' : 'BLOCKED'}`);
console.log(report.summary);
console.log(`Scanned files: ${report.scannedFiles.length}`);

if (report.recentCommits.length > 0) {
  console.log('\nRecent commits:');
  report.recentCommits.forEach((c) => console.log(`- ${c}`));
}

if (report.findings.length > 0) {
  console.log('\nFindings:');
  report.findings.forEach((f) => {
    console.log(`- [${f.severity.toUpperCase()}] ${f.rule} ${f.file}:${f.line}`);
  });
}

if (!report.ok) {
  process.exit(2);
}
