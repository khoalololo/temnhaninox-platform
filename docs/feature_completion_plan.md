# TEM NHÃN INOX - UI/UX Overhaul & Feature Completion Plan
**Document type:** Agent execution plan (phases A-D, follows completed Phase 1-3 backend and initial Phase 4 storefront work)
**Status (2026-11-28):** Phases A-F are implemented. Owner-confirmed historical verification: `mvn test` passed through Phases B/E/F, and Google sign-in works end to end. Phase G includes payment-verification safeguards, authenticated private payment-proof preview, order summary quantity, responsive admin order/payment views, Kanban, per-material pricing, and a broad storefront/admin UI refresh. UI work covers navigation/theme/account controls, product editing and image ordering, product detail galleries, category filters, shared tags/buttons, account/cart/order views, and quote-builder/3D preview readability. The latest Angular production build and `git diff --check` pass. **Backend changes currently in the worktree have not been Maven-compiled or tested; Maven and a wrapper are unavailable in the current environment.** Manual Use-Case Checklist (Section 3), `scripts/e2e-smoke.mjs`, and a `docker compose up --build` run remain pending.

> **How to use this document:** Execute ONE phase at a time. After each phase, stop and manually verify against the Use-Case Checklist (Section 3) before telling the agent to proceed to the next phase. Do not trust a "done" report from the agent without clicking through the actual running app yourself - this is the same rule as the Master Implementation Plan review: an agent's report of completion and the feature actually working are two different facts.

---

## 1. Design System Specification

### 1.1 Current Visual Direction & Resolved Fixes
The storefront uses the NVX forest-green palette (`#187115` primary brand green) on clean light/dark surfaces with local workshop and product photography mapped from `public/assets/products/`.

Resolved in recent updates:
- **Database & Asset Seeding:** `infra/postgres/init.sql` (`DROP SCHEMA IF EXISTS ... CASCADE`) and `infra/postgres/seed_products.sql` (11 categories, 37 products) run cleanly; `CatalogApiService` normalizes `images[]` to `imageUrl` and `galleryUrls` with an `(error)` fallback to the diagonal-hatch `"Chưa có ảnh"` placeholder for any missing upstream image.
- **Numeric Readability:** Replaced narrow `font-mono` glyphs on product prices (`60.000 đ`), dimensions (`400 × 300 × 1.2 mm`), SKUs, and stock counters with `font-sans tabular-nums` so numbers align cleanly and remain legible at card sizes.
- **Solid tags and semantic action colors:** Shared `.tni-chip` tags are compact square-corner labels with full-color fills and dark text. Use semantic tones consistently: green for success/available, amber for pending/warning, blue for informational/custom-work states, mauve for active production/accent states, red for rejected/destructive states, and gray for neutral states.
- **Button hierarchy:** Keep primary actions as white-on-brand-green. Use neutral gray for secondary actions, amber for low-emphasis/ghost actions, and red for destructive actions; use other filled colors only when the action/status meaning supports it. Keep text dark on all non-primary fills.
- **Navigation and compact controls:** Use clear, larger navigation targets and consistent hover/active states. Category filters and other selection controls should be readable, squared, and visibly selected without using pills by default. Give each top-level catalog category its own varied hue, with lighter related shades for its child categories; reserve the neutral fill for “all categories.” Reuse colors for tags/buttons only when they convey the same semantic nature, not merely to create a repeating palette.
- **Kanban layout:** Show all active workflow stages without horizontal scrolling. Use responsive grids (7 stages normally, 8 with cancelled visible; collapse to 4 and 2 columns at narrower breakpoints), slim lanes, readable cards, and internal vertical scrolling where needed. Preserve business transitions and payment guards.
- **3D preview contrast:** Keep dimensions, material details, camera instructions, and camera preset controls on opaque/high-contrast panels above the dark render.

### 1.2 Color Tokens

```css
:root {
  /* Light / Industrial Storefront Surfaces */
  --color-bg: #FFFFFF;
  --color-bg-elevated: #FFFFFF;
  --color-surface: #F7F9F7;
  --color-surface-raised: #EEF4EE;
  --color-border: #DCE5DC;

  /* Text */
  --color-text-primary: #1A241A;
  --color-text-secondary: #445244;
  --color-text-muted: #6E7D6E;

  /* Brand Accents */
  --color-accent: #187115;        /* Brand green; primary CTA stays white on green */
  --color-accent-hover: #1E8A1B;
  --color-steel: #397500;
  --color-steel-hover: #2B5900;

  /* Status */
  --color-success: #187115;
  --color-danger: #B20000;
  --color-warning: #D97706;
}
```

