import "server-only";
import { createHash } from "crypto";
import {
  statutoryConfigService,
  employeeTaxDeclarationsService,
  payrollDisbursementBatchesService,
  payrollTransactionsService,
  hrmUsersService,
} from "@/lib/hrm/firestore";
import type {
  StatutoryConfig,
  EmployeeTaxDeclaration,
  PayrollDisbursementBatch,
  PayrollTransaction,
} from "@/types";

// ══════════════════════════════════════════════════════════════════
// Statutory & Tax Compliance Engine (Enterprise Indian Payroll)
// ══════════════════════════════════════════════════════════════════

export const DEFAULT_STATUTORY_CONFIG: StatutoryConfig = {
  id: "statutory-default",
  pfEnabled: true,
  pfEmployeePercent: 12,
  pfEmployerPercent: 12,
  pfWageCeiling: 15000,
  esiEnabled: true,
  esiEmployeePercent: 0.75,
  esiEmployerPercent: 3.25,
  esiWageLimit: 21000,
  ptEnabled: true,
  tdsEnabled: true,
  tenantId: "default",
  createdAt: new Date() as any,
  updatedAt: new Date() as any,
};

export async function getStatutoryConfig(tenantId: string = "default"): Promise<StatutoryConfig> {
  const configs = await statutoryConfigService.findManyInTenant(tenantId, { limitCount: 1 });
  if (configs && configs.length > 0) return configs[0];
  return { ...DEFAULT_STATUTORY_CONFIG, tenantId };
}

export async function updateStatutoryConfig(
  tenantId: string = "default",
  data: Partial<StatutoryConfig>
): Promise<StatutoryConfig> {
  const existing = await getStatutoryConfig(tenantId);
  if (existing.id && existing.id !== "statutory-default") {
    const updated = await statutoryConfigService.update(existing.id, data);
    return updated || { ...existing, ...data };
  } else {
    return statutoryConfigService.createInTenant(tenantId, {
      ...DEFAULT_STATUTORY_CONFIG,
      ...data,
    });
  }
}

// ── Attendance-Adjusted Earned Salary (Loss of Pay Proration) ──────

export interface EarnedSalaryResult {
  payableDays: number;
  prorationFactor: number;
  earnedBasic: number;
  earnedGross: number;
}

export function calculateEarnedSalary(params: {
  masterBasic: number;
  masterGross: number;
  totalDaysInMonth: number;
  lopDays: number;
}): EarnedSalaryResult {
  const totalDays = Math.max(1, params.totalDaysInMonth);
  const lop = Math.max(0, Math.min(params.lopDays, totalDays));
  const payableDays = totalDays - lop;
  const prorationFactor = payableDays / totalDays;

  return {
    payableDays,
    prorationFactor,
    earnedBasic: Math.round(params.masterBasic * prorationFactor),
    earnedGross: Math.round(params.masterGross * prorationFactor),
  };
}

// ── Statutory Calculations (EPFO / ESIC / PT) ─────────────────────

export interface PFCalculationResult {
  employeePF: number;
  employerPF: number;
  employerEPS: number;
  employerEPF: number;
  employerEDLI: number;
  employerAdminCharges: number;
  totalEmployerContribution: number;
}

export function calculatePF(
  basicSalary: number,
  config: StatutoryConfig = DEFAULT_STATUTORY_CONFIG,
  useWageCeiling: boolean = true
): PFCalculationResult {
  if (!config.pfEnabled) {
    return {
      employeePF: 0,
      employerPF: 0,
      employerEPS: 0,
      employerEPF: 0,
      employerEDLI: 0,
      employerAdminCharges: 0,
      totalEmployerContribution: 0,
    };
  }

  // Statutory wage base: either capped at wage ceiling (15,000) or actual basic
  const wage = useWageCeiling ? Math.min(basicSalary, config.pfWageCeiling) : basicSalary;
  const employeePF = Math.round(wage * (config.pfEmployeePercent / 100));

  // Employer EPS: 8.33% capped at 1,250 (15,000 * 8.33%)
  const eps = Math.min(1250, Math.round(wage * (8.33 / 100)));
  const totalEmployerPF = Math.round(wage * (config.pfEmployerPercent / 100));
  const epf = Math.max(0, totalEmployerPF - eps);

  // Employer EDLI: 0.50% capped at 75 (15,000 * 0.5%)
  const employerEDLI = Math.min(75, Math.round(wage * 0.005));

  // Employer PF Admin Charges: 0.50%
  const employerAdminCharges = Math.round(wage * 0.005);
  const totalEmployerContribution = totalEmployerPF + employerEDLI + employerAdminCharges;

  return {
    employeePF,
    employerPF: totalEmployerPF,
    employerEPS: eps,
    employerEPF: epf,
    employerEDLI,
    employerAdminCharges,
    totalEmployerContribution,
  };
}

