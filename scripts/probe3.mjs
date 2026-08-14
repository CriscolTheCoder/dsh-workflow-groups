// Probe: run apply and inspect every possible failure point
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

// Monkey-patch the resolved webServer instance to log register calls
const resolved = root.webServer
const origRegister = resolved.register.bind(resolved)
resolved.register = (route) => {
  console.log('  webServer.register CALLED:', route.kind, route.path)
  return origRegister(route)
}
const origEffect = root.effect.bind(root)
root.effect = (fn, label) => {
  console.log('  ctx.effect CALLED, label:', label, 'fn type:', typeof fn)
  return origEffect(fn, label)
}

try {
  apply(root)
  console.log('apply completed without throw')
} catch (e) {
  console.log('APPLY THREW:', e.constructor.name, '::', e.message)
  console.log(e.stack?.split('\n').slice(0, 5).join('\n'))
}

console.log('--- resolved.exact ---')
for (const [p, r] of resolved.exact) console.log('  route:', p)
