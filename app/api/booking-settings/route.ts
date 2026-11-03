import { NextResponse } from "next/server";
import prisma from "../../../prisma";
import { normalizeSettings } from "../../utils/bookingSchedule";

export const dynamic = "force-dynamic";

/**
 * The online booking schedule (countries, weekly days & hours, specific
 * dates). One document in the BookingSettings collection, read by the
 * website; absent = the defaults (every day open 08:00–24:00, Lebanon / KSA / Kuwait).
 */
async function readRaw() {
  const res: any = await prisma.$runCommandRaw({ find: "BookingSettings", filter: {}, limit: 1 });
  return res?.cursor?.firstBatch?.[0] || null;
}

export async function GET() {
  try {
    return NextResponse.json(normalizeSettings(await readRaw()));
  } catch (e) {
    console.error("Booking settings read failed:", e);
    return NextResponse.json({ error: "Could not load the booking schedule" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const settings = normalizeSettings(body);
    for (const d of [...settings.weekly, ...settings.overrides]) {
      if (("closed" in d ? !d.closed : d.open) && d.from >= d.until) {
        return NextResponse.json({ error: "Each open day needs its closing time after its opening time." }, { status: 400 });
      }
    }
    // A country's own calendar: every date needs its closing time after its opening time
    for (const c of settings.countries) {
      const bad = c.mode === "dates" && c.dates.find((d) => d.from >= d.until);
      if (bad) {
        return NextResponse.json(
          { error: `${c.name}, ${bad.date}: the closing time must be after the opening time.` },
          { status: 400 }
        );
      }
    }
    await prisma.$runCommandRaw({
      update: "BookingSettings",
      updates: [{ q: {}, u: { $set: { ...settings, updatedAt: { $date: new Date().toISOString() } } }, upsert: true }],
    } as any);
    return NextResponse.json(settings);
  } catch (e) {
    console.error("Booking settings save failed:", e);
    return NextResponse.json({ error: "Could not save the booking schedule" }, { status: 500 });
  }
}
