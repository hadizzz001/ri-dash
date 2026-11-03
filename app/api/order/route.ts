import prisma from "../../../prisma";
import { NextResponse } from "next/server";
import { buildUpdate, findClash, timeZoneOfCountry } from "./appointmentData";
import { scheduleHourReminders } from "./hourReminder";
import { TOO_SOON_ERROR, bookingCutoff, isTooSoon, makeReference, newObjectId } from "../../utils/appointments";

export async function main() {
    try {
        await prisma.$connect();
    } catch (err) {
        return new Error("Database connect unsuccessful");
    }
}

export const GET = async (req: Request, res: NextResponse) => {
    try {
        console.time('start');
        await main();
        const posts = await prisma.order.findMany({
            orderBy: { id: 'desc' }
        });
        console.timeEnd('start');

        return new Response(JSON.stringify(posts), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err) {
        return NextResponse.json({ message: "Error", err }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
};

export const dynamic = "force-dynamic";

/**
 * New appointment from the dashboard calendar. Stored like a website booking:
 * a Booking document (which the website reads to hide taken times and send
 * reminders) plus the Order the dashboard lists.
 */
export const POST = async (req: Request) => {
    try {
        const body = await req.json();
        const required = ["name", "date", "hour", "country", "city", "cart"];
        const missing = required.filter((k) => !body?.[k] || (Array.isArray(body[k]) && !body[k].length));
        if (missing.length) {
            return NextResponse.json({ error: `Missing: ${missing.join(", ")}` }, { status: 400 });
        }

        const { errors, order, booking } = buildUpdate(
            { serviceType: "salon", status: "confirmed", phone: "", email: "", notes: "", ...body },
            {}
        );
        if (errors.length) return NextResponse.json({ error: errors.join(". ") }, { status: 400 });

        // `force` below only allows a double booking, never this
        if (isTooSoon(order.date, order.hour, bookingCutoff(await timeZoneOfCountry(order.country)))) {
            return NextResponse.json({ error: TOO_SOON_ERROR }, { status: 400 });
        }

        if (!body.force) {
            const clash = await findClash(order as any);
            if (clash) {
                return NextResponse.json(
                    { error: `${clash.name} is already booked in ${order.city} on ${order.date} at ${order.hour}.` },
                    { status: 409 }
                );
            }
        }

        const reference = makeReference();
        const bookingId = newObjectId();
        const lang = ["ar", "fr"].includes(body.lang) ? body.lang : "en";
        const now = new Date().toISOString();

        delete booking.updatedAt;
        await prisma.$runCommandRaw({
            insert: "Booking",
            documents: [
                {
                    ...booking,
                    _id: { $oid: bookingId },
                    reference,
                    lang,
                    paid: !!body.paid,
                    remindersSent: [],
                    source: "dashboard",
                    createdAt: { $date: now },
                },
            ],
        });

        const created = await prisma.order.create({
            data: {
                ...(order as any),
                reference,
                lang,
                paid: !!body.paid,
                bookingId,
            },
        });

        await scheduleHourReminders();
        return NextResponse.json(created, { status: 201 });
    } catch (err) {
        console.error("Error creating appointment:", err);
        return NextResponse.json({ error: "Could not create the appointment" }, { status: 500 });
    }
};

// DELETE all orders
export const DELETE = async (req: Request, res: NextResponse) => {
    try {
        await main();
        const deletedOrders = await prisma.order.deleteMany({});
        return NextResponse.json({ message: "All orders deleted", count: deletedOrders.count }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ message: "Error deleting orders", err }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
};
