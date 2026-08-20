import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const ads = await prisma.ad.findMany();
    return new Response(JSON.stringify(ads), { status: 200 });
  } catch (error) {
    console.error('Error fetching ads:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch ads' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { url, img } = await req.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'Redirect URL is required' }), { status: 400 });
    }
    if (!img || img.length === 0) {
      return new Response(JSON.stringify({ error: 'Image is required' }), { status: 400 });
    }

    const ad = await prisma.ad.create({ data: { url, img } });
    return new Response(JSON.stringify({ message: 'Ad created successfully', ad }), { status: 201 });
  } catch (error) {
    console.error('Error creating ad:', error);
    return new Response(JSON.stringify({ error: 'Failed to create ad' }), { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const id = searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });

    const { url, img } = await req.json();

    const updatedAd = await prisma.ad.update({
      where: { id },
      data: { url, img },
    });

    return new Response(JSON.stringify({ message: 'Ad updated successfully', updatedAd }), { status: 200 });
  } catch (error) {
    console.error('Error updating ad:', error);
    return new Response(JSON.stringify({ error: 'Failed to update ad' }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const id = searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });

    const deletedAd = await prisma.ad.delete({ where: { id } });
    return new Response(JSON.stringify({ message: 'Ad deleted successfully', deletedAd }), { status: 200 });
  } catch (error) {
    console.error('Error deleting ad:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete ad' }), { status: 500 });
  }
}
