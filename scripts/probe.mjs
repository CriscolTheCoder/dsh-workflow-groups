// Minimal reproduction: load the plugin apply with real services and check
// whether the workflow-groups routes register.
import { Context } from '@deepseek-ai/cordis'
import { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { apply } from '../lib/index.js'

const root = new Context()

// stub tools service
const toolsStub = {
  register: (def) => { console.log('  tools.register:', def.name); return () => {} },
}
root.provide('tools', toolsStub)

// provide webServer (WebServer constructor auto-registers 'webServer')
class FakeWebServer extends WebServer {
  constructor(ctx) { super(ctx) }
}
const ws = new FakeWebServer(root)

console.log('--- calling apply ---')
try {
  const disposer = apply(root)
  console.log('apply returned:', typeof disposer)
} catch (e) {
  console.log('APPLY THREW:', e.constructor.name, e.message)
}

// Now inspect what the fake webserver has in its exact table
console.log('--- webserver exact table ---')
for (const [path, entry] of (ws).exact) {
  console.log('  route:', path, 'handler:', typeof entry)
}
