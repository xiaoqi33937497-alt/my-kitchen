# 小票 AI 导入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有厨房 PWA 增加安全的小票拍照、豆包识别、人工确认和本地批量入库流程。

**Architecture:** GitHub Pages 前端负责选图、压缩和确认；独立 veFaaS Node Web 应用函数持有方舟密钥并规范化模型输出。确认后的条目通过现有库存服务在单个 IndexedDB 事务中批量保存。

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, Dexie, zod, Node.js HTTP server, 火山方舟 Responses API, veFaaS/API 网关

**Spec:** `docs/superpowers/specs/2026-11-08-receipt-ai-import-design.md`

## Global Constraints

- 前端继续发布到 `https://xiaoqi33937497-alt.github.io/my-kitchen/`，不增加登录或云端库存。
- 模型固定为 `doubao-seed-2-1-lite-260915`，密钥只允许存在 veFaaS 的 `ARK_API_KEY` 环境变量。
- 第一版只接受一张 JPEG/PNG/WebP 小票，源文件最大 10 MB，压缩后图片二进制最大 4 MiB。
- AI 草稿必须人工确认后才能写入 IndexedDB，小票图片不得持久化。
- 新增交互保持低饱和粉色现有视觉，并保证移动端主要控件最小高度 44 px。

## Review Focus

- HEIC、伪装 MIME 或 magic bytes 不匹配：应提示不支持，不调用方舟（Task 1、Task 2 测试）。
- 过大、极端长宽比或无法解码图片：应在客户端终止并释放预览资源（Task 2 测试）。
- 模型返回 Markdown 包裹、缺字段或非法枚举：服务端应提取并规范化或返回 502，不把原文传给前端（Task 1 测试）。
- 批量保存中任一条失败：IndexedDB 不得留下半批库存（Task 3 测试）。
- 连点识别/保存或慢网络：按钮禁用且只产生一次请求/一次事务（Task 4 测试）。

---

### Task 1: 可独立部署的安全小票识别服务

**Files:**
- Create: `server/receipt-reader/package.json`
- Create: `server/receipt-reader/src/contracts.ts`
- Create: `server/receipt-reader/src/normalizeReceipt.ts`
- Create: `server/receipt-reader/src/arkClient.ts`
- Create: `server/receipt-reader/src/server.ts`
- Create: `server/receipt-reader/src/normalizeReceipt.test.ts`
- Create: `server/receipt-reader/src/server.test.ts`
- Create: `server/receipt-reader/run.sh`
- Create: `server/receipt-reader/README.md`
- Create: `pnpm-workspace.yaml`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: environment variables `ARK_API_KEY`, `ARK_MODEL_ID`, `ALLOWED_ORIGIN`; JSON `AnalyzeReceiptRequest` from the spec.
- Produces: `POST /v1/receipts/analyze -> ReceiptApiDraft`（条目不含 ID）；`normalizeReceipt(raw: unknown, clientDate: string): NormalizedReceipt`; `createServer(deps: ServerDeps): http.Server`.

- [ ] **Step 1: Write failing normalization tests** for clean JSON, fenced JSON, invalid category/storage fallback, invalid quantity fallback, missing item names, overlong fields, more than 80 items, oversized raw model output, and unparseable output.
- [ ] **Step 2: Run `pnpm --dir server/receipt-reader test -- normalizeReceipt.test.ts`** and verify failure because the normalizer does not exist.
- [ ] **Step 3: Implement contracts and `normalizeReceipt(raw, clientDate)`** with the exact enum whitelist and fallback rules from the spec.
- [ ] **Step 4: Run the normalization tests** and verify they pass.
- [ ] **Step 5: Write failing HTTP tests** covering OPTIONS, allowed/disallowed Origin, wrong method, malformed JSON, 6 MiB streaming body limit, MIME/magic-byte mismatch, decoded 4 MiB limit, pixel/dimension limits, missing environment, Ark timeout, Ark 429, malformed model output, and successful normalized response without secret/raw image leakage.
- [ ] **Step 6: Run `pnpm --dir server/receipt-reader test -- server.test.ts`** and verify failure because `createServer` does not exist.
- [ ] **Step 7: Implement `callArk(input: ArkInput, deps: ArkDeps): Promise<unknown>` and `createServer(deps)`** using Node fetch, streaming body accounting, timeout/abort, strict CORS, structured-output prompt, thinking disabled, bounded output tokens and safe error mapping.
- [ ] **Step 8: Register the backend in the root pnpm workspace with Node 22 scripts, update the single root lockfile, then run `pnpm --dir server/receipt-reader test` and `pnpm --dir server/receipt-reader build`**; expect all tests and TypeScript compilation to pass.
- [ ] **Step 9: Add packaging/run documentation** with Node 22, `0.0.0.0:8000`, environment variables, exact ZIP root (`dist/`, `package.json`, LF `run.sh`), API gateway POST/OPTIONS route, gateway auto-CORS disabled, 6 MiB body limit, per-IP limit, maximum concurrency, global daily hard quota/automatic cutoff and budget alert checklist.
- [ ] **Step 10: Commit** with `feat: add secure receipt recognition service`.

