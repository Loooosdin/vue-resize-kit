import { gzipSync } from 'node:zlib'
import { readFile } from 'node:fs/promises'

const budgets = {
  'dist/core.js': 3 * 1024,
  'dist/vue2.js': 5 * 1024,
  'dist/vue3.js': 5 * 1024,
}

let failed = false
for (const [file, budget] of Object.entries(budgets)) {
  const source = await readFile(new URL(`../${file}`, import.meta.url))
  const size = gzipSync(source).byteLength
  const status = size <= budget ? 'OK' : 'OVER'
  console.log(`${status} ${file}: ${size} B / ${budget} B gzip`)
  if (size > budget) failed = true
}

if (failed) process.exitCode = 1
