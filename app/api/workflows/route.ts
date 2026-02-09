import { listWorkflowDefinitions } from "@repo/workflows";
import type { WorkflowsResponse } from "@/lib/workflows";
import { NextResponse } from "next/server";

export async function GET() {
  const payload: WorkflowsResponse = {
    workflows: listWorkflowDefinitions(),
  };
  return NextResponse.json(payload);
}