export interface ESICalculationResult {
  employeeESI: number;
  employerESI: number;
  isEligible: boolean;
}

export function calculateESI(
  grossSalary: number,
  config: StatutoryConfig = DEFAULT_STATUTORY_CONFIG,
  options?: { isCoveredUnderContributionPeriod?: boolean }
): ESICalculationResult {
  if (!config.esiEnabled) {
    return { employeeESI: 0, employerESI: 0, isEligible: false };
  }

  // Under ESIC Act, if an employee is eligible (gross <= 21,000) at the start of a contribution
  // period (Apr-Sep or Oct-Mar), coverage continues until the end of that contribution period.
  const isEligible = options?.isCoveredUnderContributionPeriod ?? (grossSalary <= config.esiWageLimit);
  if (!isEligible) {
    return { employeeESI: 0, employerESI: 0, isEligible: false };
  }

  // ESIC Rule: Employee contribution is rounded up to the next higher rupee (Math.ceil)
  const employeeESI = Math.ceil(grossSalary * (config.esiEmployeePercent / 100));
  const employerESI = Math.ceil(grossSalary * (config.esiEmployerPercent / 100));

  return { employeeESI, employerESI, isEligible: true };
}

export function calculatePT(
  grossSalary: number,
  state: string = "Karnataka",
  options?: { month?: number; gender?: "male" | "female" }
): number {
  const normalizedState = (state || "Karnataka").toLowerCase().trim();
  const month = options?.month ?? new Date().getMonth() + 1; // 1 to 12
  const isFemale = options?.gender === "female";

  if (normalizedState.includes("karnataka")) {
    return grossSalary > 15000 ? 200 : 0;
  }

  if (normalizedState.includes("maharashtra")) {
    // Women earning up to 25,000 are exempt in Maharashtra
    if (isFemale && grossSalary <= 25000) return 0;
    if (grossSalary > 10000) {
      // In February, PT is Rs 300; in other months Rs 200
      return month === 2 ? 300 : 200;
    }
    if (grossSalary > 7500) return 175;
    return 0;
  }

  if (normalizedState.includes("telangana") || normalizedState.includes("andhra")) {
    if (grossSalary > 20000) return 200;
    if (grossSalary > 15000) return 150;
    return 0;
  }

  if (normalizedState.includes("west bengal")) {
    if (grossSalary > 40000) return 200;
    if (grossSalary > 25000) return 150;
    if (grossSalary > 15000) return 130;
    if (grossSalary > 10000) return 110;
    return 0;
  }

  // Default fallback
  return grossSalary > 15000 ? 200 : 0;
}

// ── Income Tax Regime Comparator & Calculator (with Section 87A Marginal Relief) ──

export interface TaxRegimeComparison {
  annualGross: number;
  newRegime: {
    standardDeduction: number;
    taxableIncome: number;
    annualTax: number;
    monthlyTDS: number;
    effectiveRate: number;
  };
  oldRegime: {
    standardDeduction: number;
    totalDeductions: number;
    taxableIncome: number;
    annualTax: number;
    monthlyTDS: number;
    effectiveRate: number;
  };
  recommendedRegime: "new" | "old";
  annualTaxSavings: number;
}

