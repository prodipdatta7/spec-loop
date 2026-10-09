import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const hash = value => crypto.createHash('sha256').update(value).digest('hex');
export const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export function write(file, value) {
  if (file instanceof URL) file = fileURLToPath(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temp, value);
  fs.renameSync(temp, file);
}
export const writeJSON = (file, value) => write(file, JSON.stringify(value, null, 2) + '\n');
export function inside(root, relative) {
  if (!relative || path.isAbsolute(relative) || relative.includes('\\') || relative.includes(':')) throw Error(`Unsafe path: ${relative}`);
  const base = path.resolve(root), result = path.resolve(base, relative);
  if (!result.startsWith(base + path.sep)) throw Error(`Path escapes root: ${relative}`);
  let cursor = base;
  for (const part of path.relative(base, result).split(path.sep)) {
    cursor = path.join(cursor, part);
    if (fs.existsSync(cursor) && fs.lstatSync(cursor).isSymbolicLink()) throw Error(`Symlink not supported: ${cursor}`);
  }
  return result;
}
export function identifier(value, maxLength = 80) {
  if (typeof value !== 'string' || value.length > maxLength || !/^[a-z0-9][a-z0-9-]*$/.test(value)) throw Error(`Use a lowercase alphanumeric/hyphen identifier of at most ${maxLength} characters`);
  return value;
}
export function walk(root, prefix = '') {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    const rel = prefix + entry.name;
    if (entry.isSymbolicLink()) throw Error(`Symlink not supported: ${rel}`);
    return entry.isDirectory() ? walk(path.join(root, entry.name), rel + '/') : [rel];
  });
}
