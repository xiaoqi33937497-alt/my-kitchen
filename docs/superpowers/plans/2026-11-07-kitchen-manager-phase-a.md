# Kitchen Manager Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, no-login kitchen inventory PWA that persists locally, supports partial consumption and backup/restore, and highlights food entering its final two days.

**Architecture:** A static React/TypeScript PWA stores all user data in IndexedDB through a repository boundary. Pure domain modules calculate shelf-life and inventory state; UI pages consume application services rather than touching IndexedDB directly. The app requests durable browser storage and offers JSON export/import as the recovery path.

**Tech Stack:** Vite, React 19, TypeScript, React Router, Dexie, Zod, date-fns, Vitest, Testing Library, Playwright, vite-plugin-pwa.

**Spec:** `docs/superpowers/specs/2026-11-07-kitchen-manager-design.md`

## Global Constraints

- Mobile-first responsive web app; no account, login, server, or cloud sync.
- Simplified Chinese UI, China Standard Time defaults, and metric/common Chinese units.
- Persist inventory in IndexedDB and request durable storage where supported.
- Always distinguish package dates from estimated dates; estimates must be labeled `参考`.
- Low-saturation blush pink, cream white, and warm gray visual system; accessible text contrast and non-color status labels.
- Phase A includes manual entry, partial consumption, backup/restore, shelf-life rules, and in-app expiry reminders only.
- Keep recipe and receipt recognition as inactive future-entry points; do not implement OCR or video parsing.

## Review Focus

- Browser refresh/reopen with existing IndexedDB data must restore all active inventory without duplication (Task 2 test).
- Invalid or partially corrupt backup files must be rejected atomically, leaving existing data untouched (Task 7 test).
- Partial consumption may never create negative remaining quantity and must keep a still-positive item active (Task 4 test).
- Dates around midnight in Asia/Shanghai must produce stable `today / 1 day / 2 days` urgency classifications (Task 3 test).
- Unsupported durable-storage APIs must not block app startup or data entry (Task 8 test).

---

## File Structure

- `src/app/`: routing, providers, app shell, navigation, and PWA startup.
- `src/db/`: Dexie schema, migrations, and repository implementation.
- `src/domain/`: stable types, shelf-life rules, urgency calculations, and inventory operations.
- `src/features/dashboard/`: home summary and priority-to-eat list.
- `src/features/inventory/`: list, manual entry, detail editing, consumption, and discard flows.
- `src/features/settings/`: backup export/import and local-storage status.
- `src/shared/ui/`: reusable blush-theme components and status presentation.
- `tests/e2e/`: critical mobile user journeys only.

### Task 1: Application Shell and Visual System

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/app/router.tsx`
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Create: `src/shared/ui/Button.tsx`, `src/shared/ui/Card.tsx`, `src/shared/ui/StatusPill.tsx`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Produces: `App`, route placeholders for `/`, `/inventory`, `/inventory/new`, `/inventory/:id`, `/settings`, and shared UI primitives.

- [ ] **Step 1: Write the failing shell test**

Assert that `App` renders Chinese bottom-navigation labels `首页`, `库存`, `菜谱`, `我的` and that the `菜谱` entry is marked `即将推出`.

- [ ] **Step 2: Run the shell test and verify failure**

Run: `npm test -- src/app/App.test.tsx`
Expected: FAIL because the app shell does not exist.

- [ ] **Step 3: Scaffold Vite React TypeScript and implement the shell**

Use CSS variables `--blush-600: #A86F75`, `--blush-200: #E8CECF`, `--cream: #FBF9F8`, `--warm-gray: #817374`; make the shell usable at 320px width and cap content at 480px.

- [ ] **Step 4: Run the shell test**

Run: `npm test -- src/app/App.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json vite.config.ts tsconfig.json index.html src
git commit -m "feat: scaffold kitchen manager shell"
```

### Task 2: IndexedDB Schema and Inventory Repository

**Files:**
- Create: `src/domain/inventory/types.ts`
- Create: `src/db/kitchenDb.ts`, `src/db/inventoryRepository.ts`
- Test: `src/db/inventoryRepository.test.ts`

**Interfaces:**
- Produces: `InventoryItem`, `ConsumptionEvent`, `LocalSettings` types.
- Produces: `InventoryRepository` with `listActive(): Promise<InventoryItem[]>`, `get(id: string)`, `create(input)`, `update(id, patch)`, `addEvent(event)`, and `replaceAll(snapshot)`.

- [ ] **Step 1: Write failing repository tests**

Test create/get/update/list ordering and reopening a fresh Dexie instance against the same fake IndexedDB database without duplicating records.

- [ ] **Step 2: Run repository tests and verify failure**

Run: `npm test -- src/db/inventoryRepository.test.ts`
Expected: FAIL because schema and repository are missing.

- [ ] **Step 3: Define domain records and version-1 Dexie schema**

`InventoryItem` must include `id`, `name`, `category`, `storageZone`, `purchasedAt`, `initialQuantity`, `remainingQuantity`, `unit`, date-source fields, `createdAt`, `updatedAt`, and `status`.

