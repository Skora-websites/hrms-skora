/**
 * Team Performance Rating Normalization & Bell-Curve Calibration Engine
 * 
 * Neutralizes manager grading bias (lenient vs. strict graders) via statistical Z-score
 * standardization and maps team outcomes to the standard enterprise distribution:
 * - Tier 1: Top Talent (Top ~15%)
 * - Tier 2: Core Contributors (~70%)
 * - Tier 3: Needs Improvement / Development (~15%)
 */

export interface RawEmployeeRating {
  employeeId: string;
  employeeName: string;
  managerId: string;
  managerName?: string;
  rawScore: number; // 1.0 to 5.0
  department?: string;
}

export interface CalibratedEmployeeRating {
  employeeId: string;
  employeeName: string;
  managerId: string;
  rawScore: number;
  zScore: number;
  calibratedScore: number; // Standardized on 1.0 - 5.0 scale
  performanceTier: "Tier 1 - Exceptional" | "Tier 2 - Core Contributor" | "Tier 3 - Needs Improvement";
  rank: number;
  percentile: number;
}

export interface ManagerCalibrationSummary {
  managerId: string;
  managerName?: string;
  totalSubordinates: number;
  meanRawScore: number;
  stdDevRawScore: number;
  biasTendency: "lenient" | "strict" | "balanced";
}

export interface CalibrationResult {
  totalEmployees: number;
  companyMeanRaw: number;
  ratings: CalibratedEmployeeRating[];
  managerSummaries: ManagerCalibrationSummary[];
  distribution: {
    tier1Count: number;
    tier1Percent: number;
    tier2Count: number;
    tier2Percent: number;
    tier3Count: number;
    tier3Percent: number;
  };
}

export function calibrateTeamRatings(
  rawRatings: RawEmployeeRating[],
  options?: {
    targetMean?: number; // default 3.5
    targetStdDev?: number; // default 0.75
    tier1ThresholdPercentile?: number; // default top 15% (>= 85th percentile)
    tier3ThresholdPercentile?: number; // default bottom 15% (<= 15th percentile)
  }
): CalibrationResult {
  if (!rawRatings || rawRatings.length === 0) {
    return {
      totalEmployees: 0,
      companyMeanRaw: 0,
      ratings: [],
      managerSummaries: [],
      distribution: {
        tier1Count: 0,
        tier1Percent: 0,
        tier2Count: 0,
        tier2Percent: 0,
        tier3Count: 0,
        tier3Percent: 0,
      },
    };
  }

  const targetMean = options?.targetMean ?? 3.5;
  const targetStdDev = options?.targetStdDev ?? 0.75;
  const tier1Percentile = options?.tier1ThresholdPercentile ?? 85;
  const tier3Percentile = options?.tier3ThresholdPercentile ?? 15;

  // 1. Group ratings by manager to compute manager-level statistics
  const managerGroups = new Map<string, RawEmployeeRating[]>();
  rawRatings.forEach((r) => {
    const list = managerGroups.get(r.managerId) || [];
    list.push(r);
    managerGroups.set(r.managerId, list);
  });

  const managerSummaries: ManagerCalibrationSummary[] = [];
  const managerStats = new Map<string, { mean: number; stdDev: number }>();

  managerGroups.forEach((ratings, managerId) => {
    const n = ratings.length;
    const mean = ratings.reduce((sum, r) => sum + r.rawScore, 0) / n;
    const variance = ratings.reduce((sum, r) => sum + Math.pow(r.rawScore - mean, 2), 0) / (n > 1 ? n - 1 : 1);
    const stdDev = Math.sqrt(variance) || 0.5; // Avoid division by zero

    let biasTendency: "lenient" | "strict" | "balanced" = "balanced";
    if (mean >= 4.0) biasTendency = "lenient";
    else if (mean <= 3.2) biasTendency = "strict";

    managerSummaries.push({
      managerId,
      managerName: ratings[0]?.managerName,
      totalSubordinates: n,
      meanRawScore: Number(mean.toFixed(2)),
      stdDevRawScore: Number(stdDev.toFixed(2)),
      biasTendency,
    });

    managerStats.set(managerId, { mean, stdDev });
  });

  // 2. Compute Z-Scores and Calibrated Scores for each employee
  const calibratedList: Array<Omit<CalibratedEmployeeRating, "rank" | "percentile" | "performanceTier">> = [];

  rawRatings.forEach((r) => {
    const stats = managerStats.get(r.managerId) || { mean: targetMean, stdDev: targetStdDev };
    const zScore = stats.stdDev > 0 ? (r.rawScore - stats.mean) / stats.stdDev : 0;

    // Project onto standardized target distribution: Target Mean 3.5, clamped between 1.0 and 5.0
    const rawCalibrated = targetMean + zScore * targetStdDev;
    const calibratedScore = Number(Math.min(5.0, Math.max(1.0, rawCalibrated)).toFixed(2));

    calibratedList.push({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      managerId: r.managerId,
      rawScore: r.rawScore,
      zScore: Number(zScore.toFixed(2)),
      calibratedScore,
    });
  });

  // 3. Rank and calculate percentiles across the whole cohort
  calibratedList.sort((a, b) => b.calibratedScore - a.calibratedScore);

  const total = calibratedList.length;
  let tier1Count = 0;
  let tier2Count = 0;
  let tier3Count = 0;

  const finalRatings: CalibratedEmployeeRating[] = calibratedList.map((item, index) => {
    const rank = index + 1;
    // Percentile rank (100 = highest rank)
    const percentile = Number((((total - rank + 1) / total) * 100).toFixed(1));

    let performanceTier: CalibratedEmployeeRating["performanceTier"] = "Tier 2 - Core Contributor";
    if (percentile >= tier1Percentile) {
      performanceTier = "Tier 1 - Exceptional";
      tier1Count++;
    } else if (percentile <= tier3Percentile) {
      performanceTier = "Tier 3 - Needs Improvement";
      tier3Count++;
    } else {
      tier2Count++;
    }

    return {
      ...item,
      rank,
      percentile,
      performanceTier,
    };
  });

  const companyMeanRaw = Number(
    (rawRatings.reduce((sum, r) => sum + r.rawScore, 0) / total).toFixed(2)
  );

  return {
    totalEmployees: total,
    companyMeanRaw,
    ratings: finalRatings,
    managerSummaries,
    distribution: {
      tier1Count,
      tier1Percent: Number(((tier1Count / total) * 100).toFixed(1)),
      tier2Count,
      tier2Percent: Number(((tier2Count / total) * 100).toFixed(1)),
      tier3Count,
      tier3Percent: Number(((tier3Count / total) * 100).toFixed(1)),
    },
  };
}
