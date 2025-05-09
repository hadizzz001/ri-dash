import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req) {
  try {
    const categories = await prisma.appointment.findMany();
    return new Response(JSON.stringify(categories), { status: 200 });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch categories' }), { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { info } = await req.json(); 
    
    const category = await prisma.appointment.create({ data: { info } });
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
 
    const { info } = await req.json(); 


    const updatedCategory = await prisma.appointment.update({
      where: { id },
      data: { info },
    });
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
    const dateIndex = url.searchParams.get('dateIndex');

    if (!id) {
      return new Response(JSON.stringify({ error: 'ID is required' }), { status: 400 });
    }

    // Fetch appointment
    const appointment = await prisma.appointment.findUnique({ where: { id } });

    if (!appointment) {
      return new Response(JSON.stringify({ error: 'Appointment not found' }), { status: 404 });
    }

    // Parse JSON info (assuming info is stored as JSON with a "dates" array)
    const info = appointment.info;

    if (dateIndex !== null) {
      const index = parseInt(dateIndex, 10);
      if (!Array.isArray(info.dates) || index >= info.dates.length) {
        return new Response(JSON.stringify({ error: 'Invalid date index' }), { status: 400 });
      }

      // Remove specific date
      const updatedDates = info.dates.filter((_, i) => i !== index);

      if (updatedDates.length === 0) {
        // No dates left, delete the whole appointment
        await prisma.appointment.delete({ where: { id } });
      } else {
        // Update appointment with new dates
        await prisma.appointment.update({
          where: { id },
          data: {
            info: {
              ...info,
              dates: updatedDates,
            },
          },
        });
      }

      return new Response(JSON.stringify({ message: 'Date entry deleted successfully' }), { status: 200 });
    } else {
      // No dateIndex passed, delete entire appointment
      await prisma.appointment.delete({ where: { id } });
      return new Response(JSON.stringify({ message: 'Appointment deleted successfully' }), { status: 200 });
    }
  } catch (error) {
    console.error('Error deleting appointment:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete appointment' }), { status: 500 });
  }
}