- [ ] **Step 4: Implement `InventoryRepository`**

Keep Dexie-specific types inside `src/db`; return domain records from repository methods.

- [ ] **Step 5: Run repository tests**

Run: `npm test -- src/db/inventoryRepository.test.ts`
Expected: PASS, including reopen persistence and no duplicates.

- [ ] **Step 6: Commit**

```bash
git add src/domain/inventory/types.ts src/db
git commit -m "feat: add persistent inventory repository"
```

### Task 3: Shelf-Life and Urgency Engine

**Files:**
- Create: `src/domain/shelfLife/rules.ts`, `src/domain/shelfLife/calculate.ts`
- Test: `src/domain/shelfLife/calculate.test.ts`

**Interfaces:**
- Consumes: `InventoryItem` date and storage fields from Task 2.
- Produces: `calculateShelfLife(input, now): ShelfLifeResult` and `getUrgency(result, now): 'today' | 'one-day' | 'two-days' | 'later' | 'past'`.

- [ ] **Step 1: Write failing rule tests**

Cover an explicit package expiry date, production-date-plus-duration calculation, estimated spinach refrigeration rule, storage-zone change, and Asia/Shanghai times on both sides of midnight.

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- src/domain/shelfLife/calculate.test.ts`
Expected: FAIL because the engine is missing.

- [ ] **Step 3: Implement versioned rules and calculation precedence**

Precedence: confirmed package expiry, confirmed production date plus shelf-life duration, then category/storage estimate. Return `source: 'package' | 'calculated-package' | 'estimate'` and `isReference: boolean`.

- [ ] **Step 4: Run shelf-life tests**

Run: `npm test -- src/domain/shelfLife/calculate.test.ts`
Expected: PASS, including stable midnight urgency.

- [ ] **Step 5: Commit**

```bash
git add src/domain/shelfLife
git commit -m "feat: calculate shelf life and urgency"
```

### Task 4: Inventory Application Service and Partial Consumption

**Files:**
- Create: `src/domain/inventory/inventoryService.ts`
- Test: `src/domain/inventory/inventoryService.test.ts`

**Interfaces:**
- Consumes: `InventoryRepository` from Task 2 and shelf-life functions from Task 3.
- Produces: `createItem(input)`, `consume(id, amount)`, `discard(id, amount?)`, `editItem(id, patch)`, and `getDashboard(now)`.

- [ ] **Step 1: Write failing service tests**

Assert that consuming 2 of 6 eggs leaves 4 active, consuming the last 4 marks the item consumed, consuming 7 rejects without mutation, and dashboard priority sorts `past`, `today`, `one-day`, then `two-days`.

- [ ] **Step 2: Run service tests and verify failure**

Run: `npm test -- src/domain/inventory/inventoryService.test.ts`
Expected: FAIL because service methods are absent.

- [ ] **Step 3: Implement transactional inventory operations**

Each quantity change and its `ConsumptionEvent` must commit in one Dexie transaction; reject zero, negative, NaN, and over-consumption values.

- [ ] **Step 4: Run service tests**

Run: `npm test -- src/domain/inventory/inventoryService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/inventory
git commit -m "feat: support inventory lifecycle and partial use"
```

### Task 5: Manual Entry and Inventory Management UI

**Files:**
- Create: `src/features/inventory/InventoryListPage.tsx`
- Create: `src/features/inventory/InventoryForm.tsx`, `src/features/inventory/InventoryDetailPage.tsx`
- Create: `src/features/inventory/inventoryFormSchema.ts`
- Test: `src/features/inventory/InventoryForm.test.tsx`, `src/features/inventory/InventoryDetailPage.test.tsx`

**Interfaces:**
- Consumes: service methods from Task 4.
- Produces: create/edit/consume/discard user flows and filters for `冷藏`, `冷冻`, `常温`, category, and urgency.

- [ ] **Step 1: Write failing form and detail tests**

Test required name, positive quantity, unit selection, purchase date, storage zone, optional package-date fields, `参考` labeling, partial-consume dialog, and over-consumption error text.

- [ ] **Step 2: Run UI tests and verify failure**

Run: `npm test -- src/features/inventory`
Expected: FAIL because pages are missing.

- [ ] **Step 3: Implement schema-driven manual entry and edit forms**

Use Zod for parsing; default purchase date to the current Asia/Shanghai date, quantity to `1`, and storage zone to `冷藏` without auto-saving.

- [ ] **Step 4: Implement inventory list and detail actions**

Show source text `包装标注` or `参考估算`; require confirmation before full discard or consuming the final quantity.

- [ ] **Step 5: Run inventory UI tests**

Run: `npm test -- src/features/inventory`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/inventory
git commit -m "feat: add manual inventory management"
```

### Task 6: Dashboard and In-App Expiry Reminders

