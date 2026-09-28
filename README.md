# SKORA HRMS

A full-stack Human Resource Management System built with **Next.js 16 (App Router)**, **MongoDB**, **Tailwind v4**, and **Vercel**. Role-based access: **CEO (super_admin) → HR Admin → Manager → Employee**.

- **Production:** https://hrms-skora.vercel.app
- **Repo:** https://github.com/Skora-websites/hrms-skora

---

## 1. Architecture at a Glance

```
Browser / Mobile (Capacitor)
        │  signed session cookie (HMAC, httpOnly)
        ▼
Next.js App Router  ──  middleware.ts (Edge: session fencing per role)
        │
        ├── app/hrms/**            UI dashboards per role
        ├── app/api/hrm/v2/**      JSON APIs (requireAuth → role guards)
        ├── lib/api-auth.ts        session verify + requireAuth/requireAdmin
        ├── lib/rbac.ts            roles, hierarchy, normalizeRole, permissions
        ├── lib/hrm/firestore.ts   typed collection services (Mongo backend)
        └── services/hrm/**        business logic per domain
```

| Layer | Location | Notes |
|---|---|---|
| Pages (per role) | `app/hrms/` | `superadmin/` (CEO), `hr-admin/`, `manager/`, `employee/` |
| APIs | `app/api/hrm/v2/` | One route file per module (`leaves`, `employees`, `onboarding`, …) |
| Auth | `lib/auth.ts`, `app/api/auth/login` | Token in Mongo `sessions` collection, 5-day expiry |
| RBAC | `lib/rbac.ts`, `lib/api-auth.ts` | Role hierarchy levels: super_admin 100 > hr_admin/admin 80 > manager 50 > employee 20 |
| DB | MongoDB Atlas | Single `default` tenant; collection map in `lib/hrm/firestore.ts` |

---

## 2. Onboarding Flow (kaise employee onboard hota hai)

**Form data kahan save hota hai:** register page (`/hrms/register`) ka full statutory form (personal, bank, nominee, PF/UAN, Aadhar/PAN) POST hota hai `POST /api/hrm/v2/auth { action: "request-invite" }` → ek document banta hai **`employee_onboarding_tasks`** collection mein, `status: "invite_requested"`, PII (Aadhar/PAN/bank) usi row ke `onboardingDetails` field mein masked storage ke saath.

**Kaun verify karta hai:** **HR Admin** (ya CEO). HR dashboard → *Onboarding Queue* (`/api/hrm/v2/onboarding?pending=true`, most-recent-first). HR masked PII ko `POST /api/hrm/v2/onboarding/reveal` se field-by-field, audit-logged reveal kar sakta hai.

**Approval chain:**
1. HR approve kare (`action: "update_task", status: "approved"`):
   - User record banta hai `users` collection mein (role `employee`, temp password hash)
   - `onboardingStatus: "approved"`, employee code generate hota hai
   - Welcome email jaata hai (SMTP/Resend)
   - Employee ab login kar sakta hai
2. Reject hone pe employee ko 48h re-upload window milta hai (`escalate` route deadline ke baad super admin ko notify karta hai)
3. **CEO** employees edit modal se reporting manager assign karta hai (dropdown of existing managers) — reporting lines CEO-controlled hain

**Employee pehla login:** `/hrms/login` → role cookie ke basis pe dashboard route → employee hub (`/hrms/employee`) pe onboarding status banner (verified / under review / rejected), punch-in card, leave balances, payslips, offer letter request.

---

## 3. Modules (kya-kya work kar raha hai)

