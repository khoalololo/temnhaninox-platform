#!/usr/bin/env node
/**
 * End-to-end smoke test: drives the real running system through the gateway
 * (no mocks, no database access) and fails loudly when a rule is broken.
 *
 *   node scripts/e2e-smoke.mjs                      # gateway at http://localhost:8080
 *   BASE_URL=http://localhost:4200 node scripts/e2e-smoke.mjs   # through nginx/Angular proxy
 *
 * Env: ADMIN_EMAIL, ADMIN_PASSWORD (defaults = dev seed), VNPAY_HASH_SECRET (default = dev value),
 *      CHECK_DIRECT=1 also probes whether the order-service port is reachable directly (should NOT be in prod).
 * Requires Node 18+ (global fetch/FormData/crypto). Services + Postgres + object storage must be running.
 * Each run registers a throw-away customer and creates 2 orders: safe on a dev database only.
 */
import { createHmac } from 'node:crypto';

const BASE = process.env.BASE_URL ?? 'http://localhost:8080';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@temnhaninox.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@123456';
const VNPAY_SECRET = process.env.VNPAY_HASH_SECRET ?? 'DEMO_HASH_SECRET_KEY_1234567890';

let passed = 0;
const failures = [];
const warnings = [];

function ok(name) { passed++; console.log(`  PASS  ${name}`); }
function fail(name, detail = '') { failures.push(name); console.log(`  FAIL  ${name}${detail ? ' -> ' + detail : ''}`); }
function warn(name, detail = '') { warnings.push(name); console.log(`  WARN  ${name}${detail ? ' -> ' + detail : ''}`); }
function check(name, cond, detail = '') { cond ? ok(name) : fail(name, detail); return !!cond; }
function section(title) { console.log(`\n== ${title}`); }

async function api(method, path, { token, body, headers = {}, form } = {}) {
  const h = { ...headers };
  if (token) h.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  let res;
  try {
    res = await fetch(BASE + path, { method, headers: h, body: payload });
  } catch (e) {
    throw new Error(`Cannot reach ${BASE}${path} (${e.cause?.code ?? e.message}). Are the services running?`);
  }
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json, data: json?.data };
}

const num = (v) => Number(v);
const near = (a, b, eps = 0.01) => Math.abs(num(a) - num(b)) <= eps;

