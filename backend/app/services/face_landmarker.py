import logging
from pathlib import Path

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

logger = logging.getLogger(__name__)

# Path to the model file
PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = PROJECT_ROOT / "assets" / "models" / "face_landmarker.task"


class FaceLandmarker:
    """
    Singleton instance of face landmarking model.
    Must be initialized before use.
    """

    _instance = None

    @classmethod
    def initialize(cls):
        if cls._instance is not None:
            return cls._instance

        try:
            base_options = python.BaseOptions(model_asset_path=str(MODEL_PATH))

            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                running_mode=vision.RunningMode.VIDEO,
                num_faces=1,
                min_face_detection_confidence=0.3,
                min_face_presence_confidence=0.3,
                min_tracking_confidence=0.5,
            )

            cls._instance = vision.FaceLandmarker.create_from_options(options)

            logger.info("Face Landmarker initialized successfully")

            return cls._instance

        except Exception as e:
            logger.error(f"Failed to initialize Face Landmarker: {e}")
            cls._instance = None
            raise RuntimeError("Face Landmarker initialization failed") from e

    @classmethod
    def get(cls):
        if cls._instance is None:
            raise RuntimeError("Face Landmarker not initialized")
        return cls._instance

    @classmethod
    def shutdown(cls) -> None:
        cls._instance = None
        logger.info("Face Landmarker has been shut down")
