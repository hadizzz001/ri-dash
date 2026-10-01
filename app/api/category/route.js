import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const categories = await prisma.category1.findMany();
    return new Response(JSON.stringify(categories), { status: 200 });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch categories' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name, img } = await req.json(); 
    
    const category = await prisma.category1.create({ data: { name, img } });
    return new Response(JSON.stringify({ message: 'Category created successfully', category }), {
      status: 201,
    });
  } catch (error) {
    console.error('Error creating category:', error);
    return new Response(JSON.stringify({ error: 'Failed to create category' }), { status: 500 });
  }
}

export async function PATCH(req) {

  try {
    
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
 
    const { name, img } = await req.json(); 


    const previous = await prisma.category1.findUnique({ where: { id } });

    const updatedCategory = await prisma.category1.update({
      where: { id },
      data: { name, img },
    });

    // Items store the name as text, so carry a rename over to them —
    // otherwise their edit dropdown no longer finds a matching option.
    if (previous && name && previous.name !== name) {
      await prisma.product1.updateMany({
        where: { category: previous.name },
        data: { category: name },
      });
    }
    return new Response(JSON.stringify({ message: 'Category updated successfully', updatedCategory }), {
      status: 200,
    });
  } catch (error) {
    console.error('Error updating category:', error);
    return new Response(JSON.stringify({ error: 'Failed to update category' }), { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });

    const deletedCategory = await prisma.category1.delete({ where: { id } });
    return new Response(JSON.stringify({ message: 'Category deleted successfully', deletedCategory }), {
      status: 200,
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete category' }), { status: 500 });
  }
}
