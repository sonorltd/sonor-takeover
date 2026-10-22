# Takeover — Claude Code Context (v0.2.0)

> **v0.1.3 (2026-10-17)** — consistency batch: supabase-js pinned to 2.45.4 + SRI, shared masters synced (project-bar / kit mirror / wq-sync / takeoffs-supabase / wq-push to their masters). No feature change.

> **v0.1.2 (2026-10-17)** — WeQuote-linked mark (Bryn: "a small wq … pill bubble against items that are wq linked"): the shared `.wq-pill` (small red WQ, `data/sonor-components.css`, `SonorWQClient.pill()` / `webUrl()` 1.3.1, both re-synced from the root masters) beside the status pill in the tab bar, in the Pricing & mirror header and on the Settings quote-id label (links to the WeQuote quote; outline `.wq-off` when no quote is linked), on every section line with a WeQuote product (outline when it has none), and on mirror rows that are on the live quote (outline for expected lines missing from it). App UI only — never in the client PDF.

> **v0.1.1 (2026-10-17)** — the shared project bar (root `sonor-project-bar.js` 1.14.0 + bus + list, synced into `data/`) replaces the app's own `#projectPick`: appKey `takeover`, `decorateOption` marks ● projects that have a proposal, `beforeChange` is the unsaved-edits guard, `showNew:false` (the tab bar's + New starts a proposal). `#project=<uuid>`, `?pid=` and the pre-0.1.1 `sonor_takeover_project` memory all still open a project.

> **Spine version: 1.3** (SONOR-APP-SPINE.md) — SonorShell app (§21)
> Inherits: `../CLAUDE.md` (master brand rules + cross-project references)
> Brand source: `../Branding - CORE/brand-core.xml`
> Skill: `../sonor-config/skills/takeover-quote/` (laws + the Python reference renderer) · `client-language` · `wq-quote-build` (shape 3)

## What this is
The **takeover survey / proposal** (B-553, born 2026-10-16 for Woodbrook / Deborah): when Sonor takes over systems it did not
install, this app holds the client-facing proposal — what we will do per workstream, in the client's language — and keeps it
**mirrored to the WeQuote quote that carries every price**. Bryn edits the sections in place, checks the mirror, exports the PDF.
A takeover does not need a service contract (the tier table is optional) but can propose one; Service Contracts stays the plans SSOT.

Laws (never bend):
- **WeQuote is the price SSOT.** No price is typed here, ever. The PDF's price table is the LIVE quote lines (`list_quote_lines`
  via `sonor-wq-client.js`, source `takeover`); the proposal's own `lines[]` are only the *expected* products per section.
  Mirror: quote lines grouped by `structure_id` ↔ `section.wq_structure_id` / the push's `metadata.wequote_quote_structure.areas[key]`; missing line → **red**,
  qty / optional drift, extra or unmapped lines, DO-IN-WEQUOTE products → **amber**. **The export is never blocked** (Bryn 2026-10-16: "just mark export as TBC if not priced") — an expected line not on the quote, or on it unpriced, prints as *to be confirmed* with the plan quantity.
- **Service order 01 → 10 everywhere.** Sections sort by `service_nn` (derived order — no handles, no typed numbers); `§nn` is
  renumbered at export. `kind: 'noted'` sections (snags) print with their eyebrow label, no number, no prices.
- **Client language.** `lang_client` comes from `projects.metadata.client_language`. English is approved first; the client-language
  text is the final output. Editing EN after an ES translation sets `options.es_stale` (amber dot on the toggle; confirm on export).
  WeQuote stays English. Usted register (client-language skill).
- **Subcontractors are internal.** `internal_notes[]` never prints (Lutron → Tom @ Ribble AV lives there, never client-side).
- **Takeover works are access-based and provisional** until visit 1 — the assumptions copy says so; lines carry `provisional`.
- **Cover / chrome = Service Contracts' luxury look** (`contract-hero.jpg`, airy, brand large, no alpha on the cover, Gilroy), footer
  `<project> · Page N` only (`footerMode('minimal')`), full contact block once on the rear page (`rearPage`, service@sonor.co.uk).

## v0.2.0 (2026-10-22) — the finished quote
- **Order = WeQuote area order** (Bryn: "make sure the numbering follows the WQ areas order"): sections sort by the quote's `area_groups[].display_order` (via `wq_structure_id`), remembered in `mirror.area_order`; unmapped sections follow in service order. Service colour stays per section.
- **Optional = WeQuote line `active: 0`** (Core 5 upgrade, Lutron engraving). A section whose quote lines are all optional prints an OPTIONAL tag.
- **Prices**: `options.prices_mode` — `reference` (default, Bryn: "leave pricing off for now … just reference to see the wequote proposal") prints one paragraph pointing at the Sonor quotation no.; `table` prints the live-line table.
- **Area Net Totals** come from the client-facing WeQuote proposal PDF (quote/get → templates[] → wq-proxy v5 `/public/print_quote_template` → pdf.js text) because `list_quote_lines` carries no labour pricing. Needs **wq-proxy v5** deployed (`supabase/functions/wq-proxy/index.ts`); until then the mirror notes it and carries on.
- **⟲ Refresh lines from WeQuote** rebuilds every mapped section's expected lines from the quote (qty + optional from WQ; labels/notes kept; bundle children folded into the parent; a DO-IN-WEQUOTE placeholder is fulfilled by a new product line in the same section).

