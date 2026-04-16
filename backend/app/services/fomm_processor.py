"""
First Order Motion Model (FOMM) processor.

Animates a target person image to reproduce the full-body movements from a driving video.

References:
  - Paper: "First Order Motion Model for Image Animation" (Siarohin et al., 2019)
  - Repo:  https://github.com/AliaksandrSiarohin/first-order-model
"""
import sys
import os
import subprocess
import numpy as np
import cv2
import torch
import yaml
import logging
from pathlib import Path
from typing import List, Optional, Callable
from skimage.transform import resize
from skimage import img_as_ubyte

logger = logging.getLogger(__name__)


class FOMMProcessor:
    """
    Wraps the First Order Motion Model for full-body animation.

    Usage:
        processor = FOMMProcessor(fomm_dir, checkpoint_path)
        animated_frames = processor.animate(source_image_rgb, driving_frames_rgb)
    """

    def __init__(
        self,
        fomm_dir: str,
        checkpoint_path: str,
        config_name: str = "config/vox-256.yaml",
        device: str = "auto",
    ):
        self.fomm_dir = Path(fomm_dir)
        self.checkpoint_path = Path(checkpoint_path)
        self.config_path = self.fomm_dir / config_name
        self.device = self._resolve_device(device)
        self.generator = None
        self.kp_detector = None
        self._load_models()

    # ─── Initialisation ───────────────────────────────────────────────────────

    @staticmethod
    def _resolve_device(device: str) -> str:
        if device == "auto":
            return "cuda" if torch.cuda.is_available() else "cpu"
        return device

    def _load_models(self):
        """Load FOMM generator and keypoint detector from checkpoint."""
        if not self.fomm_dir.exists():
            raise RuntimeError(
                f"FOMM directory not found: {self.fomm_dir}\n"
                "Run scripts/setup_models.sh to download it."
            )
        if not self.checkpoint_path.exists():
            raise RuntimeError(
                f"FOMM checkpoint not found: {self.checkpoint_path}\n"
                "Run scripts/setup_models.sh to download it."
            )

        # Add FOMM to Python path
        fomm_str = str(self.fomm_dir)
        if fomm_str not in sys.path:
            sys.path.insert(0, fomm_str)

        try:
            from modules.generator import OcclusionAwareGenerator
            from modules.keypoint_detector import KPDetector

            with open(self.config_path) as f:
                config = yaml.full_load(f)

            mp = config["model_params"]
            common = mp["common_params"]

            self.generator = OcclusionAwareGenerator(
                **mp["generator_params"], **common
            )
            self.kp_detector = KPDetector(
                **mp["kp_detector_params"], **common
            )

            checkpoint = torch.load(
                self.checkpoint_path, map_location=self.device
            )
            self.generator.load_state_dict(checkpoint["generator"])
            self.kp_detector.load_state_dict(checkpoint["kp_detector"])

            self.generator.eval()
            self.kp_detector.eval()

            if self.device == "cuda":
                self.generator.cuda()
                self.kp_detector.cuda()

            logger.info(f"FOMM loaded on {self.device} from {self.checkpoint_path}")
        except ImportError as e:
            raise RuntimeError(
                f"Cannot import FOMM modules: {e}\n"
                f"Ensure {self.fomm_dir} is a valid first-order-model clone."
            )

    # ─── Animation ────────────────────────────────────────────────────────────

    def animate(
        self,
        source_image: np.ndarray,
        driving_frames: List[np.ndarray],
        relative: bool = True,
        adapt_movement_scale: bool = True,
        progress_cb: Optional[Callable[[int], None]] = None,
    ) -> List[np.ndarray]:
        """
        Animate source_image to reproduce the motion from driving_frames.

        Args:
            source_image:         RGB uint8 array — the target person's portrait.
            driving_frames:       List of RGB uint8 arrays — the driving video frames.
            relative:             Use relative keypoint motion (recommended).
            adapt_movement_scale: Scale motion to match source proportions.
            progress_cb:          Optional callback(percent: int).

        Returns:
            List of RGB uint8 arrays (same count as driving_frames).
        """
        from animate import normalize_kp  # from FOMM repo

        img_size = 256  # FOMM vox model input resolution
        source_resized = resize(source_image, (img_size, img_size))[..., :3].astype(
            np.float32
        )

        driving_resized = [
            resize(f, (img_size, img_size))[..., :3].astype(np.float32)
            for f in driving_frames
        ]

        # torch tensors: (1, C, H, W)
        source_t = (
            torch.tensor(source_resized).permute(2, 0, 1).unsqueeze(0)
        )
        if self.device == "cuda":
            source_t = source_t.cuda()

        predictions: List[np.ndarray] = []

        with torch.no_grad():
            kp_source = self.kp_detector(source_t)

            # Initial driving keypoints for relative motion
            driving_0 = torch.tensor(driving_resized[0]).permute(2, 0, 1).unsqueeze(0)
            if self.device == "cuda":
                driving_0 = driving_0.cuda()
            kp_driving_initial = self.kp_detector(driving_0)

            total = len(driving_resized)
            for idx, drv_frame in enumerate(driving_resized):
                drv_t = torch.tensor(drv_frame).permute(2, 0, 1).unsqueeze(0)
                if self.device == "cuda":
                    drv_t = drv_t.cuda()

                kp_driving = self.kp_detector(drv_t)
                kp_norm = normalize_kp(
                    kp_source=kp_source,
                    kp_driving=kp_driving,
                    kp_driving_initial=kp_driving_initial,
                    use_relative_movement=relative,
                    use_relative_jacobian=relative,
                    adapt_movement_scale=adapt_movement_scale,
                )

                out = self.generator(
                    source_t, kp_source=kp_source, kp_driving=kp_norm
                )
                pred = np.transpose(
                    out["prediction"].data.cpu().numpy(), [0, 2, 3, 1]
                )[0]
                predictions.append(img_as_ubyte(pred))

                if progress_cb:
                    progress_cb(int((idx + 1) / total * 100))

        logger.info(f"FOMM animated {len(predictions)} frames")
        return predictions

    # ─── Convenience: subprocess fallback ────────────────────────────────────

    @classmethod
    def run_demo_script(
        cls,
        fomm_dir: str,
        checkpoint_path: str,
        config_name: str,
        source_image_path: str,
        driving_video_path: str,
        output_video_path: str,
    ) -> None:
        """
        Run FOMM via its demo.py script (fallback if direct import fails).
        Produces an MP4 at output_video_path.
        """
        fomm_dir = Path(fomm_dir)
        config_path = fomm_dir / config_name
        cmd = [
            "python", str(fomm_dir / "demo.py"),
            "--config", str(config_path),
            "--checkpoint", checkpoint_path,
            "--source_image", source_image_path,
            "--driving_video", driving_video_path,
            "--result_video", output_video_path,
            "--relative",
            "--adapt_scale",
        ]
        logger.info(f"Running FOMM demo: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(fomm_dir))
        if result.returncode != 0:
            raise RuntimeError(f"FOMM demo.py failed:\n{result.stderr}")
        logger.info("FOMM demo.py completed successfully")
