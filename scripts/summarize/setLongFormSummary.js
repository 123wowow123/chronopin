'use strict';

// Usage: node scripts/summarize/setLongFormSummary.js <pinId> < summary.txt
// Reads the summary text from stdin and writes it to Pin.longFormSummary.

require('@babel/register');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { Pin } = require('../../server/model');
const cp = require('../../server/db');

const pinId = +process.argv[2];

if (!pinId) {
  console.log('ERROR: usage: node setLongFormSummary.js <pinId> < summary.txt');
  process.exit(1);
}

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  const summary = input.trim();
  if (!summary) {
    console.log('ERROR: empty summary on stdin');
    process.exitCode = 1;
    return cp.closeConnection();
  }
  Pin.updateLongFormSummary(pinId, summary)
    .then(() => {
      console.log(`OK pin ${pinId} (${summary.length} chars)`);
    })
    .catch(err => {
      console.log(`ERROR pin ${pinId}:`, err);
      process.exitCode = 1;
    })
    .finally(() => cp.closeConnection());
});
