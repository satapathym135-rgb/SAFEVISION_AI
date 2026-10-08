from pathlib import Path
from ultralytics import YOLO
import torch 


class PPEDetector:
    def __init__(self, model_path: str):
        self.model_path = Path(model_path)

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Model file not found: {self.model_path}"
            )

        self.model = YOLO(str(self.model_path))

    def predict(self, source, conf: float = 0.35):
        """
        Run PPE detection on an image/video frame.

        source:
            Image path, video frame, or other Ultralytics-compatible source.
        """

        results = self.model.predict(
            source=source,
            conf=conf,
            device=0 if torch.cuda.is_available() else "cpu",
            verbose=False
        )

        return results

    def detect_frame(self, frame, conf: float = 0.35):
        """
        Detect PPE objects in a single OpenCV frame.
        Returns the raw YOLO result.
        """

        results = self.model.predict(
            source=frame,
            conf=conf,
            device=0 if torch.cuda.is_available() else "cpu",
            verbose=False
        )

        return results[0]


if __name__ == "__main__":
    print("PPE Detector module ready.")