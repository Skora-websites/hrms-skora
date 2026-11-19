import "server-only";
import { sendNotification } from "@/services/hrm/notifications";
import { sendMail } from "@/lib/email";
import { getDb, ObjectId } from "@/lib/db/mysql";

interface TicketNotifyInput {
  tenantId: string;
  userId: string;
  userEmail?: string;
  title: string;
  body: string;
  ticketId: string;
}

/**
 * Sends an instant in-app notification to a user, followed by a non-blocking
 * email alert if user email is present and SMTP/mail transport is available.
 */
export async function notifyTicketUser(input: TicketNotifyInput) {
  try {
    if (!input.userId) return;

    // 1. Instant in-app notification
    await sendNotification({
      tenantId: input.tenantId || "default",
      userId: input.userId,
      title: input.title,
      body: input.body,
      type: "ticket",
      referenceId: input.ticketId,
      referenceType: "ticket",
    });

    // 2. Non-blocking email alert (catch & ignore so API response never hangs)
    if (input.userEmail) {
      const baseUrl = process.env.NEXTAUTH_URL || "https://hrms.skora.in";
      const ticketLink = `${baseUrl}/hrms/tickets?id=${input.ticketId}`;

      sendMail({
        to: input.userEmail,
        subject: input.title,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="margin-bottom: 16px;">
              <span style="background-color: #eff6ff; color: #1d4ed8; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600;">HRMS Ticket System</span>
            </div>
            <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 12px;">${input.title}</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px;">${input.body}</p>
            <div>
              <a href="${ticketLink}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 6px;">Open Ticket in HRMS</a>
            </div>
          </div>
        `,
      }).catch((err) => {
        // Non-blocking log
        console.warn(`[ticket-notifications] Mail delivery skipped or failed for ${input.userEmail}:`, err?.message);
      });
    }
  } catch (err: any) {
    console.error(`[ticket-notifications] In-app notification error for user ${input.userId}:`, err?.message);
  }
}

/**
 * Notifies the managers of a target department (or super_admins if no department manager exists)
 */
export async function notifyDepartmentManagers(
  tenantId: string,
  department: string,
  title: string,
  body: string,
  ticketId: string
) {
  try {
    const db = await getDb();
    if (!db) return;

    // Find managers in the department
    let targetUsers = await db
      .collection("users")
      .find({
        tenantId,
        department,
        role: "manager",
        isActive: true,
      })
      .toArray();

    // If no active department manager, notify active super_admins
    if (!targetUsers || targetUsers.length === 0) {
      targetUsers = await db
        .collection("users")
        .find({
          tenantId,
          role: "super_admin",
          isActive: true,
        })
        .toArray();
    }

    for (const u of targetUsers as any[]) {
      const uId = u._id ? u._id.toString() : String(u.id);
      await notifyTicketUser({
        tenantId,
        userId: uId,
        userEmail: u.email,
        title,
        body,
        ticketId,
      });
    }
  } catch (err: any) {
    console.error(`[ticket-notifications] Failed to notify department managers for ${department}:`, err?.message);
  }
}
