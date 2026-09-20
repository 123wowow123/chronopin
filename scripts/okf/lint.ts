// Checks the link wikis and keeps them healthy (docs/okf/playbooks/lint-the-wikis.md).
// Findings are stored in OkfLintFinding and shown in the admin source view.
//
//   npm run okf:lint                              every check, report only
//   npm run okf:lint -- --fix                     and put right what can be (see below)
//   npm run okf:lint -- --check stale --check orphan
//   npm run okf:lint -- --pin 930                 just that pin and its links
//   npm run okf:lint -- --dir docs/okf            only check a bundle on disk against the OKF spec
//
//   conformance    the generated OKF bundle against the spec       report only
//   stale          re-read links per the admin setting (Admin >     --fix rewrites changed wikis, rebuilds summaries
//                  Pins; default: pins viewed since); --viewed and/or
//                  --recheck-days N replace it
//   orphan         links no live pin cites (over --orphan-days)    --fix deletes them
//   quality        thin/blank/repetitive wikis, pins w/o summary   --fix queues rewrites, writes summaries
//   contradiction  Claude compares each pin's link wikis           report only; with no API credit, pins
//                                                                  left over are checked by hand (wiki:export)
//   imprecise      future pins dated to a year alone, which one    report only
//   cluster        too many pins sharing one start date, the     report only
//                  shape of a scrape that invented it
//                  better reference would sharpen
//
// --limit caps the links re-read and the pins checked for contradictions per run.

import '../env';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { lintBundle } from '@/lib/okfLint';
import * as db from '@/server/db';
import type { LintCheck } from '@/server/model/okfLint';
import { LINT_CHECKS, runLint } from '@/server/services/okfLint';

const { values: flags } = parseArgs({
  options: {
    check: { type: 'string', multiple: true },
    pin: { type: 'string', multiple: true },
    fix: { type: 'boolean' },
    dir: { type: 'string' },
    'recheck-days': { type: 'string' },
    viewed: { type: 'boolean' },
    'orphan-days': { type: 'string' },
    limit: { type: 'string' },
  },
});

function lintDir(dir: string) {
  const root = path.resolve(dir);
  const files = new Map<string, string>();
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.set(path.relative(root, full).split(path.sep).join('/'), readFileSync(full, 'utf8'));
    }
  };
  walk(root);
  const issues = lintBundle(files);
  issues.forEach((i) => console.log(`${i.severity.padEnd(7)} ${i.path}: ${i.message}`));
  console.log(`${files.size} file(s), ${issues.filter((i) => i.severity === 'error').length} error(s), ${issues.filter((i) => i.severity === 'warning').length} warning(s)`);
  if (issues.some((i) => i.severity === 'error')) process.exitCode = 1;
}

async function run() {
  if (flags.dir) return lintDir(flags.dir);
  const checks = (flags.check ?? LINT_CHECKS) as LintCheck[];
  const unknown = checks.filter((c) => !LINT_CHECKS.includes(c));
  if (unknown.length) throw new Error(`unknown check(s): ${unknown.join(', ')} (known: ${LINT_CHECKS.join(', ')})`);
  const report = await runLint({
    checks,
    pinIds: flags.pin?.map(Number),
    fix: flags.fix,
    recheckDays: flags['recheck-days'] ? Number(flags['recheck-days']) : undefined,
    viewed: flags.viewed,
    orphanDays: flags['orphan-days'] ? Number(flags['orphan-days']) : undefined,
    limit: flags.limit ? Number(flags.limit) : undefined,
  });
  for (const [check, out] of Object.entries(report)) {
    console.log(`\n${check}: ${out.findings.length} finding(s)`);
    for (const f of out.findings) {
      const about = f.pinId ? `pin ${f.pinId}` : f.sourceId ? `source ${f.sourceId}` : f.path ?? '';
      console.log(`  ${f.severity.padEnd(7)} ${about}${f.path && f.pinId == null && f.sourceId == null ? '' : f.path ? ` (${f.path})` : ''}: ${f.message}`);
    }
    out.fixed.forEach((line) => console.log(`  fixed   ${line}`));
    out.notes.forEach((line) => console.log(`  note    ${line}`));
  }
}

run()
  .catch((err) => {
    console.log('okf:lint failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