export function calculateNewRegimeTax(annualGross: number): { taxableIncome: number; annualTax: number } {
  // Standard Deduction: Rs 75,000 (applicable FY 2024-25 onwards / FY 2026-27)
  const standardDeduction = 75000;
  const taxable = Math.max(0, annualGross - standardDeduction);

  // Section 87A Rebate: Zero tax for taxable income up to 7 Lakhs (Gross up to 7.75 Lakhs)
  if (taxable <= 700000) {
    return { taxableIncome: taxable, annualTax: 0 };
  }

  let tax = 0;
  let remaining = taxable;

  // 0 - 3L : 0%
  remaining = Math.max(0, remaining - 300000);

  // 3L - 7L : 5% (4 Lakhs @ 5% = 20,000)
  const slab1 = Math.min(400000, remaining);
  tax += slab1 * 0.05;
  remaining -= slab1;

  // 7L - 10L : 10% (3 Lakhs @ 10% = 30,000)
  const slab2 = Math.min(300000, remaining);
  tax += slab2 * 0.10;
  remaining -= slab2;

  // 10L - 12L : 15% (2 Lakhs @ 15% = 30,000)
  const slab3 = Math.min(200000, remaining);
  tax += slab3 * 0.15;
  remaining -= slab3;

  // 12L - 15L : 20% (3 Lakhs @ 20% = 60,000)
  const slab4 = Math.min(300000, remaining);
  tax += slab4 * 0.20;
  remaining -= slab4;

  // Above 15L : 30%
  if (remaining > 0) {
    tax += remaining * 0.30;
  }

  // Section 87A Marginal Relief (New Regime):
  // Tax payable cannot exceed the amount by which taxable income exceeds 7,00,000
  const excessOverThreshold = taxable - 700000;
  if (tax > excessOverThreshold) {
    tax = excessOverThreshold;
  }

  // 4% Health and Education Cess
  const finalTax = Math.round(tax * 1.04);
  return { taxableIncome: taxable, annualTax: finalTax };
}

export function calculateOldRegimeTax(
  annualGross: number,
  basicAnnual: number,
  hraAnnual: number,
  declaration?: Partial<EmployeeTaxDeclaration>
): { standardDeduction: number; totalDeductions: number; taxableIncome: number; annualTax: number } {
  const standardDeduction = 50000;
  const sec80C = Math.min(150000, declaration?.sec80CDeclared || declaration?.section80C || 0);
  const sec80D = Math.min(75000, declaration?.sec80DDeclared || declaration?.section80D || 0);
  const sec24 = Math.min(200000, declaration?.sec24HomeLoanInterest || declaration?.homeLoanInterest80EEA || 0);

  // HRA Exemption calculation (least of 3 components)
  let hraExemption = 0;
  const rentPaid = declaration?.hraRentPaidAnnually || declaration?.hraRentPaidAnnual || 0;
  if (rentPaid > 0) {
    const excessRent = Math.max(0, rentPaid - 0.10 * basicAnnual);
    const metroCap = declaration?.metroCity ? 0.50 * basicAnnual : 0.40 * basicAnnual;
    hraExemption = Math.min(hraAnnual, excessRent, metroCap);
  }

  const otherDeductions = declaration?.otherDeductions || declaration?.otherExemptions || 0;
  const totalDeductions = standardDeduction + sec80C + sec80D + sec24 + hraExemption + otherDeductions;
  const taxable = Math.max(0, annualGross - totalDeductions);

  // Section 87A Rebate: Zero tax for taxable income up to 5 Lakhs
  if (taxable <= 500000) {
    return { standardDeduction, totalDeductions, taxableIncome: taxable, annualTax: 0 };
  }

  let tax = 0;
  let remaining = taxable;

  // 0 - 2.5L : 0%
  remaining = Math.max(0, remaining - 250000);

  // 2.5L - 5L : 5% (2.5 Lakhs @ 5% = 12,500)
  const slab1 = Math.min(250000, remaining);
  tax += slab1 * 0.05;
  remaining -= slab1;

  // 5L - 10L : 20% (5 Lakhs @ 20% = 1,00,000)
  const slab2 = Math.min(500000, remaining);
  tax += slab2 * 0.20;
  remaining -= slab2;

  // Above 10L : 30%
  if (remaining > 0) {
    tax += remaining * 0.30;
  }

  // Section 87A Marginal Relief (Old Regime):
  // For taxable income marginally above 5,00,000, tax cannot exceed (taxable - 500000)
  const excessOld = taxable - 500000;
  if (tax > excessOld) {
    tax = excessOld;
  }

  // 4% Health and Education Cess
  const finalTax = Math.round(tax * 1.04);
  return { standardDeduction, totalDeductions, taxableIncome: taxable, annualTax: finalTax };
}

