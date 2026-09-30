# SKORA HRMS — Changelog

## September 2026

### 📝 Register form designations + Employee hub se My Tasks removed

- **Register form mein Designation dropdown** — pehle free-text input tha (koi bhi type kar
  leta). Ab department-wise standard designations ka dropdown hai: department choose karo →
  uske relevant titles dikhte hain (e.g. QA → QA Trainee/QA Engineer/Senior QA Engineer/QA
  Lead). Department change karne par designation reset hoti hai (purani title naye department
  mein valid nahi). Server approval pe `designation` + `designationName` dono set karta hai.
- **Department→designation approval flow verified end-to-end** — Register (QA + QA Engineer)
  → CEO queue mein department + designation dikhe → approve → user record mein department
  "Quality Assurance" aur designation "QA Engineer" correct copy hua. Ek chhota bug bhi fix:
  users API `designationName` return nahi karta tha (SAFE fields mein nahi tha) — ab dono
  spellings jaate hain.
- **Employee Hub se My Tasks board + "My Tasks" stat remove** — Naye joiners ke paas tasks
  hote hi nahi, khali board confusing tha (CEO ko apne hub pe bhi yahi dikhta tha). Hub ab
  focused hai: punch card, leave balances, payslips, documents. Tasks ab bhi
  /hrms/employee/my-tasks aur manager dashboards pe available hain.

### ⏰ Punch-in anytime clarification + go-live fresh slate
### ⏰ Punch-in anytime clarification + go-live fresh slate

- **Punch-in anytime — verified end-to-end** — Report se pehle punch karna allowed hai (9:45
  AM aane par 10:00 ka wait nahi). Office start/end sirf PRESENT/LATE/HALF_DAY label derive
  karte hain aur display ke liye hain, punch kabhi block nahi hota. E2E proof: officeStart
  temporarily 11 PM set karke employee ne current time pe punch-in kiya (success, status
  derived) aur phir punch-out bhi — sab DB mein sahi record hua. Misleading copy bhi fix:
  Settings ka "Employees can punch in after this time" ab "punch is never blocked" bolti hai,
  punch-card subtitle mein "Punch-in allowed anytime" add kiya.
- **Go-live fresh slate** — Production DB se saara test/dummy residue clear: E2E test
  employees, unke attendance rows, onboarding tasks, notifications, sessions, audit logs.
  Backup `scripts/backup-fresh-slate.json` mein. Ab DB mein sirf CEO account + system config
  (office rules, leave types, salary components, pay groups, employee-code counter) hai —
  kal se real employees register ho sakte hain.

### ✅ Settings page 100% functional + retroactive rules + Live Ops E2E
### ✅ Settings page 100% functional + retroactive rules + Live Ops E2E

- **Settings page se saare dead fields hata diye** — "Enforce 2FA" toggle (koi 2FA system hai
  hi nahi), "API Key Management" section (payment keys kahin use nahi hote) aur "MongoDB
  Directory Sync" section (simulated progress bar tha — "Sync Now" kuch nahi karta tha).
  Ab har field ya to sach mein enforce hoti hai ya page pe hai hi nahi.
- **Password Expiry ab functional** — har password set/change par `passwordChangedAt` stamp
  lagta hai (change-password, force-change, reset, HR create, onboarding approval). Fence-check
  endpoint expiry calculate karta hai: N din purana password → middleware force-change page pe
  bhej deta hai (CEO account exempt). Default 0 = never.
- **Retroactive office rules** — CEO office rules save kare to AAJ ke already-created attendance
  rows turant re-evaluate hote hain: `lateAfter` change → PRESENT/LATE boundary punch-in time se
  re-derive; work-day add/remove → week_off ↔ LATE/PRESENT restore. Pehle changes sirf future
  punch-ins pe lagte the. Managers/HR rows bhi ab cover (pehle sirf employees).
