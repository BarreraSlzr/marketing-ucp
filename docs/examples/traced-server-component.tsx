// LEGEND: Example server component with tracing
// Shows how to instrument a React Server Component
// All usage must comply with this LEGEND and the LICENSE

import { traceServerComponent } from "@repo/tracing";

/**
 * Example: Trace a server component render
 *
 * This wraps the entire component rendering in a span,
 * allowing you to see how long server-side rendering takes
 * in the flame chart.
 */
export default async function ExampleServerComponent() {
  return traceServerComponent("ExampleServerComponent", async () => {
    // Simulate data fetching
    const data = await fetchData();

    return (
      <div>
        <h1>Server Component Example</h1>
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    );
  });
}

async function fetchData() {
  // This would be a real API call
  await new Promise(resolve => setTimeout(resolve, 100));
  return { message: "Hello from server" };
}