export function compareTaxRegimes(
  annualGross: number,
  basicAnnual: number = annualGross * 0.5,
  hraAnnual: number = annualGross * 0.2,
  declaration?: Partial<EmployeeTaxDeclaration>
): TaxRegimeComparison {
  const newCalc = calculateNewRegimeTax(annualGross);
  const oldCalc = calculateOldRegimeTax(annualGross, basicAnnual, hraAnnual, declaration);

  const newTax = newCalc.annualTax;
  const oldTax = oldCalc.annualTax;

  const recommendedRegime: "new" | "old" = newTax <= oldTax ? "new" : "old";
  const annualTaxSavings = Math.abs(newTax - oldTax);

  return {
    annualGross,
    newRegime: {
      standardDeduction: 75000,
      taxableIncome: newCalc.taxableIncome,
      annualTax: newTax,
      monthlyTDS: Math.round(newTax / 12),
      effectiveRate: annualGross > 0 ? Number(((newTax / annualGross) * 100).toFixed(2)) : 0,
    },
    oldRegime: {
      standardDeduction: oldCalc.standardDeduction,
      totalDeductions: oldCalc.totalDeductions,
      taxableIncome: oldCalc.taxableIncome,
      annualTax: oldTax,
      monthlyTDS: Math.round(oldTax / 12),
      effectiveRate: annualGross > 0 ? Number(((oldTax / annualGross) * 100).toFixed(2)) : 0,
    },
    recommendedRegime,
    annualTaxSavings,
  };
}

// ── Dynamic Section 192 TDS Projection Engine ──────────────────────

export interface DynamicTDSParams {
  currentMonthGross: number;
  ytdGross: number;
  ytdTDS: number;
  monthIndex: number; // 1 for April, 2 for May ... 12 for March
  masterMonthlyGross: number;
  regime?: "new" | "old";
  declarations?: Partial<EmployeeTaxDeclaration>;
  prevEmployerGross?: number;
  prevEmployerTDS?: number;
  masterBasicAnnual?: number;
  masterHraAnnual?: number;
}

export interface DynamicTDSResult {
  projectedAnnualGross: number;
  projectedAnnualTax: number;
  remainingMonths: number;
  monthlyTDS: number;
  effectiveRate: number;
  taxableIncome: number;
}

export function calculateDynamicTDS(params: DynamicTDSParams): DynamicTDSResult {
  const monthIdx = Math.max(1, Math.min(12, params.monthIndex));
  // Remaining months including current month: e.g. April (1) -> 12, Oct (7) -> 6, March (12) -> 1
  const remainingMonths = Math.max(1, 12 - monthIdx + 1);
  const futureMonths = Math.max(0, 12 - monthIdx);

  // Projected Annual Gross: YTD earned + current month + projected future months + previous employer
  const projectedAnnualGross =
    (params.ytdGross || 0) +
    params.currentMonthGross +
    params.masterMonthlyGross * futureMonths +
    (params.prevEmployerGross || 0);

  const regime = params.regime || params.declarations?.taxRegime || params.declarations?.regime || "new";
  let projectedAnnualTax = 0;
  let taxableIncome = 0;

  if (regime === "old") {
    const basicAnnual = params.masterBasicAnnual || projectedAnnualGross * 0.5;
    const hraAnnual = params.masterHraAnnual || projectedAnnualGross * 0.2;
    const oldCalc = calculateOldRegimeTax(projectedAnnualGross, basicAnnual, hraAnnual, params.declarations);
    projectedAnnualTax = oldCalc.annualTax;
    taxableIncome = oldCalc.taxableIncome;
  } else {
    const newCalc = calculateNewRegimeTax(projectedAnnualGross);
    projectedAnnualTax = newCalc.annualTax;
    taxableIncome = newCalc.taxableIncome;
  }

  // Deduct tax already deposited/collected YTD and from Form 12B (previous employer)
  const totalTaxPaid = (params.ytdTDS || 0) + (params.prevEmployerTDS || 0);
  const remainingTaxLiability = Math.max(0, projectedAnnualTax - totalTaxPaid);

  // Amortize over remaining months
  const monthlyTDS = Math.round(remainingTaxLiability / remainingMonths);
  const effectiveRate = projectedAnnualGross > 0 ? Number(((projectedAnnualTax / projectedAnnualGross) * 100).toFixed(2)) : 0;

  return {
    projectedAnnualGross,
    projectedAnnualTax,
    remainingMonths,
    monthlyTDS,
    effectiveRate,
    taxableIncome,
  };
}

