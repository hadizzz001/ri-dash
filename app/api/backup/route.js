import { NextResponse } from "next/server";
import JSZip from "jszip";
import prisma from "../../libs/prismadb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const models = [
      "product",
      "cat",
      "service",
      "new",
      "extension",
      "appointment",
      "order",
      "video",
      "new1",
      "product1",
      "category1",
      "sub1",
      "factory1",
      "offer",
      "order1",
    ];

    const zip = new JSZip();

    for (const model of models) {
      try {
        const data = await prisma[model].findMany();
        zip.file(`${model}.json`, JSON.stringify(data, null, 2));
      } catch (err) {
        zip.file(
          `${model}.error.txt`,
          `Failed to export ${model}: ${err?.message || err}`
        );
      }
    }

    const content = await zip.generateAsync({ type: "nodebuffer" });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="backup-${ts}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: "Failed to generate backup" },
      { status: 500 }
    );
  }
}