- **Live Ops E2E verified (real browser + real DB)** — Dummy employee se poora flow chala:
  punch-in (13:59 IST → LATE sahi) → On Break (summary onBreak=1, badge duration tick) →
  Meeting (inMeeting=1, auxSince reset) → early-departure punch-out (DB mein `earlyDeparture`
  stamp + CEO ko notification, workHours=1.03 correct). CEO Live Ops pe naya "X / Y shown"
  counter (All=1 shown, Punched Out=1/1, Absent=0/1, garbage search=0/1) aur AUX-duration
  badges verify hue. Test data cleanup ho gaya.

### ⚙️ Settings jo ab sach mein kaam karte hain + Live dashboard improvements
### ⚙️ Settings jo ab sach mein kaam karte hain + Live dashboard improvements

CEO Settings page ka poora audit + fixes — ab jo dikhta hai wo sach mein reflect hota hai:

- **BUG FIX: Office rules save hote the par apply NahI hote the** — Settings page policy
  `super_admin` key pe likhta tha, par attendance/tenants-current readers `super_admin_system`
  (stale legacy doc) padh rahe the. Ab readers priority-based hain: current key pehle, legacy
  sirf fallback. Office start/end/late-after/work-days/required-hours/break-allowance — sab
  ab punch-in status (LATE threshold), effective-hours aur break-deduction mein live apply hote hain.
- **Minimum Password Length ab enforce hota hai** — pehle sirf UI mein dikhta tha, har jagah
  hardcoded 8 tha. Ab naya `lib/password-policy.ts` har password flow (change-password,
  force-change, reset, user create, HR employee create, signup) mein settings se dynamic
  min-length padhta hai (hard floor 8, 60s cache). UI "6 characters" messages bhi 8 kar diye.
- **Session Timeout ab live sessions pe lagta hai** — Settings ka Session Timeout (minutes)
  ab login ke waqt session + role cookies ke max-age ko drive karta hai (DB-backed, 60s
  cache, 5-day default). Pehle ye field bhi cosmetic tha.
- **Meeting Counts as Work toggle ab functional** — pehle hardcoded `checked={true}` tha.
  Ab settings se padha jaata hai: OFF hone par meeting AUX time effective work hours mein
  count NahI hota (punch-out + AUX transitions dono mein).
- **Break Allowance enforcement** — allowance se excess break minutes ab effective work
  time se deduct hote hain (`applyBreakAllowance`), pehle sirf display value thi.
- **Live Operations Dashboard: "X / Y shown" counter** — Filter apply karne par section
  header mein dikhta hai ki filter se kitne employees bache (e.g. "3 / 8 shown").
- **Live cards: AUX state duration highlight** — Active/On Break/In Meeting badge ke saath
  ab current state kitne min/hours se chal raha hai wo bhi dikhta hai (e.g. "On Break ·25m").
- **Dropdown label format fix** — Office timings ke selects "10.5:00 AM"-jaise broken labels
  dikhate the (fraction hours ka naive format). Ab proper "10:30 AM" labels; office start
  mein 30-min steps bhi added; Required Hours "7h 00m"-style clean labels.

### 🗑️ Offer-letter removal + CEO RM assignment + security scan fixes (naya batch)
### 🗑️ Offer-letter removal + CEO RM assignment + security scan fixes (naya batch)

- **Offer-letter feature poore project se REMOVED** — Offer letters ab kahin nahi hain:
  - Onboarding approval pe ab **sirf welcome email** (email + temporary password + employee
    code) jaati hai — offer-letter PDF generation, password-protected attachment aur uska
    email block (`sendOfferLetterEmail`) poora hata diya. `lib/offer-letter-pdf.ts`,
    `lib/email.ts` ka offer-letter sender, API routes (`offer-letters`, `download`,
    `password`, `offer-letter-settings`), CEO/employee pages (`/hrms/superadmin/offer-letters`,
    `offer-letter-settings`, `/hrms/employee/offer-letters`) aur employee nav entry — sab deleted.
  - Removed routes ab 404 dete hain (regression tests added: har offer-letter endpoint 404).
  - Employee profile upload options mein "Offer Letter / Contract" → "Employment Contract / Agreement".
