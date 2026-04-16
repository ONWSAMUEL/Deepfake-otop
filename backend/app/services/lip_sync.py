"""
Wav2Lip lip synchronisation service.

Synchronises lip movements on an animated video to match the audio from the source video.

References:
  - Paper: "A Lip Sync Expert Is All You Need for Speech to Lip Generation In the Wild"
  - Repo:  https://github.com/Rudrabha/Wav2Lip
"""
import subprocess
import logging
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


class LipSyncService:
    """Wraps Wav2Lip inference.py for lip synchronisation."""

    def __init__(self, wav2lip_dir: str, checkpoint_path: str):
        self.wav2lip_dir = Path(wav2lip_dir)
        self.checkpoint_path = Path(checkpoint_path)
        self._validate()

    def _validate(self):
        if not self.wav2lip_dir.exists():
            raise RuntimeError(
                f"Wav2Lip directory not found: {self.wav2lip_dir}\n"
                "Run scripts/setup_models.sh to download it."
            )
        if not self.checkpoint_path.exists():
            raise RuntimeError(
                f"Wav2Lip checkpoint not found: {self.checkpoint_path}\n"
                "Run scripts/setup_models.sh to download it."
            )

    def sync(
        self,
        face_video_path: str,
        audio_path: str,
        output_path: str,
        pads: tuple = (0, 10, 0, 0),
        resize_factor: int = 1,
        nosmooth: bool = True,
    ) -> str:
        """
        Run Wav2Lip to sync lips on face_video_path using audio_path.

        Args:
            face_video_path: Input video with the (possibly animated) face.
            audio_path:      WAV audio source (from the original driving video).
            output_path:     Where to write the lip-synced result.
            pads:            Padding (top, bottom, left, right) for face crop.
            resize_factor:   Downscale factor for faster inference (1 = full res).
            nosmooth:        Disable temporal smoothing of face detections.

        Returns:
            Path to the output video.
        """
        inference_script = self.wav2lip_dir / "inference.py"

        cmd = [
            "python", str(inference_script),
            "--checkpoint_path", str(self.checkpoint_path),
            "--face", face_video_path,
            "--audio", audio_path,
            "--outfile", output_path,
            "--pads", *[str(p) for p in pads],
            "--resize_factor", str(resize_factor),
        ]
        if nosmooth:
            cmd.append("--nosmooth")

        logger.info(f"Running Wav2Lip: {' '.join(cmd)}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(self.wav2lip_dir),
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"Wav2Lip inference failed:\n{result.stderr[-2000:]}"
            )

        if not os.path.exists(output_path):
            raise RuntimeError(
                f"Wav2Lip did not produce output at {output_path}"
            )

        logger.info(f"Lip sync complete → {output_path}")
        return output_path
