# dsh-workflow-groups · 分组工作流看板

为 DeepSeek Harness Web GUI 提供**分好组的工作流看板**：每个分组的 workflow
在会话头部的独立「工作流」标签页中实时展示 —— 状态徽章、阶段进度、子
agent 明细与实时日志。

## 功能

- **分组展示**：每个分组一个独立面板，组内逐条展示每个 workflow 的运行卡片。
- **实时刷新**：每 2 秒轮询 `/api/workflow-groups/list`，另有「刷新」「清空」按钮。
- **模型工具**：
  - `workflow_new` —— 创建并启动一个分组 workflow（经 `ctx.dynamicWorkflows.startInline` 直接启动引擎，`approvalGranted` 免审批；引擎不可达时登记为「已登记」）；
  - `workflow_groups` —— 只读列出当前分组面板数据。
- **数据源**：直接读取 workflow 引擎的持久化运行目录（`.dsh/workflow-runs/run-*` 下的 `run.json` + `manifest.json` + `events.jsonl`），无需事件流接线；分组名持久化在 `~/.dsh/dsh-workflow-groups.json`（runId → group），重启不丢。

## 安装

```sh
# 从 GitHub
dsh plugin --profile web add https://github.com/CriscolTheCoder/dsh-workflow-groups
```

安装后**刷新页面**，会话头部出现「工作流」标签；Agent 调用 `workflow_new`
创建分组 workflow 即实时出现在对应分组面板。

## 依赖与配置

- **需要 workflow 引擎**：本看板展示的是 `@dsh-external/workflow`（DSH 工作流引擎）产生的运行。请确保该插件已安装：
  ```sh
  dsh plugin --profile web add @dsh-external/workflow
  ```
- **审批策略为 `never` 时必须配置（否则工作流无法运行）**：workflow 引擎默认
  `approvalMode: generated-and-local`（inline 生成的工作流要先过一次审批）。
  当会话审批策略是 `never` 时，该审批请求会被自动拒绝，工作流报
  `workflow approval rejected`。此时在 profile 的 `cordis.patch.yml` 中给引擎
  加配置覆盖：
  ```yaml
  - id: dsh-external-workflow
    config:
      approvalMode: never
  ```
  之后重启 DSH web。若审批策略是 `ask`，则无需此配置（审批弹窗放行即可）。

## 结构

```
src/index.ts    Host 半区：run 目录扫描、group 映射、模型工具、HTTP 路由
src/client.ts   Client 半区：「工作流」conversation.view 标签页（react 外部化，随 shell 渲染）
cordis.patch.yml  插件行（insert: workflow-groups）
scripts/build.mjs 构建（esbuild bundle 到 lib/）
```

## 开发

```sh
node scripts/build.mjs
```

## License

Apache-2.0
