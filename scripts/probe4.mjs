// Probe: check whether register's disposer is immediately invoked
import { Context } from '@deepseek-ai/cordis'
import { WebServer } from '@deepseek-ai/dsh-host-webserver'
import { apply } from '../lib/index.js'

const root = new Context()
const toolsStub = {
  register: (def) => { console.log('  tools.register:', def.name); return () => {} },
  presentAs: () => () => {},
}
root.provide('tools', toolsStub)
const ws = new WebServer(root, { host: '127.0.0.1', port: 0 })
const resolved = root.webServer
const origRegister = resolved.register.bind(resolved)
resolved.register = (route) => {
  const dispose = origRegister(route)
  console.log('  register:', route.path, '-> exact has it:', resolved.exact.has(route.path))
  return () => {
    console.log('  DISPOSE CALLED:', route.path)
    dispose()
  }
}

try { apply(root) } catch (e) { console.log('THREW:', e.message) }
console.log('final exact:', Array.from(resolved.exact.keys()))