async function main() {
  console.log(`Smoke test against ${BASE}`);

  // ---------------------------------------------------------------- auth
  section('Auth');
  const adminLogin = await api('POST', '/api/v1/auth/login', { body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } });
  if (!check('admin can log in', adminLogin.status === 200 && adminLogin.data?.accessToken, `HTTP ${adminLogin.status}`)) return;
  const admin = adminLogin.data.accessToken;

  const email = `smoke+${Date.now()}@example.com`;
  const reg = await api('POST', '/api/v1/auth/register', {
    body: { email, password: 'Smoke#12345', fullName: 'Smoke Tester', phone: '0901234567' },
  });
  if (!check('customer can register', reg.status === 201 && reg.data?.accessToken, `HTTP ${reg.status} ${reg.json?.message ?? ''}`)) return;
  const cust = reg.data.accessToken;

  const noToken = await api('GET', '/api/v1/orders');
  check('no token -> 401 on /orders', noToken.status === 401, `HTTP ${noToken.status}`);
  const custOnAdmin = await api('GET', '/api/v1/admin/orders', { token: cust });
  check('customer token -> 403 on /admin/orders', custOnAdmin.status === 403, `HTTP ${custOnAdmin.status}`);
  const adminCart = await api('POST', '/api/v1/cart/items', { token: admin, body: { itemType: 'STANDARD_ITEM', quantity: 1 } });
  check('admin token -> 403 on cart (admin cannot shop)', adminCart.status === 403, `HTTP ${adminCart.status}`);

  const forgot1 = await api('POST', '/api/v1/auth/forgot-password', { body: { email } });
  const forgot2 = await api('POST', '/api/v1/auth/forgot-password', { body: { email: 'nobody-' + email } });
  check('forgot-password answers identically for known/unknown email',
    forgot1.status === 200 && forgot2.status === 200 && forgot1.json?.message === forgot2.json?.message,
    `${forgot1.status}/${forgot2.status}`);
  const badReset = await api('POST', '/api/v1/auth/reset-password', { body: { token: 'not-a-real-token', newPassword: 'Whatever1' } });
  check('reset-password rejects an invalid token', badReset.status === 400, `HTTP ${badReset.status}`);

  // ---------------------------------------------------------------- catalog + pricing
  section('Catalog & pricing');
  const mats = await api('GET', '/api/v1/catalog/materials');
  const inox = (mats.data ?? []).find((m) => m.code === 'INOX_304') ?? (mats.data ?? [])[0];
  if (!check('materials load with processing methods', inox?.allowedProcessingMethods?.length > 0)) return;
  const method = inox.allowedProcessingMethods[0];

  const quote = await api('POST', '/api/v1/quotes/calculate', {
    body: { materialId: inox.id, processingMethodId: method.id, widthMm: 100, heightMm: 50, thicknessMm: 2, quantity: 10, requiresVatInvoice: true },
  });
  if (inox.code === 'INOX_304') {
    // 0.1m x 0.05m x 0.002m x 7930 kg/m3 x 85,000 VND/kg x 5 = 33,702.50 ; x10 = 337,025 ; +10% VAT = 370,727.50
    check('INOX_304 100x50x2mm x10 unit price = 33,702.50', near(quote.data?.unitPrice, 33702.5), `got ${quote.data?.unitPrice}`);
    check('VAT 10% applied -> total 370,727.50', near(quote.data?.totalAmount, 370727.5), `got ${quote.data?.totalAmount}`);
    check('deposit = 50% of total', near(quote.data?.depositRequiredAmount, num(quote.data?.totalAmount) / 2), `got ${quote.data?.depositRequiredAmount}`);
  } else {
    check('quote calculates', quote.status === 200, `HTTP ${quote.status}`);
  }
  const tooThick = await api('POST', '/api/v1/quotes/calculate', {
    body: { materialId: inox.id, processingMethodId: method.id, widthMm: 100, heightMm: 50, thicknessMm: 999, quantity: 1, requiresVatInvoice: false },
  });
  check('out-of-range thickness is rejected', tooThick.status === 400, `HTTP ${tooThick.status}`);

  // ---------------------------------------------------------------- custom order lifecycle
  section('Custom quote order: QUOTE_PENDING -> ... -> COMPLETED');
  let designUrl = null;
  {
    const form = new FormData();
    form.append('file', new Blob(['%PDF-1.4 smoke'], { type: 'application/pdf' }), 'smoke.pdf');
    const up = await api('POST', '/api/v1/files/upload', { token: cust, form });
    if (up.status === 200 && up.data?.url) { designUrl = up.data.url; ok('design file upload (object storage)'); }
    else warn('design file upload failed (is object storage running?)', `HTTP ${up.status} ${up.json?.message ?? ''}`);
  }

  await api('DELETE', '/api/v1/cart', { token: cust });
  const add = await api('POST', '/api/v1/cart/items', {
    token: cust,
    body: { itemType: 'CUSTOM_ITEM', materialId: inox.id, processingMethodId: method.id, widthMm: 100, heightMm: 50, thicknessMm: 2, quantity: 10, designFileUrl: designUrl, customerNote: 'smoke test' },
  });
  if (!check('custom item added to cart', add.status === 200 || add.status === 201, `HTTP ${add.status} ${add.json?.message ?? ''}`)) return;

  const checkout = await api('POST', '/api/v1/orders/checkout', {
    token: cust,
    body: {
      recipientName: 'Smoke Tester', recipientPhone: '0901234567', shippingAddress: '1 Test St, HCMC',
      requiresVatInvoice: true, vatCompanyName: 'Smoke Co', vatTaxCode: '0312345678', vatCompanyAddress: '1 Test St, HCMC',
    },
  });
  if (!check('checkout creates a QUOTE_PENDING order', checkout.data?.status === 'QUOTE_PENDING', `HTTP ${checkout.status} ${checkout.data?.status ?? checkout.json?.message}`)) return;
  const orderId = checkout.data.id;
  const item = checkout.data.items?.[0];
  check('order has a code', /^TNI-\d{8}-\d+/.test(checkout.data.orderCode ?? ''), checkout.data.orderCode);

  const cartAfter = await api('GET', '/api/v1/cart', { token: cust });
  check('cart is emptied after checkout', (cartAfter.data?.items ?? []).length === 0);

  const pendingKpi = await api('GET', '/api/v1/admin/dashboard/summary', { token: admin });
  check('admin dashboard shows pending quotes', pendingKpi.status === 200 && pendingKpi.data?.pendingQuotesCount >= 1, `HTTP ${pendingKpi.status}`);

  const review = await api('PATCH', `/api/v1/admin/orders/${orderId}/quote`, {
    token: admin, body: { items: [{ orderItemId: item.id, finalUnitPrice: 40000 }], note: 'smoke approve' },
  });
  check('admin reviews quote -> QUOTE_APPROVED', review.data?.status === 'QUOTE_APPROVED', `HTTP ${review.status} ${review.json?.message ?? ''}`);
  check('admin price override recalculated total (40,000 x 10 + 10% VAT = 440,000)', near(review.data?.totalAmount, 440000), `got ${review.data?.totalAmount}`);

  const proto = await api('POST', `/api/v1/admin/orders/${orderId}/items/${item.id}/prototype`, {
    token: admin, body: { prototypeImageUrl: designUrl ?? 'http://example.com/prototype.jpg', note: 'sample photo' },
  });
  check('admin uploads prototype -> PROTOTYPING', proto.data?.status === 'PROTOTYPING', `HTTP ${proto.status}`);

  const earlyProd = await api('PATCH', `/api/v1/admin/orders/${orderId}/status`, { token: admin, body: { targetStatus: 'IN_PRODUCTION' } });
  check('cannot jump to IN_PRODUCTION from PROTOTYPING', earlyProd.status === 400, `HTTP ${earlyProd.status}`);

  const approve = await api('POST', `/api/v1/orders/${orderId}/approve-prototype`, { token: cust, body: {} });
  check('customer approves sample -> AWAITING_DEPOSIT', approve.data?.status === 'AWAITING_DEPOSIT', `HTTP ${approve.status}`);

  const total = num(approve.data?.totalAmount);
  const deposit = num(approve.data?.depositRequiredAmount);
  check('deposit is 50% of the approved total', near(deposit, total / 2), `${deposit} vs ${total}`);

  const noDepositProd = await api('PATCH', `/api/v1/admin/orders/${orderId}/status`, { token: admin, body: { targetStatus: 'IN_PRODUCTION' } });
  check('cannot start production before deposit is verified', noDepositProd.status === 400, `HTTP ${noDepositProd.status}`);

  const proof1 = await api('POST', `/api/v1/orders/${orderId}/payments/proof`, {
    token: cust,
    body: { paymentPhase: 'DEPOSIT_50', paymentMethod: 'BANK_TRANSFER', amount: deposit, transactionRef: 'SMOKE-DEP', proofImageUrl: designUrl ?? 'http://example.com/proof.png' },
  });
  if (!check('customer submits deposit proof (PENDING)', proof1.data?.status === 'PENDING', `HTTP ${proof1.status} ${proof1.json?.message ?? ''}`)) return;
  const verify1 = await api('PATCH', `/api/v1/admin/payments/${proof1.data.id}/verify`, { token: admin, body: { status: 'VERIFIED' } });
  check('admin verifies deposit -> IN_PRODUCTION', verify1.data?.status === 'IN_PRODUCTION', `HTTP ${verify1.status} ${verify1.data?.status}`);

  const ready = await api('PATCH', `/api/v1/admin/orders/${orderId}/status`, {
    token: admin, body: { targetStatus: 'READY_FOR_DELIVERY', productionWorkerNote: 'Etched, QC ok' },
  });
  check('admin -> READY_FOR_DELIVERY with worker note', ready.data?.status === 'READY_FOR_DELIVERY' && ready.data?.productionWorkerNote === 'Etched, QC ok', `HTTP ${ready.status}`);

  const earlyDone = await api('PATCH', `/api/v1/admin/orders/${orderId}/status`, { token: admin, body: { targetStatus: 'COMPLETED' } });
  check('cannot COMPLETE before the balance is paid (BALANCE_NOT_SETTLED)', earlyDone.status === 400 && earlyDone.json?.errorCode === 'BALANCE_NOT_SETTLED', `HTTP ${earlyDone.status} ${earlyDone.json?.errorCode}`);

  const proof2 = await api('POST', `/api/v1/orders/${orderId}/payments/proof`, {
    token: cust,
    body: { paymentPhase: 'BALANCE_50', paymentMethod: 'BANK_TRANSFER', amount: Math.round((total - deposit) * 100) / 100, transactionRef: 'SMOKE-BAL', proofImageUrl: designUrl ?? 'http://example.com/proof2.png' },
  });
  check('customer submits balance proof', proof2.data?.status === 'PENDING', `HTTP ${proof2.status}`);
  await api('PATCH', `/api/v1/admin/payments/${proof2.data?.id}/verify`, { token: admin, body: { status: 'VERIFIED' } });

  const done = await api('PATCH', `/api/v1/admin/orders/${orderId}/status`, { token: admin, body: { targetStatus: 'COMPLETED' } });
  check('admin -> COMPLETED after full payment', done.data?.status === 'COMPLETED', `HTTP ${done.status} ${done.json?.message ?? ''}`);

  const vat = await api('PATCH', `/api/v1/admin/orders/${orderId}/vat-invoice`, { token: admin, body: { vatInvoiceNumber: 'SMOKE-0001' } });
  check('admin records VAT invoice number', vat.status === 200, `HTTP ${vat.status}`);

  const final = await api('GET', `/api/v1/orders/${orderId}`, { token: cust });
  const path = (final.data?.statusLogs ?? []).map((l) => l.toStatus);
  check('customer sees the full status history', ['QUOTE_APPROVED', 'PROTOTYPING', 'AWAITING_DEPOSIT', 'IN_PRODUCTION', 'READY_FOR_DELIVERY', 'COMPLETED'].every((s) => path.includes(s)), path.join(' > '));
  check('paid amount equals total', near(final.data?.paidAmount, final.data?.totalAmount), `${final.data?.paidAmount} vs ${final.data?.totalAmount}`);

  const other = await api('POST', '/api/v1/auth/register', { body: { email: `other+${Date.now()}@example.com`, password: 'Smoke#12345', fullName: 'Other', phone: '0900000001' } });
  const peek = await api('GET', `/api/v1/orders/${orderId}`, { token: other.data?.accessToken });
  check("another customer cannot read this customer's order", peek.status === 403 || peek.status === 404, `HTTP ${peek.status}`);

  // ---------------------------------------------------------------- standard item + VNPAY IPN
  section('Standard item order + VNPAY IPN');
  const prods = await api('GET', '/api/v1/catalog/products?productType=STANDARD_ITEM&size=5');
  const product = (prods.data?.content ?? []).find((p) => num(p.basePrice) > 0);
  if (!product) {
    warn('no STANDARD_ITEM product with a price found; skipping standard-order checks');
  } else {
    await api('DELETE', '/api/v1/cart', { token: cust });
    const addStd = await api('POST', '/api/v1/cart/items', { token: cust, body: { itemType: 'STANDARD_ITEM', productId: product.id, quantity: 2 } });
    check('standard item added to cart', addStd.status === 200 || addStd.status === 201, `HTTP ${addStd.status} ${addStd.json?.message ?? ''}`);
    const co = await api('POST', '/api/v1/orders/checkout', {
      token: cust, body: { recipientName: 'Smoke Tester', recipientPhone: '0901234567', shippingAddress: '1 Test St, HCMC', requiresVatInvoice: false },
    });
    check('standard checkout goes straight to AWAITING_DEPOSIT', co.data?.status === 'AWAITING_DEPOSIT', `HTTP ${co.status} ${co.data?.status ?? co.json?.message}`);

    if (co.data?.id) {
      const create = await api('POST', '/api/v1/payments/vnpay/create-url', { token: cust, body: { orderId: co.data.id, paymentPhase: 'FULL_100' } });
      if (check('VNPAY create-url returns a signed URL', create.status === 200 && create.data?.paymentUrl, `HTTP ${create.status} ${create.json?.message ?? ''}`)) {
        const params = {
          vnp_Amount: String(Math.round(num(create.data.amount) * 100)),
          vnp_ResponseCode: '00',
          vnp_TmnCode: new URL(create.data.paymentUrl).searchParams.get('vnp_TmnCode'),
          vnp_TxnRef: create.data.transactionRef,
        };
        const sign = (p) => createHmac('sha512', VNPAY_SECRET)
          .update(Object.keys(p).sort().map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(p[k])}`).join('&'))
          .digest('hex');
        const ipnUrl = (p) => '/api/v1/payments/vnpay-ipn?' + new URLSearchParams({ ...p, vnp_SecureHash: sign(p) }).toString();

        const wrongAmount = await api('GET', ipnUrl({ ...params, vnp_Amount: '100' }));
        check('IPN rejects a wrong amount (RspCode 04)', wrongAmount.json?.RspCode === '04', JSON.stringify(wrongAmount.json));
        const bad = await api('GET', '/api/v1/payments/vnpay-ipn?' + new URLSearchParams({ ...params, vnp_SecureHash: 'bad' }).toString());
        check('IPN rejects a bad signature (RspCode 97)', bad.json?.RspCode === '97', JSON.stringify(bad.json));
        const good = await api('GET', ipnUrl(params));
        if (good.json?.RspCode !== '00') {
          warn('IPN signature check failed - is VNPAY_HASH_SECRET the same as the order-service secret?', JSON.stringify(good.json));
        } else {
          ok('IPN accepts a valid payment (RspCode 00) with no browser involved');
          const replay = await api('GET', ipnUrl(params));
          check('IPN replay is idempotent (RspCode 02)', replay.json?.RspCode === '02', JSON.stringify(replay.json));
          const after = await api('GET', `/api/v1/orders/${co.data.id}`, { token: cust });
          check('order moved to IN_PRODUCTION and was paid once', after.data?.status === 'IN_PRODUCTION' && near(after.data?.paidAmount, create.data.amount), `${after.data?.status} paid=${after.data?.paidAmount}`);
        }
      }
    }
  }

  // ---------------------------------------------------------------- deployment hygiene
  if (process.env.CHECK_DIRECT) {
    section('Deployment hygiene (informational)');
    try {
      const r = await fetch('http://localhost:8083/api/v1/admin/orders', { headers: { 'X-User-Role': 'ADMIN' } });
      if (r.status === 200) warn('order-service is directly reachable and trusts X-User-Role; block 8081-8083 outside the gateway before deploying');
      else ok(`order-service direct access not accepted (HTTP ${r.status})`);
    } catch { ok('order-service port is not reachable directly'); }
  }
}

try {
  await main();
} catch (e) {
  fail('script aborted', e.message);
}

console.log(`\n${passed} passed, ${failures.length} failed, ${warnings.length} warnings`);
if (failures.length) {
  console.log('Failed checks:\n - ' + failures.join('\n - '));
  process.exit(1);
}
