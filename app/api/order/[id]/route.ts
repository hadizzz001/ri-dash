import prisma from "../../../../prisma";
import { buildUpdate, findClash, syncBooking } from "../appointmentData";
import { resetHourReminder, scheduleHourReminders } from "../hourReminder";
import { appointmentOwners, notifyAppointmentChanged, notifyAppointmentDeleted } from "../../notifications/notify";

export const dynamic = "force-dynamic";

const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const order = await prisma.order.findUnique({ where: { id: params.id } });
    if (!order) return json({ message: "Appointment not found" }, 404);
    return json(order);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    return json({ error: "Internal Server Error" }, 500);
  }
}

/**
 * Edit an appointment. Any of: name, phone, email, country, city, date, hour,
 * serviceType, staff, notes, status, paid, cart, taxPercent.
 * An empty body marks it as paid (what the old "Mark as paid" button sent).
 * A time already taken at the same place answers 409 unless `force` is set.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    if (!body || !Object.keys(body).length) body = { paid: true };

    const current = await prisma.order.findUnique({ where: { id } });
    if (!current) return json({ error: "Appointment not found" }, 404);

    const { errors, order, booking } = buildUpdate(body, current);
    if (errors.length) return json({ error: errors.join(". ") }, 400);

    const next = { ...current, ...order } as any;
    const moved = ["date", "hour", "country", "city", "status"].some(
      (k) => k in order && order[k] !== (current as any)[k]
    );
    if (moved && next.status !== "cancelled" && !body.force) {
      const clash = await findClash({ id, country: next.country, city: next.city, date: next.date, hour: next.hour });
      if (clash)
        return json(
          {
            error: `${clash.name} is already booked in ${next.city} on ${next.date} at ${next.hour}.`,
            clash: { id: clash.id, name: clash.name },
          },
          409
        );
    }

    const updated = await prisma.order.update({ where: { id }, data: order });
    await syncBooking(current.bookingId, booking).catch((e) =>
      console.error("Booking sync failed:", e?.message || e)
    );

    // Anything but a payment change: the scheduled "in 1 hour" emails are
    // replaced with ones carrying the new details (none once cancelled)
    if (Object.keys(order).some((k) => k !== "paid")) {
      await resetHourReminder(current.bookingId);
      await scheduleHourReminders();
    }

    await notifyAppointmentChanged(current, updated);
    return json(updated);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return json({ error: "Internal Server Error" }, 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return json({ error: "Order not found" }, 404);

    // Read now: the Booking that may hold them is about to go
    const owners = await appointmentOwners(order);

    // Its scheduled "in 1 hour" emails must not go out
    await resetHourReminder(order.bookingId);

    // The website reads taken times from the Booking behind this order, so
    // delete both together: that frees the appointment's date and hour.
    await prisma.$transaction([
      prisma.order.delete({ where: { id } }),
      ...(order.bookingId ? [prisma.booking.deleteMany({ where: { id: order.bookingId } })] : []),
    ]);

    await notifyAppointmentDeleted(order, owners);
    return json({ message: "Appointment deleted" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return json({ error: "Internal Server Error" }, 500);
  }
}
