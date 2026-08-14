/**
 * dsh-workflow-groups — host half.
 *
 * Maintains an in-memory grouped registry of workflow runs, fed by the
 * `workflow/*` event stream (start / phase / log / agent-start / agent-end /
 * end). Exposes:
 *   - model tools `workflow_new` (create + start a grouped workflow, or
 *     register it when the engine is unreachable) and `workflow_groups`
 *     (read-only grouped snapshot),
 *   - HTTP JSON routes `/api/workflow-groups/list` and
 *     `/api/workflow-groups/clear` for the client half.
 *
 * The registry lives in the owning fiber, so an update/restart of this plugin
 * clears it; any new workflow run is re-captured from the event stream.
 */
import { Context } from '@deepseek-ai/cordis'
import type { WorkflowRunInfo, WorkflowResultInfo, WorkflowAgentInfo, WorkflowAgentEndInfo, WorkflowMeta } from '@deepseek-ai/dsh-workflow'

export const name = 'workflow-groups'
export const inject = ['webServer', 'tools']

interface PhaseView { title: string; detail?: string; totalAgents: number; doneAgents: number; current: boolean }
interface AgentView { seq: number; label: string; phase?: string; outcome?: string }
interface RunEntry {
  id: string
  group: string
  name: string
  description: string
  status: string
  startedAt: number
  endedAt?: number
  phases: PhaseView[]
  agents: AgentView[]
  logs: { at: number; message: string }[]
  result?: { stopReason: string; error?: string; agentsStarted: number }
}

const API_PREFIX = '/api/workflow-groups'

function json(res: any, status: number, value: unknown) {
  const body = JSON.stringify(value)
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': String(Buffer.byteLength(body)) })
  res.end(body)
}

function readJsonBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {})
      } catch {
        reject(new Error('invalid-json'))
      }
    })
    req.on('error', reject)
  })
}

function getRoute(path: string, run: () => Promise<unknown>) {
  return {
    kind: 'exact',
    path,
    handler: (req: any, res: any) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }
      run().then((value) => json(res, 200, value), (error) => {
        json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) })
      })
    },
  }
}

function postRoute(path: string, run: (body: any) => Promise<unknown>) {
  return {
    kind: 'exact',
    path,
    handler: (req: any, res: any) => {
      if (req.method !== 'POST') {
        res.writeHead(405)
        res.end()
        return Promise.resolve()
      }
      return readJsonBody(req).then((body) => {
        return run(typeof body === 'object' && body !== null ? body : {}).then((value) => json(res, 200, value), (error) => {
          json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
        })
      }, (error) => {
        json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
      })
    },
  }
}

