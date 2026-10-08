import os
from datetime import datetime

from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
)
from sqlalchemy.orm import declarative_base, sessionmaker


# ---------------------------------------------------------
# PostgreSQL Configuration
# ---------------------------------------------------------

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://postgres:madhu%402026@localhost:5432/safevision"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# ---------------------------------------------------------
# Worker Detection Table
# ---------------------------------------------------------

class WorkerDetection(Base):
    __tablename__ = "worker_detections"

    id = Column(Integer, primary_key=True, index=True)

    worker_id = Column(String(50), index=True)

    camera_id = Column(String(100), default="CAM-01")

    helmet = Column(Boolean, default=False)
    vest = Column(Boolean, default=False)
    gloves = Column(Boolean, default=False)
    goggles = Column(Boolean, default=False)
    boots = Column(Boolean, default=False)

    compliance_score = Column(Float, default=0.0)

    risk_level = Column(String(30), default="LOW")

    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        index=True
    )


# ---------------------------------------------------------
# Safety Violation / Alert Table
# ---------------------------------------------------------

class SafetyViolation(Base):
    __tablename__ = "safety_violations"

    id = Column(Integer, primary_key=True, index=True)

    worker_id = Column(String(50), index=True)

    camera_id = Column(String(100), default="CAM-01")

    violation_type = Column(String(100))

    severity = Column(String(30), default="MEDIUM")

    description = Column(Text)

    status = Column(String(30), default="OPEN")

    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        index=True
    )


# ---------------------------------------------------------
# Fire / Smoke Event Table
# ---------------------------------------------------------

class FireSmokeEvent(Base):
    __tablename__ = "fire_smoke_events"

    id = Column(Integer, primary_key=True, index=True)

    camera_id = Column(String(100), default="CAM-01")

    event_type = Column(String(50))

    confidence = Column(Float, default=0.0)

    severity = Column(String(30), default="HIGH")

    status = Column(String(30), default="OPEN")

    timestamp = Column(
        DateTime,
        default=datetime.utcnow,
        index=True
    )


# ---------------------------------------------------------
# Camera Table
# ---------------------------------------------------------

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(Integer, primary_key=True, index=True)

    camera_id = Column(
        String(100),
        unique=True,
        index=True
    )

    camera_name = Column(String(200))

    location = Column(String(200))

    status = Column(String(30), default="ONLINE")

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )


# ---------------------------------------------------------
# Create Database Tables
# ---------------------------------------------------------

def create_tables():
    Base.metadata.create_all(bind=engine)
    print("SafeVision database tables created successfully.")


# ---------------------------------------------------------
# Database Session
# ---------------------------------------------------------

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------
# Test
# ---------------------------------------------------------

if __name__ == "__main__":
    create_tables()