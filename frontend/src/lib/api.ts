const API_BASE_URL = "http://127.0.0.1:8000";

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

  if (!response.ok) {
    throw new Error("Failed to detect fire/smoke");
  }

  return response.json();
}