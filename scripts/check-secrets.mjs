import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const findings = [];
const files = new Set(execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean));
function addTree(path) { if (!existsSync(path)) return; if (statSync(path).isDirectory()) { for (const name of readdirSync(path)) addTree(join(path, name)); } else files.add(path); }
addTree('dist');
function hasSecret(text) {
  const assignments = [...text.matchAll(/["']?ARK_API_KEY["']?\s*[:=]\s*["']?([^\s"',;}$]{8,})/g)].map((match) => match[1]);
  const realAssignment = assignments.some((value) => !/(test|example|replace|dummy|placeholder)/i.test(value));
  return realAssignment || /Bearer\s+[A-Za-z0-9_-]{24,}/.test(text);
}
for (const path of files) {
  if (/\.(png|jpe?g|gif|webp|ico|zip|woff2?|ttf|pdf)$/i.test(path)) continue;
  let text;
  try { text = readFileSync(path, 'utf8'); } catch { continue; }
  if (hasSecret(text)) findings.push(path);
  if (path.startsWith('dist') && text.includes('ARK_API_KEY')) findings.push(path);
}
if (findings.length) { console.error(`Potential secret found in: ${[...new Set(findings)].join(', ')}`); process.exit(1); }
console.log('Secret scan passed');
