// src/client.ts
import { createElement, useEffect, useState } from "react";
var name = "workflow-groups-client";
var inject = ["slots", "timer"];
var API_PREFIX = "/api/workflow-groups";
async function fetchList() {
  const response = await fetch(`${API_PREFIX}/list`, { method: "GET" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function fetchClear() {
  const response = await fetch(`${API_PREFIX}/clear`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
var css = `
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
`;
function apply(ctx) {
  const slots = ctx.get("slots");
  if (slots === void 0) return;
  const tag = document.createElement("style");
  tag.textContent = css;
  tag.setAttribute("data-dsh-workflow-groups", "");
  document.head.appendChild(tag);
  ctx.effect(() => {
    tag.remove();
  });
  const timeStr = (t) => {
    if (!t) return "";
    try {
      return new Date(t).toLocaleTimeString();
    } catch {
      return "";
    }
  };
  const statusLabel = (s) => s === "running" ? "\u8FD0\u884C\u4E2D" : s === "completed" ? "\u5B8C\u6210" : s === "error" ? "\u51FA\u9519" : s === "registered" ? "\u5DF2\u767B\u8BB0" : "\u5DF2\u53D6\u6D88";
  const outcomeLabel = (o) => o === "completed" ? "\u6210\u529F" : o === "failed" ? "\u5931\u8D25" : "\u53D6\u6D88";
  function WorkflowCard(props) {
    const wf = props.wf;
    const [showAll, setShowAll] = useState(false);
    const shown = showAll ? wf.logs : wf.logs.slice(-3);
    const children = [];
    children.push(
      createElement(
        "div",
        { className: "wf-wf-top" },
        createElement("span", { className: "wf-wf-name" }, wf.name),
        createElement("span", { className: "wf-status " + wf.status }, statusLabel(wf.status)),
        createElement("span", { className: "wf-time" }, timeStr(wf.startedAt))
      )
    );
    if (wf.description) children.push(createElement("div", { className: "wf-desc" }, wf.description));
    if (wf.phases.length) {
      children.push(
        createElement(
          "div",
          { className: "wf-phases" },
          wf.phases.map((p) => createElement(
            "span",
            { className: "wf-phase" + (p.current ? " current" : "") },
            p.title,
            createElement("span", { className: "wf-num" }, p.doneAgents + "/" + p.totalAgents)
          ))
        )
      );
    }
    if (wf.agents.length) {
      children.push(
        createElement(
          "div",
          { className: "wf-agents" },
          wf.agents.map((a) => createElement(
            "div",
            { className: "wf-agent" },
            createElement("span", { className: "wf-dot " + (a.outcome || (wf.status === "running" ? "running" : "")) }),
            createElement("span", null, "#" + a.seq + " " + a.label),
            a.phase ? createElement("span", null, "\xB7 " + a.phase) : null,
            a.outcome ? createElement("span", null, "\xB7 " + outcomeLabel(a.outcome)) : null
          ))
        )
      );
    }
    if (wf.result && wf.result.error) children.push(createElement("div", { className: "wf-desc" }, "\u9519\u8BEF: " + wf.result.error));
    if (shown.length) children.push(createElement("div", { className: "wf-logs" }, shown.map((l) => "[" + timeStr(l.at) + "] " + l.message).join("\n")));
    if (wf.logs.length > 3) {
      children.push(
        createElement(
          "button",
          { className: "wf-btn", onClick: () => setShowAll(!showAll) },
          showAll ? "\u6536\u8D77\u65E5\u5FD7" : "\u5C55\u5F00\u5168\u90E8\u65E5\u5FD7 (" + wf.logs.length + ")"
        )
      );
    }
    return createElement("div", { className: "wf-wf" }, children);
  }
  function GroupPanel(props) {
    const g = props.g;
    const running = g.workflows.filter((w) => w.status === "running").length;
    const head = [createElement("span", null, g.name)];
    head.push(createElement("span", { className: "wf-badge" }, g.workflows.length + " \u4E2A workflow"));
    if (running) head.push(createElement("span", { className: "wf-badge" }, running + " \u8FD0\u884C\u4E2D"));
    return createElement(
      "div",
      { className: "wf-group" },
      createElement("div", { className: "wf-group-head" }, head),
      g.workflows.map((w) => createElement(WorkflowCard, { key: w.id, wf: w }))
    );
  }
  slots.inject("conversation.view", () => slots.register(
    { name: "conversation.view", id: "wf-board", order: 20, label: "\u5DE5\u4F5C\u6D41" },
    function WorkflowBoard() {
      const [groups, setGroups] = useState(null);
      const [updated, setUpdated] = useState(null);
      const [err, setErr] = useState(null);
      const load = () => {
        fetchList().then((d) => {
          setGroups(d.groups || []);
          setUpdated(/* @__PURE__ */ new Date());
          setErr(null);
        }).catch((e) => setErr(String(e && e.message || e)));
      };
      const clearAll = () => {
        fetchClear().then(() => load()).catch(() => {
        });
      };
      useEffect(() => {
        let alive = true;
        const tick = () => {
          fetchList().then((d) => {
            if (alive) {
              setGroups(d.groups || []);
              setUpdated(/* @__PURE__ */ new Date());
              setErr(null);
            }
          }).catch((e) => {
            if (alive) setErr(String(e && e.message || e));
          });
        };
        tick();
        const stop = ctx.interval(tick, 2e3);
        return () => {
          alive = false;
          stop();
        };
      }, []);
      const children = [];
      const headKids = [createElement("span", null, "\u5DE5\u4F5C\u6D41\u5206\u7EC4")];
      if (updated) headKids.push(createElement("span", { className: "wf-muted" }, "\u66F4\u65B0\u4E8E " + timeStr(updated.getTime())));
      headKids.push(createElement("button", { className: "wf-btn", onClick: () => load() }, "\u5237\u65B0"));
      headKids.push(createElement("button", { className: "wf-btn", onClick: clearAll }, "\u6E05\u7A7A"));
      children.push(createElement("div", { className: "wf-head" }, headKids));
      if (err) children.push(createElement("div", { className: "wf-empty" }, "\u52A0\u8F7D\u5931\u8D25: " + err));
      else if (!groups) children.push(createElement("div", { className: "wf-empty" }, "\u52A0\u8F7D\u4E2D\u2026"));
      else if (!groups.length) children.push(createElement("div", { className: "wf-empty" }, "\u8FD8\u6CA1\u6709\u5206\u7EC4 workflow\u3002\u8BA9 Agent \u8C03\u7528 workflow_new \u5DE5\u5177\u521B\u5EFA\u5E76\u542F\u52A8\u3002"));
      else groups.forEach((g) => children.push(createElement(GroupPanel, { key: g.name, g })));
      return createElement("div", { className: "wf-board" }, children);
    }
  ));
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=client.js.map
