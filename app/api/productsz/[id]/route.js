import { PrismaClient } from '@prisma/client';
import { normalizeBarcode, findBarcodeOwner, barcodeTakenResponse } from '../../../libs/barcode';

const prisma = new PrismaClient();

// Update Product API
export async function PATCH(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const {
    title,
    description,
    price,
    discount,
    img,
    category,
    stock,
    arrival,
    color,
    type,
    sub,
    factory,
    sale,
  } = body;

  console.log("imgs are: ", img);


  try {
    // Only touch the barcode when the client sent one (null / '' clears it).
    const hasBarcode = Object.prototype.hasOwnProperty.call(body, 'barcode');
    const barcode = normalizeBarcode(body.barcode);
    if (hasBarcode && barcode) {
      const owner = await findBarcodeOwner(prisma, barcode, id);
      if (owner) return barcodeTakenResponse(owner);
    }

    // Update product and its specifications
    // If no discount, show the price on the discount field
    const finalDiscount = discount || price;

    const updatedProduct = await prisma.product1.update({
      where: { id },
      data: {
        title,
        description,
        price,
        discount: finalDiscount,
        img,
        category,
        stock,
        arrival,
        color,
        type,
        sub,
        factory,
        sale,
        ...(hasBarcode && { barcode }),
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


    // Delete the product
    await prisma.product1.delete({
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

