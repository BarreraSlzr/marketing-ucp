import { NextResponse } from "next/server";
import { getAllDocs } from "@/lib/docs/docs";

export async function GET() {
  const docs = getAllDocs();

  return NextResponse.json({
    docs: docs.map((doc) => ({
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      url: `/docs/${doc.slug}`,
      apiUrl: `/api/docs/${doc.slug}`,
      rawUrl: `/api/docs/${doc.slug}?format=raw`,
    })),
    count: docs.length,
  });
}
