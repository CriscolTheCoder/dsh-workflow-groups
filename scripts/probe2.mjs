// Probe: check route registration via the ctx-resolved webServer instance
import { Context } from '@deepseek-ai/cordis'
import { WebServer } from '@deepseek-ai/dsh-host-webserver'
import * as plugin from '../lib/index.js'

const root = new Context()
const toolsStub = {
  register: (def) => { console.log('  tools.register:', def.name); return () => {} },
  presentAs: () => () => {},
}
root.provide('tools', toolsStub)

const ws = new WebServer(root, { host: '127.0.0.1', port: 0 })
const resolved = root.webServer
console.log('resolved.exact === ws.exact:', resolved.exact === ws.exact)
console.log('resolved.constructor:', resolved.constructor.name)

try {
  plugin.apply(root)
} catch (e) {
  console.log('APPLY THREW:', e.constructor.name, '::', e.message)
}

console.log('--- resolved.exact table ---')
for (const [p, r] of resolved.exact) console.log('  route:', p, r.kind)
console.log('--- ws.exact table ---')
for (const [p, r] of ws.exact) console.log('  route:', p, r.kind)
