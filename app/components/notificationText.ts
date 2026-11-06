import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CreditCard,
  Package,
  PackageCheck,
  PackageX,
  PenLine,
  ShoppingBag,
  Star,
  Trash2,
} from "lucide-react";
import { STATUSES } from "../utils/appointments";

export type NotificationItem = {
  id: string;
  type: string;
  actor: "client" | "admin";
  params: Record<string, string>;
  orderId: string | null;
  createdAt: string;
  read: boolean;
  mine: boolean;
};

type Tone = "normal" | "urgent" | "danger" | "good";

const STATUS_TITLES: Record<string, string> = {
  pending: "Back to Booked",
  confirmed: "Appointment confirmed",
  arrived: "Client arrived",
  started: "Appointment started",
  completed: "Appointment completed",
  "no-show": "Client didn't show up",
};

const fmtDay = (iso?: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
};

/** How the bell shows a notification. */
export function describe(n: NotificationItem): {
  title: string;
  body: string;
  icon: any;
  tone: Tone;
  href: string;
} {
  const p = n.params || {};
  const who = p.name || "A client";
  const when = `${fmtDay(p.date)} at ${p.hour}`;
  const where = p.city ? ` in ${p.city}` : "";
  const byClient = n.actor === "client";
  const appointment = n.orderId ? `/reservation?open=${n.orderId}` : "/reservation";
  const order = n.orderId ? `/order1?id=${n.orderId}` : "/reservation1";

  switch (n.type) {
    case "booking.short_notice":
      return {
        title: "Short-notice appointment",
        body: `${who} booked ${when}${where}, less than 3 hours away. They were asked to continue on WhatsApp.`,
        icon: CalendarClock,
        tone: "urgent",
        href: appointment,
      };
    case "booking.created":
      return byClient
        ? {
            title: "New appointment",
            body: `${who} booked ${when}${where}${p.services ? `: ${p.services}` : ""}.`,
            icon: CalendarPlus,
            tone: "good",
            href: appointment,
          }
        : {
            title: "Appointment added",
            body: `${who} was booked for ${when}${where}.`,
            icon: CalendarPlus,
            tone: "normal",
            href: appointment,
          };
    case "booking.cancelled":
      return {
        title: byClient ? "Cancelled by the client" : "Appointment cancelled",
        body: byClient
          ? `${who} cancelled ${when}${where}. The time is free again.`
          : `${who}'s appointment on ${when}${where} was cancelled.`,
        icon: CalendarX,
        tone: "danger",
        href: appointment,
      };
    case "booking.moved":
      return {
        title: "Appointment moved",
        body: `${who}'s appointment is now ${when}${where}${p.fromDate ? ` (was ${fmtDay(p.fromDate)} at ${p.fromHour})` : ""}.`,
        icon: CalendarClock,
        tone: "normal",
        href: appointment,
      };
    case "booking.status": {
      const status = STATUSES.find((s) => s.id === p.status)?.name || p.status;
      return {
        title: STATUS_TITLES[p.status] || "Status changed",
        body: `${who}'s appointment on ${when} is now marked ${status}.`,
        icon: CalendarCheck,
        tone: "normal",
        href: appointment,
      };
    }
    case "booking.paid":
      return {
        title: "Appointment paid",
        body: `${who}'s appointment on ${when} was marked as paid${p.total ? ` ($${p.total})` : ""}.`,
        icon: CreditCard,
        tone: "good",
        href: appointment,
      };
    case "booking.updated":
      return {
        title: "Appointment updated",
        body: `${who}'s appointment on ${when} was edited.`,
        icon: PenLine,
        tone: "normal",
        href: appointment,
      };
    case "booking.deleted":
      return {
        title: "Appointment deleted",
        body: `${who}'s appointment on ${when}${where} was deleted.`,
        icon: Trash2,
        tone: "danger",
        href: "/reservation",
      };
    case "order.created":
      return {
        title: "New shop order",
        body: `${p.name || "A client"} placed order #${p.oid}${p.count ? `: ${p.count} item${p.count === "1" ? "" : "s"}` : ""}${p.total ? `, $${p.total}` : ""}.`,
        icon: ShoppingBag,
        tone: "good",
        href: order,
      };
    case "order.paid":
      return { title: "Order paid", body: `Order #${p.oid} was marked as paid.`, icon: CreditCard, tone: "good", href: order };
    case "order.fulfilled":
      return { title: "Order fulfilled", body: `Order #${p.oid} was marked as fulfilled.`, icon: PackageCheck, tone: "normal", href: order };
    case "order.unfulfilled":
      return { title: "Order not fulfilled", body: `Order #${p.oid} is no longer marked as fulfilled.`, icon: Package, tone: "normal", href: order };
    case "order.deleted":
      return { title: "Order deleted", body: `Order #${p.oid} was deleted.`, icon: PackageX, tone: "danger", href: "/reservation1" };
    case "review.created":
      return {
        title: "New product review",
        body: `${p.name || "A client"} rated ${p.product || "a product"} ${p.rating}/5.`,
        icon: Star,
        tone: "normal",
        href: "/reviews",
      };
    default:
      return { title: "Update", body: "", icon: PenLine, tone: "normal", href: "/reservation" };
  }
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday" or "Earlier": the list's headings. */
export function daySection(createdAt: string, now = new Date()) {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(createdAt))) / 86400000);
  return days <= 0 ? "Today" : days === 1 ? "Yesterday" : "Earlier";
}

/** "just now", "5 min ago", "3 h ago", then the date. */
export function timeAgo(createdAt: string, now = Date.now()) {
  const then = new Date(createdAt).getTime();
  const min = Math.max(0, Math.round((now - then) / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} h ago`;
  return new Date(then).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