// ── Form 12BB & Declarations ───────────────────────────────────────

export async function getEmployeeTaxDeclaration(
  tenantId: string = "default",
  userId: string,
  financialYear: string = "2026-2027"
): Promise<EmployeeTaxDeclaration | null> {
  const list = await employeeTaxDeclarationsService.findManyInTenant(tenantId, {
    where: [
      { field: "userId", op: "==", value: userId },
      { field: "financialYear", op: "==", value: financialYear },
    ],
    limitCount: 1,
  });
  return list[0] || null;
}

export async function submitEmployeeTaxDeclaration(
  tenantId: string = "default",
  userId: string,
  data: Partial<EmployeeTaxDeclaration>
): Promise<EmployeeTaxDeclaration> {
  const user = await hrmUsersService.findById(userId);
  const employeeName = user?.displayName || (user as any)?.name || user?.email || "Employee";
  const financialYear = data.financialYear || "2026-2027";

  const existing = await getEmployeeTaxDeclaration(tenantId, userId, financialYear);
  if (existing?.id) {
    const updated = await employeeTaxDeclarationsService.update(existing.id, {
      ...data,
      employeeName,
      status: "submitted",
    });
    return updated!;
  }

  return employeeTaxDeclarationsService.createInTenant(tenantId, {
    ...data,
    userId,
    employeeName,
    financialYear,
    regime: data.regime || data.taxRegime || "new",
    taxRegime: data.taxRegime || data.regime || "new",
    sec80CDeclared: data.sec80CDeclared ?? data.section80C ?? 0,
    sec80DDeclared: data.sec80DDeclared ?? data.section80D ?? 0,
    sec24HomeLoanInterest: data.sec24HomeLoanInterest ?? data.homeLoanInterest80EEA ?? 0,
    hraRentPaidAnnually: data.hraRentPaidAnnually ?? data.hraRentPaidAnnual ?? 0,
    metroCity: Boolean(data.metroCity),
    otherDeductions: data.otherDeductions ?? data.otherExemptions ?? 0,
    status: "submitted",
  });
}

export async function verifyTaxDeclaration(
  id: string,
  verifiedBy: string,
  status: "verified" | "rejected"
): Promise<EmployeeTaxDeclaration | null> {
  return employeeTaxDeclarationsService.update(id, {
    status,
    verifiedBy,
    verifiedAt: new Date() as any,
  });
}

// ── Bank Account & IFSC Validation (Zero-Dummy Policy) ─────────────

export interface BankValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmployeeBankDetails(employee: {
  userId?: string;
  employeeName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
}): BankValidationResult {
  const name = employee.employeeName || employee.userId || "Employee";
  const acc = (employee.bankAccountNumber || "").trim();
  const ifsc = (employee.bankIfsc || "").trim().toUpperCase();

  if (!acc || acc.length < 9 || !/^\d+$/.test(acc) || /^0+$/.test(acc)) {
    return {
      isValid: false,
      error: `Missing or invalid bank account number for ${name} (provided: "${acc || "empty"}"). Must be 9 to 18 digits.`,
    };
  }

  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifsc || !ifscRegex.test(ifsc)) {
    return {
      isValid: false,
      error: `Invalid IFSC code "${ifsc}" for ${name}. Must match standard 11-character Indian banking format (e.g. HDFC0001234, SBIN0000456).`,
    };
  }

  return { isValid: true };
}

// ── Bank Disbursement Batch Generation & State Machine ─────────────

