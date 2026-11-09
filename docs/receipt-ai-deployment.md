# 小票 AI 服务部署清单

## 1. 打包后端

要求 Node.js 22。运行 `pnpm install --frozen-lockfile`、`pnpm test:receipt-server`、`pnpm package:receipt-server`，产物为 `server/receipt-reader/receipt-reader.zip`。ZIP 根目录包含 `dist/`、`package.json` 和 LF 格式的 `run.sh`。

## 2. 创建 veFaaS Web 应用函数

在北京地域创建 Web 应用函数，上传 ZIP，启动命令 `sh run.sh`（不依赖 ZIP 是否保留 Unix 可执行位），监听端口 `8000`，实例按请求分配 CPU。环境变量：

- `ARK_API_KEY`：只在控制台粘贴，不截图、不提交仓库。
- `ARK_MODEL_ID=doubao-seed-2-1-lite-260915`
- `ALLOWED_ORIGIN=https://xiaoqi33937497-alt.github.io`

发布函数后再创建 API 网关入口。

## 3. API 网关硬性保护

- 路由 `POST /v1/receipts/analyze` 和 `OPTIONS /v1/receipts/analyze`。
- 关闭网关自动 CORS，由函数返回精确 Origin；不能设置 `*`。
- 请求体上限 6 MiB，按源 IP 设置低频限流，设置低最大并发。
- 必须验证全局每日硬配额或自动熔断确实生效；无法验证则不公开发布。
- 关闭请求/响应正文日志与 APM 正文采样，设置最短可用日志保留期。
- 在费用中心设置预算告警。预算告警不能代替每日硬截止。

## 4. 配置 GitHub Pages

在仓库 Settings → Secrets and variables → Actions → Variables 新建 `VITE_RECEIPT_API_URL`，值为 API 网关 HTTPS 根地址，不要带 `/v1/receipts/analyze`。工作流会拒绝空值和非 HTTPS 地址。这里不配置 `ARK_API_KEY`。

## 5. 验证与回滚

先用清晰测试小票验证识别、修改、删除、批量保存，再测试模糊图、断网、超限和重复点击。确认网关日志没有小票正文。回滚时先删除或清空 GitHub 变量阻止前端新发布，再禁用网关路由；密钥疑似泄露时立即在方舟禁用并轮换。
