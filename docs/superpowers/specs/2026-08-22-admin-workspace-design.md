# Admin Workspace Design

## Goal

Refactor the Payload CMS dashboard into a compact editorial workspace that makes the next content action obvious without changing existing article data or API routes.

## Direction

Use a bright editorial desk: warm paper surfaces, ink-coloured copy, a restrained forest-green action colour, and serif headings paired with compact utility text. The workspace keeps a clear header, content status summary, horizontally scrollable board, dense library view, and an analytics view for reader feedback. Decorative gradients, emoji controls, oversized cards, and duplicated navigation are removed.

## Interaction Model

- A persistent header provides article creation, search, and front-site access.
- The board remains the default view. Cards can be dragged between workflow columns or moved with a status select.
- The library view supports the same status updates and article actions in a scan-friendly table.
- The quick-draft view creates an article using the existing CMS route. The editor remains a full-screen form with an optional live preview.
- Keyboard shortcuts retain Cmd/Ctrl+K for search and Escape to close the editor.

## Boundaries

The change is limited to the bespoke `/admin` workspace and its CMS styling. Article schema, authentication, Payload collection routes, and API payloads remain unchanged.

## Verification

Run lint and build/type checks. Manually load `/admin` with representative content, switch each view, filter and search, drag a card to a new column, update an article, and confirm narrow viewport layout preserves all controls.
