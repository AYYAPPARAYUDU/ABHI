"""Phase 8 Stage 8.5 — Creative Asset Planner & Smart Cache Engine.

Responsibilities:
- Identifies required assets from Storyboards, Scenes, and Timelines
- Queries local artifact registries for existing valid artifacts by parameter/input hash
- Prevents redundant diffusion synthesis via CreativeCache
- Preserves complete asset lineage, provenance, and reuse metrics
"""

import hashlib
import json
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

from backend.app.media.creative_models import (
    CreativeAsset,
    CreativeAssetType,
    Scene,
    Storyboard,
    MediaTimeline,
)
from backend.app.media.storage import MediaStorageManager
from backend.app.media.video_storage import VideoStorageManager

logger = logging.getLogger(__name__)


class CreativeCache:
    """In-memory and disk-consistent cache for verified intermediate creative assets."""

    def __init__(self):
        self._cache: Dict[str, CreativeAsset] = {}

    def compute_cache_key(
        self,
        asset_type: CreativeAssetType,
        skill_id: str,
        parameters: Dict[str, Any],
        model_id: Optional[str] = None,
        model_digest: Optional[str] = None,
        seed: Optional[int] = None,
        parent_hashes: Optional[List[str]] = None,
    ) -> str:
        """Computes a deterministic cache key over operation inputs and model specifications."""
        key_dict = {
            "asset_type": asset_type.value,
            "skill_id": skill_id,
            "parameters": parameters,
            "model_id": model_id or "",
            "model_digest": model_digest or "",
            "seed": seed or 0,
            "parent_hashes": sorted(parent_hashes or []),
        }
        encoded = json.dumps(key_dict, sort_keys=True).encode("utf-8")
        return hashlib.sha256(encoded).hexdigest()

    def get(self, cache_key: str) -> Optional[CreativeAsset]:
        """Retrieves a cached asset if present and valid."""
        return self._cache.get(cache_key)

    def put(self, cache_key: str, asset: CreativeAsset) -> None:
        """Stores a verified asset in the cache."""
        self._cache[cache_key] = asset

    def invalidate(self, cache_key: str) -> bool:
        """Removes a cache entry."""
        return self._cache.pop(cache_key, None) is not None

    def clear(self) -> None:
        """Clears all cached entries."""
        self._cache.clear()

    def count(self) -> int:
        return len(self._cache)


class AssetPlanner:
    """Plans, resolves, and binds assets across creative scenes and workflows."""

    def __init__(
        self,
        image_storage: Optional[MediaStorageManager] = None,
        video_storage: Optional[VideoStorageManager] = None,
        cache: Optional[CreativeCache] = None,
    ):
        self.image_storage = image_storage or MediaStorageManager()
        self.video_storage = video_storage or VideoStorageManager()
        self.cache = cache or CreativeCache()

    def plan_scene_assets(
        self,
        scenes: List[Scene],
        storyboard: Optional[Storyboard] = None,
        style_notes: Optional[str] = None,
    ) -> Tuple[List[CreativeAsset], int]:
        """Analyzes scenes and storyboard to identify existing vs required assets.

        Returns:
            Tuple of (planned_assets, reused_count)
        """
        planned_assets: List[CreativeAsset] = []
        reused_count = 0

        # Build map of storyboard scenes
        sb_map = {s.scene_id: s for s in (storyboard.scenes if storyboard else [])}

        for scene in scenes:
            sb_scene = sb_map.get(scene.scene_id)
            prompt = (
                sb_scene.visual_prompt
                if sb_scene
                else f"Scene {scene.order} visual representation"
            )
            if style_notes:
                prompt = f"{prompt}, {style_notes}"

            # Check for image asset
            img_cache_key = self.cache.compute_cache_key(
                asset_type=CreativeAssetType.IMAGE,
                skill_id="media.image.generate",
                parameters={"prompt": prompt},
            )

            cached_img = self.cache.get(img_cache_key)
            if cached_img:
                reused_asset = cached_img.model_copy(update={"is_reused": True})
                planned_assets.append(reused_asset)
                scene.visual_assets.append(reused_asset.asset_id)
                reused_count += 1
            else:
                # Check storage registry for pre-existing matching prompt
                existing_art = self._find_matching_image_artifact(prompt)
                if existing_art:
                    asset = CreativeAsset(
                        artifact_id=existing_art.artifact_id,
                        asset_type=CreativeAssetType.IMAGE,
                        source="REUSED",
                        model_id=getattr(existing_art, "model_id", "local-diffusion"),
                        parameters_hash=img_cache_key,
                        content_hash=getattr(existing_art, "sha256", ""),
                        file_path=str(existing_art.file_path),
                        size_bytes=getattr(existing_art, "size_bytes", 0),
                        is_reused=True,
                    )
                    self.cache.put(img_cache_key, asset)
                    planned_assets.append(asset)
                    scene.visual_assets.append(asset.asset_id)
                    reused_count += 1
                else:
                    # New asset will be generated by pipeline
                    new_asset = CreativeAsset(
                        artifact_id=f"pending_art_img_{scene.scene_id}",
                        asset_type=CreativeAssetType.IMAGE,
                        source="GENERATED",
                        parameters_hash=img_cache_key,
                        is_reused=False,
                    )
                    planned_assets.append(new_asset)
                    scene.visual_assets.append(new_asset.asset_id)

        return planned_assets, reused_count

    def register_generated_asset(
        self,
        artifact_id: str,
        asset_type: CreativeAssetType,
        skill_id: str,
        parameters: Dict[str, Any],
        model_id: Optional[str] = None,
        model_digest: Optional[str] = None,
        file_path: Optional[str] = None,
        size_bytes: int = 0,
        content_hash: str = "",
        parent_assets: Optional[List[str]] = None,
    ) -> CreativeAsset:
        """Registers a newly synthesized artifact into the asset plan and cache."""
        cache_key = self.cache.compute_cache_key(
            asset_type=asset_type,
            skill_id=skill_id,
            parameters=parameters,
            model_id=model_id,
            model_digest=model_digest,
        )

        asset = CreativeAsset(
            artifact_id=artifact_id,
            asset_type=asset_type,
            source="GENERATED",
            model_id=model_id,
            model_digest=model_digest,
            file_path=file_path,
            size_bytes=size_bytes,
            content_hash=content_hash,
            parent_assets=parent_assets or [],
            parameters_hash=cache_key,
            is_reused=False,
        )

        self.cache.put(cache_key, asset)
        return asset

    def _find_matching_image_artifact(self, prompt: str) -> Optional[Any]:
        """Looks up existing registered image artifacts with matching prompt."""
        try:
            for art in self.image_storage.list_artifacts():
                meta = getattr(art, "metadata", {})
                if meta.get("prompt") == prompt or getattr(art, "prompt", None) == prompt:
                    return art
        except Exception as e:
            logger.debug(f"Image artifact search encountered error: {e}")
        return None
