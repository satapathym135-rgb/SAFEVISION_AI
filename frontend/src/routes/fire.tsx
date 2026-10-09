import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Flame, Wind, Upload, LoaderCircle, AlertTriangle } from "lucide-react";
import { Panel, PageHeader, SeverityBadge } from "@/components/sentinel/ui";
import { meta } from "@/components/sentinel/meta";

export const Route = createFileRoute("/fire")({
  head: () =>
    meta(
      "Fire & Smoke Detection",
      "AI-powered fire and smoke detection from uploaded images.",
    ),
  component: Fire,
});

const API_BASE = "https://safevision-ai-cmki.onrender.com";

type Detection = {
  class?: string;
  label?: string;
  confidence?: number;
  bbox?: number[];
};

type DetectionResult = {
  success?: boolean;
  fire_detected?: boolean;
  smoke_detected?: boolean;
  risk_level?: string;
  detections?: Detection[];
  model?: string;
  message?: string;
  detail?: string;
};

function Fire() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function selectFile(selected: File | null) {
    setError("");
    setResult(null);

    if (preview) URL.revokeObjectURL(preview);

    if (!selected) {
      setFile(null);
      setPreview("");
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setFile(null);
      setPreview("");
      setError("Please select a valid image file.");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }

  async function detect() {
    if (!file) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch(`${API_BASE}/detect/fire-smoke/image`, {
        method: "POST",
        body: form,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : `Detection API failed (${response.status}).`,
        );
      }

      setResult(data as DetectionResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to the detection API.",
      );
    } finally {
      setLoading(false);
    }
  }

  const detections = result?.detections ?? [];
  const fireDetected = result?.fire_detected === true;
  const smokeDetected = result?.smoke_detected === true;
  const risk = result?.risk_level ?? "UNKNOWN";

  return (
    <>
      <PageHeader
        title="Fire & Smoke Detection"
        subtitle="YOLO-based visual fire and smoke analysis"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Fire Status">
          <div className="flex items-center gap-3">
            <Flame className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-xl font-semibold">
                {result
                  ? fireDetected
                    ? "FIRE DETECTED"
                    : "No Fire Detected"
                  : "Awaiting Image"}
              </p>
              <p className="text-sm text-muted-foreground">
                Based on the latest image analysis
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="Smoke Status">
          <div className="flex items-center gap-3">
            <Wind className="h-8 w-8 text-warning" />
            <div>
              <p className="text-xl font-semibold">
                {result
                  ? smokeDetected
                    ? "SMOKE DETECTED"
                    : "No Smoke Detected"
                  : "Awaiting Image"}
              </p>
              <p className="text-sm text-muted-foreground">
                Based on the latest image analysis
              </p>
            </div>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Analyze an Image">
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center hover:bg-muted/30">
              <Upload className="h-8 w-8" />
              <span className="text-sm">
                {file ? file.name : "Choose a fire/smoke image"}
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, or WEBP
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {preview && (
              <img
                src={preview}
                alt="Selected image for fire and smoke analysis"
                className="max-h-72 w-full rounded-lg border object-contain"
              />
            )}

            <button
              type="button"
              onClick={detect}
              disabled={!file || loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Flame className="h-4 w-4" />
              )}
              {loading ? "Analyzing..." : "Run Fire/Smoke Detection"}
            </button>

            {error && (
              <div className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
                <AlertTriangle className="mr-2 inline h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="AI Detection Results">
          {!result ? (
            <p className="text-sm text-muted-foreground">
              Select an image and run detection to view actual model results.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm">Risk Level</span>
                <SeverityBadge
                  s={
                    risk.toUpperCase() === "CRITICAL" ||
                    risk.toUpperCase() === "HIGH"
                      ? "high"
                      : risk.toUpperCase() === "MEDIUM"
                        ? "medium"
                        : "low"
                  }
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Model: {result.model ?? "Configured detection model"}
              </p>

              {detections.length === 0 ? (
                <p className="text-sm">
                  No fire/smoke objects were returned by the model.
                </p>
              ) : (
                <ul className="space-y-3">
                  {detections.map((d, index) => (
                    <li
                      key={`${d.class ?? d.label ?? "detection"}-${index}`}
                      className="rounded-lg border p-3"
                    >
                      <p className="font-medium">
                        {d.class ?? d.label ?? "Detected object"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Confidence:{" "}
                        {typeof d.confidence === "number"
                          ? `${(d.confidence * 100).toFixed(1)}%`
                          : "Not provided"}
                      </p>
                      {d.bbox && (
                        <p className="break-words font-mono text-xs text-muted-foreground">
                          Bounding box: {d.bbox.map((v) => Number(v).toFixed(1)).join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs text-muted-foreground">
                Results reflect the API response for this image, not a simulated
                detection.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}