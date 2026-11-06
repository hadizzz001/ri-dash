import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verify } from "jsonwebtoken";
import prisma from "../../../prisma";
import { COOKIE_NAME, DEVICE_COOKIE } from "../../constants";

export const dynamic = "force-dynamic";

const COLLECTION = "Notification";
const isId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{24}$/i.test(v);

/** Notifications name clients and their phones: signed-in dashboard users only. */
const signedIn = () => {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    verify(token, process.env.JWT_SECRET || "");
    return true;
  } catch {
    return false;
  }
};

const notSignedIn = () => NextResponse.json({ error: "Please sign in" }, { status: 401 });

const dateOf = (v: any) => {
  const d = v?.$date ?? v;
  const n = typeof d === "object" && d?.$numberLong ? Number(d.$numberLong) : d;
  return new Date(n).toISOString();
};

const idOf = (d: any) => d._id?.$oid || String(d._id);

const shape = (d: any, device: string | null) => {
  const mine = !!device && d.device === device;
  return {
    id: idOf(d),
    type: d.type,
    actor: d.actor,
    params: d.params || {},
    orderId: d.orderId || null,
    createdAt: dateOf(d.createdAt),
    read: mine || !!d.readAt,
    mine,
  };
};

/**
 * Appointments clients booked that nobody has opened yet: the dashboard keeps
 * ringing for these. They are looked up on their own, as they may be far down
 * the list. Not the ones that no longer need anyone: their day has gone by, or
 * the appointment was cancelled or deleted in the meantime.
 */
const ringingNow = async (device: string | null) => {
  const res: any = await prisma.$runCommandRaw({
    find: COLLECTION,
    filter: {
      audience: "admin",
      actor: "client",
      readAt: null,
      type: { $in: ["booking.created", "booking.short_notice"] },
      "params.date": { $gte: new Date().toISOString().slice(0, 10) },
    },
    sort: { _id: -1 },
    limit: 30,
  });
  const docs: any[] = (res?.cursor?.firstBatch || []).filter((d: any) => isId(d.orderId));
  if (!docs.length) return [];

  const orders: any = await prisma.$runCommandRaw({
    find: "Order",
    filter: { _id: { $in: docs.map((d) => ({ $oid: d.orderId })) }, status: { $ne: "cancelled" } },
    projection: { _id: 1 },
    limit: docs.length,
  });
  const standing = new Set((orders?.cursor?.firstBatch || []).map(idOf));
  return docs.filter((d) => standing.has(d.orderId)).map((d) => shape(d, device));
};

/**
 * The bell on the dashboard, newest first.
 *   GET /api/notifications?limit=20&before=<id of the last one shown>
 * What an admin did on this device shows up as already read: it only rings on
 * the team's other devices.
 */
export async function GET(req: Request) {
  if (!signedIn()) return notSignedIn();
  try {
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
    const before = url.searchParams.get("before");
    const device = cookies().get(DEVICE_COOKIE)?.value || null;

    const [list, count, ringing]: any[] = await Promise.all([
      prisma.$runCommandRaw({
        find: COLLECTION,
        filter: { audience: "admin", ...(isId(before) ? { _id: { $lt: { $oid: before } } } : {}) },
        sort: { _id: -1 },
        limit: limit + 1,
      }),
      prisma.$runCommandRaw({
        count: COLLECTION,
        query: { audience: "admin", readAt: null, ...(device ? { device: { $ne: device } } : {}) },
      }),
      before ? [] : ringingNow(device),
    ]);

    const docs: any[] = list?.cursor?.firstBatch || [];
    return NextResponse.json({
      items: docs.slice(0, limit).map((d) => shape(d, device)),
      ringing,
      unread: Number(count?.n) || 0,
      hasMore: docs.length > limit,
    });
  } catch (e) {
    console.error("Notifications read failed:", e);
    return NextResponse.json({ error: "Could not load notifications" }, { status: 500 });
  }
}

/** Marks as read: { ids: [...] } those, { all: true } every one. */
export async function PATCH(req: Request) {
  if (!signedIn()) return notSignedIn();
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter(isId) : [];
    if (!body?.all && !ids.length) return NextResponse.json({ error: "Nothing to mark" }, { status: 400 });

    await prisma.$runCommandRaw({
      update: COLLECTION,
      updates: [
        {
          q: {
            audience: "admin",
            readAt: null,
            ...(body?.all ? {} : { _id: { $in: ids.map((id) => ({ $oid: id })) } }),
          },
          u: { $set: { readAt: { $date: new Date().toISOString() } } },
          multi: true,
        },
      ],
    } as any);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Notifications update failed:", e);
    return NextResponse.json({ error: "Could not update notifications" }, { status: 500 });
  }
}