Semantic badge fills are intentionally distinct from the theme tokens so that tag text remains dark and legible: warning `#F7DF91`, info `#B8E4F2`, accent/production `#DFC5EB`, success `#C8E6C1`, danger `#F3B9B9`, and muted `#D9DDDA`.

### 1.3 Typography

| Role | Font | Weight | Notes |
|---|---|---|---|
| Headings (`h1`-`h3`) | **Space Grotesk** / **Be Vietnam Pro** | 600-700 | Clean Vietnamese diacritic support with geometric industrial weight |
| Body & UI text | **Be Vietnam Pro** / **IBM Plex Sans** | 400-500 | Default UI font |
| Prices, Dimensions, SKUs & Tables | **Sans-serif + `tabular-nums`** | 600-700 | Replaces `font-mono` for crisp numeric legibility and aligned columns |

### 1.4 Spacing, Radius & Elevation
- Base spacing unit: `4px` (`4, 8, 12, 16, 24, 32, 48, 64, 96`).
- Border radius: approximately `4-6px` for inputs/buttons/tags, `10px` max for cards. Prefer square-corner tags over pill badges.
- Elevation: `1px` `--color-border` outline on cards at rest; introduce subtle shadow only on hover/focus (`0 4px 16px rgba(0, 0, 0, 0.08)` in light mode, `rgba(0, 0, 0, 0.3)` in dark mode).

### 1.5 Iconography and UI Punctuation
- Do not display arrows, checkmarks, crosses, emoji, or decorative icon glyphs as text anywhere in the site. Use inline SVG artwork for visual icons, and provide accessible labels when an icon conveys meaning.
- Write transitions and navigation instructions in plain words. Do not use em dashes as UI punctuation; use commas, periods, colons, or regular hyphens where appropriate.
- This rule applies to every route and shared component, including storefront, account, checkout, payment, and admin pages. Preserve meaningful mathematical notation and normal language punctuation.

---

## 2. Consolidated Feature Gap Tiers

This audit combines the gaps in the original Phase 0-5 checklist with the Phase C/D completion plan. “Implemented” means code exists; it does not mean the runtime/manual acceptance check has passed. Google sign-in and forgot/reset-password are now implemented (Phase B); Google sign-in is verified by the owner, the reset-password flow still needs UC-01.

### Tier 1 - Verify or resolve before production/demo sign-off
| # | Gap | Current evidence / status | Required follow-up |
|---|---|---|---|
| 1 | Full cross-service order lifecycle is not verified end-to-end | Unit tests cover individual services and transitions; no cross-service integration test or recorded manual run covers custom quote to admin review to prototype to deposit to production to completion. | **Automated now:** `node scripts/e2e-smoke.mjs` (see Phase F) drives the whole lifecycle through the gateway and asserts every state, guard and price. Run it, then still do the visual UC walkthrough by hand. |
| 2 | Storefront/admin acceptance checks are still pending | Pagination, product detail, admin catalog/pricing, order tracking, dashboard, loading/error states, and mobile navigation are implemented in code. The tracker explicitly says UC-03-UC-12 and 375px checks are pending. | Run and record UC-01 and UC-03-UC-16 on desktop and a 375px viewport (UC-02 already verified by the owner). |
| 3 | Production RBAC depends on trusted network boundaries | The gateway validates JWTs, strips spoofed identity headers, and has tests for 401/403 behavior. Downstream services accept `X-User-Id`/`X-User-Role`; no repository deployment config currently restricts direct access to their ports. JWT config also has a development fallback secret. | Before deployment, make services reachable only through the gateway (private network/bind/firewall) and require a strong shared `JWT_SECRET` with no production fallback. Verify gateway-mediated and direct-service denial. |

### Tier 2 - Align implementation with the Phase 0/3/5 architecture checklist
| # | Gap | Current evidence / status | Required follow-up |
|---|---|---|---|
| 4 | Repeatable Docker/Nginx deployment setup is not runtime-verified | Dockerfiles, `infra/docker-compose.yml`, Nginx configuration, environment-driven gateway URLs, and Mailpit wiring are present. The stack has not been built or started in this verification cycle. | Run Compose from a clean environment, verify health checks and gateway-only exposure, and document any reproducibility gaps found. |
| 5 | Storage topology/bucket acceptance criteria do not match | The app uses SeaweedFS S3 configuration and the `design-files`, `product-images`, and private `payment-proofs` buckets. Payment proofs are streamed via an authenticated admin endpoint. The repository still needs a reproducible Compose/startup check proving all required buckets and storage behavior. | Confirm SeaweedFS vs. MinIO and provision/verify the intended buckets reproducibly; run the stack and test authenticated proof viewing. |
| 6 | Admin order UI differs from the requested Phase 5 layout | **Addressed in Phase G (2026-11-27/28):** `/admin/board` provides a no-horizontal-scroll responsive Kanban grid next to the existing list + inspector at `/admin`. Simple workflow transitions remain draggable/actionable; steps needing quote, prototype, or payment data open the inspector. The list/inspector supports status tags, payment progress, and authenticated image previews. | Verify UC-13 and the responsive board in a real browser; latest no-scroll/color redesign has build verification but no visual browser pass yet. |
| 7 | Order-state logic is not factored into the named state-machine service | Transition validation and deposit gates exist in `AdminOrderService`/`OrderService`; there is no separate `OrderStateMachineService` as named in the Phase 3 checklist. | Extract a dedicated service only if the architecture requirement is retained; preserve and test the existing transition and deposit rules. |

