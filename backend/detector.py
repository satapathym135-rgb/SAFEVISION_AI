import os
from pathlib import Path

import torch
from huggingface_hub import hf_hub_download
from ultralytics import YOLO


class PPEDetector:
    def __init__(self, model_path: str):
        local_path = Path(model_path)

        # First use the trained model if it exists locally.
        if local_path.is_file():
            self.model_path = local_path
        else:
            # Otherwise download the trained PPE model from Hugging Face.
            repo_id = os.getenv(
                "HF_MODEL_REPO",
                "madhusmita77/SAFEVISION_AI_MODELS",
            )

            self.model_path = Path(
                hf_hub_download(
                    repo_id=repo_id,
                    filename="ppe/best.pt",
                    repo_type="model",
                )
            )

        if not self.model_path.is_file():
            raise FileNotFoundError(
                f"Trained PPE model not found: {self.model_path}"
            )

        device = 0 if torch.cuda.is_available() else "cpu"

        print(f"SAFEVISION PPE MODEL: {self.model_path}")
        print(f"SAFEVISION PPE DEVICE: {device}")

        self.model = YOLO(str(self.model_path))

    def predict(self, source, conf: float = 0.35):
        return self.model.predict(
            source=source,
            conf=conf,
            device=0 if torch.cuda.is_available() else "cpu",
            verbose=False,
        )

    def detect_frame(self, frame, conf: float = 0.35):
        results = self.model.predict(
            source=frame,
            conf=conf,
            device=0 if torch.cuda.is_available() else "cpu",
            verbose=False,
        )
        return results[0]


if __name__ == "__main__":
    print("PPE Detector module ready.")