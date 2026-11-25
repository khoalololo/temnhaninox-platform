# TEM NHÃN INOX — UI/UX Overhaul & Feature Completion Plan
**Document type:** Agent execution plan (phases 2B–2E, follows the completed Phase 1 auth/gateway work)
**Status:** Design spec + feature gaps verified against the live screenshot and stated feedback (2026-11-25)

> **How to use this document:** Execute ONE phase at a time. After each phase, stop and manually verify against the Use-Case Checklist (Section 3) before telling the agent to proceed to the next phase. Do not trust a "done" report from the agent without clicking through the actual running app yourself — this is the same rule as the Master Implementation Plan review: an agent's report of completion and the feature actually working are two different facts.

---

## 1. Design System Specification

### 1.1 Diagnosis — why the current UI reads as "AI-generic"

The screenshot has real strengths worth keeping: the dark industrial palette fits a metal-fabrication brand far better than a generic light SaaS theme, the monospace spec-chips are a genuinely good signature detail, and the information hierarchy (hero → capability stats → categories → products) is sound. What reads as generic:

- No distinct heading typeface — everything is one system sans-serif at different weights.
- The large-radius-plus-soft-shadow card style is the single most common unstyled-Tailwind tell.
- Flat grey "Kim loại" placeholder boxes read as broken images, not deliberate design.
- No secondary accent color — everything leans on one orange, so nothing but font-weight distinguishes hierarchy.

None of this requires discarding the current direction. Tighten it with the tokens below.

### 1.2 Color tokens

```css
:root {
  /* Surfaces */
  --color-bg: #0B0F17;          /* page background — near-black navy, not flat slate */
  --color-surface: #141B2B;     /* card/panel background */
  --color-surface-raised: #1B2438; /* hover/active surface */
  --color-border: #26314A;

  /* Text */
  --color-text-primary: #F3F5F7;
  --color-text-secondary: #9AA5B8;
  --color-text-muted: #6B7690;

  /* Brand accents — TWO accents, not one, to carry hierarchy without relying on weight alone */
  --color-accent: #F97316;        /* amber/orange — primary CTA, keep from current design */
  --color-accent-hover: #FB8B3D;
  --color-steel: #4C7FA8;         /* steel blue — secondary actions, links, info badges, nav hover */
  --color-steel-hover: #639BC4;

  /* Status */
  --color-success: #22C55E;
  --color-danger: #EF4444;
  --color-warning: #FACC15;
}
```

Rule: amber = primary action (add to cart, submit, confirm). Steel blue = secondary/navigational (links, filters, info badges, nav active state). Never use both as competing primary CTAs on the same screen.

### 1.3 Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Headings (h1–h3) | **Space Grotesk** | 600–700 | Geometric, technical, distinct from body — this one change does more than any other to kill the "generic" read |
| Body text | **IBM Plex Sans** | 400–500 | Highly readable, slightly technical connotation fits an industrial brand |
| Spec chips, SKU codes, prices in tables, code-like labels | **IBM Plex Mono** | 500 | Keep this motif from the current design — it's good, just make sure it's used *consistently*, not only on the hero chips |

Load via Google Fonts. Do not use Inter, Roboto, or system-ui as the primary heading font — those are the fonts every unstyled AI-generated UI defaults to, and are precisely what makes a page look templated.

### 1.4 Spacing, radius, elevation

- Base spacing unit: 4px. Scale: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Border radius: 6px for inputs/buttons/badges, 10px for cards, 999px for pills/tags. **Never larger than 10px** — oversized radius is part of the generic-SaaS tell.
- Elevation: avoid default soft drop-shadows. Use a 1px `--color-border` outline on all cards at rest; introduce a shadow **only** on hover/focus (`0 4px 16px rgba(0,0,0,0.3)`), and keep it subtle. Flat-until-interacted reads as deliberate and technical, not templated.

### 1.5 Component treatment rules

