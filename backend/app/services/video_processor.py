"""Video processing utilities — frame extraction, audio extraction, reconstruction."""
import cv2
import subprocess
import numpy as np
from pathlib import Path
from typing import List, Tuple, Optional, Callable
import logging
import os
import tempfile

logger = logging.getLogger(__name__)


class VideoProcessor:
    """Handles all video I/O using OpenCV and FFmpeg."""

    # ─── Frame extraction ─────────────────────────────────────────────────────

    def extract_frames(
        self,
        video_path: str,
        max_frames: Optional[int] = None,
        resize_to: Optional[Tuple[int, int]] = None,
        progress_cb: Optional[Callable[[int], None]] = None,
    ) -> Tuple[List[np.ndarray], float, int, int]:
        """
        Extract frames from a video file.

        Returns:
            (frames, fps, width, height)
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise RuntimeError(f"Cannot open video: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        orig_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        orig_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        frames: List[np.ndarray] = []
        idx = 0

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if resize_to:
                frame = cv2.resize(frame, resize_to)

            # OpenCV reads BGR — convert to RGB for model compatibility
            frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            idx += 1

            if progress_cb and total > 0:
                progress_cb(int(idx / total * 100))

            if max_frames and idx >= max_frames:
                break

        cap.release()
        w = resize_to[0] if resize_to else orig_w
        h = resize_to[1] if resize_to else orig_h
        logger.info(f"Extracted {len(frames)} frames @ {fps:.1f}fps from {video_path}")
        return frames, fps, w, h

    # ─── Audio extraction ─────────────────────────────────────────────────────

    def extract_audio(self, video_path: str, output_wav: str) -> bool:
        """Extract audio track to a WAV file (mono, 16 kHz)."""
        cmd = [
            "ffmpeg", "-y", "-i", video_path,
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            output_wav,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.warning(f"Audio extraction failed: {result.stderr}")
            return False
        logger.info(f"Audio extracted to {output_wav}")
        return True

    # ─── Video reconstruction ─────────────────────────────────────────────────

    def frames_to_video(
        self,
        frames: List[np.ndarray],
        output_path: str,
        fps: float,
        audio_path: Optional[str] = None,
        crf: int = 18,
    ) -> str:
        """
        Encode RGB frames into an MP4 file, optionally muxing audio.

        Returns:
            Path to the output video.
        """
        if not frames:
            raise ValueError("No frames provided")

        h, w = frames[0].shape[:2]
        tmp_video = output_path.replace(".mp4", "_noaudio.mp4")

        writer = cv2.VideoWriter(
            tmp_video,
            cv2.VideoWriter_fourcc(*"mp4v"),
            fps,
            (w, h),
        )
        for frame in frames:
            # Convert RGB back to BGR for OpenCV
            writer.write(cv2.cvtColor(frame, cv2.COLOR_RGB2BGR))
        writer.release()

        # Re-encode with libx264 for better quality and compatibility
        tmp_h264 = output_path.replace(".mp4", "_h264.mp4")
        cmd_encode = [
            "ffmpeg", "-y", "-i", tmp_video,
            "-c:v", "libx264", "-crf", str(crf), "-preset", "fast",
            "-pix_fmt", "yuv420p",
            tmp_h264,
        ]
        subprocess.run(cmd_encode, capture_output=True, check=True)
        os.remove(tmp_video)

        if audio_path and os.path.exists(audio_path):
            cmd_mux = [
                "ffmpeg", "-y",
                "-i", tmp_h264,
                "-i", audio_path,
                "-c:v", "copy",
                "-c:a", "aac", "-b:a", "192k",
                "-shortest",
                output_path,
            ]
            subprocess.run(cmd_mux, capture_output=True, check=True)
            os.remove(tmp_h264)
        else:
            os.rename(tmp_h264, output_path)

        logger.info(f"Video written to {output_path}")
        return output_path

    # ─── Helpers ──────────────────────────────────────────────────────────────

    def get_video_info(self, video_path: str) -> dict:
        """Return basic metadata about a video file."""
        cap = cv2.VideoCapture(video_path)
        info = {
            "fps": cap.get(cv2.CAP_PROP_FPS),
            "frame_count": int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
            "width": int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
            "height": int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
            "duration_seconds": 0.0,
        }
        if info["fps"] > 0:
            info["duration_seconds"] = info["frame_count"] / info["fps"]
        cap.release()
        return info

    def load_image(self, image_path: str) -> np.ndarray:
        """Load an image as RGB numpy array."""
        img = cv2.imread(image_path)
        if img is None:
            raise RuntimeError(f"Cannot load image: {image_path}")
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
