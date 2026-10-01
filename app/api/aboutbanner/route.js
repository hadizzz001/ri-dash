import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// The About page banner lives in a single AboutBanner document.
export async function GET() {
  try {
    const banner = await prisma.aboutBanner.findFirst();
    return new Response(JSON.stringify({ img: banner?.img ?? null }), { status: 200 });
  } catch (error) {
    console.error('Error fetching about banner:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch about banner' }), { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { img } = await req.json();
    if (typeof img !== 'string' || !img.startsWith('https://')) {
      return new Response(JSON.stringify({ error: 'Please upload an image' }), { status: 400 });
    }

    const existing = await prisma.aboutBanner.findFirst();
    const banner = existing
      ? await prisma.aboutBanner.update({ where: { id: existing.id }, data: { img } })
      : await prisma.aboutBanner.create({ data: { img } });

    return new Response(JSON.stringify({ message: 'Banner saved successfully', banner }), { status: 200 });
  } catch (error) {
    console.error('Error saving about banner:', error);
    return new Response(JSON.stringify({ error: 'Failed to save about banner' }), { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.aboutBanner.deleteMany();
    return new Response(JSON.stringify({ message: 'Banner removed successfully' }), { status: 200 });
  } catch (error) {
    console.error('Error removing about banner:', error);
    return new Response(JSON.stringify({ error: 'Failed to remove about banner' }), { status: 500 });
  }
}