- **Buttons:** solid amber fill for primary, 1px steel-blue outline + transparent fill for secondary, text-only (no border) for tertiary/ghost actions.
- **Placeholder images:** replace flat grey boxes with a subtle diagonal hatch pattern (SVG background, `repeating-linear-gradient` at low opacity) plus a small icon + "Chưa có ảnh" label — reads as an intentional empty state, not a broken image.
- **Badges/tags** ("Gia công 3D", "Có sẵn"): pill-shaped, border-only (not filled), using steel blue or amber depending on meaning — keep, this detail already works in the current build.
- **Tables (admin):** no zebra striping; use `--color-border` row dividers only, matches the flat-industrial language.

---

## 2. Feature Gap Analysis

### Tier 1 — Must-fix before this is demo-ready (blocks real usage)

| # | Feature | Why it's Tier 1 |
|---|---|---|
| 1 | Forgot/reset password flow | Explicitly missing per your test; a login system without recovery is unusable in practice |
| 2 | Pagination on all list endpoints (catalog, admin orders, admin customers) | Without it, every list will silently break once real data volume exists |
| 3 | Data-driven top nav with category mega-menu | Currently static; legacy site already proves customers expect this nested structure (Tem Nhãn → Inox/Nhôm/Đồng/Mica, CNC, Laser, Máy Móc, Hoá Chất, Vật Phẩm Lưu Niệm) |
| 4 | Detailed product page (image gallery, spec table, differentiated CTA by product type) | Currently only has list/card view per the screenshot |
| 5 | Admin product management UI (not just API) | You cannot run this business if adding a product requires calling an API by hand |
| 6 | Admin pricing-rule management UI | Same reason — the pricing formula needs to be owner-editable, not developer-editable, especially since the thickness-unit ("ly") question is still unresolved and may need adjusting after you confirm with your uncle |
| 7 | Mobile-responsive nav (hamburger/drawer) | Survey shows customers reach via Zalo/Facebook/phone — mobile-first channels — yet the current screenshot is desktop-only |
| 8 | Consistent loading/empty/error states across all list and detail views | Core requirement from the course work, and good practice independent of it |

### Tier 2 — Should add soon (meaningfully improves usability, not launch-blocking)

