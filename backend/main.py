from pathlib import Path
from typing import Optional

import cv2
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func

from backend.detector import PPEDetector
from backend.fire_smoke_detector import FireSmokeDetector
from database.database import (
    SessionLocal,
    WorkerDetection,
    SafetyViolation,
    FireSmokeEvent,
    create_tables
)
from tracking.tracker import WorkerTracker

# =========================================================
# SafeVision AI - FastAPI Backend
# =========================================================

app = FastAPI(
    title="SafeVision AI",
    description="AI-Powered Factory Safety & PPE Compliance Monitoring System",
    version="1.0.0",
)

@app.on_event("startup")
def startup_event():
    print("SAFEVISION STARTUP: Creating database tables...")
    create_tables()
    print("SAFEVISION STARTUP: Database tables created.")

# =========================================================
# CORS - React Frontend Connection
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# Paths
# =========================================================

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "outputs" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

PROCESSED_DIR = BASE_DIR / "outputs" / "processed"
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


# =========================================================
# PPE Model
# =========================================================

MODEL_PATH = (
    BASE_DIR
    / "runs"
    / "detect"
    / "training"
    / "ppe_v1"
    / "runs"
    / "ppe_baseline_v2"
    / "weights"
    / "best.pt"
)


# =========================================================
# Fire / Smoke Model
# =========================================================

FIRE_SMOKE_MODEL_PATH = (
    BASE_DIR
    / "runs"
    / "detect"
    / "training"
    / "fire_smoke"
    / "fire_smoke_yolo11"
    / "weights"
    / "best.pt"
)


# =========================================================
# Global Models
# =========================================================

detector: Optional[PPEDetector] = None
tracker: Optional[WorkerTracker] = None
fire_smoke_detector: Optional[FireSmokeDetector] = None


# =========================================================
# PPE Detector
# =========================================================

def get_detector():

    global detector

    if detector is None:

        if not MODEL_PATH.exists():

            raise HTTPException(
                status_code=404,
                detail=(
                    "Trained PPE model not found. "
                    f"Expected model at: {MODEL_PATH}"
                ),
            )

        detector = PPEDetector(
            str(MODEL_PATH)
        )

    return detector


# =========================================================
# ByteTrack Worker Tracker
# =========================================================

def get_tracker():

    global tracker

    if tracker is None:

        if not MODEL_PATH.exists():

            raise HTTPException(
                status_code=404,
                detail=(
                    "Trained PPE model not found. "
                    f"Expected model at: {MODEL_PATH}"
                ),
            )

        tracker = WorkerTracker(
            str(MODEL_PATH)
        )

    return tracker


# =========================================================
# Fire / Smoke Detector
# =========================================================

def get_fire_smoke_detector():

    global fire_smoke_detector

    if fire_smoke_detector is None:

        if not FIRE_SMOKE_MODEL_PATH.exists():

            raise HTTPException(
                status_code=404,
                detail=(
                    "Trained Fire/Smoke model not found. "
                    f"Expected model at: {FIRE_SMOKE_MODEL_PATH}"
                ),
            )

        fire_smoke_detector = FireSmokeDetector(
            str(FIRE_SMOKE_MODEL_PATH)
        )

    return fire_smoke_detector


# =========================================================
# Health Check
# =========================================================

@app.get("/")
def root():

    return {
        "project": "SafeVision AI",
        "status": "online",
        "message": "Factory Safety AI Backend is running",
    }


@app.get("/health")
def health():

    return {
        "status": "healthy",
        "service": "SafeVision AI API",
    }


# =========================================================
# PPE Model Status
# =========================================================

@app.get("/model/status")
def model_status():

    return {
        "model": "YOLO11s PPE",
        "model_path": str(MODEL_PATH),
        "trained_model_available": MODEL_PATH.exists(),
    }


# =========================================================
# Fire / Smoke Model Status
# =========================================================

@app.get("/fire-smoke/model-status")
def fire_smoke_model_status():

    return {
        "model": "YOLO11s Fire + Smoke",
        "model_path": str(FIRE_SMOKE_MODEL_PATH),
        "trained_model_available": FIRE_SMOKE_MODEL_PATH.exists(),
        "classes": [
            "smoke",
            "fire",
        ],
    }


# =========================================================
# PPE IMAGE DETECTION
# =========================================================

