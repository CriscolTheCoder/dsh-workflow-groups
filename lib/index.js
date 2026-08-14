// src/index.ts
var name = "workflow-groups";
var inject = ["webServer", "tools"];
var API_PREFIX = "/api/workflow-groups";
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
  const byName = /* @__PURE__ */ new Map();
  const ensureGroup = (name2) => {
    let g = groups.get(name2);
    if (!g) {
      g = { name: name2, createdAt: Date.now(), runIds: [] };
      groups.set(name2, g);
    }
    return g;
  };
  const takeRegistered = (id, meta) => {
    if (!meta?.name || !byName.has(meta.name)) return void 0;
    const priorId = byName.get(meta.name);
    const prior = runs.get(priorId);
    if (prior && prior.status === "registered" && priorId !== id) {
      const inherited = prior.group;
      runs.delete(priorId);
      const g = groups.get(prior.group);
      if (g) g.runIds = g.runIds.filter((x) => x !== priorId);
      byName.set(meta.name, id);
      return inherited;
    }
    return void 0;
  };
  const upsertRun = (info, extra) => {
    const inherited = takeRegistered(info.id, info.meta);
    let e = runs.get(info.id);
    if (!e) {
      const declared = Array.isArray(info.meta?.phases) ? info.meta.phases : [];
      e = {
        id: info.id,
        group: inherited ?? "\u672A\u5206\u7EC4",
        name: info.meta?.name ?? "\u672A\u547D\u540D",
        description: info.meta?.description ?? "",
        status: "running",
        phases: declared.map((p) => ({ title: p.title, detail: p.detail, totalAgents: 0, doneAgents: 0, current: false })),
        agents: [],
        logs: [],
        startedAt: Date.now()
      };
      runs.set(info.id, e);
      if (info.meta?.name) byName.set(info.meta.name, info.id);
    }
    if (extra?.group && e.group !== extra.group) {
      const old = groups.get(e.group);
      if (old) old.runIds = old.runIds.filter((id) => id !== info.id);
      e.group = extra.group;
    }
    if (extra?.name) e.name = extra.name;
    if (extra?.description) e.description = extra.description;
    const g = ensureGroup(e.group);
    if (!g.runIds.includes(e.id)) g.runIds.push(e.id);
    return e;
  };
  ctx.on("workflow/start", (info) => {
    upsertRun(info);
  });
  ctx.on("workflow/phase", (info, title) => {
    const e = upsertRun(info);
    let p = e.phases.find((x) => x.title === title);
    if (!p) {
      p = { title, totalAgents: 0, doneAgents: 0, current: true };
      e.phases.push(p);
    }
    e.phases.forEach((x) => {
      x.current = x.title === title;
    });
  });
  ctx.on("workflow/log", (info, message) => {
    const e = upsertRun(info);
    e.logs.push({ at: Date.now(), message });
    if (e.logs.length > 200) e.logs = e.logs.slice(-200);
  });
  ctx.on("workflow/agent-start", (info, agent) => {
    const e = upsertRun(info);
    e.agents.push({ seq: agent.seq, label: agent.label, phase: agent.phase });
    if (agent.phase) {
      let p = e.phases.find((x) => x.title === agent.phase);
      if (!p) {
        p = { title: agent.phase, totalAgents: 0, doneAgents: 0, current: true };
        e.phases.push(p);
      }
      p.totalAgents += 1;
    }
  });
  ctx.on("workflow/agent-end", (info, agent) => {
    const e = upsertRun(info);
    const a = e.agents.find((x) => x.seq === agent.seq);
    if (a) a.outcome = agent.outcome;
    if (agent.phase) {
      const p = e.phases.find((x) => x.title === agent.phase);
      if (p) p.doneAgents = Math.min(p.totalAgents, p.doneAgents + 1);
    }
  });
  ctx.on("workflow/end", (info, result) => {
    const e = upsertRun(info);
    const reason = result?.stopReason ?? "error";
    e.status = reason === "completed" ? "completed" : reason === "cancelled" ? "cancelled" : "error";
    e.endedAt = Date.now();
    e.result = { stopReason: reason, error: result?.error, agentsStarted: result?.agentsStarted ?? 0 };
    e.phases.forEach((p) => {
      p.current = false;
      p.doneAgents = p.totalAgents;
    });
  });
  const plain = (v) => v === void 0 ? null : v;
  const snapshot = () => {
    const groupsOut = [];
    for (const g of groups.values()) {
      groupsOut.push({
        name: g.name,
        createdAt: g.createdAt,
        workflows: g.runIds.map((id) => runs.get(id)).filter((e) => !!e).map((e) => ({
          id: e.id,
          name: e.name,
          description: e.description,
          status: e.status,
          startedAt: e.startedAt,
          endedAt: plain(e.endedAt),
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
    description: "\u521B\u5EFA\u5E76\u7ACB\u5373\u542F\u52A8\u4E00\u4E2A\u65B0\u7684\u5206\u7EC4\u5DE5\u4F5C\u6D41\uFF08workflow\uFF09\u3002\u5FC5\u987B\u63D0\u4F9B group\uFF08\u5206\u7EC4\u540D\uFF09\u3001name\u3001description \u4E0E script\uFF08\u7EAF JS \u811A\u672C\u4F53\uFF0C\u5141\u8BB8 top-level await\uFF0C\u4EE5 return <json> \u7ED3\u5C3E\uFF09\u3002\u811A\u672C\u5185\u53EF\u7528 agent(prompt, opts) \u6D3E\u751F\u5B50 agent\u3001phase(title) \u8FDB\u5165\u9636\u6BB5\u3001log(message) \u8F93\u51FA\u65E5\u5FD7\u3002\u8FD0\u884C\u72B6\u6001\u4F1A\u5B9E\u65F6\u663E\u793A\u5728 GUI \u7684\u300C\u5DE5\u4F5C\u6D41\u300D\u6807\u7B7E\u9875\u4E2D\uFF0C\u540C\u5206\u7EC4\u7684 workflow \u663E\u793A\u5728\u540C\u4E00\u4E2A\u72EC\u7ACB\u9762\u677F\u3002\u82E5\u5F53\u524D\u73AF\u5883\u65E0\u6CD5\u76F4\u63A5\u542F\u52A8\u5F15\u64CE\uFF0C\u5C06\u767B\u8BB0\u4E3A\u300C\u5DF2\u767B\u8BB0\u300D\u6761\u76EE\uFF0C\u968F\u540E\u8BF7\u7528 run_workflow \u5DE5\u5177\uFF08source=script\u3001meta \u542B\u540C\u540D name\uFF09\u6267\u884C\uFF0C\u4E8B\u4EF6\u6D41\u4F1A\u81EA\u52A8\u5173\u8054\u56DE\u8BE5\u5206\u7EC4\u3002",
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
      required: ["group", "name", "description", "script"]
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        // DSH JSON-Schema subset requires `required` at the OBJECT level as a
        // string array — NOT `required: true` inside each property.
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
      const engine = ctx.get?.("workflowEngine");
      if (engine) {
        if (!exec?.agent) return { id: "", group, name: name2, status: "error: \u7F3A\u5C11 agent \u4E0A\u4E0B\u6587" };
        const meta = { name: name2, description };
        if (args.whenToUse) meta.whenToUse = String(args.whenToUse);
        if (Array.isArray(args.phases) && args.phases.length) {
          meta.phases = args.phases.map((p) => ({
            title: String(p.title),
            detail: p.detail ? String(p.detail) : void 0,
            provider: p.provider ? String(p.provider) : void 0,
            model: p.model ? String(p.model) : void 0
          }));
        }
        const run = engine.start({
          script: String(args.script),
          meta,
          args: args.args,
          parent: exec.agent,
          subagentProvider: args.subagentProvider ? String(args.subagentProvider) : void 0,
          maxTotalAgents: args.maxTotalAgents ? Number(args.maxTotalAgents) : void 0
        });
        const e2 = upsertRun({ id: run.id, meta }, { group, name: name2, description });
        e2.status = "running";
        return { id: run.id, group: e2.group, name: e2.name, status: e2.status };
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
      byName.set(name2, id);
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
      byName.clear();
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
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
