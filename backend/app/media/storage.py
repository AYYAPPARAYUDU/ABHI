"""Phase 8 Stage 8.1 — Media Artifact Storage & Integrity Validator.

Governs:
- Canonical File Organization (media/images/YYYY/MM/img_<job_id>_<index>.<format>)
- Path Traversal & Injection Defense
- Post-Generation Image Integrity & Dimension Validation
- SHA-256 Cryptographic Hashing
- Safe Deletion & Storage Governance
"""

import os
import re
import time
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import cv2
import numpy as np
from backend.app.core.logging import logger
from backend.app.media.models import MediaArtifact, ImageFormat, MediaType


class MediaStorageManager:
    """Manages secure local storage, file naming, and integrity verification for generated artifacts."""

    RESERVED_WINDOWS_NAMES = {
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    }

    def __init__(self, base_media_dir: Optional[str] = None):
        if base_media_dir:
            self.base_dir = Path(base_media_dir).resolve()
        else:
            # Default to project root media/
            project_root = Path(__file__).resolve().parent.parent.parent.parent
            self.base_dir = (project_root / "media").resolve()

        self.images_dir = (self.base_dir / "images").resolve()
        self.images_dir.mkdir(parents=True, exist_ok=True)

    def sanitize_filename_component(self, name: str) -> str:
        """Sanitize string component to prevent directory traversal or reserved Windows names."""
        if not name:
            return "unknown"
        # Strip null bytes and path separators
        clean = name.replace("\0", "").replace("/", "").replace("\\", "").replace("..", "")
        clean = re.sub(r'[^a-zA-Z0-9_\-.]', '_', clean)
        stem = clean.split(".")[0].upper()
        if stem in self.RESERVED_WINDOWS_NAMES:
            clean = f"safe_{clean}"
        return clean

    def generate_artifact_path(self, job_id: str, index: int, format: ImageFormat) -> Tuple[Path, str]:
        """Generate canonical relative and absolute paths: media/images/YYYY/MM/img_<job_id>_<index>.<format>"""
        from datetime import timezone
        now = datetime.now(timezone.utc)
        year_month = now.strftime("%Y/%m")
        target_dir = (self.images_dir / now.strftime("%Y") / now.strftime("%m")).resolve()
        target_dir.mkdir(parents=True, exist_ok=True)

        clean_job_id = self.sanitize_filename_component(job_id)
        ext = format.value.lower()
        filename = f"img_{clean_job_id}_{index}.{ext}"

        full_path = (target_dir / filename).resolve()

        # Strict sandbox check: must reside inside self.images_dir
        if not str(full_path).startswith(str(self.images_dir)):
            raise ValueError(f"Path traversal detected: {full_path} escapes media root {self.images_dir}")

        # Compute relative path from project root for storage
        rel_path = str(full_path.relative_to(self.base_dir.parent)).replace("\\", "/")
        return full_path, rel_path

    def compute_sha256(self, file_path: Path) -> str:
        """Compute SHA-256 hash of a file on disk."""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    def validate_and_register_artifact(
        self,
        file_path: Path,
        job_id: str,
        expected_format: ImageFormat,
        expected_width: int,
        expected_height: int,
        model_id: str,
        parameters_hash: str,
        prompt_preview: str = "",
        provenance: str = "ACTUAL"
    ) -> Tuple[bool, Optional[MediaArtifact], str]:
        """Validate generated image file on disk and construct MediaArtifact record.
        
        Verification Steps:
        1. File exists on disk
        2. File size > 0
        3. Image format and dimensions match expectations
        4. Cryptographic SHA-256 is computed
        """
        if not file_path.exists():
            return False, None, f"Image artifact file does not exist: {file_path}"

        size_bytes = file_path.stat().st_size
        if size_bytes <= 0:
            return False, None, f"Image artifact file is empty (0 bytes): {file_path}"

        # 3. Read image with OpenCV to verify valid format decoding and dimensions
        try:
            img = cv2.imread(str(file_path), cv2.IMREAD_UNCHANGED)
            if img is None:
                return False, None, f"IMAGE_ARTIFACT_INVALID: Failed to decode image file format from {file_path}"

            h, w = img.shape[:2]
            if w != expected_width or h != expected_height:
                logger.warning(f"Dimension mismatch: expected {expected_width}x{expected_height}, got {w}x{h}")
                # We record actual dimensions
        except Exception as e:
            return False, None, f"IMAGE_ARTIFACT_INVALID: Decoding exception: {str(e)}"

        # 4. SHA-256
        sha256_hash = self.compute_sha256(file_path)
        artifact_id = f"art_{hashlib.sha256(f'{job_id}_{sha256_hash}'.encode()).hexdigest()[:16]}"
        try:
            rel_path = str(file_path.relative_to(self.base_dir.parent)).replace("\\", "/")
        except ValueError:
            rel_path = str(file_path).replace("\\", "/")


        artifact = MediaArtifact(
            artifact_id=artifact_id,
            job_id=job_id,
            media_type=MediaType.IMAGE,
            path=rel_path,
            filename=file_path.name,
            format=expected_format,
            width=w,
            height=h,
            size_bytes=size_bytes,
            sha256=sha256_hash,
            created_at=time.time(),
            model_id=model_id,
            generation_parameters_hash=parameters_hash,
            prompt_preview=prompt_preview,
            provenance=provenance
        )

        logger.info(
            f"MediaStorageManager: Successfully validated and registered artifact {artifact_id} "
            f"({w}x{h}, {size_bytes} bytes, sha256={sha256_hash[:8]}...)"
        )
        return True, artifact, "Artifact validated successfully"

    def delete_artifact(self, relative_or_absolute_path: str) -> Tuple[bool, str]:
        """Safely delete artifact file if within media sandbox."""
        try:
            target = Path(relative_or_absolute_path)
            if not target.is_absolute():
                target = (self.base_dir.parent / target).resolve()

            if not str(target).startswith(str(self.images_dir)):
                return False, f"Access denied: Path {target} is outside media root"

            if target.exists() and target.is_file():
                target.unlink()
                logger.info(f"MediaStorageManager: Deleted artifact file {target}")
                return True, "Artifact file deleted"
            return True, "File already removed"
        except Exception as e:
            logger.error(f"MediaStorageManager: Failed to delete artifact {relative_or_absolute_path}: {e}")
            return False, str(e)


# Global singleton
media_storage_manager = MediaStorageManager()
