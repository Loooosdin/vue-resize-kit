# 贡献指南

感谢参与 vue-resize-kit。

## 开发流程

1. Fork 仓库并从 `main` 创建功能分支。
2. 使用 `pnpm install` 安装依赖。
3. 为行为变化补充单元测试或浏览器测试。
4. 提交前运行 `pnpm typecheck` 和 `pnpm test`。
5. 在 Pull Request 中说明动机、API 影响、测试结果和兼容性影响。

## 设计原则

- Core 不依赖 Vue，也不在模块加载阶段访问 DOM 全局对象。
- Vue 2/3 适配器共享相同行为，不使用 `vue-demi`。
- 新功能需要有明确的元素尺寸监听场景，避免扩张成通用观察器集合。
- 公共 API 变更遵循语义化版本规则。

## Commit

提交信息建议使用 Conventional Commits，例如 `feat: add scheduler option`、`fix: cancel pending frame on unmount`。
