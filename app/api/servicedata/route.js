import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

// GET /api/servicedata            -> all rows
// GET /api/servicedata?serviceId= -> rows of one service
export async function GET(req) {
  try {
    const serviceId = new URL(req.url).searchParams.get('serviceId');
    const data = await prisma.serviceData.findMany({
      where: serviceId ? { serviceId } : undefined,
    });
    return json(data);
  } catch (error) {
    console.error('Error fetching service data:', error);
    return json({ error: 'Failed to fetch service data' }, 500);
  }
}

export async function POST(req) {
  try {
    const { serviceId, title, description, img } = await req.json();
    if (!serviceId) return json({ error: 'serviceId is required' }, 400);

    const created = await prisma.serviceData.create({
      data: { serviceId, title, description, img: img || [] },
    });
    return json({ message: 'Service data created successfully', created }, 201);
  } catch (error) {
    console.error('Error creating service data:', error);
    return json({ error: 'Failed to create service data' }, 500);
  }
}

export async function PATCH(req) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'ID is required' }, 400);

    const { serviceId, title, description, img } = await req.json();
    const updated = await prisma.serviceData.update({
      where: { id },
      data: { serviceId, title, description, img: img || [] },
    });
    return json({ message: 'Service data updated successfully', updated });
  } catch (error) {
    console.error('Error updating service data:', error);
    return json({ error: 'Failed to update service data' }, 500);
  }
}

export async function DELETE(req) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return json({ error: 'ID is required' }, 400);

    const deleted = await prisma.serviceData.delete({ where: { id } });
    return json({ message: 'Service data deleted successfully', deleted });
  } catch (error) {
    console.error('Error deleting service data:', error);
    return json({ error: 'Failed to delete service data' }, 500);
  }
}