export async function generateDisbursementBatch(
  tenantId: string = "default",
  periodMonth: string, // YYYY-MM
  bankFormat: PayrollDisbursementBatch["bankFormat"] = "STANDARD_NEFT",
  generatedBy: string = "HR Admin",
  options?: { forceRegenerate?: boolean }
): Promise<{ batch: PayrollDisbursementBatch; fileContent: string; fileName: string }> {
  // 1. Idempotency Guard: Ensure a batch for this month isn't duplicated
  const existingBatches = await payrollDisbursementBatchesService.findManyInTenant(tenantId, {
    where: [{ field: "periodMonth", op: "==", value: periodMonth }],
  });

  const activeBatch = existingBatches.find(
    (b) => b.status === "generated" || b.status === "completed" || b.status === "processing"
  );

  if (activeBatch && !options?.forceRegenerate) {
    throw new Error(
      `Disbursement batch for period ${periodMonth} already exists (Batch ID: ${activeBatch.id}, Status: ${activeBatch.status}). Reconcile or cancel the existing batch before regenerating.`
    );
  }

  // 2. Fetch Payroll Transactions for this period
  const transactions = await payrollTransactionsService.findManyInTenant(tenantId, {
    where: [{ field: "periodMonth", op: "==", value: periodMonth }],
  });

  if (!transactions || transactions.length === 0) {
    throw new Error(`No payroll transactions found for period ${periodMonth}. Run payroll calculation first.`);
  }

  // 3. Pre-flight Validation: Enrich and validate bank details for all employees
  const validationErrors: string[] = [];
  const enrichedRows: Array<{
    txId: string;
    userId: string;
    employeeName: string;
    employeeId: string;
    bankAccountNumber: string;
    bankIfsc: string;
    netAmount: number;
  }> = [];

  for (const tx of transactions) {
    const net = tx.netPay ?? (tx as any).netPayable ?? 0;
    if (net <= 0) continue; // Skip zero/negative payout records

    let empName = (tx as any).employeeName;
    let bankAcc = tx.bankAccountNumber || (tx as any).bankAccount;
    let bankIfsc = tx.bankIfsc || (tx as any).ifscCode;
    let empCode = (tx as any).employeeId || tx.userId;

    // Fetch user profile if details are missing from transaction record
    if (!bankAcc || !bankIfsc || !empName) {
      try {
        const user = await hrmUsersService.findById(tx.userId);
        if (user) {
          empName = empName || user.displayName || (user as any).name || user.email;
          bankAcc = bankAcc || (user as any).bankAccountNumber || (user as any).onboardingDetails?.bankAccountNumber;
          bankIfsc = bankIfsc || (user as any).bankIfsc || (user as any).ifscCode || (user as any).onboardingDetails?.ifscCode;
          empCode = (user as any).employeeId || empCode;
        }
      } catch (err) {
        console.warn(`Could not enrich bank details for user ${tx.userId}:`, err);
      }
    }

    const validation = validateEmployeeBankDetails({
      userId: tx.userId,
      employeeName: empName,
      bankAccountNumber: bankAcc,
      bankIfsc,
    });

    if (!validation.isValid) {
      validationErrors.push(validation.error!);
    } else {
      enrichedRows.push({
        txId: tx.id,
        userId: tx.userId,
        employeeName: empName,
        employeeId: empCode,
        bankAccountNumber: bankAcc.trim(),
        bankIfsc: bankIfsc.trim().toUpperCase(),
        netAmount: net,
      });
    }
  }

  // Zero-Dummy Policy: Halt if any bank details are invalid
  if (validationErrors.length > 0) {
    throw new Error(
      `Pre-flight bank disbursement validation failed for ${validationErrors.length} employee(s):\n- ${validationErrors.join("\n- ")}`
    );
  }

  const totalAmount = enrichedRows.reduce((sum, r) => sum + r.netAmount, 0);
  const employeeCount = enrichedRows.length;

  // 4. Generate deterministic batch hash for integrity
  const batchHash = createHash("sha256")
    .update(`${tenantId}:${periodMonth}:${employeeCount}:${totalAmount}`)
    .digest("hex");

  const [yearStr, monthStr] = periodMonth.split("-");
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const month = monthStr || String(new Date().getMonth() + 1).padStart(2, "0");

  const batch = await payrollDisbursementBatchesService.createInTenant(tenantId, {
    month,
    year,
    periodMonth,
    totalEmployees: employeeCount,
    employeeCount,
    totalGross: totalAmount,
    totalDeductions: 0,
    totalNet: totalAmount,
    totalAmount,
    bankName: bankFormat,
    bankFormat,
    status: "generated",
    batchHash,
    generatedBy,
  });

  // 5. Update transaction records with batchId and status 'batched'
  for (const row of enrichedRows) {
    try {
      await payrollTransactionsService.update(row.txId, {
        status: "batched",
        payoutStatus: "batched",
        disbursementBatchId: batch.id,
        bankAccountNumber: row.bankAccountNumber,
        bankIfsc: row.bankIfsc,
      } as any);
    } catch (updateErr) {
      console.warn(`Failed to update transaction ${row.txId} to batched:`, updateErr);
    }
  }

  // 6. Build Bank-Specific CSV Content
  let header = "";
  const rows: string[] = [];

  if (bankFormat === "HDFC") {
    // HDFC Corporate NetBanking format
    header = "Transaction_Type,Beneficiary_Code,Beneficiary_Acc_No,Amount,Beneficiary_Name,IFSC,Remarks";
    enrichedRows.forEach((r) => {
      rows.push(`NEFT,${r.employeeId},${r.bankAccountNumber},${r.netAmount},"${r.employeeName}","${r.bankIfsc}","SALARY_${periodMonth}"`);
    });
  } else if (bankFormat === "ICICI") {
    // ICICI Corporate Eazypay format
    header = "PYMT_PROD_TYP_CODE,PYMT_MODE,DR_AC_NO,CR_AC_NO,AMOUNT,CURRENCY,TXN_TXT,BENEFICIARY_NAME,IFSC";
    enrichedRows.forEach((r) => {
      rows.push(`SALARY,NEFT,CORPORATE_ACC,${r.bankAccountNumber},${r.netAmount},INR,SALARY_${periodMonth},"${r.employeeName}","${r.bankIfsc}"`);
    });
  } else {
    // STANDARD_NEFT format
    header = "Beneficiary Name,Account Number,IFSC Code,Amount,Payment Reference,Month";
    enrichedRows.forEach((r) => {
      rows.push(`"${r.employeeName}",${r.bankAccountNumber},${r.bankIfsc},${r.netAmount},"SALARY_PAYOUT",${periodMonth}`);
    });
  }

  const fileContent = [header, ...rows].join("\n");
  const fileName = `PAYROLL_DISBURSEMENT_${bankFormat}_${periodMonth}.csv`;

  return { batch, fileContent, fileName };
}