@app.post("/detect/image")
async def detect_image(
    file: UploadFile = File(...)
):

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
    }

    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail="Please upload a JPG, PNG or WEBP image.",
        )

    # -----------------------------------------------------
    # Load models
    # -----------------------------------------------------

    detector_instance = get_detector()
    tracker_instance = get_tracker()

    # -----------------------------------------------------
    # Save uploaded image
    # -----------------------------------------------------

    safe_filename = Path(file.filename).name

    file_path = (
        UPLOAD_DIR / safe_filename
    )

    content = await file.read()

    file_path.write_bytes(content)

    # -----------------------------------------------------
    # Read image
    # -----------------------------------------------------

    frame = cv2.imread(
        str(file_path)
    )

    if frame is None:

        raise HTTPException(
            status_code=400,
            detail="Unable to read uploaded image.",
        )

    # =====================================================
    # 1. PPE DETECTION
    # =====================================================

    detection_results = detector_instance.predict(
        str(file_path),
        conf=0.35,
    )

    detection_result = detection_results[0]

    ppe_detections = []

    if detection_result.boxes is not None:

        boxes = detection_result.boxes

        for i in range(len(boxes)):

            class_id = int(
                boxes.cls[i].item()
            )

            confidence = float(
                boxes.conf[i].item()
            )

            class_name = (
                detection_result.names[class_id]
            )

            bbox = boxes.xyxy[i].tolist()

            ppe_detections.append(
                {
                    "class": class_name,
                    "confidence": round(
                        confidence,
                        4,
                    ),
                    "bbox": [
                        round(x, 2)
                        for x in bbox
                    ],
                }
            )

    # =====================================================
    # 2. PERSON DETECTION + BYTETRACK
    # =====================================================

    tracking_result = (
        tracker_instance.track_frame(
            frame,
            conf=0.25,
        )
    )

    tracking_raw_result = (
        tracking_result["raw_result"]
    )

    workers = []

    if tracking_raw_result.boxes is not None:

        boxes = tracking_raw_result.boxes

        if boxes.id is not None:

            track_ids = (
                boxes.id
                .int()
                .cpu()
                .tolist()
            )

        else:

            track_ids = [
                -(i + 1)
                for i in range(
                    len(boxes)
                )
            ]

        for i, track_id in enumerate(
            track_ids
        ):

            class_id = int(
                boxes.cls[i].item()
            )

            class_name = (
                tracking_raw_result.names[
                    class_id
                ]
            )

            # Only Person becomes Worker
            if class_name != "person":
                continue

            confidence = float(
                boxes.conf[i].item()
            )

            bbox = boxes.xyxy[i].tolist()

            # -------------------------------------------------
            # Worker ID
            # -------------------------------------------------

            if track_id < 0:

                worker_id = (
                    f"W-{len(workers) + 1:03d}"
                )

                real_track_id = None

            else:

                worker_id = (
                    f"W-{track_id:03d}"
                )

                real_track_id = track_id

            workers.append(
                {
                    "worker_id": worker_id,
                    "track_id": real_track_id,
                    "bbox": [
                        round(x, 2)
                        for x in bbox
                    ],
                    "confidence": round(
                        confidence,
                        4,
                    ),
                }
            )

    # =====================================================
    # 3. WORKER-WISE PPE ASSOCIATION
    # =====================================================

    worker_results = []

    for worker in workers:

        wx1, wy1, wx2, wy2 = (
            worker["bbox"]
        )

        worker_ppe = []

        # -------------------------------------------------
        # Find PPE inside worker bounding box
        # -------------------------------------------------

        for ppe in ppe_detections:

            if ppe["class"] == "Person":
                continue

            px1, py1, px2, py2 = (
                ppe["bbox"]
            )

            center_x = (
                px1 + px2
            ) / 2

            center_y = (
                py1 + py2
            ) / 2

            inside_worker = (
                wx1 <= center_x <= wx2
                and
                wy1 <= center_y <= wy2
            )

            if inside_worker:

                worker_ppe.append(
                    ppe
                )

        # -------------------------------------------------
        # PPE Status
        # -------------------------------------------------

        helmet = False
        vest = False
        gloves = False
        goggles = False
        boots = False

        for ppe in worker_ppe:

            class_name = ppe["class"]

            if class_name == "Helmet":
                helmet = True

            elif class_name == "Vest":
                vest = True

            elif class_name == "Gloves":
                gloves = True

            elif class_name == "Goggles":
                goggles = True

            elif class_name == "Boots":
                boots = True

        # -------------------------------------------------
        # Missing PPE
        # -------------------------------------------------

        violations = []

        if not helmet:
            violations.append(
                "NO-Helmet"
            )

        if not vest:
            violations.append(
                "NO-Vest"
            )

        if not gloves:
            violations.append(
                "NO-Gloves"
            )

        if not goggles:
            violations.append(
                "NO-Goggles"
            )

        if not boots:
            violations.append(
                "NO-Boots"
            )

        # -------------------------------------------------
        # Compliance Score
        # -------------------------------------------------

        compliant_items = sum(
            [
                helmet,
                vest,
                gloves,
                goggles,
                boots,
            ]
        )

        compliance_score = (
            compliant_items / 5
        ) * 100

        # -------------------------------------------------
        # Risk
        # -------------------------------------------------

        if violations:

            risk_level = "HIGH"

        elif compliance_score >= 80:

            risk_level = "LOW"

        elif compliance_score >= 50:

            risk_level = "MEDIUM"

        else:

            risk_level = "HIGH"

        # -------------------------------------------------
        # Worker Result
        # -------------------------------------------------

        worker_result = {

            "worker_id": worker[
                "worker_id"
            ],

            "track_id": worker[
                "track_id"
            ],

            "bbox": worker[
                "bbox"
            ],

            "confidence": worker[
                "confidence"
            ],

            "helmet": helmet,

            "vest": vest,

            "gloves": gloves,

            "goggles": goggles,

            "boots": boots,

            "compliance_score": round(
                compliance_score,
                2,
            ),

            "risk_level": risk_level,

            "violations": violations,

            "ppe_detections": worker_ppe,
        }

        worker_results.append(
            worker_result
        )

    # =====================================================
    # 4. SAVE TO POSTGRESQL
    # =====================================================

    db = SessionLocal()

    try:

        for worker in worker_results:

            # -------------------------------------------------
            # Save worker detection
            # -------------------------------------------------

            worker_detection = (
                WorkerDetection(
                    worker_id=worker[
                        "worker_id"
                    ],
                    camera_id="CAM-01",
                    helmet=worker[
                        "helmet"
                    ],
                    vest=worker[
                        "vest"
                    ],
                    gloves=worker[
                        "gloves"
                    ],
                    goggles=worker[
                        "goggles"
                    ],
                    boots=worker[
                        "boots"
                    ],
                    compliance_score=worker[
                        "compliance_score"
                    ],
                    risk_level=worker[
                        "risk_level"
                    ],
                )
            )

            db.add(
                worker_detection
            )

            # -------------------------------------------------
            # Duplicate Violation Control
            # -------------------------------------------------

            for violation_type in worker[
                "violations"
            ]:

                existing_violation = (
                    db.query(
                        SafetyViolation
                    )
                    .filter(
                        SafetyViolation.worker_id
                        == worker["worker_id"],

                        SafetyViolation.camera_id
                        == "CAM-01",

                        SafetyViolation.violation_type
                        == violation_type,

                        SafetyViolation.status
                        == "OPEN",
                    )
                    .first()
                )

                # Only create a new violation
                # if one is not already OPEN
                if existing_violation is None:

                    violation = (
                        SafetyViolation(
                            worker_id=worker[
                                "worker_id"
                            ],
                            camera_id="CAM-01",
                            violation_type=(
                                violation_type
                            ),
                            severity="HIGH",
                            description=(
                                f"{violation_type} "
                                f"detected for "
                                f"{worker['worker_id']} "
                                f"by YOLO11 + ByteTrack"
                            ),
                            status="OPEN",
                        )
                    )

                    db.add(
                        violation
                    )

        db.commit()

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Database error: {str(e)}"
            ),
        )

    finally:

        db.close()

    # =====================================================
    # 5. RESPONSE
    # =====================================================

    return {

        "success": True,

        "filename": file.filename,

        "workers": worker_results,

        "total_workers": len(
            worker_results
        ),

        "detections": ppe_detections,

        "total_detections": len(
            ppe_detections
        ),

        "tracking": "ByteTrack",

        "model": "YOLO11s PPE",

        "database_saved": True,
    }


