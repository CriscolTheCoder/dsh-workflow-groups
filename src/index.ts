/**
 * dsh-workflow-groups — host half.
 *
 * Builds a grouped view of workflow runs for the「工作流」board. Data source:
 * the DSH workflow engine's persisted run directory (.dsh/workflow-runs) —
 * read directly from disk (run.json + manifest.json + events.jsonl), so no
 * event-stream wiring is required. Group names are persisted in
 * ~/.dsh/dsh-workflow-groups.json (runId → group), written by `workflow_new`.
 *
 * Exposes:
 *   - model tools `workflow_new` (create + start a grouped workflow via
 *     ctx.dynamicWorkflows.startInline, or register it when the engine is
 *     unreachable) and `workflow_groups` (read-only grouped snapshot),
 *   - HTTP JSON routes `/api/workflow-groups/list` and
 *     `/api/workflow-groups/clear` for the client half.
 */
import { Context } from '@deepseek-ai/cordis'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

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

/** Persisted runId → group mapping (survives plugin restarts). */
const GROUP_MAP_PATH = join(process.env.DSH_HOME ?? homedir(), '.dsh', 'dsh-workflow-groups.json')

function loadGroupMap(): Record<string, string> {
  try {
    // strip a UTF-8 BOM (PowerShell/记事本-written JSON) — JSON.parse rejects it
    const text = readFileSync(GROUP_MAP_PATH, 'utf8').replace(/^\uFEFF/, '')
    const parsed = JSON.parse(text) as Record<string, string>
    return typeof parsed === 'object' && parsed !== null ? parsed : {}
  } catch {
    return {}
  }
}

function saveGroupMap(map: Record<string, string>): void {
  try {
    mkdirSync(join(process.env.DSH_HOME ?? homedir(), '.dsh'), { recursive: true })
    writeFileSync(GROUP_MAP_PATH, JSON.stringify(map, null, 2), 'utf8')
  } catch {
    // mapping persistence is best-effort
  }
}

/** Candidate run directories (the engine's default runDirectory is `.dsh/workflow-runs` relative to cwd). */
function runDirs(): string[] {
  const candidates = [
    join(process.cwd(), '.dsh', 'workflow-runs'),
    join(process.env.DSH_HOME ?? '', 'workflow-runs'),
    join(homedir(), '.dsh', 'workflow-runs'),
  ]
  return [...new Set(candidates)].filter((dir) => existsSync(dir))
}

function mapStatus(status: string): string {
  if (status === 'completed') return 'completed'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'running' || status === 'paused') return 'running'
  return 'error' // failed / denied / stopped
}

