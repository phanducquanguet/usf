---
target: portal landing
total_score: 22
p0_count: 1
p1_count: 2
timestamp: 2026-07-09T15-32-05Z
slug: pps-web-features-portal-landing-portal-landing-tsx
---
Method: dual-agent (A: design-review sub-agent with live browser inspection · B: detector sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Config-loading state renders the false "portal temporarily closed" card; chat session start has zero loading indicator |
| 2 | Match System / Real World | 2 | "Xem demo" opens a consultation chat, not a demo; pricing titles untranslated English jargon for a non-technical VN audience |
| 3 | User Control and Freedom | 2 | Chat closable + session survives refresh, but full-screen chat has no Escape handler or focus trap |
| 4 | Consistency and Standards | 3 | Token-driven single card system; hero mockup's gradient bubbles over-promise vs. the real chat's flat UI |
| 5 | Error Prevention | 3 | Confirm-summary-before-send flow is genuinely good; email validation is thin (`includes("@")`) |
| 6 | Recognition Rather Than Recall | 3 | Clear anchor nav, self-describing sections |
| 7 | Flexibility and Efficiency | 2 | 6 CTAs all funnel to one chat; no language switcher despite full en parity; no non-chat conversion path |
| 8 | Aesthetic and Minimalist Design | 3 | Genuinely restrained for the genre; docked for fake-stat strip and uniform reveal reflex |
| 9 | Error Recovery | 1 | Failed `createPortalGuestSession` = permanently blank chat with an enabled-looking composer; no `onError`, no retry |
| 10 | Help and Documentation | 2 | FAQ has only 3 items and skips cost, ownership, "robot or human?" |
| **Total** | | **22/40** | **Acceptable — significant improvements needed** |

## Anti-Patterns Verdict

**LLM assessment (first-order): largely avoided, two lapses.** The code comments declare a quiet-surface system ("no eyebrow scaffolding", gradient reserved for the hero chat preview) and the rendered page honors it: no eyebrows, no gradient text, no side-stripes, no icon-card grids; the numbered circles in Process/Consultation are real sequences. Lapses: (1) the advantages strip is a fake-stat metric template — only 2 of 5 items are metrics; "Không cần / Đội IT nội bộ" is a sentence forced into a stat slot (portal-landing.tsx:363-375); (2) every section gets the identical `<Reveal>` fade+rise with reflex `i * 100` staggers (~20 uses) — one motion idea applied uniformly.

**Second-order: guessable.** "Vietnamese AI dev agency, dark mode" predicts this page: navy background, blue→cyan gradient, floating rotated chat mockup with typing dots, blueprint-grid hero, pulsing-dot badge. Execution is quieter than the modal instance, but the composition is the 2025-26 template. The one non-generic decision is Be Vietnam Pro as the sole family for a Vietnamese-market brand.

**Deterministic scan: clean.** `detect.mjs` returned 0 findings (exit 0) across the landing TSX files, `(portal)/layout.tsx`, `page.tsx`, and `custom.css`. The detector was self-tested against seeded anti-patterns and confirmed functional, and no ignore rules explain the result — a genuine clean pass.

**Visual overlays: unavailable.** The Claude-in-Chrome extension was not connected, so no overlay tab exists; browser evidence came from Assessment A's Playwright inspection instead (screenshots at 1440×900 and 390×844, computed-style contrast measurements).

## Overall Impression

This is a disciplined, well-engineered page wearing a generic costume — and its single conversion action is the least-finished thing on it. The restraint system (hairline rules, one gradient budget, engineered reveal) is real craft; but the moment a visitor clicks "Nhận tư vấn miễn phí" the polish inverts: a possibly-blank full-screen panel, a silent failure path, and a 3.11:1 primary button. The biggest opportunity is not more design — it's making the chat moment deliver what the hero mockup promises.

## What's Working

1. **Documented restraint that survives rendering.** portal-landing.tsx:30-32 and custom.css declare a quiet-surface system and a single-gradient budget, and the built page honors both. The hairline-rule treatment for Problems/Pricing instead of card-grid soup is the strongest visual decision.
2. **The reveal system is engineered, not sprinkled.** Server markup ships fully visible (crawler/no-JS safe), below-fold hides only pre-paint, reduced-motion disables transitions in CSS, and scroll progress runs through ref + rAF with zero React re-renders.
3. **Confirm-before-send chat flow.** Summary → explicit contact form → confirm is the right consent model for "tell an AI about your project," with pending-message handling and an agent-busy banner per the codebase's own state rules.

## Priority Issues

1. **[P0] Chat session start is invisible and its failure is silent.** With no greeting configured, the primary CTA opens an empty dark full-screen panel; if `createPortalGuestSession` fails, it stays blank forever with an enabled composer — sending then calls the API with a null token (use-portal-chat.ts:71; `submit()` never checks `hasSession`). This is the page's one conversion action. **Why it matters:** every failed session = a visitor who believes the product is broken, at the exact moment of highest intent. **Fix:** starting state (typing-dots skeleton), `onError` + retry on the start mutation, gate the composer on `hasSession`, locale-default greeting fallback. **Suggested command:** /impeccable harden
2. **[P1] Loading state asserts a falsehood.** `enabled = config?.enabled === true` treats *unknown* as *disabled* (portal-landing.tsx:187), so on slow networks the hero shows "Portal tư vấn đang tạm đóng" for seconds, then CTAs pop in with layout shift. When `contact_email` is unset the disabled card says "reach us by email" with **no email** — a dead end, and the state this dev box actually renders. **Fix:** three-state render (loading skeleton / enabled / explicitly disabled); never print the email sentence without an address. **Suggested command:** /impeccable harden
3. **[P1] Primary CTA fails WCAG AA: white on brand blue = 3.11:1** (measured; every other checked pair passes, muted-foreground was tuned well at ~7:1). The most important element on the page is its worst contrast. **Fix:** darken the brand button surface or use near-black text on brand blue inside `.portal-dark`. **Suggested command:** /impeccable colorize
4. **[P2] Four fake choices in Services.** "Đặt lịch tư vấn / Tìm hiểu thêm / Xem demo / Gửi yêu cầu" all call `openChat()` and the choice is discarded — the chat receives no context. "Xem demo" violates its label outright. **Fix:** one honest CTA, or seed the chat with the selected intent. **Suggested command:** /impeccable clarify
5. **[P2] Pricing says nothing, in English.** Four untranslated fee names ("Implementation Fee", "Managed Operations") with no numbers or anchors, aimed at the budget-sensitive audience the page itself targets. Reads as "expensive and evasive." **Fix:** translate per the conventions glossary; add an anchor or an honest "pricing after the free survey" line. **Suggested command:** /impeccable clarify

## Persona Red Flags

**Jordan (non-technical VN SME owner):** Hits English at ~10 decision points on the vi page (badge, H1, "Layer 1/2/3", all pricing titles). No phone, no Zalo, no address, no human face anywhere on the enabled page — the only human channel (email) exists solely in the *disabled* state. If greeting is unconfigured, her reward for clicking the CTA is a black empty screen.

**Riley (stress tester):** Refresh mid-chat passes (token restored from storage). But: session-start failure = blank chat with live composer sending a null token; JS off = permanent "closed" card with no email and zero conversion path; config flipping to disabled mid-chat unmounts the conversation without explanation (`chatOpen && enabled`, portal-landing.tsx:601).

**Casey (mobile, one thumb, 3G):** The false "closed" state is her first impression for seconds. The chat is `fixed inset-0` with no `env(safe-area-inset-bottom)` — the composer sits under the iOS home indicator. Chat close (X) and send buttons have no aria-label (also a VoiceOver failure). Touch targets are otherwise good (size-11 / min-h-11). "Mô hình hợp / tác" splits the Vietnamese compound across lines at 390px.

## Minor Observations

- Reduced-motion is incomplete: reveal/typing/float are covered, but the hero's `animate-in slide-in-from-bottom-6`, the badge's `animate-pulse` dot, and the back-to-top `animate-in` still animate.
- Anonymous visitors get red 401 console errors (`/api/me`, `/api/workspaces` "cookie auth init failed") on a public marketing page.
- Type scale: 72 → 44 → 18 — the 44→18 cliff leaves h3 equal to hero body size; card titles rely on weight alone.
- Copy strings double as React keys and Accordion values — brittle for a CMS future.
- FAQ at `max-w-2xl` with 3 items leaves half a 1440 viewport empty.
- The real chat renders agent replies as full-width prose while the hero mockup sells bubbles — the mockup is more polished than the product.
- en/vi key parity is structurally perfect; the vi voice is good ("Kể cho AI nghe ý tưởng") outside the jargon noted above.

## Questions to Consider

1. Why does the page's best UI exist only as a fake? The hero mockup (gradient bubbles, avatar, typing dots) outclasses the real chat it advertises. What happens to trust in the three seconds after the click?
2. If the entire pitch is "not a rigid SaaS template," can the landing afford to *be* the template? What would proving "may đo" (tailor-made) visually look like — one real client system instead of a generic mockup?
3. Who decided a Vietnamese SME owner's first conversation about a 100-million-đồng decision should have no visible human anywhere — no face, name, phone, or office? Is the all-AI funnel a conviction or an oversight?
