import { readFileSync } from 'node:fs';
import { parsePtrText } from '@/lib/trades';
console.log(JSON.stringify(parsePtrText(readFileSync(process.argv[2], 'utf8')), null, 1));
