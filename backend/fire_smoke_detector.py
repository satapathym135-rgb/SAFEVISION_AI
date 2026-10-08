from pathlib import Path
from ultralytics import YOLO


class FireSmokeDetector:
    def __init__(self, model_path: str):
        self.model_path = Path(model_path)

        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Fire/Smoke model not found: {self.model_path}"
            )

        self.model = YOLO(str(self.model_path))

    def predict(self, source, conf: float = 0.15):
        results = self.model.predict(
            source=source,
            conf=conf,
            device=0,
            verbose=False
        )

        return results

    def detect_frame(self, frame, conf: float = 0.35):
        results = self.model.predict(
            source=frame,
            conf=conf,
            device=0,
            verbose=False
        )

        return results[0]


if __name__ == "__main__":
    print("Fire/Smoke Detector module ready.")