**Files:**
- Create: `src/features/dashboard/DashboardPage.tsx`, `src/features/dashboard/PriorityList.tsx`
- Test: `src/features/dashboard/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `getDashboard(now)` from Task 4.
- Produces: two-day reminder summary, priority list, storage-zone totals, manual-add action, and disabled receipt/recipe future entries.

- [ ] **Step 1: Write the failing dashboard test**

Seed items in all urgency classes and assert that only `past` through `two-days` appear in `优先吃掉`, zone totals exclude consumed items, and empty state links to `手动添加`.

- [ ] **Step 2: Run dashboard test and verify failure**

Run: `npm test -- src/features/dashboard/DashboardPage.test.tsx`
Expected: FAIL because dashboard components are missing.

- [ ] **Step 3: Implement the approved blush dashboard**

Match the approved hierarchy: greeting, count summary, `上传购物小票` disabled with `下一阶段`, active `手动添加`, priority cards, zone totals, and recipe teaser.

- [ ] **Step 4: Run dashboard tests**

Run: `npm test -- src/features/dashboard/DashboardPage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard src/app/router.tsx
git commit -m "feat: add expiry-focused dashboard"
```

### Task 7: Atomic Backup Export and Restore

**Files:**
- Create: `src/domain/backup/schema.ts`, `src/domain/backup/backupService.ts`
- Create: `src/features/settings/SettingsPage.tsx`
- Test: `src/domain/backup/backupService.test.ts`, `src/features/settings/SettingsPage.test.tsx`

**Interfaces:**
- Consumes: repository snapshot/replace operations from Task 2.
- Produces: `exportBackup(): Promise<BackupV1>`, `validateBackup(value): BackupV1`, `restoreBackup(value): Promise<void>`.

- [ ] **Step 1: Write failing backup tests**

Assert versioned round-trip, rejection of unknown version, corrupt item, duplicate ID, and atomic rollback that leaves preexisting data unchanged after invalid import.

- [ ] **Step 2: Run backup tests and verify failure**

Run: `npm test -- src/domain/backup src/features/settings`
Expected: FAIL because backup modules are missing.

- [ ] **Step 3: Implement Zod-validated `BackupV1` and atomic restore**

The JSON root must contain `format: 'kitchen-manager-backup'`, `version: 1`, `exportedAt`, `items`, `events`, and `settings`.

- [ ] **Step 4: Implement settings UI**

Provide `导出备份` and `从备份恢复`; show a destructive replacement confirmation and a success summary with item count.

- [ ] **Step 5: Run backup and settings tests**

Run: `npm test -- src/domain/backup src/features/settings`
Expected: PASS, including atomic invalid-import behavior.

- [ ] **Step 6: Commit**

```bash
git add src/domain/backup src/features/settings src/app/router.tsx
git commit -m "feat: add local backup and restore"
```

### Task 8: PWA Persistence, Mobile Journey, and Release Verification

**Files:**
- Create: `src/app/requestPersistentStorage.ts`
- Modify: `vite.config.ts`, `src/main.tsx`
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Create: `playwright.config.ts`, `tests/e2e/mobile-inventory.spec.ts`
- Test: `src/app/requestPersistentStorage.test.ts`

**Interfaces:**
- Consumes: completed application routes and services.
- Produces: installable offline shell, non-blocking persistent-storage request, and verified mobile workflow.

- [ ] **Step 1: Write failing persistence API tests**

Test supported-and-granted, supported-and-denied, missing `navigator.storage.persist`, and thrown-error cases; every case must resolve without blocking startup.

- [ ] **Step 2: Run persistence tests and verify failure**

Run: `npm test -- src/app/requestPersistentStorage.test.ts`
Expected: FAIL because the helper is missing.

- [ ] **Step 3: Implement startup persistence request and PWA manifest**

Call `requestPersistentStorage()` after initial render; cache the static shell only and never treat service-worker cache as the inventory database.

- [ ] **Step 4: Add the mobile end-to-end journey**

At a 390×844 viewport: add 6 eggs, consume 2, reload, assert 4 remain, add an item due in two days, assert it appears on the dashboard, export backup, clear database through a test helper, import backup, and assert both active items return.

- [ ] **Step 5: Run all verification**

Run: `npm test && npm run build && npx playwright test`
Expected: all unit/component tests PASS, TypeScript build succeeds, and the mobile journey PASSes.

- [ ] **Step 6: Commit**

```bash
git add vite.config.ts src/main.tsx src/app public playwright.config.ts tests/e2e
git commit -m "feat: ship persistent offline kitchen PWA"
```

## Self-Review Result

- Spec coverage: Phase A requirements are covered; OCR, package-photo recognition, push notifications, and recipe parsing remain explicitly out of scope.
- Step scan: Each task owns one reviewable deliverable and a failing-test/pass cycle.
- Type consistency: Repository, shelf-life, inventory-service, and backup interfaces are defined once and consumed by later tasks under the same names.
- Review focus: All five listed failure modes have an owning test task.
- Proportion: The plan specifies decisions and verification without transcribing component implementations.
