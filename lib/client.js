window.__ModuleLoader__.load({
	id: "dsh-workflow-groups",
	factory: (require) => {
		"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "node_modules/.pnpm/react@18.3.1/node_modules/react/cjs/react.production.min.js"(exports) {
    "use strict";
    var l = /* @__PURE__ */ Symbol.for("react.element");
    var n = /* @__PURE__ */ Symbol.for("react.portal");
    var p = /* @__PURE__ */ Symbol.for("react.fragment");
    var q = /* @__PURE__ */ Symbol.for("react.strict_mode");
    var r = /* @__PURE__ */ Symbol.for("react.profiler");
    var t = /* @__PURE__ */ Symbol.for("react.provider");
    var u = /* @__PURE__ */ Symbol.for("react.context");
    var v = /* @__PURE__ */ Symbol.for("react.forward_ref");
    var w = /* @__PURE__ */ Symbol.for("react.suspense");
    var x = /* @__PURE__ */ Symbol.for("react.memo");
    var y = /* @__PURE__ */ Symbol.for("react.lazy");
    var z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C = Object.assign;
    var D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray;
    var J = Object.prototype.hasOwnProperty;
    var K = { current: null };
    var L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null };
    var V = { transition: null };
    var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    exports.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    exports.Component = E;
    exports.Fragment = p;
    exports.Profiler = r;
    exports.PureComponent = G;
    exports.StrictMode = q;
    exports.Suspense = w;
    exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    exports.act = X;
    exports.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    exports.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    exports.createElement = M;
    exports.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    exports.createRef = function() {
      return { current: null };
    };
    exports.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    exports.isValidElement = O;
    exports.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    exports.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    exports.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    exports.unstable_act = X;
    exports.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    exports.useContext = function(a) {
      return U.current.useContext(a);
    };
    exports.useDebugValue = function() {
    };
    exports.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    exports.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    exports.useId = function() {
      return U.current.useId();
    };
    exports.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    exports.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    exports.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    exports.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    exports.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    exports.useRef = function(a) {
      return U.current.useRef(a);
    };
    exports.useState = function(a) {
      return U.current.useState(a);
    };
    exports.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    exports.useTransition = function() {
      return U.current.useTransition();
    };
    exports.version = "18.3.1";
  }
});

// node_modules/.pnpm/react@18.3.1/node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/.pnpm/react@18.3.1/node_modules/react/index.js"(exports, module2) {
    "use strict";
    if (true) {
      module2.exports = require_react_production_min();
    } else {
      module2.exports = null;
    }
  }
});