- **CEO edit modal: reporting manager sirf employees ke liye** — CEO jab kisi **employee** ka
  edit box khole to reporting-manager dropdown dikhta hai (active managers ki list); **manager**
  ke edit box mein wo option hidden hai (managers ke paas apna reporting manager nahi hota).
  Employee Directory table rows mein bhi ab Edit action hai (wahi modal khulta hai) — pehle
  sirf roster rows se edit ho sakta tha. Save order bhi fix: role change pehle apply hota hai,
  phir explicit RM choice — data kabhi conflict nahi karta. Server-side guard bhi: koi bhi API
  se manager ko reporting manager assign karne ki koshish kare to 400 ("Managers cannot be
  assigned a reporting manager").
- **Security scan fixes (full HRMS rescan)** —
  - **Settings namespace isolation** — Koi bhi non-employee user kisi bhi role ke system
    settings overwrite kar sakta tha (manager → `role=super_admin` office-rules takeover).
    Ab caller sirf apne role-namespace mein likh sakta hai (admin→hr_admin legacy exception,
    HR-level users system-policy document maintain kar sakte hain); GET bhi employees/managers
    ko unke namespace tak seemit.
  - **Audit logs ab HR-level only** — API pehle managers ko bhi org-wide audit history de
    deta tha (nav mein CEO-only tha, par API open thi). Ab 403 for managers.
  - **Upload document listing HR-level only** — `/api/upload/list` "admins only" comment ke
    bawajood managers ko sab onboarding documents enumerate karne deta tha. Ab 403.
- **Tests** — 246 tests / 16 files green (naye: manager-RM 400 guard, employee-RM assignment,
  offer-letter 404 regressions; audit-regressions ka pehla test removal-check se replace).

### 🔁 Role-change, punch-out aur dashboard fixes (batch — naya)

CEO ke role-change aur daily-flow issues ka poora batch:

- **Role change pe stale dashboard/403 fix** — Middleware signed `user_role` cookie se dashboard
  route karta tha, jo role change ke baad stale ho jaata tha (manager dashboard + sab 403).
  Ab role-gated routes pe cookie/DB mismatch hote hi DB-fresh role verify hota hai aur user ko
  uske naye role ke dashboard pe bounce kiya jaata hai. Role change pe victim ke saare live
  sessions invalidate hote hain + naya `/hrms/session-refresh` page fresh cookies re-issue
  karke sahi dashboard pe bhejta hai.
- **Role-change RM semantics** — Employee → Manager promote karte hi us profile se reporting
  manager clear; Manager → Employee revert pe department ke hisaab se automatic reporting
  manager restore (onboarding approval wala hi auto-assign logic).
- **Early punch-out flow (before 7 PM)** — Punch-out before office end pe reason maanga jaata
  hai; submit karte hi punch-out ho jaata hai (approval gate nahi) aur log reporting manager
  + HR/CEO sabko notification mein chala jaata hai. Attendance record pe `earlyDeparture`
  stamp — reason, time, notified-to.
- **Holiday creation CEO/HR only** — Holidays create/edit/delete ab `requireHrLevel` (manager
  excluded) — UI Add/Edit/Delete buttons bhi sirf CEO/HR ko dikhte hain; baaki roles ko
  read-only calendar.
- **Offer-letter UI residue removed** — Employee dashboard ka poora Offer Letter card
  (Generate/Remind/Download + password modal) aur My Documents se offer_letter category
  (UI + API dono) hata diya. Offer letters ab sirf email-only + read-only status page.
- **Dashboard sections scoping + search** — HR onboarding queue ab managers ko sirf unki
  department ki requests dikhata hai. Har dashboard data section (manager roster/approvals,
  HR queue/recent employees/leaves, CEO attendance/leaves) mein search box + type filters.
- **Tests** — Naya `__tests__/role-change.test.ts` (RM clear/restore, session invalidation,
  super_admin-only role action). Suite: 244 tests / 16 files.

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
