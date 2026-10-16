# Takeover — Integration ideas

## Data this app can provide
- `takeover_proposals` — the client-facing scope per workstream for a rescued system; Board / PM brief pages can show the proposal status + mirror state from `projects.metadata.takeover_proposal`.
- The mirror result (`mirror` column) — a "quote ↔ proposal agree" checksum any WQ-facing app can read before sending anything.
- Section `lines[]` with `needs_product` — a ready-made DO-IN-WEQUOTE list for the wq-quote-build skill's delta push.

## Data this app could consume
- Survey app: photos already come from storage `site-photos/<project>/survey/**`; a `survey_pages` caption/room lookup would pre-fill captions.
- Project Master devices → suggested sections (a Lutron processor on the device list ⇒ the Lutron section auto-added).
- Service Contracts: when a tier is proposed and accepted, create the SC draft from here (one click, `service_contracts` row with `wq` ref).
- Library: product metadata for the expected lines (sku / manufacturer) so the editor can search products instead of typing WQ ids.

## Integration notes
- WeQuote = price SSOT; the API cannot delete lines, change qty, mark optional or set the site address — those are Bryn-in-the-UI steps the mirror flags, never auto-fixes.
- The Python reference renderer (`sonor-config/skills/takeover-quote/scripts/render-brief.py`) stays as the skill's offline fallback; the app is the live tool.
- Translation: EN approved → ES final. A "translate section" helper (Claude / DeepL via an edge function) would clear `es_stale` per section rather than per document.

## Requests to other projects
- Master Hub: roll-up strip entry (proposals by status, red mirrors).
- Board: show the proposal badge on the project card; "Open proposal" deep link `sonor-takeover.html#project=<id>`.
- Service Contracts: expose `tierPricing()` on the shared seam so the tier table's annual/monthly figures come from one function, not a copy.

## Follow-ons (v0.2)
- Delta push to WeQuote from the mirror (missing lines → `add_product_to_quote`, within the wq-api budget law).
- Per-section translate + diff view (EN changed since ES).
- Visit-1 confirmation: mark provisional lines confirmed and re-mirror.