// src/client.ts
var client_exports = {};
__export(client_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(client_exports);
var import_react = __toESM(require_react(), 1);
var name = "workflow-groups-client";
var inject = ["slots"];
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
  ctx.effect(() => () => {
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
    const [showAll, setShowAll] = (0, import_react.useState)(false);
    const shown = showAll ? wf.logs : wf.logs.slice(-3);
    const children = [];
    children.push(
      (0, import_react.createElement)(
        "div",
        { className: "wf-wf-top" },
        (0, import_react.createElement)("span", { className: "wf-wf-name" }, wf.name),
        (0, import_react.createElement)("span", { className: "wf-status " + wf.status }, statusLabel(wf.status)),
        (0, import_react.createElement)("span", { className: "wf-time" }, timeStr(wf.startedAt))
      )
    );
    if (wf.description) children.push((0, import_react.createElement)("div", { className: "wf-desc" }, wf.description));
    if (wf.phases.length) {
      children.push(
        (0, import_react.createElement)(
          "div",
          { className: "wf-phases" },
          wf.phases.map((p) => (0, import_react.createElement)(
            "span",
            { className: "wf-phase" + (p.current ? " current" : "") },
            p.title,
            (0, import_react.createElement)("span", { className: "wf-num" }, p.doneAgents + "/" + p.totalAgents)
          ))
        )
      );
    }
    if (wf.agents.length) {
      children.push(
        (0, import_react.createElement)(
          "div",
          { className: "wf-agents" },
          wf.agents.map((a) => (0, import_react.createElement)(
            "div",
            { className: "wf-agent" },
            (0, import_react.createElement)("span", { className: "wf-dot " + (a.outcome || (wf.status === "running" ? "running" : "")) }),
            (0, import_react.createElement)("span", null, "#" + a.seq + " " + a.label),
            a.phase ? (0, import_react.createElement)("span", null, "\xB7 " + a.phase) : null,
            a.outcome ? (0, import_react.createElement)("span", null, "\xB7 " + outcomeLabel(a.outcome)) : null
          ))
        )
      );
    }
    if (wf.result && wf.result.error) children.push((0, import_react.createElement)("div", { className: "wf-desc" }, "\u9519\u8BEF: " + wf.result.error));
    if (shown.length) children.push((0, import_react.createElement)("div", { className: "wf-logs" }, shown.map((l) => "[" + timeStr(l.at) + "] " + l.message).join("\n")));
    if (wf.logs.length > 3) {
      children.push(
        (0, import_react.createElement)(
          "button",
          { className: "wf-btn", onClick: () => setShowAll(!showAll) },
          showAll ? "\u6536\u8D77\u65E5\u5FD7" : "\u5C55\u5F00\u5168\u90E8\u65E5\u5FD7 (" + wf.logs.length + ")"
        )
      );
    }
    return (0, import_react.createElement)("div", { className: "wf-wf" }, children);
  }
  function GroupPanel(props) {
    const g = props.g;
    const running = g.workflows.filter((w) => w.status === "running").length;
    const head = [(0, import_react.createElement)("span", null, g.name)];
    head.push((0, import_react.createElement)("span", { className: "wf-badge" }, g.workflows.length + " \u4E2A workflow"));
    if (running) head.push((0, import_react.createElement)("span", { className: "wf-badge" }, running + " \u8FD0\u884C\u4E2D"));
    return (0, import_react.createElement)(
      "div",
      { className: "wf-group" },
      (0, import_react.createElement)("div", { className: "wf-group-head" }, head),
      g.workflows.map((w) => (0, import_react.createElement)(WorkflowCard, { key: w.id, wf: w }))
    );
  }
  slots.inject("conversation.view", () => slots.register(
    { name: "conversation.view", id: "wf-board", order: 20, label: "\u5DE5\u4F5C\u6D41" },
    function WorkflowBoard() {
      const [groups, setGroups] = (0, import_react.useState)(null);
      const [updated, setUpdated] = (0, import_react.useState)(null);
      const [err, setErr] = (0, import_react.useState)(null);
      const [fatal, setFatal] = (0, import_react.useState)(null);
      (0, import_react.useEffect)(() => {
        const onErr = (e) => {
          setFatal(String(e.message || e.error));
        };
        window.addEventListener("error", onErr);
        return () => window.removeEventListener("error", onErr);
      }, []);
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
      (0, import_react.useEffect)(() => {
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
        const handle = window.setInterval(tick, 2e3);
        return () => {
          alive = false;
          window.clearInterval(handle);
        };
      }, []);
      const children = [];
      const headKids = [(0, import_react.createElement)("span", null, "\u5DE5\u4F5C\u6D41\u5206\u7EC4")];
      if (updated) headKids.push((0, import_react.createElement)("span", { className: "wf-muted" }, "\u66F4\u65B0\u4E8E " + timeStr(updated.getTime())));
      headKids.push((0, import_react.createElement)("button", { className: "wf-btn", onClick: () => load() }, "\u5237\u65B0"));
      headKids.push((0, import_react.createElement)("button", { className: "wf-btn", onClick: clearAll }, "\u6E05\u7A7A"));
      children.push((0, import_react.createElement)("div", { className: "wf-head" }, headKids));
      if (fatal) children.push((0, import_react.createElement)("div", { className: "wf-empty" }, "\u6E32\u67D3\u9519\u8BEF: " + fatal));
      else if (err) children.push((0, import_react.createElement)("div", { className: "wf-empty" }, "\u52A0\u8F7D\u5931\u8D25: " + err));
      else if (!groups) children.push((0, import_react.createElement)("div", { className: "wf-empty" }, "\u52A0\u8F7D\u4E2D\u2026"));
      else if (!groups.length) children.push((0, import_react.createElement)("div", { className: "wf-empty" }, "\u8FD8\u6CA1\u6709\u5206\u7EC4 workflow\u3002\u8BA9 Agent \u8C03\u7528 workflow_new \u5DE5\u5177\u521B\u5EFA\u5E76\u542F\u52A8\u3002"));
      else groups.forEach((g) => children.push((0, import_react.createElement)(GroupPanel, { key: g.name, g })));
      return (0, import_react.createElement)("div", { className: "wf-board" }, children);
    }
  ));
}
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/

		return module.exports;
	}
});
