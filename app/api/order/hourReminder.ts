import prisma from "../../../prisma";

/**
 * The website schedules each appointment's "in 1 hour" emails (client +
 * salon) on Resend and keeps their ids on the Booking (hourReminderIds).
 * When the dashboard edits / moves / cancels / deletes an appointment, those
 * scheduled emails are cancelled here and the website is asked to schedule
 * new ones with the updated details.
 *
 * Env: RESEND_API_KEY (same key as the website), WEBSITE_URL (default
 * https://www.rafidaham.com) and CRON_SECRET (same value as the website's).
 */

const WEBSITE = (process.env.WEBSITE_URL || "https://www.rafidaham.com").replace(/\/$/, "");

async function cancelOnResend(id: string) {
  if (!process.env.RESEND_API_KEY) return;
  await fetch(`https://api.resend.com/emails/${id}/cancel`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  }).catch((e) => console.error("Resend cancel failed:", e?.message || e));
}

/** Cancels the scheduled reminder of a Booking and marks it to be scheduled again. */
export async function resetHourReminder(bookingId?: string | null) {
  if (!bookingId) return;
  try {
    const res: any = await prisma.$runCommandRaw({
      find: "Booking",
      filter: { _id: { $oid: bookingId } },
      projection: { hourReminderIds: 1 },
      limit: 1,
    });
    const ids: string[] = res?.cursor?.firstBatch?.[0]?.hourReminderIds || [];
    await Promise.all(ids.map(cancelOnResend));
    await prisma.$runCommandRaw({
      update: "Booking",
      updates: [
        { q: { _id: { $oid: bookingId } }, u: { $set: { hourReminderIds: [] }, $pull: { remindersSent: "hour" } } },
      ],
    } as any);
  } catch (e: any) {
    console.error("Resetting the 1-hour reminder failed:", e?.message || e);
  }
}

/** Asks the website to schedule every missing "in 1 hour" reminder (fire and forget). */
export function scheduleHourReminders() {
  const secret = process.env.CRON_SECRET;
  const url = `${WEBSITE}/api/booking/reminders/hour${secret ? `?secret=${encodeURIComponent(secret)}` : ""}`;
  return fetch(url, { cache: "no-store" })
    .then((r) => {
      if (!r.ok) console.error("Website reminder scheduling answered", r.status);
    })
    .catch((e) => console.error("Website reminder scheduling failed:", e?.message || e));
}
