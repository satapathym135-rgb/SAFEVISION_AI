from ultralytics import YOLO


class WorkerTracker:
    """
    Person-only YOLO11 tracker using ByteTrack.

    This tracker is responsible ONLY for:
    1. Detecting persons
    2. Assigning persistent Worker IDs
    3. Tracking multiple workers
    """

    def __init__(self, model_path: str):
        # Use pretrained YOLO11s for reliable Person detection
        self.model = YOLO("yolo11s.pt")

    def track_frame(self, frame, conf: float = 0.25):

        results = self.model.track(
            source=frame,
            conf=conf,
            device=0,
            tracker="bytetrack.yaml",
            persist=True,
            verbose=False
        )

        result = results[0]

        workers = []

        if (
            result.boxes is not None
            and result.boxes.id is not None
        ):

            boxes = result.boxes

            track_ids = (
                boxes.id
                .int()
                .cpu()
                .tolist()
            )

            for i, track_id in enumerate(track_ids):

                class_id = int(
                    boxes.cls[i].item()
                )

                class_name = result.names[
                    class_id
                ]

                # Only Person becomes a Worker
                if class_name != "person":
                    continue

                confidence = float(
                    boxes.conf[i].item()
                )

                bbox = boxes.xyxy[i].tolist()

                workers.append({
                    "worker_id": f"W-{track_id:03d}",
                    "track_id": track_id,
                    "class": "Person",
                    "confidence": round(
                        confidence,
                        4
                    ),
                    "bbox": [
                        round(x, 2)
                        for x in bbox
                    ]
                })

        return {
            "workers": workers,
            "total_workers": len(workers),
            "raw_result": result
        }

    def track_video(
        self,
        video_path: str,
        conf: float = 0.25
    ):

        results = self.model.track(
            source=video_path,
            conf=conf,
            device=0,
            tracker="bytetrack.yaml",
            persist=True,
            stream=True,
            verbose=False
        )

        return results


if __name__ == "__main__":
    print(
        "YOLO11 Person + ByteTrack Worker Tracker ready."
    )