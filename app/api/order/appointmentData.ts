import prisma from "../../../prisma";
import {
  SERVICE_TYPES,
  STAFF,
  STATUSES,
  cleanCart,
  computeTotals,
  discountPercentOf,
  isDate,
  isHour,
} from "../../utils/appointments";

/**
 * Turns an edit / create request from the calendar into the Order fields
 * (amounts as strings, as the Order model stores them) and the matching
 * fields of the website's Booking document (amounts as numbers).
 *
 * Only the keys present in `body` are changed; the cart, the place or the
 * service type re-price the booking with the same rules as the website.
 */
export function buildUpdate(body: any, current: any = {}) {
  const errors: string[] = [];
  const order: Record<string, any> = {};
  const str = (k: string) => {
    if (k in body) order[k] = String(body[k] ?? "").trim();
  };
  ["name", "phone", "email", "country", "city", "date", "hour", "notes"].forEach(str);

  if ("serviceType" in body) {
    if (body.serviceType && !SERVICE_TYPES.some((s) => s.id === body.serviceType))
      errors.push("Unknown service type");
    else order.serviceType = body.serviceType || null;
  }
  if ("staff" in body) {
    if (body.staff && !STAFF.some((s) => s.id === body.staff)) errors.push("Unknown team member");
    else order.staff = body.staff || null;
  }
  if ("status" in body) {
    if (!STATUSES.some((s) => s.id === body.status)) errors.push("Unknown status");
    else {
      order.status = body.status;
      if (body.status === "cancelled" && current.status !== "cancelled") {
        order.cancelledAt = new Date();
        order.cancelledBy = "salon";
      } else if (body.status !== "cancelled") {
        order.cancelledAt = null;
        order.cancelledBy = null;
      }
    }
  }
  if ("paid" in body) order.paid = !!body.paid;

  if ("name" in order && !order.name) errors.push("Client name is required");
  if ("date" in order && !isDate(order.date)) errors.push("Invalid date");
  if ("hour" in order && !isHour(order.hour)) errors.push("Invalid time");
  if ("email" in order && order.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email))
    errors.push("Invalid email");

  // Re-price when anything that changes the amount was sent
  const reprice = ["cart", "country", "city", "serviceType", "taxPercent", "discountPercent"].some((k) => k in body);
  let totals: ReturnType<typeof computeTotals> | null = null;
  if (reprice) {
    const cart = "cart" in body ? cleanCart(body.cart) : cleanCart(current.cart);
    if (cart.length === 0) errors.push("Add at least one service");
    const pick = (k: string) => (k in order ? order[k] : current[k]) || "";
    totals = computeTotals(cart, {
      country: pick("country"),
      city: pick("city"),
      serviceType: pick("serviceType"),
      taxPercent: "taxPercent" in body ? Number(body.taxPercent) : Number(current.taxPercent) || 0,
      discountPercent:
        "discountPercent" in body ? Number(body.discountPercent) || 0 : discountPercentOf(current),
    });
    order.discountPercent = String(totals.discountPercent);
    order.discount = String(totals.discount);
    order.cart = cart;
    order.subtotal = String(totals.subtotal);
    order.homeFee = String(totals.homeFee);
    order.taxPercent = String(totals.taxPercent);
    order.tax = String(totals.tax);
    order.total = String(totals.total);
  }

  // The website's Booking keeps numbers and a Date for cancelledAt
  const booking: Record<string, any> = {};
  Object.entries(order).forEach(([k, v]) => {
    if (["subtotal", "homeFee", "discount", "discountPercent", "taxPercent", "tax", "total"].includes(k)) booking[k] = Number(v);
    else if (k === "cancelledAt") booking[k] = v ? { $date: (v as Date).toISOString() } : null;
    else booking[k] = v;
  });
  if (totals) booking.deposit = totals.deposit;
  // A new day or time: the reminder emails go out again for it
  if (("date" in order && order.date !== current.date) || ("hour" in order && order.hour !== current.hour))
    booking.remindersSent = [];
  booking.updatedAt = { $date: new Date().toISOString() };

  return { errors, order, booking };
}

/**
 * Another live booking at the same day and time (the website gives each
 * time once in total, whatever the city), or null.
 */
export async function findClash(
  { id, date, hour }: { id?: string; country?: string; city?: string; date: string; hour: string }
) {
  const same = await prisma.order.findMany({ where: { date, hour } });
  return same.find((o) => o.id !== id && o.status !== "cancelled") || null;
}

/** Applies `$set` to the website's Booking document (no-op without an id). */
export async function syncBooking(bookingId: string | null | undefined, set: Record<string, any>) {
  if (!bookingId || !Object.keys(set).length) return;
  await prisma.$runCommandRaw({
    update: "Booking",
    updates: [{ q: { _id: { $oid: bookingId } }, u: { $set: set } }],
  });
}