# =========================================================
# DASHBOARD SUMMARY
# =========================================================

@app.get("/dashboard/summary")
def dashboard_summary():

    db = SessionLocal()

    try:

        workers_detected = (
            db.query(
                func.count(
                    func.distinct(
                        WorkerDetection.worker_id
                    )
                )
            ).scalar()
            or 0
        )

        compliance_rate = (
            db.query(
                func.avg(
                    WorkerDetection.compliance_score
                )
            ).scalar()
            or 0
        )

        violations_today = (
            db.query(
                SafetyViolation
            ).count()
        )

        fire_smoke_alerts = (
            db.query(
                FireSmokeEvent
            ).count()
        )

        # Overall factory risk
        if fire_smoke_alerts > 0:

            risk_level = "HIGH"

        elif violations_today >= 5:

            risk_level = "MEDIUM"

        else:

            risk_level = "LOW"

        return {

            "workers_detected": (
                workers_detected
            ),

            "compliance_rate": round(
                float(compliance_rate),
                2,
            ),

            "violations_today": (
                violations_today
            ),

            "fire_smoke_alerts": (
                fire_smoke_alerts
            ),

            "risk_level": risk_level,

            "system_status": "ACTIVE",
        }

    finally:

        db.close()


# =========================================================
# VIDEO DETECTION + BYTETRACK
# =========================================================

