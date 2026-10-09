const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  "https://safevision-ai-cmki.onrender.com"
).replace(/\/+$/, ""); 

export async function getHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error("Backend is not responding");
  }

  return response.json();
}

export async function getDashboardSummary() {
  const response = await fetch(`${API_BASE_URL}/dashboard/summary`);

  if (!response.ok) {
    throw new Error("Failed to load dashboard summary");
  }

  return response.json();
}

export async function getModelStatus() {
  const response = await fetch(`${API_BASE_URL}/model/status`);

  if (!response.ok) {
    throw new Error("Failed to load model status");
  }

  return response.json();
}

export async function getViolations() {
  const response = await fetch(`${API_BASE_URL}/violations`);

  if (!response.ok) {
    throw new Error("Failed to load violations");
  }

  return response.json();
}

export async function getFireSmokeStatus() {
  const response = await fetch(`${API_BASE_URL}/fire-smoke/status`);

  if (!response.ok) {
    throw new Error("Failed to load fire/smoke status");
  }

  return response.json();
}

export async function askSafetyAssistant(question: string) {
  const response = await fetch(`${API_BASE_URL}/assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
    }),
  });

  if (!response.ok) {
    throw new Error("Safety Assistant request failed");
  }

  return response.json();
}
export async function analyzeCameraFrame(blob: Blob) {
  const formData = new FormData();

  formData.append(
    "file",
    blob,
    "camera-frame.jpg"
  );

  const response = await fetch(
    `${API_BASE_URL}/detect/image`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(
      "Failed to analyze camera frame"
    );
  }

  return response.json();
}
export async function detectFireSmoke(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/fire-smoke/detect`,
    {
      method: "POST",
      body: formData,
    }
  );

  const responseText = await response.text();

  if (!response.ok) {
    console.error(
      "Fire/Smoke API error:",
      response.status,
      responseText
    );

    throw new Error(
      `Fire/Smoke failed (${response.status}): ${responseText}`
    );
  }

  try {
    return JSON.parse(responseText);
  } catch {
    throw new Error("Backend returned an invalid JSON response.");
  }
}

export type PpeDetectionItem = {
  class: string;
  confidence: number;
  bbox: number[];
};

export type WorkerPpeDetection = {
  worker_id: string;
  track_id: number | null;
  bbox: number[];
  confidence: number;
  helmet: boolean;
  vest: boolean;
  gloves: boolean;
  goggles: boolean;
  boots: boolean;
  compliance_score: number;
  risk_level: string;
  violations: string[];
  ppe_detections: PpeDetectionItem[];
};

export type PpeDetectionResponse = {
  success: boolean;
  filename?: string;
  workers?: WorkerPpeDetection[];
  total_workers: number;
  detections: PpeDetectionItem[];
  total_detections: number;
  tracking: string;
  model: string;
  database_saved: boolean;
  detail?: string;
};

export async function detectPpeImage(file: File | Blob): Promise<PpeDetectionResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/detect/image`, {
    method: "POST",
    body: formData,
  });

  const responseText = await response.text();

  if (!response.ok) {
    let errorDetail = responseText;
    try {
      const data = JSON.parse(responseText);
      if (typeof data.detail === "string") {
        errorDetail = data.detail;
      }
    } catch {
      // not JSON
    }
    throw new Error(
      errorDetail || `PPE Detection failed (${response.status})`
    );
  }

  try {
    return JSON.parse(responseText) as PpeDetectionResponse;
  } catch {
    throw new Error("Backend returned an invalid JSON response.");
  }
}