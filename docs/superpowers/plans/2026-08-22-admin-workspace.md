# Admin Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visually noisy Payload admin dashboard with a responsive editorial workspace while retaining all article-management behaviour.

**Architecture:** Keep data loading in the existing server route and API mutations in the existing client component. Replace presentational inline styles with semantic dashboard components backed by a scoped stylesheet, so the workspace is maintainable without affecting Payload's data model.

**Tech Stack:** Next.js, React 19, Payload CMS 3, TypeScript, lucide-react, CSS.

---

### Task 1: Rebuild the dashboard structure

**Files:**
- Modify: `components/admin/BespokeStudioDashboard.tsx`

- [ ] Replace the monolithic visual presentation with semantic workspace header, summary, board, library, quick-draft, and modal editor components.
- [ ] Preserve `GET`, `POST`, `PATCH`, and `DELETE` calls to `/api/admin/cms-articles`, optimistic status updates, filtering, drag-and-drop, and keyboard shortcuts.
- [ ] Use lucide-react icons for controls and title attributes for icon-only actions.

### Task 2: Define the visual system

**Files:**
- Modify: `components/admin/custom-admin.css`

- [ ] Add namespaced `.studio-*` rules for layout, colour tokens, action states, board columns, cards, table rows, modal editor, and responsive behaviour.
- [ ] Tighten the existing Payload overrides to use small radii and restrained motion.

### Task 3: Verify the dashboard

**Files:**
- Test: `components/admin/BespokeStudioDashboard.tsx`

- [ ] Run `npm run lint` and `npm run build`.
- [ ] Load `/admin` and test view navigation, search, tag filtering, status change, draft creation, editor preview, and a narrow viewport.
