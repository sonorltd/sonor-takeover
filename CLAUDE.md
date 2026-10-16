# Takeover — Claude Code Context (v0.1.0)

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
  Mirror: areas ↔ `section.wq_area` (matched on the leading `N ·` number, then exact name); missing line → **red** (export blocked);
  qty / optional drift, extra or unmapped lines, DO-IN-WEQUOTE products → **amber** (check before sending).
- **Service order 01 → 10 everywhere.** Sections sort by `service_nn` (derived order — no handles, no typed numbers); `§nn` is
  renumbered at export. `kind: 'noted'` sections (snags) print with their eyebrow label, no number, no prices.
- **Client language.** `lang_client` comes from `projects.metadata.client_language`. English is approved first; the client-language
  text is the final output. Editing EN after an ES translation sets `options.es_stale` (amber dot on the toggle; confirm on export).
  WeQuote stays English. Usted register (client-language skill).
- **Subcontractors are internal.** `internal_notes[]` never prints (Lutron → Tom @ Ribble AV lives there, never client-side).
- **Takeover works are access-based and provisional** until visit 1 — the assumptions copy says so; lines carry `provisional`.
- **Cover / chrome = Service Contracts' luxury look** (`contract-hero.jpg`, airy, brand large, no alpha on the cover, Gilroy), footer
  `<project> · Page N` only (`footerMode('minimal')`), full contact block once on the rear page (`rearPage`, service@sonor.co.uk).

## Architecture
Spine 1.3 SonorShell app, vanilla, graphite. Files:
- `dashboard/sonor-takeover.html` — head/import order cloned from Service Contracts; `SonorShell.mount({appKey:'takeover', requires:[SonorProjectList, SonorWQClient, TakeoverApp, SonorPdfLuxury, TakeoverPdf]})`; tabs Proposal / Pricing & mirror / Settings; nav-actions = project picker (`SonorProjectList.populateSelect`, ● = has a proposal), EN/ES toggle, status pill, + New, Save, ⬇ PDF. Palette: G-P / G-M / G-S, S, E, M.
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
