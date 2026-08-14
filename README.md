# dsh-workflow-groups · 分组工作流看板

为 DeepSeek Harness Web GUI 提供**分好组的工作流看板**：每个分组的 workflow
在会话头部的独立「工作流」标签页中实时展示 —— 状态徽章、阶段进度、子
agent 明细与实时日志。

## 功能

- **分组展示**：每个分组一个独立面板，组内逐条展示每个 workflow 的运行卡片。
- **实时刷新**：每 2 秒轮询 `/api/workflow-groups/list`，另有「刷新」「清空」按钮。
- **模型工具**：
  - `workflow_new` —— 创建并启动一个分组 workflow（直接启动引擎；引擎不可达时登记为「已登记」，配合 `run_workflow` 执行同名脚本自动关联回分组）；
  - `workflow_groups` —— 只读列出当前分组面板数据。
- **事件驱动**：监听宿主 `workflow/*` 事件流（start / phase / log / agent-start / agent-end / end），任何 workflow 运行都会被自动收录并按组归类。

## 安装

```sh
# 本地路径
dsh plugin --profile web add link:D:/Deepseek Harness/plugins/dsh-workflow-groups
# 或从 GitHub
dsh plugin --profile web add https://github.com/CriscolTheCoder/dsh-workflow-groups
```

安装后**刷新页面**，会话头部出现「工作流」标签；Agent 调用 `workflow_new`
创建分组 workflow 即实时出现在对应分组面板。

## 结构

```
src/index.ts    Host 半区：分组注册表、workflow/* 事件监听、模型工具、HTTP 路由
src/client.ts   Client 半区：「工作流」conversation.view 标签页
cordis.patch.yml  插件行（insert: workflow-groups）
scripts/build.mjs 构建（esbuild bundle 到 lib/）
```

## 开发

```sh
node scripts/build.mjs
```

## License

Apache-2.0