### Task 2: 浏览器图片选择、校验与压缩

**Files:**
- Create: `src/features/receipts/contracts.ts`
- Create: `src/features/receipts/imageProcessor.ts`
- Create: `src/features/receipts/imageProcessor.test.ts`
- Create: `src/features/receipts/receiptApi.ts`
- Create: `src/features/receipts/receiptApi.test.ts`
- Modify: `src/app/services.ts`

**Interfaces:**
- Consumes: browser `File`, canvas/image decoder APIs, public `import.meta.env.VITE_RECEIPT_API_URL`.
- Produces: `processReceiptImage(file: File): Promise<ProcessedReceiptImage>` and `analyzeReceipt(image: ProcessedReceiptImage, clientDate: string, signal?: AbortSignal): Promise<ReceiptApiDraft>`.

- [ ] **Step 1: Write failing image tests** for JPEG/PNG/WebP acceptance, HEIC/unknown/forged-MIME rejection via magic bytes, 10 MB source limit, decode failure, EXIF rotation, 36 MP/dimension/aspect-ratio limits, longest-edge 2200 px, bounded iterative quality/size reduction from 0.82 to at most 4 MiB, and object URL cleanup.
- [ ] **Step 2: Run `pnpm test -- src/features/receipts/imageProcessor.test.ts`** and verify failure because the module does not exist.
- [ ] **Step 3: Implement `processReceiptImage(file)`** with injected/testable decoder/canvas helpers and Chinese domain errors.
- [ ] **Step 4: Run image tests** and verify they pass.
- [ ] **Step 5: Write failing API tests** for missing URL configuration, JSON request contract, success parsing, AbortError, 400/403/413/429/502/504 messages, and rejection of malformed response data.
- [ ] **Step 6: Implement `ReceiptApi.analyzeReceipt(...)`** with zod response validation and no local persistence.
- [ ] **Step 7: Run both receipt client test files** and verify they pass.
- [ ] **Step 8: Commit** with `feat: add receipt image processing client`.

### Task 3: 原子批量库存写入

**Files:**
- Modify: `src/domain/inventory/inventoryService.ts`
- Modify: `src/domain/inventory/inventoryService.test.ts`
- Modify: `src/db/inventoryRepository.ts`
- Modify: `src/db/inventoryRepository.test.ts`

**Interfaces:**
- Consumes: `NewInventoryItem[]` built from confirmed receipt rows.
- Produces: `DexieInventoryRepository.createMany(items: NewInventoryItem[]): Promise<InventoryItem[]>` using one Dexie transaction and `InventoryService.createItems(inputs: NewInventoryItem[]): Promise<InventoryItem[]>`.

- [ ] **Step 1: Write failing service/repository tests** with real fake-indexeddb for two-item success, shelf-life calculation per item, empty-list rejection, duplicate input IDs, and `bulkAdd` constraint failure proving the whole transaction rolls back.
- [ ] **Step 2: Run the focused inventory tests** and verify failure because `createItems` is absent.
- [ ] **Step 3: Implement `repository.createMany(items)` with one `db.transaction` + `bulkAdd`, then implement `InventoryService.createItems(inputs)`** validating/calculating all entries before opening the transaction.
- [ ] **Step 4: Run focused inventory tests** and verify no partial writes and all tests pass.
- [ ] **Step 5: Commit** with `feat: add atomic inventory batch creation`.

### Task 4: 拍照、识别与确认页面

