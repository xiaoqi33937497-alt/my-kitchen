# Mobile Install and Rabbit Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the existing kitchen PWA over HTTPS with the supplied rabbit image as its Android and iPhone home-screen icon.

**Architecture:** Keep the current Vite PWA and local IndexedDB data model unchanged. Produce deterministic PNG icon sizes from the supplied square source, reference them from the web app manifest and HTML, validate the production bundle, then publish the static `dist` output over HTTPS.

**Tech Stack:** React, Vite, vite-plugin-pwa, PNG assets, static HTTPS hosting

**Spec:** `docs/superpowers/specs/2026-11-07-mobile-install-icon-design.md`

## Global Constraints

- No login or account flow.
- Inventory data remains local to the phone browser.
- Preserve the supplied rabbit image without generative alteration.
- App name remains “我的厨房”; retain the existing blush theme.

## Review Focus

- Manifest icon files must exist at the declared paths and exact sizes.
- Apple home-screen icon must be linked independently of the PWA manifest.
- Published build must load without a computer-local dependency.
- Service worker and manifest must be served from the same HTTPS origin.
- Existing inventory tests must remain green.

---

### Task 1: Install icon assets and metadata

**Files:**
- Create: `public/icons/rabbit-192.png`
- Create: `public/icons/rabbit-512.png`
- Create: `public/icons/rabbit-apple-touch.png`
- Modify: `vite.config.ts`
- Modify: `index.html`
- Test: `src/app/pwaConfig.test.ts`

**Interfaces:**
- Consumes: user-supplied `codex-clipboard-53bd44ab-1ee7-453d-a684-3563339b271a.png`
- Produces: manifest icons at `/icons/rabbit-192.png` and `/icons/rabbit-512.png`, Apple icon at `/icons/rabbit-apple-touch.png`

- [ ] **Step 1: Write a failing PWA metadata test**

Assert the Vite config declares both PNG manifest sizes and `index.html` links the Apple touch icon.

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `pnpm test -- src/app/pwaConfig.test.ts`
Expected: FAIL because the PNG metadata is absent.

- [ ] **Step 3: Generate exact-size PNG assets from the supplied square source**

Resize without cropping or generative changes to 192×192, 512×512, and 180×180.

- [ ] **Step 4: Update manifest and HTML metadata**

Declare the 192 and 512 icons with `purpose: "any maskable"`; add `apple-touch-icon` for the 180 icon.

- [ ] **Step 5: Run the targeted test and full suite**

Run: `pnpm test`
Expected: all tests PASS.

- [ ] **Step 6: Commit**

Commit message: `feat: use rabbit home screen icon`

### Task 2: Validate and publish the HTTPS build

**Files:**
- Modify only hosting manifest files if the selected publisher requires them.

**Interfaces:**
- Consumes: Task 1 production build
- Produces: public HTTPS URL with an installable PWA

- [ ] **Step 1: Build the production bundle**

Run: `pnpm build`
Expected: Vite and PWA generation complete with no errors.

- [ ] **Step 2: Inspect the generated manifest and icon files**

Assert all declared icons are present in `dist` and the manifest uses HTTPS-origin-relative paths.

- [ ] **Step 3: Publish the static `dist` output**

Use Sites hosting with public/no-login access and retain the returned HTTPS URL.

- [ ] **Step 4: Verify the published URL**

Confirm the page, manifest, service worker, and rabbit icon respond successfully.

- [ ] **Step 5: Commit any required hosting metadata**

Commit message: `chore: prepare kitchen app for https hosting`
