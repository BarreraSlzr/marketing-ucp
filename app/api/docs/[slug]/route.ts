import { NextResponse } from "next/server";
import { getDocBySlug } from "@/lib/docs/docs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  const doc = getDocBySlug(slug);

  if (!doc) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  // Return raw markdown with proper content type for agents/MCP tools
  if (format === "raw") {
    return new NextResponse(doc.rawContent, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "X-Doc-Title": doc.title,
        "X-Doc-Slug": doc.slug,
      },
    });
  }

  // Return markdown file for download
  return new NextResponse(doc.rawContent, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
      "X-Doc-Title": doc.title,
      "X-Doc-Slug": doc.slug,
    },
  });
}