/** Parse one run directory into a RunEntry (or undefined when run.json is missing). */
function parseRunDir(dir: string, groupMap: Record<string, string>): RunEntry | undefined {
  const runPath = join(dir, 'run.json')
  if (!existsSync(runPath)) return undefined
  let run: any
  try {
    run = JSON.parse(readFileSync(runPath, 'utf8'))
  } catch {
    return undefined
  }
  const id = String(run.runId ?? '')
  const name = String(run.workflow ?? run.displayName ?? '未命名')

  let manifestDescription = ''
  try {
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
    manifestDescription = String(manifest.description ?? '')
  } catch { /* no manifest */ }

  // events.jsonl → agents + logs + phase activity
  const agents: AgentView[] = []
  const logs: { at: number; message: string }[] = []
  const phaseTitles: string[] = []
  let currentPhase: string | undefined
  let lastAgentSeq = 0
  try {
    const eventsText = readFileSync(join(dir, 'events.jsonl'), 'utf8')
    for (const line of eventsText.split('\n')) {
      if (!line.trim()) continue
      let ev: any
      try { ev = JSON.parse(line) } catch { continue }
      const at = Number(ev.time ?? Date.now())
      const type = String(ev.type ?? '')
      const data = (ev.data ?? {}) as any
      if (type === 'phase-started') {
        currentPhase = String(data.name ?? '')
        if (!phaseTitles.includes(currentPhase)) phaseTitles.push(currentPhase)
      } else if (type === 'phase-completed') {
        if (data.name === currentPhase) currentPhase = undefined
      } else if (type === 'agent-started') {
        lastAgentSeq += 1
        agents.push({
          seq: lastAgentSeq,
          label: String(data.name ?? 'agent'),
          phase: data.phase === undefined ? undefined : String(data.phase),
        })
      } else if (type === 'agent-completed') {
        const byTask = agents.find((a) => a.label === String(data.name ?? '') && !a.outcome)
        const target = byTask ?? agents[agents.length - 1]
        if (target) target.outcome = String(data.outcome ?? 'completed')
      } else if (type === 'workflow-log') {
        logs.push({ at, message: String(data.message ?? '') })
      }
    }
  } catch { /* no events */ }

  // phases: declared in manifest + any seen in events
  let declaredPhases: string[] = []
  try {
    const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'))
    if (Array.isArray(manifest.phases)) declaredPhases = manifest.phases.map((p: any) => String(p))
  } catch { /* no manifest */ }
  const phaseNames = [...new Set([...declaredPhases, ...phaseTitles])]
  const phases: PhaseView[] = phaseNames.map((title) => {
    const count = agents.filter((a) => a.phase === title).length
    const done = agents.filter((a) => a.phase === title && (a.outcome === 'completed' || a.outcome === 'failed' || a.outcome === 'stopped')).length
    return { title, totalAgents: count, doneAgents: done, current: title === currentPhase }
  })
  if (phases.length === 0 && agents.length > 0) {
    // agent events exist but no phase names — group them under a generic phase
    phases.push({ title: 'run', totalAgents: agents.length, doneAgents: agents.filter((a) => a.outcome).length, current: false })
  }

  const result = run.result && typeof run.result === 'object'
    ? {
        stopReason: String(run.result.stopReason ?? 'error'),
        error: run.result.error === undefined || run.result.error === null ? undefined : String(run.result.error),
        agentsStarted: Number(run.result.agentsStarted ?? agents.length),
      }
    : undefined

  return {
    id,
    group: groupMap[id] ?? '未分组',
    name,
    description: manifestDescription,
    status: mapStatus(String(run.status ?? 'running')),
    startedAt: Number(run.startedAt ?? Date.now()),
    endedAt: run.endedAt === undefined || run.endedAt === null ? undefined : Number(run.endedAt),
    phases,
    agents,
    logs,
    result,
  }
}

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
  // ---- in-memory registered placeholders (engine unreachable) ----
  const groups = new Map<string, { name: string; createdAt: number; runIds: string[] }>()
  const runs = new Map<string, RunEntry>()

  const ensureGroup = (name: string) => {
    let g = groups.get(name)
    if (!g) {
      g = { name, createdAt: Date.now(), runIds: [] }
      groups.set(name, g)
    }
    return g
  }

  const upsertRun = (id: string, group: string, entry: Omit<RunEntry, 'id' | 'group'>) => {
    let e = runs.get(id)
    if (!e) {
      e = { id, group, ...entry }
      runs.set(id, e)
    }
    return e
  }

  // ---- grouped snapshot: disk runs + registered placeholders ----
  const snapshot = () => {
    const groupMap = loadGroupMap()
    const byGroup = new Map<string, RunEntry[]>()

    const push = (e: RunEntry) => {
      const list = byGroup.get(e.group) ?? []
      list.push(e)
      byGroup.set(e.group, list)
    }

    for (const dir of runDirs()) {
      const entries = readdirRuns(dir)
      for (const sub of entries) {
        const parsed = parseRunDir(sub, groupMap)
        if (parsed) push(parsed)
      }
    }

    for (const e of runs.values()) push(e)

    // de-duplicate by run id (registered placeholder superseded by a disk run)
    const deduped = new Map<string, RunEntry>()
    for (const [group, entries] of byGroup) {
      for (const e of entries) deduped.set(e.id, e)
      const unique = [...deduped.values()].filter((e) => e.group === group)
      byGroup.set(group, unique)
    }

    const groupsOut: unknown[] = []
    for (const [group, entries] of [...byGroup.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      groupsOut.push({
        name: group,
        createdAt: groups.get(group)?.createdAt ?? Date.now(),
        workflows: entries
          .sort((a, b) => b.startedAt - a.startedAt)
          .map((e) => ({
            id: e.id,
            name: e.name,
            description: e.description,
            status: e.status,
            startedAt: e.startedAt,
            endedAt: e.endedAt ?? null,
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
    description: '创建并立即启动一个新的分组工作流（workflow）。必须提供 group（分组名）、name、description 与 script（纯 JS 脚本体，允许 top-level await，以 return <json> 结尾）。脚本内可用 agent(prompt, opts) 派生子 agent、phase(title) 进入阶段、log(message) 输出日志。运行状态会实时显示在 GUI 的「工作流」标签页中，同分组的 workflow 显示在同一个独立面板。若当前环境无法直接启动引擎，将登记为「已登记」条目。',
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
      // DSH JSON-Schema subset requires `required` at the OBJECT level as a
      // string array — NOT `required: true` inside each property.
      required: ['group', 'name', 'description', 'script'],
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          group: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string' },
        },
        required: ['id', 'group', 'name', 'status'],
      },
      render: (args: unknown, value: unknown) => [{ type: 'text', text: JSON.stringify(value) }],
    },
    async execute(args: any, exec: any) {
      const name = String(args.name ?? '')
      const group = String(args.group ?? '')
      const description = String(args.description ?? '')
      const script = String(args.script ?? '')
      const engine = (ctx as any).get?.('dynamicWorkflows') as { startInline(agent: any, module: any, args?: unknown, signal?: any, source?: string, approvalGranted?: boolean): Promise<{ id: string }> } | undefined
      if (engine) {
        if (!exec?.agent) return { id: '', group, name, status: 'error: 缺少 agent 上下文' }
        const phaseTitles: string[] = Array.isArray(args.phases) ? args.phases.map((p: any) => String(p?.title ?? '')).filter(Boolean) : []
        const manifest = {
          name,
          description,
          phases: phaseTitles,
          readOnly: false,
          maxAgents: args.maxTotalAgents ? Number(args.maxTotalAgents) : 8,
          maxConcurrency: 2,
          patterns: ['classify-and-act'],
          execution: 'capability-generated',
        }
        try {
          const run = await engine.startInline(
            exec.agent,
            { manifest, execution: 'capability-generated', source: script },
            args.args,
            undefined,
            'inline',
            true, // approvalGranted — the board owns workflow starts
          )
          const map = loadGroupMap()
          map[String(run.id)] = group
          saveGroupMap(map)
          upsertRun(String(run.id), group, {
            name, description, status: 'running', startedAt: Date.now(), phases: phaseTitles.map((title) => ({ title, totalAgents: 0, doneAgents: 0, current: false })), agents: [], logs: [],
          })
          const g = ensureGroup(group)
          if (!g.runIds.includes(String(run.id))) g.runIds.push(String(run.id))
          return { id: String(run.id), group, name, status: 'running' }
        } catch (error) {
          return { id: '', group, name, status: 'error: ' + (error instanceof Error ? error.message : String(error)) }
        }
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
      schema: { type: 'object', additionalProperties: true },
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
      saveGroupMap({})
      return { cleared: true }
    }),
  ]
  // Register routes for the fiber lifetime. ctx.effect(callback) treats the
  // callback's RETURN value as the disposer — so pass a thunk that registers
  // and returns the cleanup, never the disposer itself.
  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route))
    return () => {
      for (const dispose of disposers) dispose()
    }
  })
}

/** List immediate subdirectories of a run directory (each holds one run). */
function readdirRuns(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(dir, d.name))
  } catch {
    return []
  }
}
