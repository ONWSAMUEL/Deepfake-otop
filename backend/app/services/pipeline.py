"""
Main deepfake processing pipeline.

Steps:
  1. Extract frames & audio from source (driving) video.
  2. FOMM: animate target person image using driving frames → animated video.
  3. Wav2Lip: sync lips of animated video with source audio → final result.
"""
import os
import uuid
import logging
import tempfile
from pathlib import Path
from typing import Callable, Optional

from app.config import settings
from app.services.video_processor import VideoProcessor
from app.services.fomm_processor import FOMMProcessor
from app.services.lip_sync import LipSyncService
from app.models.schemas import JobOptions, ProcessingStep

logger = logging.getLogger(__name__)


class DeepfakePipeline:
    """Orchestrates the full deepfake pipeline."""

    def __init__(self):
        self.video_proc = VideoProcessor()
        self._fomm: Optional[FOMMProcessor] = None
        self._lip_sync: Optional[LipSyncService] = None

    # ─── Lazy model loading ───────────────────────────────────────────────────

    def _get_fomm(self) -> FOMMProcessor:
        if self._fomm is None:
            self._fomm = FOMMProcessor(
                fomm_dir=str(settings.FOMM_DIR),
                checkpoint_path=str(settings.FOMM_CHECKPOINT),
                device=settings.PROCESSING_DEVICE,
            )
        return self._fomm

    def _get_lip_sync(self) -> LipSyncService:
        if self._lip_sync is None:
            self._lip_sync = LipSyncService(
                wav2lip_dir=str(settings.WAV2LIP_DIR),
                checkpoint_path=str(settings.WAV2LIP_CHECKPOINT),
            )
        return self._lip_sync

    # ─── Main entry point ─────────────────────────────────────────────────────

    def process(
        self,
        source_video_path: str,
        target_image_path: str,
        output_path: str,
        options: JobOptions,
        progress_cb: Optional[Callable[[str, int, str], None]] = None,
    ) -> str:
        """
        Run the full pipeline.

        Args:
            source_video_path: Path to the driving video (provides motion + audio).
            target_image_path: Path to the target person image.
            output_path:       Where to write the final output video.
            options:           Processing options.
            progress_cb:       Called as (step_name, percent, message).

        Returns:
            Path to the final output video.
        """
        def _cb(step: str, pct: int, msg: str = ""):
            if progress_cb:
                progress_cb(step, pct, msg)

        with tempfile.TemporaryDirectory(prefix="dfotop_") as tmp:
            tmp = Path(tmp)

            # ── Step 1: Extract audio ─────────────────────────────────────────
            _cb(ProcessingStep.EXTRACTING_AUDIO, 5, "Extraction de l'audio...")
            audio_path = str(tmp / "audio.wav")
            has_audio = self.video_proc.extract_audio(source_video_path, audio_path)

            # ── Step 2: Extract frames ────────────────────────────────────────
            _cb(ProcessingStep.EXTRACTING_FRAMES, 10, "Extraction des frames...")
            frames, fps, w, h = self.video_proc.extract_frames(
                source_video_path,
                max_frames=None,
            )
            if not frames:
                raise RuntimeError("La vidéo source ne contient aucune frame lisible.")

            # ── Step 3: Load target image ─────────────────────────────────────
            target_image = self.video_proc.load_image(target_image_path)

            # ── Step 4: FOMM animation ────────────────────────────────────────
            _cb(ProcessingStep.RUNNING_FOMM, 15, "Chargement du modèle FOMM...")

            def fomm_progress(pct: int):
                mapped = 15 + int(pct * 0.50)  # 15 → 65 %
                _cb(ProcessingStep.RUNNING_FOMM, mapped, f"FOMM: frame {pct}%")

            fomm = self._get_fomm()
            animated_frames = fomm.animate(
                source_image=target_image,
                driving_frames=frames,
                relative=options.relative_motion,
                adapt_movement_scale=options.adapt_movement_scale,
                progress_cb=fomm_progress,
            )

            # ── Step 5: Rebuild intermediate video (for Wav2Lip input) ────────
            _cb(ProcessingStep.RECONSTRUCTING_VIDEO, 65, "Reconstruction intermédiaire...")
            animated_video_path = str(tmp / "animated.mp4")
            self.video_proc.frames_to_video(
                animated_frames,
                animated_video_path,
                fps,
                audio_path=audio_path if has_audio else None,
            )

            # ── Step 6: Wav2Lip lip sync ──────────────────────────────────────
            if options.lip_sync and has_audio:
                _cb(ProcessingStep.RUNNING_LIP_SYNC, 70, "Synchronisation labiale...")
                lip_synced_path = str(tmp / "lip_synced.mp4")
                self._get_lip_sync().sync(
                    face_video_path=animated_video_path,
                    audio_path=audio_path,
                    output_path=lip_synced_path,
                )
                final_source = lip_synced_path
            else:
                final_source = animated_video_path

            # ── Step 7: Move to output ────────────────────────────────────────
            _cb(ProcessingStep.UPLOADING_RESULT, 95, "Sauvegarde du résultat...")
            import shutil
            shutil.copy2(final_source, output_path)

        _cb(ProcessingStep.UPLOADING_RESULT, 100, "Terminé !")
        logger.info(f"Pipeline complete → {output_path}")
        return output_path


# Singleton
pipeline = DeepfakePipeline()
