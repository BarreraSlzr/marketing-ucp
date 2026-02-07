// LEGEND: Example server action with tracing
// Shows how to instrument a Next.js Server Action
// All usage must comply with this LEGEND and the LICENSE

"use server";

import { traceServerAction, traceDataFetch } from "@repo/tracing";

/**
 * Example: Trace a server action
 *
 * This wraps the server action logic in a span,
 * including nested data fetching operations.
 */
export async function exampleServerAction(formData: FormData) {
  return traceServerAction("exampleServerAction", async () => {
    // Extract form data
    const email = formData.get("email") as string;

    // Trace nested data fetch
    const user = await traceDataFetch("fetchUserByEmail", async () => {
      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, 50));
      return { email, id: "user123" };
    });

    // Process the action
    await traceDataFetch("processUser", async () => {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 30));
    });

    return {
      success: true,
      userId: user.id,
    };
  });
}
