import { cookies } from "next/headers";
import prisma from "../../../prisma";
import { cleanCart } from "../../utils/appointments";
import { DEVICE_COOKIE } from "../../constants";

/**
 * Notifications made from the dashboard. They go in the `Notification`
 * collection the website uses too (my-app/app/lib/notifications.js):
 *
 *   audience "admin"   shown by the dashboard's bell
 *   audience "client"  shown by the website's bell, to the people in `owners`
 *   actor              who did it: "client" or "admin"
 *   type + params      what happened; each app writes its own wording when it
 *                      shows them, so the website can follow the client's language
 *   device             the browser that made an admin change: the change doesn't
 *                      ring there, only on the team's other devices
 *
 * A notification never gets in the way of what caused it: failures are only logged.
 */

const COLLECTION = "Notification";
const KEEP_FOR_SECONDS = 180 * 24 * 60 * 60;

type Params = Record<string, string>;
type ForAdmin = { type: string; params: Params; orderId?: string | null };
type ForClient = { type: string; params: Params; owners: string[] };

let indexing: Promise<unknown> | null = null;

/** Same indexes as the website's notifications.js. Old notifications delete themselves. */
const ensureIndexes = () => {
  indexing ||= prisma
    .$runCommandRaw({
      createIndexes: COLLECTION,
      indexes: [
        { key: { audience: 1, _id: -1 }, name: "audience_recent" },
        { key: { owners: 1, _id: -1 }, name: "owners_recent" },
        { key: { createdAt: 1 }, name: "expire_old", expireAfterSeconds: KEEP_FOR_SECONDS },
      ],
    })
    .catch((e) => console.error("Notification indexes failed:", e?.message || e));
  return indexing;
};

const thisDevice = () => {
  try {
    return cookies().get(DEVICE_COOKIE)?.value || null;
  } catch {
    return null;
  }
};

/** What the routes call: whatever goes wrong in here stays in here. */
const safely =
  <A extends any[]>(notify: (...args: A) => Promise<void>) =>
  async (...args: A) => {
    try {
      await notify(...args);
    } catch (e: any) {
      console.error("Notification failed:", e?.message || e);
    }
  };

async function add(admin: ForAdmin[], client: ForClient[] = []) {
  if (!admin.length && !client.length) return;
  const now = { $date: new Date().toISOString() };
  const device = thisDevice();
  const documents = [
    ...admin.map((n) => ({ audience: "admin", actor: "admin", device, orderId: n.orderId || null, type: n.type, params: n.params })),
    ...client.filter((n) => n.owners.length).map((n) => ({ audience: "client", actor: "admin", owners: n.owners, type: n.type, params: n.params })),
  ].map((d) => ({ ...d, readAt: null, createdAt: now }));
  if (!documents.length) return;

  await ensureIndexes();
  await prisma.$runCommandRaw({ insert: COLLECTION, documents });
}

const ownerKeys = ({ userId, email, guestKey }: { userId?: string | null; email?: string | null; guestKey?: string | null }) =>
  [
    userId && `user:${userId}`,
    email && String(email).trim() && `email:${String(email).trim().toLowerCase()}`,
    guestKey && `guest:${guestKey}`,
  ].filter(Boolean) as string[];

const rawOne = async (collection: string, id: string | null | undefined, projection: Record<string, number>) => {
  if (!id) return null;
  const res: any = await prisma.$runCommandRaw({ find: collection, filter: { _id: { $oid: id } }, projection, limit: 1 });
  return res?.cursor?.firstBatch?.[0] || null;
};

/* -------------------------------------------------------- appointments */

/** Who sees an appointment's notifications on the website. */
export async function appointmentOwners(order: any) {
  const booking = await rawOne("Booking", order.bookingId, { guestKey: 1 }).catch(() => null);
  return ownerKeys({ userId: order.userId, email: order.email, guestKey: booking?.guestKey });
}

const place = (o: any): Params => ({
  reference: o.reference || "",
  date: o.date || "",
  hour: o.hour || "",
  city: o.city || "",
  country: o.country || "",
});

const details = (o: any): Params => ({
  ...place(o),
  name: o.name || "",
  phone: o.phone || "",
  serviceType: o.serviceType || "",
  services: (Array.isArray(o.cart) ? o.cart : []).map((c: any) => c?.title).filter(Boolean).join(", "),
  total: String(o.total ?? ""),
});

/** An appointment added from the calendar. */
export const notifyAppointmentCreated = safely(async (order: any) => {
  const owners = await appointmentOwners(order);
  await add(
    [{ type: "booking.created", orderId: order.id, params: details(order) }],
    [{ type: "booking.created", owners, params: place(order) }]
  );
});