@app.post("/detect/video")
async def detect_video(
    file: UploadFile = File(...)
):

    allowed_types = {
        "video/mp4",
        "video/avi",
        "video/x-msvideo",
        "video/mov",
        "video/quicktime",
        "video/webm",
    }

    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload an MP4, AVI, MOV "
                "or WEBM video."
            ),
        )

    # -----------------------------------------------------
    # Save video
    # -----------------------------------------------------

    safe_filename = Path(
        file.filename
    ).name

    video_path = (
        UPLOAD_DIR / safe_filename
    )

    content = await file.read()

    video_path.write_bytes(
        content
    )

    # -----------------------------------------------------
    # Tracker
    # -----------------------------------------------------

    tracker_instance = get_tracker()

    # -----------------------------------------------------
    # Open video
    # -----------------------------------------------------

    cap = cv2.VideoCapture(
        str(video_path)
    )

    if not cap.isOpened():

        raise HTTPException(
            status_code=400,
            detail=(
                "Unable to open uploaded video."
            ),
        )

    fps = cap.get(
        cv2.CAP_PROP_FPS
    )

    if fps <= 0:
        fps = 25

    width = int(
        cap.get(
            cv2.CAP_PROP_FRAME_WIDTH
        )
    )

    height = int(
        cap.get(
            cv2.CAP_PROP_FRAME_HEIGHT
        )
    )

    # -----------------------------------------------------
    # Output video
    # -----------------------------------------------------

    output_name = (
        f"processed_{video_path.stem}.mp4"
    )

    output_path = (
        PROCESSED_DIR / output_name
    )

    fourcc = (
        cv2.VideoWriter_fourcc(
            *"mp4v"
        )
    )

    writer = cv2.VideoWriter(
        str(output_path),
        fourcc,
        fps,
        (width, height),
    )

    frame_count = 0
    tracked_objects = 0

    # -----------------------------------------------------
    # Process frames
    # -----------------------------------------------------

    try:

        while True:

            ret, frame = cap.read()

            if not ret:
                break

            frame_count += 1

            result = (
                tracker_instance.track_frame(
                    frame
                )
            )

            annotated_frame = (
                result["raw_result"].plot()
            )

            if (
                result["raw_result"].boxes
                is not None
            ):

                boxes = (
                    result[
                        "raw_result"
                    ].boxes
                )

                if boxes.id is not None:

                    tracked_objects += (
                        len(boxes.id)
                    )

            writer.write(
                annotated_frame
            )

    finally:

        cap.release()
        writer.release()

    return {

        "success": True,

        "filename": file.filename,

        "processed_video": output_name,

        "output_path": str(
            output_path
        ),

        "frames_processed": (
            frame_count
        ),

        "tracked_objects": (
            tracked_objects
        ),

        "tracking": "ByteTrack",

        "model": "YOLO11s Person Tracking",
    }


# =========================================================
# CAMERA STATUS
# =========================================================

@app.get("/camera/status")
def camera_status():

    return {

        "camera_id": "CAM-01",

        "camera_name": (
            "Factory Main Gate"
        ),

        "status": "READY",

        "mode": "LIVE",

        "tracking": "ByteTrack",

        "model": "YOLO11 PPE",
    }


# =========================================================
# PPE COMPLIANCE RULES
# =========================================================

