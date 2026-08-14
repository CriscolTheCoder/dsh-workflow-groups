/**
 * dsh-workflow-groups — client half.
 *
 * Registers the「工作流」conversation view tab (a sibling of chat /
 * trajectory in the view ring). Renders one panel per group, each group
 * showing its workflows with status badge, phase progress, agent details
 * and recent logs. Polls /api/workflow-groups/list every 2s.
 *
 * Export discipline (packages/client rule): the /client surface carries what
 * cordis loading needs plus types only — all value exports stay internal.
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the slot system's Context merge (ctx.slots).
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { createElement, useEffect, useState } from 'react'

export const name = 'workflow-groups-client'
export const inject = ['slots']

const API_PREFIX = '/api/workflow-groups'

async function fetchList(): Promise<{ groups: any[] }> {
  const response = await fetch(`${API_PREFIX}/list`, { method: 'GET' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function fetchClear(): Promise<{ cleared: boolean }> {
  const response = await fetch(`${API_PREFIX}/clear`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

const css = `
.wf-board{padding:14px 16px;display:flex;flex-direction:column;gap:14px;color:var(--dsw-alias-label-primary);font-size:13px;}
.wf-head{display:flex;align-items:center;gap:10px;font-weight:600;font-size:15px;}
.wf-head .wf-muted{color:var(--dsw-alias-label-secondary);font-weight:400;font-size:12px;}
.wf-btn{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);border-radius:6px;padding:2px 10px;font-size:12px;cursor:pointer;}
.wf-btn:hover{opacity:.85}
.wf-empty{color:var(--dsw-alias-label-secondary);padding:24px;text-align:center;border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;}
.wf-group{background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;}
.wf-group-head{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;}
.wf-badge{font-size:11px;line-height:1;padding:3px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);}
.wf-wf{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-layer-2);padding:8px 10px;display:flex;flex-direction:column;gap:6px;}
.wf-wf-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.wf-wf-name{font-weight:600;}
.wf-status{font-size:11px;line-height:1;padding:3px 8px;border-radius:999px;}
.wf-status.running{color:var(--dsw-alias-brand-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);}
.wf-status.completed{color:var(--dsw-alias-state-success-primary);background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);}
.wf-status.error{color:var(--dsw-alias-state-error-primary);background:color-mix(in srgb,var(--dsw-alias-state-error-primary) 14%,transparent);}
.wf-status.cancelled{color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);}
.wf-status.registered{color:var(--dsw-alias-state-warn-primary);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);}
.wf-desc{color:var(--dsw-alias-label-secondary);}
.wf-phases{display:flex;gap:6px;flex-wrap:wrap;}
.wf-phase{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);}
.wf-phase.current{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary);}
.wf-phase .wf-num{opacity:.75;margin-left:4px;}
.wf-agents{display:flex;flex-direction:column;gap:2px;}
.wf-agent{display:flex;gap:6px;align-items:center;font-size:12px;color:var(--dsw-alias-label-secondary);}
.wf-agent .wf-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-border-l2);flex:none;}
.wf-agent .wf-dot.running{background:var(--dsw-alias-brand-primary);}
.wf-agent .wf-dot.completed{background:var(--dsw-alias-state-success-primary);}
.wf-agent .wf-dot.failed{background:var(--dsw-alias-state-error-primary);}
.wf-agent .wf-dot.cancelled{background:var(--dsw-alias-label-secondary);}
.wf-logs{margin-top:2px;font-size:11px;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:6px 8px;max-height:120px;overflow:auto;white-space:pre-wrap;word-break:break-word;}
.wf-time{font-size:11px;color:var(--dsw-alias-label-secondary);}
`

export function apply(ctx: ClientContext): void {
  const slots = ctx.get('slots')
  if (slots === undefined) return

  // styles are injected by the shell; keep the stylesheet scoped and idempotent
  const tag = document.createElement('style')
  tag.textContent = css
  tag.setAttribute('data-dsh-workflow-groups', '')
  document.head.appendChild(tag)
  // ctx.effect(callback) runs callback now and treats its RETURN as the
  // disposer — so wrap the removal in a thunk.
  ctx.effect(() => () => { tag.remove() })

  const timeStr = (t: number | null | undefined) => {
    if (!t) return ''
    try { return new Date(t).toLocaleTimeString() } catch { return '' }
  }
  const statusLabel = (s: string) => s === 'running' ? '运行中' : s === 'completed' ? '完成' : s === 'error' ? '出错' : s === 'registered' ? '已登记' : '已取消'
  const outcomeLabel = (o: string) => o === 'completed' ? '成功' : o === 'failed' ? '失败' : '取消'

  function WorkflowCard(props: { wf: any }) {
    const wf = props.wf
    const [showAll, setShowAll] = useState(false)
    const shown = showAll ? wf.logs : wf.logs.slice(-3)
    const children: any[] = []
    children.push(
      createElement('div', { className: 'wf-wf-top' },
        createElement('span', { className: 'wf-wf-name' }, wf.name),
        createElement('span', { className: 'wf-status ' + wf.status }, statusLabel(wf.status)),
        createElement('span', { className: 'wf-time' }, timeStr(wf.startedAt)),
      ),
    )
    if (wf.description) children.push(createElement('div', { className: 'wf-desc' }, wf.description))
    if (wf.phases.length) {
      children.push(
        createElement('div', { className: 'wf-phases' },
          wf.phases.map((p: any) =>
            createElement('span', { className: 'wf-phase' + (p.current ? ' current' : '') },
              p.title,
              createElement('span', { className: 'wf-num' }, p.doneAgents + '/' + p.totalAgents),
            )),
        ),
      )
    }
    if (wf.agents.length) {
      children.push(
        createElement('div', { className: 'wf-agents' },
          wf.agents.map((a: any) =>
            createElement('div', { className: 'wf-agent' },
              createElement('span', { className: 'wf-dot ' + (a.outcome || (wf.status === 'running' ? 'running' : '')) }),
              createElement('span', null, '#' + a.seq + ' ' + a.label),
              a.phase ? createElement('span', null, '· ' + a.phase) : null,
              a.outcome ? createElement('span', null, '· ' + outcomeLabel(a.outcome)) : null,
            )),
        ),
      )
    }
    if (wf.result && wf.result.error) children.push(createElement('div', { className: 'wf-desc' }, '错误: ' + wf.result.error))
    if (shown.length) children.push(createElement('div', { className: 'wf-logs' }, shown.map((l: any) => '[' + timeStr(l.at) + '] ' + l.message).join('\n')))
    if (wf.logs.length > 3) {
      children.push(
        createElement('button', { className: 'wf-btn', onClick: () => setShowAll(!showAll) },
          showAll ? '收起日志' : '展开全部日志 (' + wf.logs.length + ')'),
      )
    }
    return createElement('div', { className: 'wf-wf' }, children)
  }

  function GroupPanel(props: { g: any }) {
    const g = props.g
    const running = g.workflows.filter((w: any) => w.status === 'running').length
    const head: any[] = [createElement('span', null, g.name)]
    head.push(createElement('span', { className: 'wf-badge' }, g.workflows.length + ' 个 workflow'))
    if (running) head.push(createElement('span', { className: 'wf-badge' }, running + ' 运行中'))
    return createElement('div', { className: 'wf-group' },
      createElement('div', { className: 'wf-group-head' }, head),
      g.workflows.map((w: any) => createElement(WorkflowCard, { key: w.id, wf: w })),
    )
  }

  slots.inject('conversation.view', () => slots.register(
    { name: 'conversation.view', id: 'wf-board', order: 20, label: '工作流' },
    function WorkflowBoard() {
      const [groups, setGroups] = useState<any[] | null>(null)
      const [updated, setUpdated] = useState<Date | null>(null)
      const [err, setErr] = useState<string | null>(null)
      const [fatal, setFatal] = useState<string | null>(null)
      // surface any render-time crash instead of a blank view
      useEffect(() => {
        const onErr = (e: ErrorEvent) => {
          setFatal(String(e.message || e.error))
        }
        window.addEventListener('error', onErr)
        return () => window.removeEventListener('error', onErr)
      }, [])
      const load = () => {
        fetchList().then((d) => { setGroups(d.groups || []); setUpdated(new Date()); setErr(null) })
          .catch((e) => setErr(String((e && e.message) || e)))
      }
      const clearAll = () => { fetchClear().then(() => load()).catch(() => {}) }
      useEffect(() => {
        let alive = true
        const tick = () => {
          fetchList().then((d) => { if (alive) { setGroups(d.groups || []); setUpdated(new Date()); setErr(null) } })
            .catch((e) => { if (alive) setErr(String((e && e.message) || e)) })
        }
        tick()
        const handle = window.setInterval(tick, 2000)
        return () => { alive = false; window.clearInterval(handle) }
      }, [])
      const children: any[] = []
      const headKids: any[] = [createElement('span', null, '工作流分组')]
      if (updated) headKids.push(createElement('span', { className: 'wf-muted' }, '更新于 ' + timeStr(updated.getTime())))
      headKids.push(createElement('button', { className: 'wf-btn', onClick: () => load() }, '刷新'))
      headKids.push(createElement('button', { className: 'wf-btn', onClick: clearAll }, '清空'))
      children.push(createElement('div', { className: 'wf-head' }, headKids))
      if (fatal) children.push(createElement('div', { className: 'wf-empty' }, '渲染错误: ' + fatal))
      else if (err) children.push(createElement('div', { className: 'wf-empty' }, '加载失败: ' + err))
      else if (!groups) children.push(createElement('div', { className: 'wf-empty' }, '加载中…'))
      else if (!groups.length) children.push(createElement('div', { className: 'wf-empty' }, '还没有分组 workflow。让 Agent 调用 workflow_new 工具创建并启动。'))
      else groups.forEach((g) => children.push(createElement(GroupPanel, { key: g.name, g })))
      return createElement('div', { className: 'wf-board' }, children)
    },
  ))
}
