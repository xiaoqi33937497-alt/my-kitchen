# Food Icons and Mobile Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match common food names to suitable Emoji and improve the mobile alignment and touch size of the add and inventory filter controls.

**Architecture:** Add a pure name/category-to-Emoji helper and consume it from the dashboard priority list. Keep layout changes in the existing global stylesheet and preserve all inventory storage interfaces.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, CSS, Vite PWA, GitHub Pages

**Spec:** `docs/superpowers/specs/2026-11-07-food-icons-mobile-controls-design.md`

## Global Constraints

- Keep the existing GitHub Pages URL unchanged.
- Do not change IndexedDB schema or existing inventory records.
- Keep all three inventory filters on one row on the current phone layout.
- Use name matching first and category fallback second.

## Review Focus

- Chinese egg names such as 鸡蛋 and 鹌鹑蛋 must resolve to 🥚.
- Unknown names must still receive the configured category fallback.
- Name matching must not be affected by surrounding whitespace.
- The manual-add action must remain a valid accessible link.
- Filter controls must remain usable at narrow phone widths without horizontal overflow.

---

### Task 1: Food Emoji matching

**Files:**
- Create: `src/shared/foodEmoji.ts`
- Create: `src/shared/foodEmoji.test.ts`
- Modify: `src/features/dashboard/PriorityList.tsx`

**Interfaces:**
- Produces: `getFoodEmoji(name: string, category: FoodCategory): string`

- [ ] Write failing tests for egg keywords, common food keywords, trimmed names, and category fallback.
- [ ] Run `npm test -- src/shared/foodEmoji.test.ts` and verify failure because the helper does not exist.
- [ ] Implement keyword-first matching with category fallback and use it in `PriorityList`.
- [ ] Run the focused test and dashboard tests; expect all to pass.
- [ ] Commit the task.

### Task 2: Mobile action and filter sizing

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/features/dashboard/DashboardPage.test.tsx`
- Modify: `src/features/inventory/InventoryListPage.test.tsx`

**Interfaces:**
- Consumes: existing dashboard link and inventory filter markup.
- Produces: centered manual-add contents and filter controls with 48px minimum height and 16px text.

- [ ] Add failing component assertions for distinct decorative add icon/text and all three labeled filters.
- [ ] Add a failing stylesheet contract test for centered flex action layout and filter sizing.
- [ ] Run focused tests and verify the new assertions fail.
- [ ] Update markup and CSS with `display:flex`, centered alignment, stable gap, `min-height:48px`, and `font-size:16px`.
- [ ] Run focused tests and verify they pass.
- [ ] Commit the task.

### Task 3: Regression verification and GitHub Pages release

**Files:**
- Modify only generated build output if the project workflow requires it; do not commit `dist` otherwise.

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: verified production build deployed at the existing Pages URL.

- [ ] Run the complete test suite and confirm all tests pass.
- [ ] Run `npm run build` and confirm Vite/PWA build succeeds.
- [ ] Review the diff to ensure no storage schema or unrelated files changed.
- [ ] Push the verified source changes to the current GitHub repository without force-updating history.
- [ ] Confirm the Pages workflow succeeds and verify the live URL serves the new build.