### Tier 3 - Evidence and quality gates
| # | Gap | Current evidence / status | Required follow-up |
|---|---|---|---|
| 8 | “100%” pricing test coverage is not demonstrated | Pricing formula tests cover representative thin/thick, bulk, VAT, and deposit cases, but no coverage report was found to substantiate 100% coverage. | **Done:** JaCoCo added to the parent pom; run `mvn test` and open `catalog-pricing-service/target/site/jacoco/index.html`. Added 999/1000-unit and 1.00/1.01 mm boundary tests. Quote the real number from the report; do not claim 100% unless it says so. |
| 9 | Runtime infrastructure claims are not verified by repository state | The tracker records earlier local PostgreSQL/SeaweedFS setup, but there is no checked-in deployment definition to reproduce the claimed running services, schemas, or buckets. | Re-run the setup from documented commands and record schema/bucket/health checks after Tier 2 deployment decisions are resolved. |

### Tier 4 - Deferred or awaiting owner decision
| # | Item | Status |
|---|---|---|
| 10 | Google sign-in and forgot/reset-password | Implemented (Phase B). Google sign-in verified by the owner; reset flow awaiting UC-01 (Mailpit). |
| 11 | Meaning of “1 ly” | **Resolved 2026-11-27: 1 ly = 1 mm.** The existing threshold (`THIN_SHEET_THRESHOLD_MM = 1.0`, thin when thickness ≤ 1.0 mm) is therefore correct; no code change. The admin label now reads “Ngưỡng tấm mỏng (1 ly = 1 mm)”. |
| 12 | Mica/Decal pricing rate | **Resolved in principle 2026-11-27: the 5,000,000 đ/m² rate does NOT apply to mica or decal.** Implemented: the rate is per material; a non-metal material with no rate configured is refused by the quote engine with a clear message instead of silently using the metal rate. **Still needed from the uncle: the actual đ/m² for mica/decal** (enter it in Admin to Định giá to “Giá theo vật liệu”). Until then, mica/decal quotes return a validation error. |
| 13 | Official VAT invoice PDF | Current print-friendly order summary is not a tax invoice; a compliant invoice integration remains out of scope until specified. |
| 14 | Customer-visible vs internal order notes | Open. `productionWorkerNote` is currently an internal/worker note that the API also returns to customers; as a stopgap the customer order page no longer displays it (it shows only the estimated completion date). Proper fix: add a separate customer-facing progress note (backend Flyway V2 in order-service + entity/DTO/mapper/tests, admin input, customer display). |
| 15 | Image size/optimisation | Reframed by the owner: the need is that admin and customer can *see and preview* uploaded images (designs, prototypes, payment proofs). Done in Phase G (thumbnails + lightbox). Resizing/compressing the static asset folder remains optional and untracked in git. |

---

## 3. Use-Case Checklist (verify manually)