@app.post("/compliance/check")
def compliance_check(
    data: dict
):

    required_items = [
        "helmet",
        "vest",
        "gloves",
        "goggles",
        "boots",
    ]

    compliant_items = 0

    for item in required_items:

        if data.get(
            item,
            False
        ):

            compliant_items += 1

    score = (
        compliant_items
        / len(required_items)
    ) * 100

    if score >= 80:

        status = "COMPLIANT"
        risk = "LOW"

    elif score >= 50:

        status = "PARTIAL"
        risk = "MEDIUM"

    else:

        status = "NON-COMPLIANT"
        risk = "HIGH"

    return {

        "worker_id": data.get(
            "worker_id",
            "UNKNOWN",
        ),

        "compliance_score": round(
            score,
            2,
        ),

        "status": status,

        "risk_level": risk,

        "required_items": (
            required_items
        ),
    }


# =========================================================
# VIOLATIONS
# =========================================================

@app.get("/violations")
def get_violations():

    db = SessionLocal()

    try:

        violations = (
            db.query(
                SafetyViolation
            )
            .order_by(
                SafetyViolation.timestamp.desc()
            )
            .all()
        )

        violation_list = []

        for violation in violations:

            violation_list.append(
                {
                    "id": violation.id,

                    "worker_id": (
                        violation.worker_id
                    ),

                    "camera_id": (
                        violation.camera_id
                    ),

                    "violation_type": (
                        violation.violation_type
                    ),

                    "severity": (
                        violation.severity
                    ),

                    "description": (
                        violation.description
                    ),

                    "status": (
                        violation.status
                    ),

                    "timestamp": (
                        violation.timestamp.isoformat()
                        if violation.timestamp
                        else None
                    ),
                }
            )

        return {

            "success": True,

            "violations": (
                violation_list
            ),

            "total": len(
                violation_list
            ),
        }

    finally:

        db.close()


# =========================================================
# FIRE / SMOKE STATUS
# =========================================================

@app.get("/fire-smoke/status")
def fire_smoke_status():

    db = SessionLocal()

    try:

        latest_event = (
            db.query(
                FireSmokeEvent
            )
            .order_by(
                FireSmokeEvent.timestamp.desc()
            )
            .first()
        )

        if latest_event is None:

            return {

                "fire_detected": False,

                "smoke_detected": False,

                "confidence": 0,

                "risk_level": "LOW",

                "status": "NO EVENTS",
            }

        event_type = (
            latest_event.event_type.lower()
        )

        return {

            "fire_detected": (
                event_type == "fire"
            ),

            "smoke_detected": (
                event_type == "smoke"
            ),

            "confidence": (
                latest_event.confidence
            ),

            "risk_level": (
                latest_event.severity
            ),

            "status": (
                latest_event.status
            ),

            "timestamp": (
                latest_event.timestamp.isoformat()
                if latest_event.timestamp
                else None
            ),
        }

    finally:

        db.close()


# =========================================================
# FIRE / SMOKE IMAGE DETECTION
# =========================================================

@app.post("/fire-smoke/detect")
async def detect_fire_smoke(
    file: UploadFile = File(...)
):

    allowed_types = {
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
    }

    if file.content_type not in allowed_types:

        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload a JPG, PNG "
                "or WEBP image."
            ),
        )

    # -----------------------------------------------------
    # Save image
    # -----------------------------------------------------

    safe_filename = Path(
        file.filename
    ).name

    temp_path = (
        UPLOAD_DIR
        / f"fire_smoke_{safe_filename}"
    )

    content = await file.read()

    temp_path.write_bytes(
        content
    )

    # -----------------------------------------------------
    # Load detector
    # -----------------------------------------------------

    detector_instance = (
        get_fire_smoke_detector()
    )

    # -----------------------------------------------------
    # Run YOLO
    # -----------------------------------------------------

    results = (
        detector_instance.predict(
            str(temp_path),
            conf=0.25,
        )
    )

    result = results[0]

    detections = []

    if result.boxes is not None:

        for box in result.boxes:

            class_id = int(
                box.cls[0]
            )

            confidence = float(
                box.conf[0]
            )

            class_name = (
                result.names[class_id]
            )

            bbox = box.xyxy[0].tolist()

            detections.append(
                {
                    "class": class_name,

                    "confidence": round(
                        confidence,
                        4,
                    ),

                    "bbox": [
                        round(x, 2)
                        for x in bbox
                    ],
                }
            )

    # -----------------------------------------------------
    # Determine risk
    # -----------------------------------------------------

    fire_detected = any(
        d["class"].lower() == "fire"
        for d in detections
    )

    smoke_detected = any(
        d["class"].lower() == "smoke"
        for d in detections
    )

    if fire_detected:

        risk_level = "CRITICAL"

    elif smoke_detected:

        risk_level = "HIGH"

    else:

        risk_level = "LOW"

    # -----------------------------------------------------
    # Save events to PostgreSQL
    # -----------------------------------------------------

    db = SessionLocal()

    try:

        for detection in detections:

            event_type = (
                detection["class"]
            )

            if (
                event_type.lower()
                == "fire"
            ):

                severity = "CRITICAL"

            else:

                severity = "HIGH"

            event = FireSmokeEvent(

                camera_id="CAM-01",

                event_type=event_type,

                confidence=(
                    detection[
                        "confidence"
                    ]
                ),

                severity=severity,

                status="OPEN",
            )

            db.add(event)

        db.commit()

    except Exception as e:

        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=(
                f"Fire/Smoke database error: "
                f"{str(e)}"
            ),
        )

    finally:

        db.close()

    return {

        "success": True,

        "fire_detected": (
            fire_detected
        ),

        "smoke_detected": (
            smoke_detected
        ),

        "risk_level": risk_level,

        "detections": detections,

        "model": (
            "YOLO11s Fire + Smoke"
        ),
    }


