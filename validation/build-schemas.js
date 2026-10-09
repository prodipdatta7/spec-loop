import { schemas } from '../core/schemas/build.js';
import { writeJSON } from './io.js';
for (const [name, schema] of Object.entries(schemas)) writeJSON(new URL(`../core/schemas/${name}.schema.json`, import.meta.url), { $schema: 'http://json-schema.org/draft-07/schema#', ...schema });
