import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Items added from the dashboard have ObjectIds, but the seeded service menu
// (my-app/scripts/seed-services.js) uses readable ids such as
// "featured--curly-hair-style", which Prisma rejects as malformed ObjectIds.
// Those items are changed with raw commands that match the id as stored.
const isObjectId = (id) => /^[0-9a-f]{24}$/i.test(id);

const notFound = () =>
  new Response(JSON.stringify({ error: 'Product not found' }), { status: 404 });

// Update Product API
export async function PATCH(request, { params }) {
  const { id } = params;
  const {
    title, 
    price,
cat
     
  } = await request.json();
 
  

  try {
    if (!isObjectId(id)) {
      // Same rule Prisma applies to the model: all three are text
      if (![title, price, cat].every((v) => typeof v === 'string')) {
        return new Response(
          JSON.stringify({ error: 'Title, price and category are required' }),
          { status: 400 }
        );
      }
      const { n } = await prisma.$runCommandRaw({
        update: 'Product',
        updates: [{ q: { _id: id }, u: { $set: { title, price, cat } } }],
      });
      if (!n) return notFound();
      return new Response(JSON.stringify({ id, title, price, cat }), { status: 200 });
    }

    // Update product and its specifications
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        title, 
        price,
cat
         
      },
    });

    return new Response(JSON.stringify(updatedProduct), { status: 200 });
  } catch (error) {
    console.error('Error updating product:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update product' }),
      { status: 500 }
    );
  }
}

// Delete Product API
export async function DELETE(request, { params }) {
  const { id } = params;

  try {
    if (!isObjectId(id)) {
      const { n } = await prisma.$runCommandRaw({
        delete: 'Product',
        deletes: [{ q: { _id: id }, limit: 1 }],
      });
      if (!n) return notFound();
      return new Response(
        JSON.stringify({ message: 'Product deleted successfully' }),
        { status: 200 }
      );
    }

    // Delete the product
    await prisma.product.delete({
      where: { id },
    });

    return new Response(
      JSON.stringify({ message: 'Product deleted successfully' }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting product:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete product' }),
      { status: 500 }
    );
  }
}

