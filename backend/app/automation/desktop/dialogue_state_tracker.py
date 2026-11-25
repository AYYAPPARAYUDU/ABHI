"""
ABHI Sovereign Dialogue State Tracker (DST) & Contextual Carryover Engine.
Inspired by Amazon Alexa Conversations & Multi-Modal Screen Grounding.
Tracks active dialogue sessions, short-term entity stacks, and demonstrative pronoun resolution.
100% Real World Data — Zero Mock Seeds.
"""

import time
import re
from typing import Dict, Any, List, Optional, Tuple


class DialogueStateTracker:
    """Manages short-term conversation state, pronoun resolution ('it', 'that'), and follow-up window."""

    def __init__(self):
        self.last_target_entity: Optional[str] = None
        self.last_clicked_coords: Optional[Tuple[int, int]] = None
        self.last_action_type: Optional[str] = None
        self.last_action_time: float = 0.0
        self.visible_entities: List[str] = []
        self.active_media_metadata: Dict[str, Any] = {}
        self.follow_up_window_sec: float = 8.0  # 8-second continuous conversational follow-up

    def record_media_context(self, title: str, description: str = "", metadata: Optional[Dict[str, Any]] = None) -> None:
        """Record active media playback context for contextual follow-up queries."""
        self.active_media_metadata = {
            "title": title,
            "description": description,
            "metadata": metadata or {},
            "timestamp": time.time()
        }
        self.push_entity(title, entity_type="media")

    def push_entity(self, entity: str, entity_type: str = "generic", metadata: Optional[Dict[str, Any]] = None) -> None:
        """Push an entity onto the short-term dialogue stack."""
        clean_target = entity.strip()
        if clean_target.lower() not in ["it", "that", "this", "them", "one", "him", "her", "video", "movie", "song"]:
            self.last_target_entity = clean_target
            if clean_target not in self.visible_entities:
                self.visible_entities.insert(0, clean_target)
            self.last_action_time = time.time()

    def record_action(self, action_type: str, target_entity: Optional[str] = None, coords: Optional[Tuple[int, int]] = None) -> None:
        """Record an executed action and its target into conversational memory."""
        self.last_action_type = action_type
        self.last_action_time = time.time()
        if target_entity and len(target_entity.strip()) > 1:
            clean_target = target_entity.strip()
            # Avoid recording pronouns as entities
            if clean_target.lower() not in ["it", "that", "this", "them", "one", "him", "her", "video", "movie", "song"]:
                self.last_target_entity = clean_target
        if coords:
            self.last_clicked_coords = coords

    def record_visible_entities(self, entities: List[str]) -> None:
        """Record on-screen detected items (e.g. movie titles or buttons)."""
        if entities:
            self.visible_entities = entities
            if not self.last_target_entity and len(entities) > 0:
                self.last_target_entity = entities[0]

    def is_in_follow_up_window(self) -> bool:
        """Check if we are within the Alexa-style active conversational follow-up window."""
        return (time.time() - self.last_action_time) < self.follow_up_window_sec

    def resolve_demonstrative_pronoun(self, query: str) -> Optional[str]:
        """
        Resolves phrases like 'click it', 'play it', 'open that', 'click that one'
        to the active entity in conversational memory.
        """
        q = query.lower().strip()
        pronoun_patterns = [
            r"^(?:ok\s+)?(?:please\s+)?(?:click|play|open|tap|select|press|pause|resume)\s+(?:on\s+)?(?:it|that|this|that\s+one|the\s+one|this\s+video|that\s+video|the\s+video)$",
            r"^(?:click|play|open|select|pause|resume)\s+(?:it|this|that|the\s+video|this\s+video)$",
            r"^(?:it|that|this|this\s+video|that\s+video|the\s+video)$",
            r"^click\s+it\s+now$",
            r"^play\s+it\s+now$",
            r"^open\s+it\s+now$",
            r"^it$"
        ]

        for pat in pronoun_patterns:
            if re.match(pat, q):
                if self.last_target_entity:
                    return self.last_target_entity
                elif self.visible_entities:
                    return self.visible_entities[0]

        return None

    def get_last_entity(self) -> Optional[str]:
        return self.last_target_entity

    def clear(self) -> None:
        self.last_target_entity = None
        self.last_clicked_coords = None
        self.last_action_type = None
        self.visible_entities.clear()


# Global Singleton
dialogue_state = DialogueStateTracker()
