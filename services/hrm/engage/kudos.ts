import "server-only";
import { kudosService, kudosLikesService } from "@/lib/hrm/firestore";
import { getMySQLPool } from "@/lib/db/mysql";
import type { Kudos, KudosLike } from "@/types";

// ══════════════════════════════════════════════════════════════════
// Peer Kudos & Recognition Wall Service
// ══════════════════════════════════════════════════════════════════

export async function getRemainingMonthlyAllowance(
  tenantId: string,
  userId: string
): Promise<{ monthlyBudget: number; pointsGiven: number; remainingPoints: number }> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const monthStr = `${year}-${month}`;

  const allUserKudos = await kudosService.findManyInTenant(tenantId, {
    where: [{ field: "senderId", op: "==", value: userId }],
  });

  const thisMonthGiven = allUserKudos
    .filter((k) => {
      const d = new Date(k.createdAt);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return m === monthStr;
    })
    .reduce((sum, k) => sum + Number(k.points || 0), 0);

  const monthlyBudget = 100;
  const remainingPoints = Math.max(0, monthlyBudget - thisMonthGiven);

  return { monthlyBudget, pointsGiven: thisMonthGiven, remainingPoints };
}

export async function getKudosFeed(
  tenantId: string,
  options: {
    coreValue?: string;
    userId?: string;
    limit?: number;
  } = {}
): Promise<Kudos[]> {
  const where: { field: string; op: "=="; value: unknown }[] = [];

  if (options.coreValue) {
    where.push({ field: "coreValue", op: "==", value: options.coreValue });
  }

  let list = await kudosService.findManyInTenant(tenantId, {
    where: where.length > 0 ? where : undefined,
    orderByField: "createdAt",
    orderByDirection: "desc",
  });

  if (options.userId) {
    list = list.filter((k) => k.receiverId === options.userId || k.senderId === options.userId);
  }

  if (options.limit && options.limit > 0) {
    list = list.slice(0, options.limit);
  }

  return list;
}

export async function getKudosLeaderboard(
  tenantId: string
): Promise<{ receiverId: string; receiverName: string; receiverAvatar: string; department: string; kudosCount: number; totalPoints: number }[]> {
  const pool = getMySQLPool();
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const monthPattern = `${year}-${month}%`;

    const [rows]: any = await pool.query(
      `SELECT receiverId, receiverName, receiverAvatar, department,
              COUNT(id) as kudosCount,
              SUM(points) as totalPoints
       FROM kudos
       WHERE tenantId = ? AND createdAt LIKE ?
       GROUP BY receiverId, receiverName, receiverAvatar, department
       ORDER BY totalPoints DESC, kudosCount DESC
       LIMIT 10`,
      [tenantId, monthPattern]
    );

    return rows.map((r: any) => ({
      receiverId: r.receiverId,
      receiverName: r.receiverName,
      receiverAvatar: r.receiverAvatar || "",
      department: r.department || "General",
      kudosCount: Number(r.kudosCount),
      totalPoints: Number(r.totalPoints),
    }));
  } catch (err) {
    console.error("Error fetching kudos leaderboard:", err);
    return [];
  }
}

export async function sendKudos(
  tenantId: string,
  data: {
    senderId: string;
    senderName: string;
    senderEmail: string;
    senderAvatar?: string;
    receiverId: string;
    receiverName: string;
    receiverEmail: string;
    receiverAvatar?: string;
    department?: string;
    points: number;
    badge: string;
    coreValue: string;
    message: string;
  }
): Promise<Kudos> {
  if (data.senderId === data.receiverId) {
    throw new Error("You cannot send kudos to yourself! Recognize a team member instead.");
  }

  const numPoints = Number(data.points || 10);
  if (numPoints <= 0) {
    throw new Error("Points must be greater than 0");
  }

  const allowance = await getRemainingMonthlyAllowance(tenantId, data.senderId);
  if (numPoints > allowance.remainingPoints) {
    throw new Error(
      `Insufficient points allowance. You have ${allowance.remainingPoints} points remaining this month (requested ${numPoints} points)`
    );
  }

  const now = new Date();
  const kudos: Omit<Kudos, "id"> = {
    tenantId,
    senderId: data.senderId,
    senderName: data.senderName,
    senderEmail: data.senderEmail,
    senderAvatar: data.senderAvatar || "",
    receiverId: data.receiverId,
    receiverName: data.receiverName,
    receiverEmail: data.receiverEmail,
    receiverAvatar: data.receiverAvatar || "",
    department: data.department || "General",
    points: numPoints,
    badge: data.badge || "Team Player",
    coreValue: data.coreValue || "#Teamwork",
    message: data.message,
    likesCount: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };

  return kudosService.create({
    tenantId,
    senderId: data.senderId,
    senderName: data.senderName,
    senderEmail: data.senderEmail,
    senderAvatar: data.senderAvatar || "",
    receiverId: data.receiverId,
    receiverName: data.receiverName,
    receiverEmail: data.receiverEmail,
    receiverAvatar: data.receiverAvatar || "",
    department: data.department || "General",
    points: numPoints,
    badge: data.badge || "Team Player",
    coreValue: data.coreValue || "#Teamwork",
    message: data.message,
    likesCount: 0,
  } as any);
}

export async function toggleKudosLike(
  tenantId: string,
  kudosId: string,
  userId: string,
  userName: string
): Promise<{ liked: boolean; likesCount: number }> {
  const pool = getMySQLPool();

  // Check if already liked
  const [existing]: any = await pool.query(
    "SELECT id FROM kudos_likes WHERE kudosId = ? AND userId = ?",
    [kudosId, userId]
  );

  let liked = false;
  if (existing.length > 0) {
    // Unlike
    await pool.query("DELETE FROM kudos_likes WHERE kudosId = ? AND userId = ?", [kudosId, userId]);
    await pool.query("UPDATE kudos SET likesCount = GREATEST(0, likesCount - 1) WHERE id = ? OR legacyId = ?", [kudosId, kudosId]);
    liked = false;
  } else {
    // Like
    await pool.query(
      "INSERT INTO kudos_likes (tenantId, kudosId, userId, userName, createdAt) VALUES (?, ?, ?, ?, NOW(3))",
      [tenantId, kudosId, userId, userName]
    );
    await pool.query("UPDATE kudos SET likesCount = likesCount + 1 WHERE id = ? OR legacyId = ?", [kudosId, kudosId]);
    liked = true;
  }

  const [kudosRows]: any = await pool.query(
    "SELECT likesCount FROM kudos WHERE id = ? OR legacyId = ?",
    [kudosId, kudosId]
  );

  const likesCount = kudosRows.length > 0 ? Number(kudosRows[0].likesCount) : 0;
  return { liked, likesCount };
}
