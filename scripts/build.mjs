/**
 * Build script: bundles the host half (src/index.ts) and the client half
 * (src/client.ts) into standalone ESM files under lib/, plus type
 * declarations. Uses esbuild when available, falling back to plain text
 * copy for the .d.ts stubs.
 */
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const src = join(root, '..', 'src')
const out = join(root, '..', 'lib')

mkdirSync(out, { recursive: true })

const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: [
    '@deepseek-ai/cordis',
    '@deepseek-ai/dsh-workflow',
    '@deepseek-ai/dsh-client-runtime',
    '@deepseek-ai/dsh-client-ui-slots',
    'react',
  ],
  logLevel: 'info',
}

await build({
  ...common,
  entryPoints: [join(src, 'index.ts')],
  outfile: join(out, 'index.js'),
})

await build({
  ...common,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  entryPoints: [join(src, 'client.ts')],
  outfile: join(out, 'client.js'),
})

// minimal type stubs so TS consumers can import the package
writeFileSync(join(out, 'index.d.ts'), 'export declare const name: string\nexport declare const inject: string[]\nexport declare function apply(ctx: any): void\n')
writeFileSync(join(out, 'client.d.ts'), 'export declare const name: string\nexport declare const inject: string[]\nexport declare function apply(ctx: any): void\n')

console.log('build complete ->', out)
