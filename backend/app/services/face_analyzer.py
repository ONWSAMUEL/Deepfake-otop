"""Face analysis service using InsightFace."""
import numpy as np
import cv2
from typing import Optional, List, Dict, Any
import logging

logger = logging.getLogger(__name__)

# Lazy-loaded to avoid importing at module level (heavy)
_face_app = None


def _get_face_app():
    global _face_app
    if _face_app is None:
        try:
            from insightface.app import FaceAnalysis
            _face_app = FaceAnalysis(
                name="buffalo_l",
                providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
            )
            _face_app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace (buffalo_l) loaded")
        except Exception as e:
            logger.error(f"Failed to load InsightFace: {e}")
            raise
    return _face_app


class FaceAnalyzer:
    """Detects and analyzes faces in images using InsightFace."""

    def detect_faces(self, image: np.ndarray) -> List[Any]:
        """Return list of detected face objects (sorted largest first)."""
        app = _get_face_app()
        faces = app.get(image)
        if faces:
            faces = sorted(
                faces,
                key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]),
                reverse=True,
            )
        return faces

    def get_primary_face(self, image: np.ndarray) -> Optional[Any]:
        """Return the largest face in the image, or None."""
        faces = self.detect_faces(image)
        return faces[0] if faces else None

    def has_face(self, image: np.ndarray) -> bool:
        """Return True if at least one face is detected."""
        return len(self.detect_faces(image)) > 0

    def crop_face(
        self,
        image: np.ndarray,
        face: Any,
        padding: float = 0.3,
    ) -> Optional[np.ndarray]:
        """Crop a face region from the image with padding."""
        x1, y1, x2, y2 = [int(v) for v in face.bbox]
        h, w = image.shape[:2]

        pad_x = int((x2 - x1) * padding)
        pad_y = int((y2 - y1) * padding)

        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)

        return image[y1:y2, x1:x2].copy()

    def get_face_landmarks(self, face: Any) -> Optional[np.ndarray]:
        """Return 2D landmark array (5 points) for the face."""
        if hasattr(face, "kps") and face.kps is not None:
            return face.kps
        return None