export function apply(ctx: Context) {
  const groups = new Map<string, { name: string; createdAt: number; runIds: string[] }>()
  const runs = new Map<string, RunEntry>()
  const byName = new Map<string, string>()

  const ensureGroup = (name: string) => {
    let g = groups.get(name)
    if (!g) {
      g = { name, createdAt: Date.now(), runIds: [] }
      groups.set(name, g)
    }
    return g
  }

  /** If a name-keyed "registered" placeholder exists, adopt its group for the live run. */
  const takeRegistered = (id: string, meta?: WorkflowMeta) => {
    if (!meta?.name || !byName.has(meta.name)) return undefined
    const priorId = byName.get(meta.name)!
    const prior = runs.get(priorId)
    if (prior && prior.status === 'registered' && priorId !== id) {
      const inherited = prior.group
      runs.delete(priorId)
      const g = groups.get(prior.group)
      if (g) g.runIds = g.runIds.filter((x) => x !== priorId)
      byName.set(meta.name, id)
      return inherited
    }
    return undefined
  }

  const upsertRun = (info: WorkflowRunInfo, extra?: { group?: string; name?: string; description?: string }) => {
    const inherited = takeRegistered(info.id, info.meta)
    let e = runs.get(info.id)
    if (!e) {
      const declared = Array.isArray(info.meta?.phases) ? info.meta!.phases! : []
      e = {
        id: info.id,
        group: inherited ?? '未分组',
        name: info.meta?.name ?? '未命名',
        description: info.meta?.description ?? '',
        status: 'running',
        phases: declared.map((p) => ({ title: p.title, detail: p.detail, totalAgents: 0, doneAgents: 0, current: false })),
        agents: [],
        logs: [],
        startedAt: Date.now(),
      }
      runs.set(info.id, e)
      if (info.meta?.name) byName.set(info.meta.name, info.id)
    }
    if (extra?.group && e.group !== extra.group) {
      const old = groups.get(e.group)
      if (old) old.runIds = old.runIds.filter((id) => id !== info.id)
      e.group = extra.group
    }
    if (extra?.name) e.name = extra.name
    if (extra?.description) e.description = extra.description
    const g = ensureGroup(e.group)
    if (!g.runIds.includes(e.id)) g.runIds.push(e.id)
    return e
  }

  // ---- workflow event stream -> registry ----
  ctx.on('workflow/start', (info: WorkflowRunInfo) => { upsertRun(info) })
  ctx.on('workflow/phase', (info: WorkflowRunInfo, title: string) => {
    const e = upsertRun(info)
    let p = e.phases.find((x) => x.title === title)
    if (!p) {
      p = { title, totalAgents: 0, doneAgents: 0, current: true }
      e.phases.push(p)
    }
    e.phases.forEach((x) => { x.current = x.title === title })
  })
  ctx.on('workflow/log', (info: WorkflowRunInfo, message: string) => {
    const e = upsertRun(info)
    e.logs.push({ at: Date.now(), message })
    if (e.logs.length > 200) e.logs = e.logs.slice(-200)
  })
  ctx.on('workflow/agent-start', (info: WorkflowRunInfo, agent: WorkflowAgentInfo) => {
    const e = upsertRun(info)
    e.agents.push({ seq: agent.seq, label: agent.label, phase: agent.phase })
    if (agent.phase) {
      let p = e.phases.find((x) => x.title === agent.phase)
      if (!p) {
        p = { title: agent.phase, totalAgents: 0, doneAgents: 0, current: true }
        e.phases.push(p)
      }
      p.totalAgents += 1
    }
  })
  ctx.on('workflow/agent-end', (info: WorkflowRunInfo, agent: WorkflowAgentEndInfo) => {
    const e = upsertRun(info)
    const a = e.agents.find((x) => x.seq === agent.seq)
    if (a) a.outcome = agent.outcome
    if (agent.phase) {
      const p = e.phases.find((x) => x.title === agent.phase)
      if (p) p.doneAgents = Math.min(p.totalAgents, p.doneAgents + 1)
    }
  })
  ctx.on('workflow/end', (info: WorkflowRunInfo, result: WorkflowResultInfo) => {
    const e = upsertRun(info)
    const reason = result?.stopReason ?? 'error'
    e.status = reason === 'completed' ? 'completed' : reason === 'cancelled' ? 'cancelled' : 'error'
    e.endedAt = Date.now()
    e.result = { stopReason: reason, error: result?.error, agentsStarted: result?.agentsStarted ?? 0 }
    e.phases.forEach((p) => { p.current = false; p.doneAgents = p.totalAgents })
  })

  // ---- snapshot (own plain JSON leaves only; never undefined) ----
  const plain = (v: unknown) => (v === undefined ? null : v)
  const snapshot = () => {
    const groupsOut: unknown[] = []
    for (const g of groups.values()) {
      groupsOut.push({
        name: g.name,
        createdAt: g.createdAt,
        workflows: g.runIds
          .map((id) => runs.get(id))
          .filter((e): e is RunEntry => !!e)
          .map((e) => ({
            id: e.id,
            name: e.name,
            description: e.description,
            status: e.status,
            startedAt: e.startedAt,
            endedAt: plain(e.endedAt),
            phases: e.phases.map((p) => ({ title: p.title, totalAgents: p.totalAgents, doneAgents: p.doneAgents, current: p.current })),
            agents: e.agents.map((a) => ({ seq: a.seq, label: a.label, phase: a.phase ?? null, outcome: a.outcome ?? null })),
            logs: e.logs.slice(-60).map((l) => ({ at: l.at, message: l.message })),
            result: e.result ? { stopReason: e.result.stopReason, error: e.result.error ?? '', agentsStarted: e.result.agentsStarted } : null,
          })),
      })
    }
    return groupsOut
  }

  // ---- model tools ----
  ctx.tools.register({
    name: 'workflow_new',
    description: '创建并立即启动一个新的分组工作流（workflow）。必须提供 group（分组名）、name、description 与 script（纯 JS 脚本体，允许 top-level await，以 return <json> 结尾）。脚本内可用 agent(prompt, opts) 派生子 agent、phase(title) 进入阶段、log(message) 输出日志。运行状态会实时显示在 GUI 的「工作流」标签页中，同分组的 workflow 显示在同一个独立面板。若当前环境无法直接启动引擎，将登记为「已登记」条目，随后请用 run_workflow 工具（source=script、meta 含同名 name）执行，事件流会自动关联回该分组。',
    parameters: {
      type: 'object',
      properties: {
        group: { type: 'string', description: '分组名：同一分组的 workflow 在 GUI 中显示在同一个独立面板。' },
        name: { type: 'string', description: 'workflow 名称（短 kebab-case，如 audit-codebase）。' },
        description: { type: 'string', description: '一句话描述该 workflow 做什么。' },
        script: { type: 'string', description: 'workflow 脚本体：纯 JS（无 import/require/JSX），允许 top-level await，以 return <json 值> 结束。' },
        args: { description: '可选 JSON 参数，脚本通过 args 全局读取。' },
        whenToUse: { type: 'string', description: '可选：何时使用此 workflow 的说明。' },
        phases: {
          type: 'array',
          items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string' }, provider: { type: 'string' }, model: { type: 'string' } }, required: ['title'] },
          description: '可选阶段声明（进度分组），phase() 调用按标题精确匹配。',
        },
        subagentProvider: { type: 'string', description: '可选：子 agent 提供者名称。' },
        maxTotalAgents: { type: 'number', description: '可选：本次运行子 agent 总数上限。' },
      },
      required: ['group', 'name', 'description', 'script'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', required: true },
          group: { type: 'string', required: true },
          name: { type: 'string', required: true },
          status: { type: 'string', required: true },
        },
      },
      render: (args: unknown, value: unknown) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args: any, exec: any) {
      const name = String(args.name ?? '')
      const group = String(args.group ?? '')
      const description = String(args.description ?? '')
      const engine = (ctx as any).get?.('workflowEngine') as { start(req: any): { id: string } } | undefined
      if (engine) {
        if (!exec?.agent) return { id: '', group, name, status: 'error: 缺少 agent 上下文' }
        const meta: WorkflowMeta = { name, description }
        if (args.whenToUse) meta.whenToUse = String(args.whenToUse)
        if (Array.isArray(args.phases) && args.phases.length) {
          meta.phases = args.phases.map((p: any) => ({
            title: String(p.title),
            detail: p.detail ? String(p.detail) : undefined,
            provider: p.provider ? String(p.provider) : undefined,
            model: p.model ? String(p.model) : undefined,
          }))
        }
        const run = engine.start({
          script: String(args.script),
          meta,
          args: args.args,
          parent: exec.agent,
          subagentProvider: args.subagentProvider ? String(args.subagentProvider) : undefined,
          maxTotalAgents: args.maxTotalAgents ? Number(args.maxTotalAgents) : undefined,
        })
        const e = upsertRun({ id: run.id, meta }, { group, name, description })
        e.status = 'running'
        return { id: run.id, group: e.group, name: e.name, status: e.status }
      }
      // engine not reachable: register a pending entry
      const id = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const declared = Array.isArray(args.phases) ? args.phases : []
      const e: RunEntry = {
        id,
        group,
        name,
        description,
        status: 'registered',
        phases: declared.map((p: any) => ({ title: String(p.title), detail: p.detail ? String(p.detail) : undefined, totalAgents: 0, doneAgents: 0, current: false })),
        agents: [],
        logs: [],
        startedAt: Date.now(),
      }
      runs.set(id, e)
      byName.set(name, id)
      const g = ensureGroup(group)
      if (!g.runIds.includes(id)) g.runIds.push(id)
      return { id, group, name, status: 'registered' }
    },
  })

  ctx.tools.register({
    name: 'workflow_groups',
    description: '列出当前按组归类的 workflow 运行状态（只读）：每个分组的独立面板内容，包括每个 workflow 的状态、阶段进度、子 agent 明细与最近日志。用于查看 GUI「工作流」标签页背后的数据。',
    parameters: { type: 'object', properties: {} },
    output: {
      schema: { type: 'json' },
      render: (args: unknown, value: unknown) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute() {
      return { groups: snapshot() }
    },
  })

  // ---- HTTP routes (client half fetches these) ----
  const routes = [
    getRoute(`${API_PREFIX}/list`, async () => ({ groups: snapshot() })),
    postRoute(`${API_PREFIX}/clear`, async () => {
      groups.clear()
      runs.clear()
      byName.clear()
      return { cleared: true }
    }),
  ]
  // Register routes for the fiber lifetime. ctx.effect(callback) treats the
  // callback's RETURN value as the disposer — so pass a thunk that registers
  // and returns the cleanup, never the disposer itself (that would dispose
  // immediately when the effect callback is the disposer).
  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route))
    return () => {
      for (const dispose of disposers) dispose()
    }
  })
}
