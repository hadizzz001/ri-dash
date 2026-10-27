import prisma from "../../../prisma";

export const dynamic = "force-dynamic";

/**
 * The website's services (collection "Product": title, cat, price, duration)
 * for the calendar's service picker. Read raw, because seeded services have
 * readable string ids that the Prisma model (ObjectId ids) can't load.
 */
export async function GET() {
  try {
    const res: any = await prisma.$runCommandRaw({
      find: "Product",
      filter: {},
      projection: { title: 1, cat: 1, price: 1, duration: 1 },
      limit: 2000,
    });
    const docs: any[] = res?.cursor?.firstBatch || [];
    const services = docs
      .map((d) => ({
        id: typeof d._id === "object" && d._id?.$oid ? d._id.$oid : String(d._id),
        title: String(d.title || ""),
        cat: String(d.cat || ""),
        price: Number(d.price) || 0,
        duration: Number(d.duration) || null,
      }))
      .filter((s) => s.title)
      .sort((a, b) => a.cat.localeCompare(b.cat) || a.title.localeCompare(b.title));

    return new Response(JSON.stringify(services), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching services:", error);
    return new Response(JSON.stringify([]), { status: 500 });
  }
}
