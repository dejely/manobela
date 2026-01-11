import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.services.face_landmarker import FaceLandmarker

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting application")

    # Startup
    FaceLandmarker.initialize()

    try:
        yield
    finally:
        # Shutdown
        logger.info("Shutting down application...")
        FaceLandmarker.shutdown()
        logger.info("Shutdown complete")
