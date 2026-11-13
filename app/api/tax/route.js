import { PrismaClient } from '@prisma/client';
import { MAX_OUTSIDE_FACTOR, outsideFactorOf } from '../../utils/appointments';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Appointment prices, kept in a single Tax document and read by the website
 * too (my-app/app/api/tax and /api/booking): the tax percentage and the
 * outside-Lebanon multiplier (4 until one is saved).
 */
export async function GET() {
  try {
    const tax = await prisma.tax.findFirst();
    return json({ percent: tax?.percent ?? 0, outsideFactor: outsideFactorOf(tax?.outsideFactor) });
  } catch (error) {
    console.error('Error fetching tax:', error);
    return json({ error: 'Failed to fetch tax' }, 500);
  }
}

/** Saves whichever of `percent` and `outsideFactor` is sent. */
export async function PUT(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Nothing to save' }, 400);

    const data = {};
    if ('percent' in body) {
      const { percent } = body;
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        return json({ error: 'Tax must be a percentage between 0 and 100' }, 400);
      }
      data.percent = percent;
    }
    if ('outsideFactor' in body) {
      const { outsideFactor } = body;
      if (!Number.isFinite(outsideFactor) || outsideFactor < 1 || outsideFactor > MAX_OUTSIDE_FACTOR) {
        return json({ error: `The price outside Lebanon must be between ×1 and ×${MAX_OUTSIDE_FACTOR}` }, 400);
      }
      data.outsideFactor = Math.round(outsideFactor * 100) / 100;
    }
    if (!Object.keys(data).length) return json({ error: 'Nothing to save' }, 400);

    const existing = await prisma.tax.findFirst();
    const tax = existing
      ? await prisma.tax.update({ where: { id: existing.id }, data })
      : await prisma.tax.create({ data: { percent: 0, ...data } });

    return json({
      message: 'Prices updated successfully',
      percent: tax.percent,
      outsideFactor: outsideFactorOf(tax.outsideFactor),
    });
  } catch (error) {
    console.error('Error updating tax:', error);
    return json({ error: 'Failed to update prices' }, 500);
  }
}