| # | Feature | Notes |
|---|---|---|
| 9 | Google sign-in | Explicitly requested; see Phase B spec below — requires a manual prerequisite from you (see note) |
| 10 | Order-tracking stepper UI on the order detail page | Visualizes the 6–8 state lifecycle; directly addresses the real pain point the survey implies (no formal tracking today, lives in the owner's head) |
| 11 | Toast/snackbar notification system | Replace any `alert()` calls with a consistent, dismissible notification component |
| 12 | Breadcrumbs on category/product pages | Cheap, standard e-commerce navigation aid |
| 13 | Form validation polish (password strength meter, Vietnamese phone format, MST/VAT format check) | |
| 14 | Session/JWT expiry handling | Auto-redirect to login on 401, refresh-or-reauth flow |
| 15 | Admin dashboard summary widgets (today's orders, pending quotes, monthly revenue) | Endpoint already planned (`/admin/dashboard/summary`) — needs UI |

### Tier 3 — Nice-to-have, defer

| # | Feature |
|---|---|
| 16 | Printable/downloadable VAT invoice PDF |
| 17 | Catalog filter sidebar (by material, price range, product type) |
| 18 | Static content pages (Về chúng tôi, Liên hệ) carried over from the legacy site |
| 19 | 404/500 custom error pages |
| 20 | Search autocomplete dropdown |

---

## 3. Use-Case Checklist (verify manually — do not trust agent self-report)

| ID | Actor | Scenario | Steps | Expected result |
|---|---|---|---|---|
| UC-01 | Customer | Forgot password | Click "Quên mật khẩu" → enter email → check inbox (Mailpit UI at `localhost:8025` in dev) → click reset link → set new password | Can log in with new password; old password no longer works; reset link fails if reused or expired |
| UC-02 | Customer | Google sign-in | Click "Đăng nhập với Google" → pick Google account → redirected back | Account created or matched by email; logged in with a valid app JWT; no password required |
| UC-03 | Visitor | Browse paginated catalog | Open product list with >12 items | Page shows 12 items + pagination control; page 2 shows the next set; URL reflects current page |
| UC-04 | Visitor | Use category mega-menu | Hover/click "Sản phẩm" in nav | Dropdown shows nested categories matching legacy site structure; clicking a leaf category filters the catalog |
| UC-05 | Visitor | View product detail | Click a product card | See image gallery (multiple images, thumbnail swap), full spec table, correct CTA (Add to Cart for stocked items, "Tuỳ chỉnh kích thước" for custom items) |
| UC-06 | Admin | Create a new product | Admin → Products → New | Can set name, category, type (stocked vs custom), upload multiple images, set price/stock (if stocked) or link a pricing rule (if custom); product appears live immediately |
| UC-07 | Admin | Edit a pricing rule | Admin → Pricing Rules → edit thin-sheet rate | Change persists; next quote calculation on the storefront reflects the new rate without a redeploy |
| UC-08 | Customer | Track an order | Open Orders → select an order | See a visual stepper showing current state among the full lifecycle, not just a text label |
| UC-09 | Any user | Mobile nav | Load site at phone width | Nav collapses to a hamburger/drawer; all the same links are reachable; no horizontal scroll |
| UC-10 | Any user | Trigger a list error state | Disconnect backend, reload a list page | Shows a styled error state with retry option, not a blank page or raw stack trace |
| UC-11 | Customer | Session expiry | Let JWT expire, then perform an authenticated action | Redirected to login with a message, not a silent failure or raw 401 in console |
| UC-12 | Admin | View dashboard | Open Admin home | See today's order count, pending quotes needing approval, and month revenue as real widgets, not placeholder text |

---

## 4. Agent Execution Prompts

Run these as separate sessions, in order. **Stop after each and run the relevant Use-Case rows above before starting the next.**

### Manual prerequisites (you do these yourself — an agent cannot)

1. **Google OAuth:** Go to Google Cloud Console → create a project (or reuse one) → OAuth consent screen → Credentials → Create OAuth Client ID (type: Web application) → add `http://localhost:4200` as an authorized JavaScript origin → copy the generated **Client ID**. You'll pass this to the agent as `GOOGLE_CLIENT_ID`.
2. **Email for password reset (dev only):** no account needed — Phase B below adds Mailpit as a local Docker service that catches all outgoing mail with zero configuration. Swapping to a real provider (Resend, SendGrid, etc.) is a separate later decision, not required to ship this feature for the capstone.

---

### Phase A — Design System Foundation (run first; everything else benefits from it)

```
Apply the design system defined in docs/PHASE_UI_IMPLEMENTATION_PLAN.md Section 1 across the existing Angular frontend.

### Scope
1. Add Google Fonts: Space Grotesk (headings), IBM Plex Sans (body), IBM Plex Mono (already used for spec chips — keep and extend).
2. Define all color tokens from Section 1.2 as CSS custom properties in `src/styles.css` (:root scope). Remove any hardcoded Tailwind default colors (e.g. default blue-600) from existing components in favor of these tokens via Tailwind theme extension in `tailwind.config.js`.
3. Update `tailwind.config.js` `theme.extend` to register: the color tokens as named colors (`bg`, `surface`, `surface-raised`, `border`, `text-primary`, `text-secondary`, `text-muted`, `accent`, `accent-hover`, `steel`, `steel-hover`, `success`, `danger`, `warning`), fontFamily entries for heading/body/mono, and a maximum borderRadius of 10px across all component presets.
4. Update the shared Button component to: solid accent fill (primary variant), steel-blue outline (secondary variant), text-only (ghost variant) — per Section 1.5.
5. Replace every flat grey product-image placeholder with the hatch-pattern + icon + "Chưa có ảnh" empty state described in Section 1.5. Build this as a shared `ImagePlaceholder` component used everywhere a product image is missing.
6. Audit every existing card/panel component: remove soft box-shadow at rest, add a 1px `--color-border` outline instead, add the hover-only shadow rule from Section 1.4.
7. Do NOT change page layout, routes, or business logic in this phase — tokens and shared components only.

### Verification
- Run the app locally and visually confirm: headings render in Space Grotesk, body in IBM Plex Sans, all buttons use the new variant styles, no card has a visible shadow at rest.
- `npm run build` passes with zero errors.
```

---

### Phase B — Auth Completeness (Google sign-in + forgot/reset password)

```
Implement Google sign-in and forgot/reset password for backend/auth-service (8081) and the Angular frontend, building on the existing JWT auth from Phase 1.

### Part 1: Database (infra/postgres/init.sql — add migration)
1. Alter `auth_schema.users`: add `auth_provider` (VARCHAR, enum-like: 'LOCAL' | 'GOOGLE', default 'LOCAL'), add `google_id` (VARCHAR, nullable, unique). Make `password_hash` nullable (Google-only users have none).
2. New table `auth_schema.password_reset_tokens`: `id` (PK), `user_id` (FK to users), `token` (VARCHAR, unique, indexed), `expires_at` (TIMESTAMP), `used_at` (TIMESTAMP, nullable).

### Part 2: backend/auth-service
1. Add dependency `com.google.api-client:google-api-client` for `GoogleIdTokenVerifier`.
2. Add dependency `spring-boot-starter-mail`.
3. New config: `GOOGLE_CLIENT_ID` (env var, also used by frontend).
4. `POST /api/v1/auth/google` — body `{ idToken }`. Verify the token via `GoogleIdTokenVerifier` (audience = GOOGLE_CLIENT_ID). Extract `email`, `email_verified`, `name`, `sub`. Find user by email; if none exists, create one with `role=CUSTOMER`, `authProvider=GOOGLE`, `googleId=sub`, no password. Issue the same internal JWT format as password login. Return `ApiResponse<AuthResponse>`.
5. `POST /api/v1/auth/forgot-password` — body `{ email }`. Always return a generic success message regardless of whether the email exists (prevent user enumeration). If the user exists, generate a UUID token, store it with a 1-hour expiry, and send an email containing a link to `http://localhost:4200/reset-password?token=<token>`.
6. `POST /api/v1/auth/reset-password` — body `{ token, newPassword }`. Validate the token exists, is unexpired, and unused. Update the user's `password_hash` (BCrypt), mark the token `used_at = now()`. Reject with a clear error if the token is invalid/expired/used.
7. Configure Spring Mail to point at a local Mailpit instance (`localhost:1025`, no auth) for dev.

### Part 3: infra/docker-compose.yml
Add a `mailpit` service (image `axllent/mailpit`), exposing SMTP on 1025 and the web UI on 8025, on the existing `b2b-network` (or equivalent network name already in use).

### Part 4: frontend
1. Load the Google Identity Services script (`https://accounts.google.com/gsi/client`) in `index.html`.
2. On the Login page, add a "Đăng nhập với Google" button using `google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback })` and `renderButton`. On callback, POST the received `credential` to `/api/v1/auth/google`, store the returned JWT the same way the password login flow does.
3. New `ForgotPasswordComponent` (route `/forgot-password`): email field, submit calls `/api/v1/auth/forgot-password`, shows a generic "if that email exists, check your inbox" message regardless of outcome.
4. New `ResetPasswordComponent` (route `/reset-password`): reads `token` from the query string, new-password + confirm-password fields with matching validation, submits to `/api/v1/auth/reset-password`, redirects to login on success with a confirmation toast.
5. Apply the Phase A design system to all new components — no unstyled default forms.

### Verification
- Register a normal account, then test Google sign-in with a different/new Google account — confirm it creates a CUSTOMER user with no password set.
- Trigger forgot-password, open Mailpit at localhost:8025, confirm the email arrived, click the link, set a new password, log in with it.
- Confirm the old password no longer works and the reset link is rejected if visited again.
- JUnit tests for: GoogleAuthService (new user creation, existing user matched by email), password reset token generation/validation/expiry/reuse-rejection.
```

---

### Phase C — Catalog & Navigation UX

```
Implement pagination, the data-driven category mega-menu, mobile nav, and the detailed product page.

### Part 1: backend/catalog-pricing-service — pagination
1. Convert `GET /api/v1/catalog/products` to accept `page`, `size`, `sort` query params using Spring Data `Pageable`, returning `ApiResponse<PageResponse<ProductDto>>` (PageResponse already exists in common-dto).
2. Same conversion for any admin list endpoints under `/api/v1/admin/catalog/**`.
3. Ensure `GET /api/v1/catalog/categories` returns a nested tree structure (parent categories with a `children[]` array), matching the legacy site's structure: Tem Nhãn (parent) → Tem Nhãn Inox, Tem Nhãn Nhôm, Tem nhãn đồng, Tem nhãn mica (children); plus top-level CNC, Laser, Máy Móc, Hoá Chất, Vật Phẩm Lưu Niệm.

### Part 2: backend/order-service — pagination
Convert admin order list and admin customer list endpoints to the same `Pageable`/`PageResponse<T>` pattern.

### Part 3: frontend — shared PaginatorComponent
Build one reusable `PaginatorComponent` (prev/next, page numbers, current-page highlight) styled per the Phase A design system. Wire it into the product list and both admin list pages.

### Part 4: frontend — NavbarComponent rebuild
1. Fetch categories from `/api/v1/catalog/categories` on load (cache in a signal).
2. Render a hover/click-activated dropdown mega-menu for any category with children, matching the legacy site's nested structure above.
3. Add a mobile breakpoint: below 768px, collapse the nav into a hamburger icon that opens a slide-out drawer with the same links.
4. Close any open dropdown on outside click and on Escape key.

### Part 5: frontend — ProductDetailComponent
1. Image gallery: main image + thumbnail strip below it; clicking a thumbnail swaps the main image; clicking the main image opens a simple lightbox/zoom overlay.
2. Full spec table: material, thickness options, size range, processing method, estimated lead time.
3. Differentiated CTA: for `productType === 'STANDARD_ITEM'`, show quantity selector + "Thêm vào giỏ"; for `productType === 'CUSTOM_TEMPLATE'`, show "Tuỳ chỉnh kích thước" routing to `/quote-builder` pre-filled with this product's category/material.
4. Breadcrumb trail (Trang chủ / Category / Product name) above the gallery.

### Verification
- Confirm UC-03, UC-04, UC-05, UC-09 from the use-case checklist all pass by manual click-through, on both desktop and a narrow (375px) viewport.
```

---

### Phase D — Admin Product & Pricing Management

```
Build the admin UI for product and pricing-rule management — these currently only exist as raw APIs.

### Part 1: frontend — AdminProductListComponent
Paginated table (uses the Phase C PaginatorComponent) with columns: image thumbnail, name, category, type, price/stock (if stocked), active toggle, edit/delete actions. Search box filtering by name; dropdown filter by category and product type.

### Part 2: frontend — AdminProductFormComponent (create/edit)
1. Fields: name, auto-generated editable slug, category select, product type select (STANDARD_ITEM / CUSTOM_TEMPLATE).
2. If STANDARD_ITEM: fixed price field, stock quantity field.
3. If CUSTOM_TEMPLATE: linked material select, linked pricing rule select.
4. Multi-image upload: drag-and-drop or file picker, uses the existing `/api/v1/files/upload` endpoint, shows thumbnail previews, allows reordering and marking one image as primary, allows removing an image before save.
5. Form validation errors shown inline per field, using the Phase A design system's error state styling.

### Part 3: frontend — AdminPricingRuleListComponent + form
1. List existing pricing rules (per material): thin-sheet rate per m², weight multiplier, thickness threshold, density.
2. Edit form for each: allow the thickness threshold to be edited explicitly as its own labeled field (in millimeters, with a visible unit label) rather than hardcoded — this is deliberate, since the exact "1 ly" threshold value is still unconfirmed with the business owner and must be owner-editable once confirmed, not require a code change.
3. Bulk-discount tiers: support an editable LIST of {minQuantity, discountPercent} tiers, not a single hardcoded 1000-unit/10% rule — allows adding more tiers later without a backend change.

### Verification
- Confirm UC-06, UC-07 pass by manual click-through: create a product end-to-end including image upload, then edit a pricing rule's rate and confirm a fresh quote calculation on the public quote-builder reflects the new number immediately.
```

---

## 5. Open items still needing your uncle's confirmation (do not let the agent silently assume these)

1. **"1 ly" unit** — confirm whether this means 1.0mm or 0.1mm. This single answer changes which pricing branch most real orders fall into.
2. **Whether the 5,000,000 VND/m² thin-sheet rate applies uniformly to mica/decal as well as thin metal**, or whether decal should have its own, separately configured rate (the Phase D admin UI above is built so this can be corrected without touching code, once you know the answer).
