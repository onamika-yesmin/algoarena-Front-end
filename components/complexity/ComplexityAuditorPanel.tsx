"use client";

import { useState } from "react";
import { runComplexityAudit } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";
import type { ComplexityReport, ScalingDataPoint } from "@/types/api";

const CONFIDENCE_LABEL: Record<ComplexityReport["confidence"], string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

// A single-series line+dot chart in a fixed viewBox, scaled to the data's
// own min/max — no chart library, matching the rest of the codebase's
// hand-rolled visuals (see app/analytics's ActivityStrip/BarList). One
// axis, one hue per chart — time and memory are drawn as two separate
// charts rather than sharing a dual y-axis.
function ScalingChart({
  title,
  points,
  color,
  format,
}: {
  title: string;
  points: { size: number; value: number }[];
  color: string;
  format: (value: number) => string;
}) {
  const width = 280;
  const height = 110;
  const padding = 10;

  if (points.length < 2) {
    return (
      <div className="complexity-chart">
        <p className="complexity-chart-title">{title}</p>
        <p className="complexity-chart-empty">Not enough differently-sized test cases to chart this.</p>
      </div>
    );
  }

  const sorted = [...points].sort((a, b) => a.size - b.size);
  const minSize = sorted[0].size;
  const maxSize = sorted[sorted.length - 1].size;
  const minValue = Math.min(...sorted.map((p) => p.value));
  const maxValue = Math.max(...sorted.map((p) => p.value));
  const sizeRange = maxSize - minSize || 1;
  const valueRange = maxValue - minValue || 1;

  const xFor = (size: number) => padding + ((size - minSize) / sizeRange) * (width - padding * 2);
  const yFor = (value: number) => height - padding - ((value - minValue) / valueRange) * (height - padding * 2);

  const linePath = sorted.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.size).toFixed(1)},${yFor(p.value).toFixed(1)}`).join(" ");

  return (
    <div className="complexity-chart">
      <p className="complexity-chart-title">{title}</p>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={`${title} chart`}>
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#232a45" strokeWidth={1} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {sorted.map((p, i) => (
          <circle key={i} cx={xFor(p.size)} cy={yFor(p.value)} r={3.5} fill={color}>
            <title>{`input size ${p.size} → ${format(p.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="complexity-chart-axis">
        <span>size {minSize}</span>
        <span>size {maxSize}</span>
      </div>
    </div>
  );
}

export default function ComplexityAuditorPanel({ submissionId, initialReport }: { submissionId: string; initialReport?: ComplexityReport }) {
  const [report, setReport] = useState<ComplexityReport | null>(initialReport ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestAudit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await runComplexityAudit(submissionId);
      setReport(result);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Could not run the complexity audit right now.");
    } finally {
      setIsLoading(false);
    }
  };

  const scaling: ScalingDataPoint[] = report?.scalingData ?? [];

  return (
    <div className="complexity-panel">
      <div className="complexity-panel-head">
        <h4>Complexity auditor</h4>
        {!report && (
          <button type="button" className="button button-small" onClick={requestAudit} disabled={isLoading}>
            {isLoading ? "Measuring…" : "Analyze complexity"}
          </button>
        )}
      </div>

      {error && <p className="verdict-failed">{error}</p>}

      {report && (
        <>
          <div className="complexity-summary">
            <div className="complexity-stat">
              <span>Time</span>
              <b>{report.timeComplexity}</b>
            </div>
            <div className="complexity-stat">
              <span>Space</span>
              <b>{report.spaceComplexity}</b>
            </div>
            <div className="complexity-stat">
              <span>Estimate</span>
              <span className={`complexity-confidence complexity-confidence-${report.confidence}`}>{CONFIDENCE_LABEL[report.confidence]}</span>
            </div>
          </div>

          <div
            className={`complexity-confbar ${report.confidence === "high" ? "conf-high" : report.confidence === "low" ? "conf-low" : ""}`}
          >
            <i style={{ width: report.confidence === "high" ? "100%" : report.confidence === "low" ? "33%" : "66%" }} />
          </div>

          <div className="complexity-charts">
            <ScalingChart
              title="Runtime vs input size"
              points={scaling.map((p) => ({ size: p.size, value: p.runtimeMs }))}
              color="#55d8d2"
              format={(v) => `${v}ms`}
            />
            <ScalingChart
              title="Memory vs input size"
              points={scaling.map((p) => ({ size: p.size, value: p.memoryKb }))}
              color="#8067ff"
              format={(v) => `${v}KB`}
            />
          </div>

          <p className="complexity-explanation">{report.explanation}</p>
        </>
      )}
    </div>
  );
}
