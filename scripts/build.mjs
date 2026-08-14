/**
 * Build script: bundles the host half (src/index.ts) and the client half
 * (src/client.ts) into standalone ESM/CJS files under lib/.
 *
 * - lib/index.js  — host half: plain ESM (cordis plugin exports name/inject/apply).
 * - lib/client.js — browser half: wrapped in window.__ModuleLoader__.load({ id,
 *   factory }) — the DSH client module system REQUIRES this wrapper for every
 *   dsh.client bundle (see dsh-pet / dsh-ssh / dsh-web-terminal). The wrapper
 *   is injected at build time so build AND future rebuilds stay correct.
 */
import { build } from 'esbuild'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const src = join(root, '..', 'src')
const out = join(root, '..', 'lib')

mkdirSync(out, { recursive: true })

const hostExternal = [
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-workflow',
]

await build({
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external: hostExternal,
  entryPoints: [join(src, 'index.ts')],
  outfile: join(out, 'index.js'),
  logLevel: 'info',
})

// Client half: build as CJS so the ModuleLoader wrapper can capture
// module.exports; then rewrite the file to the __ModuleLoader__.load form.
// `react` must stay EXTERNAL: the「工作流」board is a shell-rendered slot
// component (conversation.view), so it must use the SHELL's React instance —
// bundling a second React copy makes every hook crash with "Cannot read
// properties of null (reading 'useState')" (dispatcher null).
await build({
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  define: { 'process.env.NODE_ENV': '"production"' },
  external: ['react'],
  entryPoints: [join(src, 'client.ts')],
  outfile: join(out, 'client.raw.js'),
  logLevel: 'info',
})

const raw = readFileSync(join(out, 'client.raw.js'), 'utf8')
// The DSH __ModuleLoader__.load factory receives `require` but NOT `module` /
// `exports`. esbuild's CJS output assigns `module.exports = ...`, so both must
// be injected at the top of the factory (same approach as dsh-web-terminal's
// wrapClientPlugin) or the browser throws `module is not defined`.
const wrapped = `window.__ModuleLoader__.load({
	id: "dsh-workflow-groups",
	factory: (require) => {
		var module = { exports: {} }; var exports = module.exports;
		${raw}
		return module.exports;
	}
});
`
writeFileSync(join(out, 'client.js'), wrapped)
try { await unlink(join(out, 'client.raw.js')) } catch { /* already gone */ }

// minimal type stubs so TS consumers can import the package
writeFileSync(join(out, 'index.d.ts'), 'export declare const name: string\nexport declare const inject: string[]\nexport declare function apply(ctx: any): void\n')
writeFileSync(join(out, 'client.d.ts'), 'export declare const name: string\nexport declare const inject: string[]\nexport declare function apply(ctx: any): void\n')

console.log('build complete ->', out)