**Files:**
- Create: `src/features/receipts/NewReceiptPage.tsx`
- Create: `src/features/receipts/NewReceiptPage.test.tsx`
- Create: `src/features/receipts/ReceiptReviewForm.tsx`
- Create: `src/features/receipts/ReceiptReviewForm.test.tsx`
- Create: `src/features/receipts/receiptDraftSchema.ts`
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/features/dashboard/DashboardPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: Task 2 `processReceiptImage`/`ReceiptApi`, Task 3 `InventoryService.createItems`, existing inventory enums and shelf-life behavior.
- Produces: route `/receipts/new`; `toEditableDraft(apiDraft): EditableReceiptDraft` adds `draftId`; `toNewInventoryItems(draft, fallbackDate): NewInventoryItem[]` adds final inventory IDs.

- [ ] **Step 1: Write failing dashboard/router tests** asserting the formerly disabled action links to `/receipts/new` and the route renders the uploader.
- [ ] **Step 2: Write failing page state tests** for camera-compatible input attributes, preview, compression/recognition progress, retry after failure, double-click suppression, abort on unmount, and no IndexedDB write before confirmation.
- [ ] **Step 3: Write failing review-form tests** for editing the one receipt purchase date and every per-item field, deleting rows, empty-result handling, invalid row validation, receipt-date fallback, one-click batch save, save double-click suppression, successful navigation, and transactional failure retaining the draft.
- [ ] **Step 4: Run the focused UI tests** and verify they fail for missing components/routes.
- [ ] **Step 5: Implement uploader state machine and route wiring** while revoking all preview URLs on replace/unmount.
- [ ] **Step 6: Implement `receiptDraftSchema`, `toNewInventoryItems`, and `ReceiptReviewForm`** using existing category/storage option text and `crypto.randomUUID()` for inventory IDs.
- [ ] **Step 7: Add responsive styles** matching existing tokens and 44 px minimum touch targets.
- [ ] **Step 8: Run focused UI tests** and verify they pass.
- [ ] **Step 9: Commit** with `feat: add receipt review and import flow`.

### Task 5: 部署配置、端到端验证与发布保护

**Files:**
- Create: `.env.example`
- Create: `docs/receipt-ai-deployment.md`
- Create: `tests/e2e/receipt-import.spec.ts`
- Modify: `vite.config.ts` (only if public runtime config/base handling requires it)
- Modify: `package.json`
- Modify: `.github/workflows/deploy-pages.yml`

**Interfaces:**
- Consumes: deployed veFaaS endpoint URL and GitHub Actions variable/secret-free public configuration.
- Produces: reproducible backend ZIP, configured Pages build, operator checklist and mobile smoke test.

- [ ] **Step 1: Add a failing E2E test** that first deletes the `kitchen-manager` IndexedDB, mocks the complete veFaaS URL, uploads a fixture image, edits one recognized row, deletes another, confirms once, asserts the API was called once, and observes both inventory list and dashboard counts.
- [ ] **Step 2: Add workspace/package and deployment scripts** using Node 22 and one root lockfile; backend `build` emits `dist/`, and `package` creates a reproducible ZIP with LF `run.sh` at its root and no development dependencies.
- [ ] **Step 3: Add deployment docs** for veFaaS Web app creation, masked `ARK_API_KEY` environment entry, gateway auto-CORS off, POST/OPTIONS routes, 6 MiB body limit, per-IP rate limit, low maximum concurrency, verified daily hard quota/automatic cutoff, `VITE_RECEIPT_API_URL`, body logging disabled, retention check, budget alert, rollback and key rotation. Mark publication blocked if a daily hard limit cannot be verified.
- [ ] **Step 4: Modify `deploy-pages.yml`** so the build receives `VITE_RECEIPT_API_URL: ${{ vars.VITE_RECEIPT_API_URL }}` and fails when it is missing or not HTTPS.
- [ ] **Step 5: Add secret scanning** using a dedicated scanner or high-entropy non-empty key pattern; allow the empty `.env.example` placeholder and separately assert `dist/` contains neither the secret variable nor a configured real-key fingerprint.
- [ ] **Step 6: Run `pnpm test`, `pnpm build`, backend tests/build/package, and the receipt Playwright test**; expect all to pass.
- [ ] **Step 7: Manually verify on iPhone Safari**: camera, album, clear receipt, blurry receipt, offline retry, slow network, privacy notice, confirmation edits, batch save, refresh persistence and no duplicate submit.
- [ ] **Step 8: Verify gateway/APM logs contain request metadata only** and body sampling is off; verify rate limits, hard daily cutoff and billing alert before publishing the frontend URL.
- [ ] **Step 9: Commit** with `docs: add receipt AI deployment and verification`.
