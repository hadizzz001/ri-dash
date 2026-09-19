import prisma from '../../../prisma';

// GET → all reviews (newest first) with product titles
export async function GET() {
  try {
    const reviews = await prisma.review.findMany({ orderBy: { createdAt: 'desc' } });
    const ids = [...new Set(reviews.map((r) => r.productId))];
    const products = ids.length
      ? await prisma.product1.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, img: true } })
      : [];
    const map = new Map(products.map((p) => [p.id, p]));
    const rows = reviews.map((r) => ({
      ...r,
      productTitle: map.get(r.productId)?.title || '(deleted product)',
      productImg: map.get(r.productId)?.img?.[0] || null,
    }));
    return new Response(JSON.stringify(rows), { status: 200 });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch reviews' }), { status: 500 });
  }
}

// PATCH ?id=… { approved } → show / hide a review on the storefront
export async function PATCH(req) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
    const { approved } = await req.json();
    const updated = await prisma.review.update({ where: { id }, data: { approved: !!approved } });
    return new Response(JSON.stringify(updated), { status: 200 });
  } catch (error) {
    console.error('Error updating review:', error);
    return new Response(JSON.stringify({ error: 'Failed to update review' }), { status: 500 });
  }
}

// DELETE ?id=…
export async function DELETE(req) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
    await prisma.review.delete({ where: { id } });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (error) {
    console.error('Error deleting review:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete review' }), { status: 500 });
  }
}