// ── Bank Reverse-Feed Reconciliation ──────────────────────────────

export interface BankReconciliationRecord {
  userId: string;
  bankAccountNumber: string;
  bankUtr: string;
  status: "SUCCESS" | "FAILED";
  failureReason?: string;
}

export async function reconcileDisbursementBatch(
  tenantId: string = "default",
  batchId: string,
  records: BankReconciliationRecord[]
): Promise<{
  batchId: string;
  totalRecords: number;
  successCount: number;
  failedCount: number;
  batchStatus: "completed" | "partially_failed";
}> {
  const batch = await payrollDisbursementBatchesService.findById(batchId);
  if (!batch) {
    throw new Error(`Batch with ID ${batchId} not found`);
  }

  // Fetch all transactions associated with this batch
  const transactions = await payrollTransactionsService.findManyInTenant(tenantId, {
    where: [{ field: "disbursementBatchId", op: "==", value: batchId }],
  });

  let successCount = 0;
  let failedCount = 0;

  for (const rec of records) {
    const tx = transactions.find(
      (t) => t.userId === rec.userId || (t as any).bankAccountNumber === rec.bankAccountNumber
    );

    if (tx) {
      const isSuccess = rec.status === "SUCCESS";
      if (isSuccess) successCount++;
      else failedCount++;

      await payrollTransactionsService.update(tx.id, {
        status: isSuccess ? "paid" : "failed",
        payoutStatus: isSuccess ? "paid" : "failed",
        bankUtr: rec.bankUtr,
        failureReason: rec.failureReason || (isSuccess ? undefined : "Bank returned failure"),
        paidAt: isSuccess ? (new Date() as any) : undefined,
      } as any);
    }
  }

  const batchStatus = failedCount === 0 ? "completed" : "partially_failed";
  await payrollDisbursementBatchesService.update(batchId, {
    status: batchStatus,
    disbursedAt: new Date() as any,
    reconciliationSummary: { successful: successCount, failed: failedCount },
  } as any);

  return {
    batchId,
    totalRecords: records.length,
    successCount,
    failedCount,
    batchStatus,
  };
}

export async function getDisbursementBatches(
  tenantId: string = "default"
): Promise<PayrollDisbursementBatch[]> {
  return payrollDisbursementBatchesService.findManyInTenant(tenantId, {
    orderByField: "createdAt",
    orderByDirection: "desc",
  });
}