# =========================================================
# AI SAFETY ASSISTANT
# =========================================================

@app.post("/assistant")
def safety_assistant(
    data: dict
):

    question = (
        data.get(
            "question",
            ""
        )
        .lower()
        .strip()
    )

    db = SessionLocal()

    try:

        # -------------------------------------------------
        # Real PostgreSQL Data
        # -------------------------------------------------

        total_violations = (
            db.query(
                SafetyViolation
            ).count()
        )

        open_violations = (
            db.query(
                SafetyViolation
            )
            .filter(
                SafetyViolation.status
                == "OPEN"
            )
            .count()
        )

        total_fire_events = (
            db.query(
                FireSmokeEvent
            ).count()
        )

        latest_fire_event = (
            db.query(
                FireSmokeEvent
            )
            .order_by(
                FireSmokeEvent.timestamp.desc()
            )
            .first()
        )

        avg_compliance = (
            db.query(
                func.avg(
                    WorkerDetection.compliance_score
                )
            ).scalar()
            or 0
        )

        worker_count = (
            db.query(
                func.count(
                    func.distinct(
                        WorkerDetection.worker_id
                    )
                )
            ).scalar()
            or 0
        )

        # -------------------------------------------------
        # Assistant Logic
        # -------------------------------------------------

        if (
            "violation" in question
            or "violations" in question
        ):

            answer = (
                f"SafeVision has recorded "
                f"{total_violations} total safety "
                f"violations. "
                f"{open_violations} violations "
                f"are currently open."
            )

        elif "compliance" in question:

            answer = (
                f"The current average PPE "
                f"compliance score is "
                f"{float(avg_compliance):.1f}%. "
                f"The system checks helmet, "
                f"vest, gloves, goggles "
                f"and boots."
            )

        elif (
            "fire" in question
            or "smoke" in question
        ):

            if latest_fire_event:

                answer = (
                    f"The latest fire/smoke "
                    f"event was "
                    f"{latest_fire_event.event_type} "
                    f"with "
                    f"{latest_fire_event.confidence:.1%} "
                    f"confidence. "
                    f"Risk level is "
                    f"{latest_fire_event.severity}."
                )

            else:

                answer = (
                    "No fire or smoke events "
                    "have been recorded in "
                    "the database."
                )

        elif "risk" in question:

            if total_fire_events > 0:

                risk = "HIGH"

            elif open_violations >= 5:

                risk = "MEDIUM"

            elif open_violations > 0:

                risk = "MEDIUM"

            else:

                risk = "LOW"

            answer = (
                f"Current factory safety "
                f"risk is {risk}. "
                f"There are "
                f"{open_violations} open PPE "
                f"violations and "
                f"{total_fire_events} "
                f"fire/smoke events."
            )

        elif "worker" in question:

            answer = (
                f"The system has recorded "
                f"{worker_count} unique "
                f"worker IDs."
            )

        else:

            answer = (
                "I am SafeVision AI Safety "
                "Assistant. I am connected "
                "to your factory safety data, "
                "PPE compliance records, "
                "worker tracking, violations, "
                "fire/smoke events and "
                "factory risk."
            )

        return {

            "question": data.get(
                "question",
                ""
            ),

            "answer": answer,

            "data_source": (
                "PostgreSQL + SafeVision AI"
            ),
        }

    finally:

        db.close()


# =========================================================
# Run Backend
# =========================================================
#
# Command:
#
# uvicorn backend.main:app --reload
#
# =========================================================