| ID | Actor | Scenario | Steps | Expected result |
|---|---|---|---|---|
| UC-01 | Customer | Forgot password | `/login` to "Quên mật khẩu?" to enter email to open Mailpit (http://localhost:8025) to click link to set new password to log in with it | Same success message for unknown emails; link works once and expires after 1 h; reusing it fails |
| UC-02 | Customer | Google sign-in | Set `GOOGLE_CLIENT_ID` (backend) and `app-config.ts` (frontend), click the Google button | New CUSTOMER account created, JWT issued; an existing ADMIN email is refused; button hidden when no client ID |
| UC-03 | Visitor | Browse paginated catalog | Open `/products` with 37 seeded items | Shows page size (e.g., 12) + pagination bar; page 2 loads next set |
| UC-04 | Visitor | Use category mega-menu | Hover/click "Sản phẩm" in top nav | Dropdown shows nested categories (`Tem Nhãn` to `Inox`, `Nhôm`, `Đồng`, `Mica`, `Decal`, `CNC`, `Laser`, `Máy Móc`, `Hoá Chất`, `Vật Phẩm Lưu Niệm`) |
| UC-05 | Visitor | View product detail | Click a product card | Image gallery with thumbnail swap, full spec table, "Thêm vào giỏ" (`STANDARD_ITEM`) or "Tuỳ chỉnh kích thước 3D" (`CUSTOM_TEMPLATE`) |
| UC-06 | Admin | Create a new product | Admin to Products to New | Set name, category, type, upload images via `/api/v1/files/upload`, save; appears in catalog immediately |
| UC-07 | Admin | Edit a pricing rule | Admin to Pricing Rules to edit thin-sheet rate | Change persists; next quote calculation reflects new rate immediately |
| UC-08 | Customer | Track an order | Open Orders to select an order | Visual 7-step lifecycle stepper with status history |
| UC-09 | Any user | Mobile nav | Resize viewport to 375px | Nav collapses to hamburger drawer with all links reachable and no horizontal overflow |
| UC-10 | Any user | List error state | Stop backend, reload `/products` | Styled error state with retry button |
| UC-11 | Customer | Session expiry | Expired JWT on authenticated request | Redirects to login with notification |
| UC-12 | Admin | View dashboard | Open `/admin` | Live KPI widgets from `/api/v1/admin/dashboard/summary` |
| UC-13 | Admin | Kanban board | Open `/admin/board` (tab “Bảng Kanban”); drag a card from “Đang sản xuất” to “Sẵn sàng giao”; try the “ to  Sẵn sàng giao” button; drag a card to a column that is not allowed | Valid drag moves the card and writes a status log; invalid drop shows a toast telling you to open the order; “Hoàn tất” is refused until the balance is paid; cards open `/admin?order=<id>` |
| UC-14 | Admin | Preview uploaded images | Open an order that has a customer design image, a prototype and a payment proof | Thumbnails render in the inspector; clicking opens a full-size preview (Esc closes); non-image designs (.cdr/.ai) show a download tile |
| UC-15 | Admin | Mica/Decal pricing | Admin to Định giá to “Giá theo vật liệu”: enter a đ/m² for Mica / Decal, save; request a mica quote in `/quote-builder` | Before saving: the quote is refused with “Price per m2 is not configured yet...”; after saving: price = area (m²) × the mica rate; metals are unchanged |
| UC-16 | Customer | Order screens | `/account/orders` and `/account/orders/:id` at desktop and 375px | List shows status chips, payment progress and a “Cần thao tác” hint for orders awaiting sample approval/deposit; detail shows a numbered stepper, Vietnamese timeline labels, VAT as “10%”, payment history, and previewable design/prototype/proof images; no internal worker note |

---

## 4. Agent Execution Prompts

Run these as separate sessions, in order. **Stop after each and run the relevant Use-Case rows above before starting the next.**

### Manual Prerequisites
- Google sign-in: the OAuth Client ID is set in `GOOGLE_CLIENT_ID` (backend) and `frontend/src/app/core/config/app-config.ts`; verified working by the owner.
- Password reset needs Mailpit (`docker compose up mailpit`, UI at http://localhost:8025).
- Mica/Decal quotes need a per-material rate entered in Admin to Định giá (see Tier 4 #12).

---

### Phase A - Remaining Design System Polish

```
Apply the remaining design system updates from docs/PHASE_UI_IMPLEMENTATION_PLAN.md Section 1 across the Angular frontend.

### Scope
1. Standardize CSS variables (:root tokens from Section 1.2) in `frontend/src/styles.css` with clean light/dark surface support.
2. Ensure Google Fonts (`Space Grotesk` for headings and `Be Vietnam Pro` for UI/body) are loaded in `index.html` and mapped in `styles.css` / Tailwind config.
3. Ensure all numeric fields (prices, dimensions, SKUs, stock counts, table numbers) use `font-sans tabular-nums` instead of `font-mono`.
4. Upgrade product card top-left status badges (`GIA CÔNG 3D`, `CÓ SẴN`) to high-contrast solid pills (`bg-emerald-900/90 text-white backdrop-blur-sm`) so they remain crisp on dark product images.
5. Audit all cards/panels so border-radius is <= 10px with a 1px border outline at rest and subtle shadow on hover only.

### Verification
- Run `npm run build` with zero errors and visually inspect `/products` in both light and dark modes.
```

---

### Phase B - Auth Completeness (Google Sign-In + Forgot/Reset Password) [IMPLEMENTED on branch feature/phase-b-auth; NOT RUN - verify UC-01/UC-02]

```
Already implemented (see summary below). Do not re-run this prompt; use it only as the spec to verify against.

Implement Google sign-in and forgot/reset password for backend/auth-service (8081) and the Angular frontend, building on the existing JWT auth from Phase 1.

### Part 1: Database (new Flyway migration `backend/auth-service/src/main/resources/db/migration/V2__google_and_password_reset.sql`; do NOT edit init.sql or V1)
1. Alter `auth_schema.users`: add `auth_provider` (VARCHAR, 'LOCAL' | 'GOOGLE', default 'LOCAL'), add `google_id` (VARCHAR, nullable, unique), and make `password_hash` nullable.
2. New table `auth_schema.password_reset_tokens`: `id` (UUID PK), `user_id` (FK to users), `token` (VARCHAR, unique, indexed), `expires_at` (TIMESTAMP WITH TIME ZONE), `used_at` (TIMESTAMP WITH TIME ZONE, nullable).

### Part 2: backend/auth-service
1. Add `com.google.api-client:google-api-client` (`GoogleIdTokenVerifier`) and `spring-boot-starter-mail`.
2. `POST /api/v1/auth/google` - verify `{ idToken }` against `GOOGLE_CLIENT_ID`, find or create a `CUSTOMER` user (`authProvider=GOOGLE`, `googleId=sub`), and return the standard `ApiResponse<AuthResponse>` JWT.
3. `POST /api/v1/auth/forgot-password` - accept `{ email }`, always return a generic success response, generate a 1-hour UUID reset token if the user exists, and send a reset link (`http://localhost:4200/reset-password?token=<token>`) via Spring Mail (`localhost:1025`).
4. `POST /api/v1/auth/reset-password` - validate `{ token, newPassword }` (exists, unexpired, unused), update `password_hash` (BCrypt), and set `used_at = NOW()`.

### Part 3: infra/docker-compose.yml
Add a `mailpit` service (`axllent/mailpit`) exposing SMTP on `1025` and Web UI on `8025`.

### Part 4: frontend
1. Load `https://accounts.google.com/gsi/client` in `index.html` and wire "Đăng nhập với Google" on the Login page to `POST /api/v1/auth/google`.
2. Build `ForgotPasswordComponent` (`/forgot-password`) and `ResetPasswordComponent` (`/reset-password`) styled with the NVX design system.

### Verification
- Verify UC-01 and UC-02 manually using Mailpit at `http://localhost:8025` and run JUnit tests for `auth-service`.
```

**Phase B implementation summary (branch `feature/phase-b-auth`, uncompiled backend - run `mvn test`):**
- Flyway `V2__google_signin_and_password_reset.sql` (validated on Postgres 16): `auth_provider`, `google_id` (unique), nullable `password_hash` and `phone`, `password_reset_tokens` (stores SHA-256 hash only).
- `POST /api/v1/auth/forgot-password` (always generic 200), `POST /api/v1/auth/reset-password` (1 h, single use, invalidates all of the user's tokens), `POST /api/v1/auth/google` (verifies via Google tokeninfo, checks audience + `email_verified`, never links to an ADMIN account).
- Spring Mail + Mailpit in compose; frontend `/forgot-password`, `/reset-password`, Google button on `/login`.
- Manual prerequisite: create the Google OAuth Client ID and set it in two places (backend env + `app-config.ts`).
- Known limits: tokeninfo adds one HTTP call per Google login (fine at this scale; switch to `GoogleIdTokenVerifier` if volume grows); no rate limit on forgot-password yet; no "change password" screen for logged-in users yet.

---

### Phase C - Catalog Pagination, Mega-Menu, Mobile Drawer & Product Detail Page [IMPLEMENTED; MANUAL CHECKS PENDING]

```
Implement catalog pagination, the data-driven category dropdown menu, mobile drawer nav, and the detailed product page.

### Part 1: frontend - PaginatorComponent
Build a reusable `PaginatorComponent` (prev/next, page numbers, current-page highlight, `tabular-nums`) and wire `page`, `size`, and `totalPages` from `PageResponse<Product>` into `/products` and admin list views.

### Part 2: frontend - NavbarComponent
1. Use the cached `/api/v1/catalog/categories` tree to render a hover/click dropdown menu under "Sản phẩm" matching the nested hierarchy (`Tem Nhãn` to `Inox`, `Nhôm`, `Đồng`, `Mica`, `Decal`, `CNC`, `Laser`, `Máy Móc`, `Hoá Chất`, `Vật Phẩm Lưu Niệm`).
2. Add a mobile drawer below `768px` with a hamburger toggle, Escape/outside-click close handling, and zero horizontal overflow.

### Part 3: frontend - ProductDetailComponent (`/products/:slug`)
1. Breadcrumb trail (`Trang chủ / Category / Product name`).
2. Image gallery with main photo, thumbnail strip switcher using `galleryUrls` / `images[]`, and fallback placeholder on missing images.
3. Full specification table (material, default dimensions, thickness, processing method, estimated lead time).
4. Differentiated CTA: quantity selector + "Thêm vào giỏ" for `STANDARD_ITEM`, or "Tuỳ chỉnh kích thước 3D" routing to `/quote-builder` pre-filled with the product's material and category for `CUSTOM_TEMPLATE`.

### Verification
- Confirm UC-03, UC-04, UC-05, and UC-09 pass manually on desktop and a `375px` mobile viewport.
```

---

### Phase D - Admin Product & Pricing Management [IMPLEMENTED; MANUAL CHECKS PENDING]

```
Build the admin UI for product and pricing-rule management wired to the existing backend admin endpoints.

### Part 1: frontend - AdminProductListComponent & AdminProductFormComponent
1. Paginated product table with image thumbnail, name, SKU, category, product type, price/stock, active toggle, and edit/delete actions, plus search and category/type filters.
2. Create/edit product form supporting `STANDARD_ITEM` (fixed price, stock quantity) and `CUSTOM_TEMPLATE` (material, processing method, default dimensions).
3. Multi-image uploader wired to `POST /api/v1/files/upload` with thumbnail previews, reordering, and image removal.

### Part 2: frontend - AdminPricingRuleListComponent
1. Owner-editable form for `pricing_rules` (`THIN_SHEET_RATE_M2`, `THICK_METAL_MULTIPLIER`, `THIN_SHEET_THRESHOLD_MM` with explicit `mm` unit label, `BULK_DISCOUNT_MIN_QTY`, `BULK_DISCOUNT_RATE`, `VAT_RATE`, `DEPOSIT_RATE`).
2. Ensure updates persist via `PUT /api/v1/admin/pricing/rules` and immediately affect new quote calculations on `/quote-builder`.

### Verification
- Confirm UC-06 and UC-07 pass manually end-to-end.
```

---

### Phase E - Hardening Before Phase 5 [WRITTEN, NOT YET RUN - verify locally]

Done on branch `hardening/phase5-prep` (review the diff, then run `cd backend && mvn test` and start all services):

| # | Change | How to verify |
|---|---|---|
| E1 | VNPAY **IPN** endpoint `GET /api/v1/payments/vnpay-ipn` (public in gateway) returning VNPAY's `{RspCode, Message}`; shared signature check; **amount must match** `vnp_Amount = amount×100`; processing is idempotent (only `PENDING` changes), so IPN + browser return in any order never double-count. | 4 new tests in `PaymentServiceTest`. Manually: pay in sandbox, close the tab before returning, confirm order still reaches `IN_PRODUCTION`. IPN needs a public URL (e.g. ngrok) registered in the VNPAY merchant portal. |
| E2 | **Secrets**: no more hardcoded fallbacks in `application.yml`. Local dev uses `application-dev.yml` (active by default). Production sets `SPRING_PROFILES_ACTIVE=prod` and must supply `JWT_SECRET`, `POSTGRES_PASSWORD`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, `S3_*`, `VNPAY_*` or the service fails to start. See `infra/.env.example`. | Start with `SPRING_PROFILES_ACTIVE=prod` and no env to startup error. Start normally to works as before. |
| E3 | **Flyway** per service (`db/migration/V1__baseline_*.sql`, history table in each service's own schema, `baseline-on-migrate` so your existing DB is adopted, not rebuilt). `init.sql` no longer drops anything; `infra/postgres/dev-reset.sql` is the explicit dev wipe. Baseline SQL was checked to produce a schema identical to the old `init.sql` (pg_dump diff) with 5 materials, 7 pricing rules, 12 compatibility rows. | Start each service on your existing DB: Flyway should log "Successfully baselined". On an empty DB: it should create everything and Hibernate `validate` must pass. All future schema changes = new `V2__...sql`, never edit V1. |

**Still open after Phase E**
- Downstream services still trust `X-User-*` headers: fix by network isolation (compose) now; consider a gateway-signed internal token later.
- Existing admin keeps its old password; change it manually (no password-change UI yet - add with Phase B).
- Phase B Part 1 must now be a Flyway migration `auth-service/.../V2__google_and_password_reset.sql`, not an edit to `init.sql`.
- Pricing unit/rate questions in Section 5 still block trusting any quote.

---

### Phase F - Automated verification & guard fixes [WRITTEN, NOT YET RUN]

Branch `feature/e2e-smoke-and-coverage` (includes Phase B):
- **Bug fixed:** admin could move an order to `COMPLETED` without the full balance being verified (the `BALANCE_NOT_SETTLED` error code existed but was never used). `AdminOrderService.updateOrderStatus` now enforces `paidAmount >= totalAmount`; 2 new tests.
- **`scripts/e2e-smoke.mjs`** (Node 18+, no dependencies): auth and role checks (401/403, admin cannot use the cart), password-reset enumeration safety, pricing vector (INOX_304 100×50×2 mm ×10 = 33,702.50/unit, +10% VAT), custom order `QUOTE_PENDING to QUOTE_APPROVED to PROTOTYPING to AWAITING_DEPOSIT to IN_PRODUCTION to READY_FOR_DELIVERY to COMPLETED` including the guards (no production before deposit, no completion before balance), status history, cross-customer isolation, standard-item order, and VNPAY IPN (wrong amount 04, bad signature 97, success 00, replay 02). Creates throw-away users/orders: dev DB only. `CHECK_DIRECT=1` also reports whether service ports are reachable directly.
- Run: start Postgres + object storage + the 4 services (or compose), then `node scripts/e2e-smoke.mjs`. Exit code 1 on any failure.

**Decisions recorded for the remaining Tier 2 items**
- Admin layout (#6, Kanban + single-screen cockpit): the tabbed inspector supports full order handling; the requested at-a-glance board is now implemented at `/admin/board`. Continue to validate the board in a real browser.
- `OrderStateMachineService` (#7): transitions live in `AdminOrderService`/`OrderService` and are unit-tested; extract only if you want it as a showcase of design, not for correctness.
- Storage (#5): decide whether to retain SeaweedFS or move to MinIO. Payment proofs are stored in the private `payment-proofs` bucket and are displayed through an authenticated admin stream, not by exposing a direct public object URL.

---

### Phase G - Admin Kanban, UI/UX polish, image previews & per-material pricing [IMPLEMENTED IN WORKTREE; latest frontend build passes; latest backend changes NOT compiled]

**G1 - Kanban board** (`frontend/src/app/features/admin/order-board/`, route `/admin/board`, guarded by `adminGuard`)
- One lane per visible status with counts; completed/cancelled hidden by default. Lanes are arranged in a responsive grid with no horizontal scrolling. Data via one `getOrders` request per status (`forkJoin`); search + type filter client-side; silent 60 s refresh (paused while dragging or when the tab is hidden).
- Cards: order code, order type, recipient, total units (separate from line-item count), total, paid-% bar, VAT tag, and age/stale tag.
- Moves allowed by drag or the card's button: `IN_PRODUCTION to READY_FOR_DELIVERY`, `READY_FOR_DELIVERY to COMPLETED` (blocked until paid ≥ total, mirroring the backend `BALANCE_NOT_SETTLED` guard), and cancel from any non-terminal status. Everything else opens the inspector (`/admin?order=<id>`) because it needs data. Optimistic update with rollback + toast.
- Limitation: drag-and-drop is HTML5 DnD (no touch drag on phones - use the card buttons there). Counts for completed/cancelled show only the page size (15).
- The board's responsive layout is 7 columns normally and 8 when cancelled is shown on wide screens, 4 columns at medium widths, and 2 on phones. Cards may scroll vertically within their own lane.

**G2 - Shared UI primitives** (`frontend/src/styles.css` `.tni-*`, `shared/utils/order-ui.ts`, `shared/components/image-lightbox/`)
- Status/type/payment solid-fill square tags, progress bars, switch, avatars, thumbnails, empty states, sticky-header tables, filters; one place for Vietnamese status/phase/method labels and tones; `app-image-lightbox` (Esc to close, “open original”). Palette rules: green success, amber warning, blue info, mauve accent, red danger, gray neutral, all with dark label text.
- Shared action buttons: primary actions remain white on brand green; secondary actions use neutral gray, ghost actions amber, destructive actions red, with dark text on non-primary fills. Catalog sidebar, quote step navigation, quantity presets, file picker, and 3D camera controls use the same accessible filled-control direction.
- Catalog category filters assign a varied hue to every top-level category and use lighter shades for its subcategories; “all categories” and reset remain neutral. These category colors are distinct from semantic status tags, whose shared colors remain consistent when the meaning is the same.

**G3 - Admin cockpit polish** (`admin-cockpit.component.ts`)
- Orders: status pill filter, table with type/VAT chips, payment progress, selected-row accent, helpful empty state; inspector shows a localized status chip, thumbnails for the customer's design, the prototype and payment proofs (click to enlarge), payment phase/method/status in Vietnamese.
- Pricing: new “Giá theo vật liệu” panel (per-material đ/m², saves through `PUT /api/v1/admin/catalog/materials/{id}`); labels clarify that 1 ly = 1 mm and that the global thin-sheet rate is for metals.
- Products: thumbnail + name/SKU cell, type tag, price, stock tag (out / low / ok), on/off switch instead of a bare checkbox, row actions as text actions, better search bar and empty state. Customers: avatar, e-mail under the name, active/blocked tag.
- Action columns keep clear of the floating contact buttons on wide screens.
- Payment proofs are retrieved with an authenticated admin API call from the fixed private `payment-proofs` bucket. The catalog service validates object keys and streams safe image/PDF types; API gateway routes the admin endpoint. Do not render direct private S3 links.

**G4 - Customer order screens** (`features/account/orders/`)
- List to responsive cards with status/type chips, paid-% bar, a “Cần thao tác” banner and filters (Tất cả / Cần thao tác / Đang xử lý / Hoàn tất-Đã hủy), a contextual button (Duyệt mẫu / Đặt cọc / Theo dõi).
- Detail to numbered stepper (vertical on phones), status chip in the header, VAT shown as a percentage (it showed `0.1%` before), payment history with chips and receipt thumbnails, previewable design/prototype images, timeline with Vietnamese labels instead of raw enum names, progress bar in the totals, cleaner bank-transfer form. The internal `productionWorkerNote` is no longer shown to customers (see Tier 4 #14).

**G5 - Pricing change for Mica/Decal** (backend, `catalog-pricing-service`)
- `V2__material_specific_thin_sheet_rate.sql`: `materials.thin_sheet_rate_per_m2` becomes nullable and is cleared for non-metal materials (Mica/Decal were seeded with the metal 5,000,000).
- `PricingEngineService`: thin-sheet price uses the material's own rate; if it is null a *metal* falls back to the global `THIN_SHEET_RATE_M2`, a *non-metal* throws `VALIDATION_ERROR` (“Price per m2 is not configured yet for ...”). `Material` no longer defaults the rate to 5,000,000; `MaterialRequest.thinSheetRatePerM2` is optional.
- Tests: the mica test now uses an explicit 2,000,000 đ/m² test rate (100×50 mm to 10,000 đ/unit); new test `calculateQuote_nonMetalWithoutOwnRate_isRefusedInsteadOfUsingMetalRate`. **Not compiled - run `mvn test -pl catalog-pricing-service`.** The smoke script's pricing vector (INOX_304) is unaffected.

**Additional implementation notes (2026-11-28)**
- Payment verification requires an uploaded receipt for bank-transfer approvals, rejects manual changes to VNPAY transactions, and verifies only the selected transaction; tests cover preserving other pending attempts.
- `OrderSummaryResponse` now includes `totalQuantity`, mapped as the sum of each order item's quantity; the frontend model consumes it for Kanban quantity tags while retaining `itemCount` as the number of lines. This backend change still needs compilation/tests.
- Admin theme/account controls and underline navigation, responsive order inspector/proof preview and order views, product editor navigation and image ordering, storefront theme/account order, product quantity selector and detail gallery, cart/profile tags, quote-builder controls, and 3D preview instructions/readability were refined during the UI pass.
- The quote 3D workspace is taller; the model is normalized to the current width/height proportions and the camera auto-fits when dimensions change. Product links supply product default dimensions, while standalone quote-builder visits use the documented 80 × 40 × 0.8 mm fallback.
- Product and quote contracts currently do not include a shape field, and pricing uses width × height as rectangular area. Do not present non-rectangular 3D shapes as production-accurate until shape metadata and matching pricing rules are added end to end.
- Latest checked: `Push-Location frontend; npm run build; Pop-Location` succeeds and `git diff --check` is clean. No latest visual browser pass or backend test run has been performed.

**Verification for Phase G:** Run Maven tests for `catalog-pricing-service` and `order-service` plus the gateway route; run `npm run build`; visually verify the new responsive grid and color hierarchy; verify UC-13 to UC-16; run `node scripts/e2e-smoke.mjs`.

---

## 5. Business Rules - Owner Answers & What Is Still Open
**Resolved (2026-11-27)**
1. **“1 ly” = 1 mm.** Thin-sheet rule applies to thickness ≤ 1.0 mm (unchanged in code).
2. **5,000,000 đ/m² is for metals only.** It does not apply to Mica/Decal; those use their own per-material đ/m² rate.

**Still open - ask the uncle**
3. The actual đ/m² price for Mica and for Decal (they may need two different materials/rates; today “Mica / Decal Công Nghiệp” is one material).
4. Whether the ×5 multiplier for thick metal (> 1 mm, price = weight × price/kg × 5) is the intended rule or a placeholder.
5. Whether customers should see a production progress note (see Tier 4 #14) and, if so, who writes it.
6. Bucket decision: SeaweedFS vs MinIO (Tier 2 #5). Payment proofs already use the private `payment-proofs` bucket.