const sameServices = (a: any, b: any) => {
  const lines = (cart: any) => JSON.stringify(cleanCart(cart).map((c) => [c.title, c.price, c.qty]));
  return lines(a) === lines(b);
};

/**
 * An appointment edited from the calendar. The drawer sends every field on each
 * save, so the two versions are compared to find what really changed. The
 * client only hears about what matters to them: not a note or a team member,
 * and not a correction made after the appointment has gone by.
 */
export const notifyAppointmentChanged = safely(async (before: any, after: any) => {
  const was = before.status || "pending";
  const is = after.status || "pending";
  const moved = ["date", "hour", "country", "city"].some((k) => before[k] !== after[k]);
  const priceOrServices =
    !sameServices(before.cart, after.cart) ||
    Number(before.total) !== Number(after.total) ||
    (before.serviceType || "") !== (after.serviceType || "");
  const otherFields = ["name", "phone", "email", "notes", "staff"].some((k) => (before[k] || "") !== (after[k] || ""));
  const paidNow = !before.paid && !!after.paid;
  const isUpcoming = String(after.date) >= new Date().toISOString().slice(0, 10);

  const admin: ForAdmin[] = [];
  const client: string[] = [];
  const both = (type: string, extra: Params = {}) => {
    admin.push({ type, orderId: after.id, params: { ...details(after), ...extra } });
    client.push(type);
  };

  if (is === "cancelled") {
    if (was !== "cancelled") both("booking.cancelled");
    else if (moved || priceOrServices || otherFields) admin.push({ type: "booking.updated", orderId: after.id, params: details(after) });
  } else {
    if (moved) both("booking.moved", { fromDate: before.date || "", fromHour: before.hour || "" });
    if (was !== is) {
      admin.push({ type: "booking.status", orderId: after.id, params: { ...details(after), status: is } });
      if (is === "confirmed") client.push("booking.confirmed");
      else if (is === "completed") client.push("booking.completed");
      else if (was === "cancelled") client.push("booking.updated");
    }
    if (paidNow) both("booking.paid");
    if (!admin.length && (priceOrServices || otherFields)) {
      admin.push({ type: "booking.updated", orderId: after.id, params: details(after) });
      if (priceOrServices && isUpcoming) client.push("booking.updated");
    }
  }

  const owners = client.length ? await appointmentOwners(after) : [];
  await add(admin, client.map((type) => ({ type, owners, params: place(after) })));
});

/** An appointment deleted from the calendar; `owners` was read before it went. */
export const notifyAppointmentDeleted = safely(async (order: any, owners: string[]) => {
  const liveAndAhead = order.status !== "cancelled" && String(order.date) >= new Date().toISOString().slice(0, 10);
  await add(
    [{ type: "booking.deleted", orderId: null, params: details(order) }],
    liveAndAhead ? [{ type: "booking.cancelled", owners, params: place(order) }] : []
  );
});

/* --------------------------------------------------------- shop orders */

/** The shop's Order1 keeps the customer's form in cartItems (or userInfo, on old orders). */
const customerOf = (o: any) =>
  (o.cartItems && !Array.isArray(o.cartItems) ? o.cartItems : o.userInfo && !Array.isArray(o.userInfo) ? o.userInfo : {}) as any;

/** A shop order marked paid, fulfilled (or not any more) or deleted. */
export const notifyShopOrderChanged = safely(async (before: any, after: any) => {
  const customer = customerOf(after);
  const params: Params = {
    oid: String(after.oid ?? ""),
    total: String(after.total ?? ""),
    name: [customer.fname, customer.lname].filter(Boolean).join(" "),
  };

  const admin: ForAdmin[] = [];
  const client: string[] = [];
  const event = (type: string, clientType?: string) => {
    admin.push({ type, orderId: after.id, params });
    if (clientType) client.push(clientType);
  };
  if (!before.delete && after.delete) event("order.deleted", "order.cancelled");
  if (!before.paid && after.paid) event("order.paid", "order.paid");
  if (!before.fulfillment && after.fulfillment) event("order.fulfilled", "order.fulfilled");
  if (before.fulfillment && !after.fulfillment) event("order.unfulfilled");
  if (!admin.length) return;

  let owners: string[] = [];
  if (client.length) {
    const raw = await rawOne("Order1", after.id, { userId: 1, userEmail: 1, guestKey: 1 }).catch(() => null);
    owners = ownerKeys({ userId: raw?.userId, email: raw?.userEmail || customer.email, guestKey: raw?.guestKey });
  }
  const forClient = { oid: params.oid, total: params.total };
  await add(admin, client.map((type) => ({ type, owners, params: forClient })));
});
