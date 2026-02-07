// LEGEND: Flame chart visualization component for performance traces
// Displays hierarchical span data in a flame chart format
// All usage must comply with this LEGEND and the LICENSE

"use client";

import { useEffect, useRef, useState } from "react";
import type { Span } from "@repo/tracing";
import { durationMs, isComplete } from "@repo/tracing";
import styles from "./flame-chart.module.css";

interface FlameChartProps {
  spans: Span[];
  height?: number;
  width?: number;
  className?: string;
}

interface FlameChartNode {
  span: Span;
  children: FlameChartNode[];
  depth: number;
  startTimeMs: number;
  durationMs: number;
}

export function FlameChart({ spans, height = 600, width, className }: FlameChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredSpan, setHoveredSpan] = useState<Span | null>(null);
  const [selectedSpan, setSelectedSpan] = useState<Span | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Get actual canvas dimensions
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Build flame chart tree
    const tree = buildFlameChartTree(spans);

    // Draw flame chart
    drawFlameChart(ctx, tree, rect.width, rect.height);
  }, [spans]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find span at mouse position
    const tree = buildFlameChartTree(spans);
    const span = findSpanAtPosition(tree, x, y, rect.width, rect.height);
    setHoveredSpan(span);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const tree = buildFlameChartTree(spans);
    const span = findSpanAtPosition(tree, x, y, rect.width, rect.height);
    setSelectedSpan(span);
  };

  return (
    <div className={`${styles.container} ${className ?? ""}`}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ width: width ?? "100%", height }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
      {hoveredSpan && (
        <div className={styles.tooltip}>
          <div className={styles["tooltip-name"]}>{hoveredSpan.name}</div>
          <div className={styles["tooltip-duration"]}>
            {durationMs(hoveredSpan)?.toFixed(2) ?? "—"} ms
          </div>
          {hoveredSpan.attributes && (
            <div className={styles["tooltip-attributes"]}>
              {Object.entries(hoveredSpan.attributes).map(([key, value]) => (
                <div key={key}>
                  <span className={styles["tooltip-key"]}>{key}:</span>{" "}
                  <span className={styles["tooltip-value"]}>{String(value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedSpan && (
        <div className={styles["details-panel"]}>
          <h3>{selectedSpan.name}</h3>
          <div>Duration: {durationMs(selectedSpan)?.toFixed(2) ?? "—"} ms</div>
          <div>Span ID: {selectedSpan.spanId}</div>
          <div>Trace ID: {selectedSpan.traceId}</div>
          {selectedSpan.parentSpanId && (
            <div>Parent Span ID: {selectedSpan.parentSpanId}</div>
          )}
          <div>Kind: {selectedSpan.kind}</div>
          <div>Status: {selectedSpan.status.code}</div>
          {selectedSpan.attributes && (
            <div>
              <h4>Attributes</h4>
              <pre>{JSON.stringify(selectedSpan.attributes, null, 2)}</pre>
            </div>
          )}
          <button onClick={() => setSelectedSpan(null)}>Close</button>
        </div>
      )}
    </div>
  );
}

/** Build hierarchical tree from flat spans */
function buildFlameChartTree(spans: Span[]): FlameChartNode[] {
  // Filter to complete spans only
  const completeSpans = spans.filter(isComplete);
  if (completeSpans.length === 0) return [];

  // Build parent-child map
  const spanMap = new Map<string, Span>();
  const childrenMap = new Map<string, Span[]>();

  for (const span of completeSpans) {
    spanMap.set(span.spanId, span);

    if (span.parentSpanId) {
      const siblings = childrenMap.get(span.parentSpanId) ?? [];
      siblings.push(span);
      childrenMap.set(span.parentSpanId, siblings);
    }
  }

  // Find root spans (no parent)
  const rootSpans = completeSpans.filter(s => !s.parentSpanId);

  // Build tree recursively
  function buildNode(span: Span, depth: number): FlameChartNode {
    const children = childrenMap.get(span.spanId) ?? [];
    const childNodes = children.map(child => buildNode(child, depth + 1));

    return {
      span,
      children: childNodes,
      depth,
      startTimeMs: span.startTime / 1000,
      durationMs: durationMs(span) ?? 0,
    };
  }

  return rootSpans.map(span => buildNode(span, 0));
}

/** Draw flame chart on canvas */
function drawFlameChart(
  ctx: CanvasRenderingContext2D,
  tree: FlameChartNode[],
  width: number,
  height: number
) {
  if (tree.length === 0) return;

  // Calculate time range
  let minTime = Infinity;
  let maxTime = -Infinity;

  function updateTimeRange(node: FlameChartNode) {
    minTime = Math.min(minTime, node.startTimeMs);
    maxTime = Math.max(maxTime, node.startTimeMs + node.durationMs);
    for (const child of node.children) {
      updateTimeRange(child);
    }
  }

  for (const root of tree) {
    updateTimeRange(root);
  }

  const timeRange = maxTime - minTime;

  // Row height
  const rowHeight = 20;
  const padding = 2;

  // Draw background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  // Draw spans
  function drawNode(node: FlameChartNode) {
    const x = ((node.startTimeMs - minTime) / timeRange) * width;
    const w = (node.durationMs / timeRange) * width;
    const y = node.depth * rowHeight;

    // Choose color based on span kind
    const color = getColorForSpan(node.span);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, rowHeight - padding);

    // Draw text if there's room
    if (w > 50) {
      ctx.fillStyle = "#000000";
      ctx.font = "11px sans-serif";
      ctx.fillText(
        node.span.name,
        x + 4,
        y + rowHeight / 2 + 4
      );
    }

    // Draw children
    for (const child of node.children) {
      drawNode(child);
    }
  }

  for (const root of tree) {
    drawNode(root);
  }
}

/** Find span at mouse position */
function findSpanAtPosition(
  tree: FlameChartNode[],
  x: number,
  y: number,
  width: number,
  height: number
): Span | null {
  if (tree.length === 0) return null;

  // Calculate time range
  let minTime = Infinity;
  let maxTime = -Infinity;

  function updateTimeRange(node: FlameChartNode) {
    minTime = Math.min(minTime, node.startTimeMs);
    maxTime = Math.max(maxTime, node.startTimeMs + node.durationMs);
    for (const child of node.children) {
      updateTimeRange(child);
    }
  }

  for (const root of tree) {
    updateTimeRange(root);
  }

  const timeRange = maxTime - minTime;
  const rowHeight = 20;

  function checkNode(node: FlameChartNode): Span | null {
    const nodeX = ((node.startTimeMs - minTime) / timeRange) * width;
    const nodeW = (node.durationMs / timeRange) * width;
    const nodeY = node.depth * rowHeight;

    if (x >= nodeX && x <= nodeX + nodeW && y >= nodeY && y <= nodeY + rowHeight) {
      return node.span;
    }

    // Check children
    for (const child of node.children) {
      const result = checkNode(child);
      if (result) return result;
    }

    return null;
  }

  for (const root of tree) {
    const result = checkNode(root);
    if (result) return result;
  }

  return null;
}

/** Get color for span based on kind and attributes */
function getColorForSpan(span: Span): string {
  switch (span.kind) {
    case "server":
      return "#4a90e2";
    case "client":
      return "#7ed321";
    case "internal":
      return "#f5a623";
    case "producer":
      return "#bd10e0";
    case "consumer":
      return "#9013fe";
    default:
      return "#9b9b9b";
  }
}
