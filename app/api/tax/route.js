import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// The appointment tax lives in a single Tax document.
export async function GET() {
  try {
    const tax = await prisma.tax.findFirst();
    return new Response(JSON.stringify({ percent: tax?.percent ?? 0 }), { status: 200 });
  } catch (error) {
    console.error('Error fetching tax:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch tax' }), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { percent } = await req.json();
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return new Response(JSON.stringify({ error: 'Tax must be a percentage between 0 and 100' }), {
        status: 400,
      });
    }

    const existing = await prisma.tax.findFirst();
    const tax = existing
      ? await prisma.tax.update({ where: { id: existing.id }, data: { percent } })
      : await prisma.tax.create({ data: { percent } });

    return new Response(JSON.stringify({ message: 'Tax updated successfully', tax }), { status: 200 });
  } catch (error) {
    console.error('Error updating tax:', error);
    return new Response(JSON.stringify({ error: 'Failed to update tax' }), { status: 500 });
  }
}
