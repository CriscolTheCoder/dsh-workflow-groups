// src/index.ts
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
var name = "workflow-groups";
var inject = ["webServer", "tools"];
var API_PREFIX = "/api/workflow-groups";
var GROUP_MAP_PATH = join(process.env.DSH_HOME ?? homedir(), ".dsh", "dsh-workflow-groups.json");
function loadGroupMap() {
  try {
    const text = readFileSync(GROUP_MAP_PATH, "utf8").replace(/^\uFEFF/, "");
    const parsed = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
function saveGroupMap(map) {
  try {
    mkdirSync(join(process.env.DSH_HOME ?? homedir(), ".dsh"), { recursive: true });
    writeFileSync(GROUP_MAP_PATH, JSON.stringify(map, null, 2), "utf8");
  } catch {
  }
}
function runDirs() {
  const candidates = [
    join(process.cwd(), ".dsh", "workflow-runs"),
    join(process.env.DSH_HOME ?? "", "workflow-runs"),
    join(homedir(), ".dsh", "workflow-runs")
  ];
  return [...new Set(candidates)].filter((dir) => existsSync(dir));
}
function mapStatus(status) {
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "running" || status === "paused") return "running";
  return "error";
}
function parseRunDir(dir, groupMap) {
  const runPath = join(dir, "run.json");
  if (!existsSync(runPath)) return void 0;
  let run;
  try {
    run = JSON.parse(readFileSync(runPath, "utf8"));
  } catch {
    return void 0;
  }
  const id = String(run.runId ?? "");
  const name2 = String(run.workflow ?? run.displayName ?? "\u672A\u547D\u540D");
  let manifestDescription = "";
  try {
    const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    manifestDescription = String(manifest.description ?? "");
  } catch {
  }
  const agents = [];
  const logs = [];
  const phaseTitles = [];
  let currentPhase;
  let lastAgentSeq = 0;
  try {
    const eventsText = readFileSync(join(dir, "events.jsonl"), "utf8");
    for (const line of eventsText.split("\n")) {
      if (!line.trim()) continue;
      let ev;
      try {
        ev = JSON.parse(line);
      } catch {
        continue;
      }
      const at = Number(ev.time ?? Date.now());
      const type = String(ev.type ?? "");
      const data = ev.data ?? {};
      if (type === "phase-started") {
        currentPhase = String(data.name ?? "");
        if (!phaseTitles.includes(currentPhase)) phaseTitles.push(currentPhase);
      } else if (type === "phase-completed") {
        if (data.name === currentPhase) currentPhase = void 0;
      } else if (type === "agent-started") {
        lastAgentSeq += 1;
        agents.push({
          seq: lastAgentSeq,
          label: String(data.name ?? "agent"),
          phase: data.phase === void 0 ? void 0 : String(data.phase)
        });
      } else if (type === "agent-completed") {
        const byTask = agents.find((a) => a.label === String(data.name ?? "") && !a.outcome);
        const target = byTask ?? agents[agents.length - 1];
        if (target) target.outcome = String(data.outcome ?? "completed");
      } else if (type === "workflow-log") {
        logs.push({ at, message: String(data.message ?? "") });
      }
    }
  } catch {
  }
  let declaredPhases = [];
  try {
    const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    if (Array.isArray(manifest.phases)) declaredPhases = manifest.phases.map((p) => String(p));
  } catch {
  }
  const phaseNames = [.../* @__PURE__ */ new Set([...declaredPhases, ...phaseTitles])];
  const phases = phaseNames.map((title) => {
    const count = agents.filter((a) => a.phase === title).length;
    const done = agents.filter((a) => a.phase === title && (a.outcome === "completed" || a.outcome === "failed" || a.outcome === "stopped")).length;
    return { title, totalAgents: count, doneAgents: done, current: title === currentPhase };
  });
  if (phases.length === 0 && agents.length > 0) {
    phases.push({ title: "run", totalAgents: agents.length, doneAgents: agents.filter((a) => a.outcome).length, current: false });
  }
  const result = run.result && typeof run.result === "object" ? {
    stopReason: String(run.result.stopReason ?? "error"),
    error: run.result.error === void 0 || run.result.error === null ? void 0 : String(run.result.error),
    agentsStarted: Number(run.result.agentsStarted ?? agents.length)
  } : void 0;
  return {
    id,
    group: groupMap[id] ?? "\u672A\u5206\u7EC4",
    name: name2,
    description: manifestDescription,
    status: mapStatus(String(run.status ?? "running")),
    startedAt: Number(run.startedAt ?? Date.now()),
    endedAt: run.endedAt === void 0 || run.endedAt === null ? void 0 : Number(run.endedAt),
    phases,
    agents,
    logs,
    result
  };
}
function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { "content-type": "application/json", "content-length": String(Buffer.byteLength(body)) });
  res.end(body);
}
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {});
      } catch {
        reject(new Error("invalid-json"));
      }
    });
    req.on("error", reject);
  });
}
function getRoute(path, run) {
  return {
    kind: "exact",
    path,
    handler: (req, res) => {
      if (req.method !== "GET" && req.method !== "HEAD") {
        res.writeHead(405);
        res.end();
        return;
      }
      run().then((value) => json(res, 200, value), (error) => {
        json(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      });
    }
  };
}
function postRoute(path, run) {
  return {
    kind: "exact",
    path,
    handler: (req, res) => {
      if (req.method !== "POST") {
        res.writeHead(405);
        res.end();
        return Promise.resolve();
      }
      return readJsonBody(req).then((body) => {
        return run(typeof body === "object" && body !== null ? body : {}).then((value) => json(res, 200, value), (error) => {
          json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
        });
      }, (error) => {
        json(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      });
    }
  };
}
function apply(ctx) {
  const groups = /* @__PURE__ */ new Map();
  const runs = /* @__PURE__ */ new Map();
  const ensureGroup = (name2) => {
    let g = groups.get(name2);
    if (!g) {
      g = { name: name2, createdAt: Date.now(), runIds: [] };
      groups.set(name2, g);
    }
    return g;
  };
  const upsertRun = (id, group, entry) => {
    let e = runs.get(id);
    if (!e) {
      e = { id, group, ...entry };
      runs.set(id, e);
    }
    return e;
  };
  const snapshot = () => {
    const groupMap = loadGroupMap();
    const byGroup = /* @__PURE__ */ new Map();
    const push = (e) => {
      const list = byGroup.get(e.group) ?? [];
      list.push(e);
      byGroup.set(e.group, list);
    };
    for (const dir of runDirs()) {
      const entries = readdirRuns(dir);
      for (const sub of entries) {
        const parsed = parseRunDir(sub, groupMap);
        if (parsed) push(parsed);
      }
    }
    for (const e of runs.values()) push(e);
    const deduped = /* @__PURE__ */ new Map();
    for (const [group, entries] of byGroup) {
      for (const e of entries) deduped.set(e.id, e);
      const unique = [...deduped.values()].filter((e) => e.group === group);
      byGroup.set(group, unique);
    }
    const groupsOut = [];
    for (const [group, entries] of [...byGroup.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1)) {
      groupsOut.push({
        name: group,
        createdAt: groups.get(group)?.createdAt ?? Date.now(),
        workflows: entries.sort((a, b) => b.startedAt - a.startedAt).map((e) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          status: e.status,
          startedAt: e.startedAt,
          endedAt: e.endedAt ?? null,
          phases: e.phases.map((p) => ({ title: p.title, totalAgents: p.totalAgents, doneAgents: p.doneAgents, current: p.current })),
          agents: e.agents.map((a) => ({ seq: a.seq, label: a.label, phase: a.phase ?? null, outcome: a.outcome ?? null })),
          logs: e.logs.slice(-60).map((l) => ({ at: l.at, message: l.message })),
          result: e.result ? { stopReason: e.result.stopReason, error: e.result.error ?? "", agentsStarted: e.result.agentsStarted } : null
        }))
      });
    }
    return groupsOut;
  };
  ctx.tools.register({
    name: "workflow_new",
    description: "\u521B\u5EFA\u5E76\u7ACB\u5373\u542F\u52A8\u4E00\u4E2A\u65B0\u7684\u5206\u7EC4\u5DE5\u4F5C\u6D41\uFF08workflow\uFF09\u3002\u5FC5\u987B\u63D0\u4F9B group\uFF08\u5206\u7EC4\u540D\uFF09\u3001name\u3001description \u4E0E script\uFF08\u7EAF JS \u811A\u672C\u4F53\uFF0C\u5141\u8BB8 top-level await\uFF0C\u4EE5 return <json> \u7ED3\u5C3E\uFF09\u3002\u811A\u672C\u5185\u53EF\u7528 agent(prompt, opts) \u6D3E\u751F\u5B50 agent\u3001phase(title) \u8FDB\u5165\u9636\u6BB5\u3001log(message) \u8F93\u51FA\u65E5\u5FD7\u3002\u8FD0\u884C\u72B6\u6001\u4F1A\u5B9E\u65F6\u663E\u793A\u5728 GUI \u7684\u300C\u5DE5\u4F5C\u6D41\u300D\u6807\u7B7E\u9875\u4E2D\uFF0C\u540C\u5206\u7EC4\u7684 workflow \u663E\u793A\u5728\u540C\u4E00\u4E2A\u72EC\u7ACB\u9762\u677F\u3002\u82E5\u5F53\u524D\u73AF\u5883\u65E0\u6CD5\u76F4\u63A5\u542F\u52A8\u5F15\u64CE\uFF0C\u5C06\u767B\u8BB0\u4E3A\u300C\u5DF2\u767B\u8BB0\u300D\u6761\u76EE\u3002",
    parameters: {
      type: "object",
      properties: {
        group: { type: "string", description: "\u5206\u7EC4\u540D\uFF1A\u540C\u4E00\u5206\u7EC4\u7684 workflow \u5728 GUI \u4E2D\u663E\u793A\u5728\u540C\u4E00\u4E2A\u72EC\u7ACB\u9762\u677F\u3002" },
        name: { type: "string", description: "workflow \u540D\u79F0\uFF08\u77ED kebab-case\uFF0C\u5982 audit-codebase\uFF09\u3002" },
        description: { type: "string", description: "\u4E00\u53E5\u8BDD\u63CF\u8FF0\u8BE5 workflow \u505A\u4EC0\u4E48\u3002" },
        script: { type: "string", description: "workflow \u811A\u672C\u4F53\uFF1A\u7EAF JS\uFF08\u65E0 import/require/JSX\uFF09\uFF0C\u5141\u8BB8 top-level await\uFF0C\u4EE5 return <json \u503C> \u7ED3\u675F\u3002" },
        args: { description: "\u53EF\u9009 JSON \u53C2\u6570\uFF0C\u811A\u672C\u901A\u8FC7 args \u5168\u5C40\u8BFB\u53D6\u3002" },
        whenToUse: { type: "string", description: "\u53EF\u9009\uFF1A\u4F55\u65F6\u4F7F\u7528\u6B64 workflow \u7684\u8BF4\u660E\u3002" },
        phases: {
          type: "array",
          items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" }, provider: { type: "string" }, model: { type: "string" } }, required: ["title"] },
          description: "\u53EF\u9009\u9636\u6BB5\u58F0\u660E\uFF08\u8FDB\u5EA6\u5206\u7EC4\uFF09\uFF0Cphase() \u8C03\u7528\u6309\u6807\u9898\u7CBE\u786E\u5339\u914D\u3002"
        },
        subagentProvider: { type: "string", description: "\u53EF\u9009\uFF1A\u5B50 agent \u63D0\u4F9B\u8005\u540D\u79F0\u3002" },
        maxTotalAgents: { type: "number", description: "\u53EF\u9009\uFF1A\u672C\u6B21\u8FD0\u884C\u5B50 agent \u603B\u6570\u4E0A\u9650\u3002" }
      },
      // DSH JSON-Schema subset requires `required` at the OBJECT level as a
      // string array — NOT `required: true` inside each property.
      required: ["group", "name", "description", "script"]
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          group: { type: "string" },
          name: { type: "string" },
          status: { type: "string" }
        },
        required: ["id", "group", "name", "status"]
      },
      render: (args, value) => [{ type: "text", text: JSON.stringify(value) }]
    },
    async execute(args, exec) {
      const name2 = String(args.name ?? "");
      const group = String(args.group ?? "");
      const description = String(args.description ?? "");
      const script = String(args.script ?? "");
      const engine = ctx.get?.("dynamicWorkflows");
      if (engine) {
        if (!exec?.agent) return { id: "", group, name: name2, status: "error: \u7F3A\u5C11 agent \u4E0A\u4E0B\u6587" };
        const phaseTitles = Array.isArray(args.phases) ? args.phases.map((p) => String(p?.title ?? "")).filter(Boolean) : [];
        const manifest = {
          name: name2,
          description,
          phases: phaseTitles,
          readOnly: false,
          maxAgents: args.maxTotalAgents ? Number(args.maxTotalAgents) : 8,
          maxConcurrency: 2,
          patterns: ["classify-and-act"],
          execution: "capability-generated"
        };
        try {
          const run = await engine.startInline(
            exec.agent,
            { manifest, execution: "capability-generated", source: script },
            args.args,
            void 0,
            "inline",
            true
            // approvalGranted — the board owns workflow starts
          );
          const map = loadGroupMap();
          map[String(run.id)] = group;
          saveGroupMap(map);
          upsertRun(String(run.id), group, {
            name: name2,
            description,
            status: "running",
            startedAt: Date.now(),
            phases: phaseTitles.map((title) => ({ title, totalAgents: 0, doneAgents: 0, current: false })),
            agents: [],
            logs: []
          });
          const g2 = ensureGroup(group);
          if (!g2.runIds.includes(String(run.id))) g2.runIds.push(String(run.id));
          return { id: String(run.id), group, name: name2, status: "running" };
        } catch (error) {
          return { id: "", group, name: name2, status: "error: " + (error instanceof Error ? error.message : String(error)) };
        }
      }
      const id = `reg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const declared = Array.isArray(args.phases) ? args.phases : [];
      const e = {
        id,
        group,
        name: name2,
        description,
        status: "registered",
        phases: declared.map((p) => ({ title: String(p.title), detail: p.detail ? String(p.detail) : void 0, totalAgents: 0, doneAgents: 0, current: false })),
        agents: [],
        logs: [],
        startedAt: Date.now()
      };
      runs.set(id, e);
      const g = ensureGroup(group);
      if (!g.runIds.includes(id)) g.runIds.push(id);
      return { id, group, name: name2, status: "registered" };
    }
  });
  ctx.tools.register({
    name: "workflow_groups",
    description: "\u5217\u51FA\u5F53\u524D\u6309\u7EC4\u5F52\u7C7B\u7684 workflow \u8FD0\u884C\u72B6\u6001\uFF08\u53EA\u8BFB\uFF09\uFF1A\u6BCF\u4E2A\u5206\u7EC4\u7684\u72EC\u7ACB\u9762\u677F\u5185\u5BB9\uFF0C\u5305\u62EC\u6BCF\u4E2A workflow \u7684\u72B6\u6001\u3001\u9636\u6BB5\u8FDB\u5EA6\u3001\u5B50 agent \u660E\u7EC6\u4E0E\u6700\u8FD1\u65E5\u5FD7\u3002\u7528\u4E8E\u67E5\u770B GUI\u300C\u5DE5\u4F5C\u6D41\u300D\u6807\u7B7E\u9875\u80CC\u540E\u7684\u6570\u636E\u3002",
    parameters: { type: "object", properties: {} },
    output: {
      schema: { type: "object", additionalProperties: true },
      render: (args, value) => [{ type: "text", text: JSON.stringify(value) }]
    },
    async execute() {
      return { groups: snapshot() };
    }
  });
  const routes = [
    getRoute(`${API_PREFIX}/list`, async () => ({ groups: snapshot() })),
    postRoute(`${API_PREFIX}/clear`, async () => {
      groups.clear();
      runs.clear();
      saveGroupMap({});
      return { cleared: true };
    })
  ];
  ctx.effect(() => {
    const disposers = routes.map((route) => ctx.webServer.register(route));
    return () => {
      for (const dispose of disposers) dispose();
    };
  });
}
function readdirRuns(dir) {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => join(dir, d.name));
  } catch {
    return [];
  }
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
