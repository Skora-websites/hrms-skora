# SKORA HRMS — Changelog

## September 2026

### 🔒 Security hardening (full audit run + fixes)

Poore HRMS ka security audit hua (9 findings) — **sab 9 fixed, deployed aur prod pe verified**:

- **Employee data exposure band** — Employees, Users aur Auth GET endpoints ab sirf safe fields
  return karte hain. PasswordHash/plain password jaise credential fields responses mein kabhi
  nahi jaate.
- **Manager scoping** — Manager sirf apni directory (khud + direct reports) aur unhi ki payroll
  dekh sakta hai. Non-report ke payroll transactions 403.
- **Payroll history cap** — Non-CEO viewers ke liye 3 mahine se purane payslips band (403).
  CEO exempt.
- **Privilege escalation blocks** — HR role change karke kisi ko super_admin nahi bana sakta;
  password/passwordHash fields HR writes mein drop ho jaate hain.
- **Leave decisions atomic** — Do HR logon ka ek saath approve/reject ab double-effect nahi
  de sakta (database-level atomic update).
- **Onboarding PII masking** — Aadhar/PAN/bank numbers har read path pe masked. HR reveal
  ek-do field, token-bound, audit-logged.
- **First-login fence tight** — Password change sirf tab jab account genuinely fenced ho;
  rotation ke baad baaki sessions kill.
- **Secrets fail-closed** — `SESSION_COOKIE_SECRET` / `NEXTAUTH_SECRET` / `PII_REVEAL_SECRET`
  set hone chahiye (Vercel pe set + verified). Bina secret login reject hota hai — koi silent
  fallback nahi.

### ✨ Features

- **Email-only onboarding form** — `/hrms/register` pe ab sirf email mandatory. Naam,
  designation, UAN, PAN, Aadhar, bank — sab optional; format checks di gayi values pe phir bhi
  chalte hain.
- **Auto reporting manager** — Approval pe naye employee ko automatic reporting manager milta
  hai (department match, warna pehla active manager) + manager ko notification.
- **Resend welcome email** — Approval ke waqt email fail ho jaye to HR ek click mein fresh
  temporary password bhej sakta hai (account dobara fence, purane sessions kill, audit log).
  Activated accounts pe 409 — unke liye password reset hai.
- **Email delivery history (naya)** — HR onboarding page pe "Email delivery history" panel:
  har welcome/offer-letter/payslip/reset email ka sent/failed timestamp ke saath record.
  Failures pe red badge — resend ki zaroorat pehle se dikhti hai.
- **Live onboarding queue** — HR queue har 15 second (tab visible hone par) auto-refresh hoti
  hai; nayi requests khud flash hoti hain, Live toggle se pause bhi kar sakte ho. Approved
  rows ka status sync rehta hai.
- **Form typing fix (naya)** — Onboarding form mein type karte hi cursor hatna/page-refresh
  jaisa feel — fixed. (Components theek se hoist kiye gaye the; ab focus tikana hai.)

### 🛡️ Infrastructure hardening (naya)

- **CRM routes mass-assignment guard** — Leads/contacts/customers/deals/activities/tasks
  writes ab per-collection field allowlist se filter hote hain; unknown fields drop.
- **Distributed rate limiting** — Login/register/reset limits ab Upstash Redis mein ho sakti
  hain (`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` set karo) — saare serverless
  instances ka ek shared budget, deploy ke baad bhi tikta hua. Redis na ho to in-memory
  fallback; Redis down to login kabhi nahi rukta (fail-open).

### 🧪 Quality

- Full E2E suite: **240/240 tests, 15 files** (regression suites sabhi audit fixes ke liye).
- Prod E2E verified: dummy invite → approve → account create → welcome + offer letter emails
  (delivery log mein "sent") → first-login fence armed → auto-manager assigned → probe data
  cleaned.

### 📚 Ops notes

- Vercel env setup guide: `docs/vercel-env-setup.md` (teeno secrets set + verified 2026-09-29).
- Probe cleanup: `scripts/cleanup-e2e-probes.js` (ab email_delivery_log bhi cover karta hai),
  stale invite rows: `scripts/cleanup-stale-invite-rows.js`, seed accounts:
  `scripts/seed-test-accounts.js`.
- E2E suite locally chalane ke liye server ko `SESSION_COOKIE_SECRET` + `E2E_TEST_PASSWORD`
  ke saath start karo (fail-closed prod behavior mirror).