| Module | Route | Highlights |
|---|---|---|
| **Auth & Sessions** | `/api/auth/login`, `lib/auth.ts` | bcrypt hashes, signed session cookie, 5-day expiry, self-healing role from `HRMS_ACCOUNT_ROLES_JSON` |
| **RBAC** | `lib/rbac.ts` | `normalizeRole` legacy-map, hierarchy guard (`canActOnTarget`), route gating in middleware |
| **Employees** | `/hrms/employees`, `/api/hrm/v2/employees` | CRUD with HR-level gate; managers sirf apne direct reports edit kar sakte hain; role/status changes super_admin-only |
| **Onboarding** | `/api/hrm/v2/onboarding` | Invite request → HR approve/reject → user creation; PII masking (`lib/pii-masking.ts`) + audit-logged reveal |
| **Attendance** | `/api/hrm/v2/attendance` | Punch in/out, live status dashboard, regularization requests, office-rules engine (`lib/utils/attendance-rules.ts`) |
| **Leave** | `/api/hrm/v2/leaves` | Apply (balance check, overlap guard, future-date validation), approve/reject with balance deduction, auto leave types + balances seeded |
| **Payroll** | `/api/hrm/v2/payroll` | Payslip generation (PDF via `pdfkit`), my-payslips for employees |
| **Offer Letters** | `/api/hrm/v2/offer-letters` | Employee requests → CEO reviews → releases encrypted PDF (password modal) |
| **Tasks & Tickets** | `/api/hrm/v2/tasks`, `/tickets` | Kanban boards, manager assignment |
| **Performance** | `/api/hrm/v2/performance` | Goals, reviews |
| **Documents** | `/api/hrm/v2/documents` | Upload + verification workflow |
| **Exit** | `/api/hrm/v2/exit` | Resignation → experience letter PDF |
| **Notifications** | `notifications` collection | In-app notifications on leave/onboarding/offer events |
| **Audit Logs** | `audit_logs` collection | Every privileged action recorded (`update_role`, `create_user`, …) |
| **Mobile** | Capacitor config in `package.json` | Same web app wrapped for Android/iOS (`npm run cap:add:android`) |

---

## 4. Data Collections (MongoDB `hrms` DB)

`users`, `sessions`, `employee_onboarding_tasks`, `leave_types`, `leave_balances`, `leave_balance_history`, `leave_requests`, `attendance`, `attendance_stats`, `regularization_requests`, `notifications`, `audit_logs`, `offerletters`, `payroll_transactions`, `employee_salaries`, `tasks`, `tickets`, `documents`, `performance_goals`, `password_resets`.

---

## 5. Environment Variables (`.env.local`)

| Var | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string (SRV) |
| `HRMS_ACCOUNT_ROLES_JSON` | Authoritative role map — CEO account yahan `super_admin` ke saath listed hai |
| `SMTP_*` / `RESEND_*` | Welcome/reset emails |
| `SESSION_COOKIE_SECRET` | Session cookie HMAC (production mein set karo) |
| `E2E_TEST_PASSWORD` | CI-only: fixed temp password for e2e invite flow |
| `SUPER_ADMIN_EMAIL` | Fallback CEO email |

---

## 6. Local Development & Testing

```bash
npm install
npm run dev            # http://localhost:3000

# Full verification (CI jaisa):
node scripts/seed-test-accounts.js
npx next build
E2E_TEST_PASSWORD=E2e-Temp-9931 npm run test:e2e
```

**229-test e2e suite** production server ke against chalta hai (`__tests__/`): leave lifecycle, attendance rules, onboarding flow, audit regressions, cross-dashboard permissions.

### Demo accounts (seed script se)

| Email | Password | Role |
|---|---|---|
| `manager.demo@company.com` | `Manager@123` | Manager |
| `employee.one@company.com` | `Employee@123` | Employee (reporting: Demo Manager) |
| `employee.two@company.com` | `Employee@123` | Employee (reporting: Demo Manager) |

### Maintenance scripts

```bash
node scripts/purge-except-ceo.js          # dry-run: kya delete hoga
node scripts/purge-except-ceo.js --yes    # execute (backup to scripts/backup-purge.json)
node scripts/seed-demo-data.js            # demo manager/employees + leave balances
```

---

## 7. Deployment

- **Vercel** — `main` branch → production (`hrms-skora.vercel.app`); CLI se manual: `npx vercel deploy --prod --yes`
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — har push/PR pe: typecheck → lint → seed → build → start server → 229 e2e tests
- Env vars Vercel project settings mein set hain (`MONGODB_URI`, `HRMS_ACCOUNT_ROLES_JSON`, SMTP, etc.)