## Architecture
Spine 1.3 SonorShell app, vanilla, graphite. Files:
- `dashboard/sonor-takeover.html` — head/import order cloned from Service Contracts; `SonorShell.mount({appKey:'takeover', requires:[SonorProjectList, SonorWQClient, TakeoverApp, SonorPdfLuxury, TakeoverPdf]})`; tabs Proposal / Pricing & mirror / Settings; shared project bar above the tabs (`SonorProjectBar`, appKey `takeover`, ● = has a proposal); nav-actions = EN/ES toggle, status pill, + New, Save, ⬇ PDF. Palette: G-P / G-M / G-S, S, E, M.
- `data/takeover-config.js` — `window.__TAKEOVER_CONFIG__`: version, table, languages, statuses, serviceOrder, `template[]` (8 workstreams: lutron 04, control4 07, handover 07, service 07, security 08, network 09, logistics 10, snags 10/noted), `ui.{en,es}` PDF strings (incl. tier rows/values, rear-page labels, units), `months_es`, storage bucket, assets.
- `data/takeover-app.js` (`TakeoverApp`) — load projects + proposals + `service_contract_tiers` (+ `_tier_aspects` for annual price overrides); new-from-template (picks up `metadata.wequote_quote_id`, `wequote_quotes[0].quote_no`, `client_language`); section editor (title / service / kind / do[] / result / wq_area / label / lines table / photos); photos picked from storage `site-photos/<project_id>/survey/**` (no survey-schema coupling); save = upsert row + `sonor_merge_project_metadata` pointer `metadata.takeover_proposal` (the RPC is SHALLOW on top-level keys — the pointer is its own key); mirror (`computeMirror`) + export gate.
- `data/takeover-pdf.js` (`TakeoverPdf.generate`) — cover → summary → sections (service colour bar, bullets, outcome, photos two-across) → price table grouped by section from live WQ lines (`line_labels[lang][product_id]` → client label; qty from WQ; `to be confirmed` when 0 / no price / DO-IN-WEQUOTE; subtotals works / plan) → optional tier table (14 rows, proposed tier shaded) → assumptions → next steps → validity → rear page. Download name `Proposal-Sonor_<ref>_<LANG>.pdf` / `Propuesta-…`.
- Shared (SYNCED, never edit here): `sonor-db.js`, `data/sonor-*.js|css`, `data/sonor-pdf-luxury.js` (root master ≥ 1.3.0), `data/sonor-wq-client.js`, `data/sonor-project-list.js`, `data/sonor-sortable.js`, `data/kit/`.
- Assets (copied from Service Contracts, keep identical): `data/fonts/gilroy-{extrabold,regular,ultralight}.otf`, `data/contract-hero.jpg`, `data/cedia-member-line.png`, `data/cedia-member-stacked.png`.

## Data
- **`takeover_proposals`** (Supabase, RLS anon select/insert/update, touch trigger): `id, project_id → projects, status (draft | approved | final | sent | superseded), lang_primary, lang_client, wq_quote_id, wq_quote_no, title/subtitle/summary/assumptions/next_steps/line_labels {en,es}, sections[] {key, service_nn, sort, kind, wq_area, title{}, do{}, result{}, label{}, lines[{product_id, wq_name, qty, unit, provisional, optional, needs_product, note}], photos[{survey_page_id, path, caption{}}]}, options {tiers_show, tier_proposed, segment, attention, ref, doc_type{}, es_stale}, mirror (last check summary), internal_notes[], metadata`.
- Reads: `projects` (picker + cover facts), `service_contract_tiers` + `service_contract_tier_aspects` (tier table — the Service Contracts SSOT, never copied), `wq_config` (proxy), storage `site-photos` (public URLs).
- Writes: `takeover_proposals` (upsert), `projects.metadata.takeover_proposal` (merge RPC only).
- Seed: Woodbrook `3349dac8-7943-49e7-b600-2b0402016acb` (project `b7c40775-…`, WQ 288457 / 2807).

## Brand
- **Active theme: graphite** — set via `<html data-theme="graphite">` + `data/sonor-theme.js` first + served kit. Cream is the PDF's paper only (luxury proposal law), never the UI.
- Fonts: DM Sans + DM Mono (UI); Gilroy (PDF, via `makeFonts`).
- Section cards and mirror groups carry the service colour as `--svc` (from `__SONOR_BRAND__.services[].hex`) — no raw hex in the HTML.

## Brand Overrides (preserved on brand regen)
None.

## Drawing model
**Drawing model: n/a (no canvas)**

## Development rules
1. Every version bump updates 5 sites atomically: `APP_VERSION` (html), `takeover-config.js` version, this banner, `app_versions` row, STATUS.md.
2. No raw hex in HTML — palette from `brand.css` + `app-vars.css` (S-4.1).
3. New persistent data → Supabase first (S-4.8); the proposal row is the SSOT, `projects.metadata.takeover_proposal` is a pointer only.
4. Shared files in `data/` are synced — edit the workspace-root masters and run `sync-everything.sh` (S-4.3).
5. Never add a price field. If a number needs to change, it changes in WeQuote and the mirror picks it up.
6. The Python renderer in the skill is the reference implementation of the PDF — when the two drift, the app wins and the skill notes it.
