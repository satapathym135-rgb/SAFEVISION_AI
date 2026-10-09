import torch
from ultralytics import YOLO


class WorkerTracker:
    """
    Worker tracking using the existing trained PPE model
    instead of loading a second YOLO model.
    """

    def __init__(self, model_path: str = "", model=None):
        self.device = "cuda:0" if torch.cuda.is_available() else "cpu"

        # Reuse the already-loaded PPE model when provided.
        # Otherwise load the supplied trained model path.
        if model is not None:
            self.model = model
        elif model_path:
            self.model = YOLO(model_path)
        else:
            raise ValueError(
                "Provide the trained PPE model or its model_path."
            )

        print(f"SAFEVISION TRACKER DEVICE: {self.device}")

    def track_frame(self, frame, conf: float = 0.25):
        results = self.model.track(
            source=frame,
            conf=conf,
            device=self.device,
            tracker="bytetrack.yaml",
            persist=True,
            verbose=False,
        )

        result = results[0]
        workers = []

        if result.boxes is not None and result.boxes.id is not None:
            boxes = result.boxes
            track_ids = boxes.id.int().cpu().tolist()

            for i, track_id in enumerate(track_ids):
                class_id = int(boxes.cls[i].item())
                class_name = result.names[class_id]

                # Support both common label formats.
                if class_name.lower() != "person":
                    continue

                confidence = float(boxes.conf[i].item())
                bbox = boxes.xyxy[i].tolist()

                workers.append({
                    "worker_id": f"W-{track_id:03d}",
                    "track_id": track_id,
                    "class": "Person",
                    "confidence": round(confidence, 4),
                    "bbox": [round(x, 2) for x in bbox],
                })

        return {
            "workers": workers,
            "total_workers": len(workers),
            "raw_result": result,
        }

    def track_video(self, video_path: str, conf: float = 0.25):
        return self.model.track(
            source=video_path,
            conf=conf,
            device=self.device,
            tracker="bytetrack.yaml",
            persist=True,
            stream=True,
            verbose=False,
        )


if __name__ == "__main__":
    print("SafeVision PPE + ByteTrack Worker Tracker ready.")