import prisma from "../../../prisma";
import { NextResponse } from "next/server";

export async function main() {
    try {
        await prisma.$connect();
    } catch (err) {
        return new Error("Database connect unsuccessful");
    }
}

export const GET = async (req: Request, res: NextResponse) => {
    try {
        console.time('start');
        await main();
        const posts = await prisma.order.findMany({
            orderBy: { id: 'desc' }
        });
        console.timeEnd('start');

        return new Response(JSON.stringify(posts), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err) {
        return NextResponse.json({ message: "Error", err }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
};

// DELETE all orders
export const DELETE = async (req: Request, res: NextResponse) => {
    try {
        await main();
        const deletedOrders = await prisma.order.deleteMany({});
        return NextResponse.json({ message: "All orders deleted", count: deletedOrders.count }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ message: "Error deleting orders", err }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
};
