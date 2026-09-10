import { requireSuperAdmin, isErrorResponse } from "@/lib/api-auth";
import { withErrorHandler, ok } from "@/lib/api-handler";
import { onboardingService } from "@/lib/hrm/firestore";

export const GET = withErrorHandler(async () => {
  const auth = await requireSuperAdmin();
  if (isErrorResponse(auth)) return auth;

  // Find onboarding records that are rejected or have missed deadlines
  let escalations: any[] = [];
  try {
    const allOnboarding = await onboardingService.findMany({
      orderByField: "updatedAt",
      orderByDirection: "desc",
      limitCount: 100,
    });

    const now = Date.now();
    escalations = allOnboarding
      .filter((o: any) => {
        if (o.status === "rejected" || o.status === "escalated") return true;
        // Check for 48h deadline miss
        if (o.rejectedAt && o.status !== "approved") {
          const rejectedTime = new Date(o.rejectedAt).getTime();
          const hoursSinceRejection = (now - rejectedTime) / (1000 * 60 * 60);
          if (hoursSinceRejection > 48) return true;
        }
        return false;
      })
      .map((o: any) => {
        const rejectedAt = o.rejectedAt ? new Date(o.rejectedAt).getTime() : now;
        const deadlineMs = rejectedAt + 48 * 60 * 60 * 1000;
        const hoursRemaining = Math.max(0, Math.round((deadlineMs - now) / (1000 * 60 * 60)));
        const isExpired = hoursRemaining <= 0;

        return {
          id: o.id,
          employeeName: o.employeeName || o.userName || "Unknown",
          email: o.email || "",
          department: o.department || "",
          rejectionDate: o.rejectedAt
            ? new Date(o.rejectedAt).toLocaleDateString()
            : new Date(o.updatedAt || o.createdAt).toLocaleDateString(),
          deadlineHoursRemaining: isExpired ? 0 : hoursRemaining,
          status: isExpired ? "escalated" : (o.status === "escalated" ? "escalated" : "pending"),
        };
      });
  } catch {
    // If onboarding collection is empty or doesn't exist, return empty
  }

  return ok(escalations);
}, { label: "Escalations GET" });
