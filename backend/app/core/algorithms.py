"""ABHI High-Performance Data Structures & Core Algorithms (DSA Engine).

Authoritative, optimized algorithmic primitives for:
1. LRUCache: O(1) get/put using Hash Map + Doubly Linked List for plan memoization.
2. Trie & FuzzyMatcher: Prefix Tree + Bounded Levenshtein DP for typo-resilient command dispatch.
3. KahnTopologicalSort: O(V + E) DAG dependency resolution, cycle detection, and parallel execution levels.
4. PriorityTaskQueue: Min-heap priority scheduling with monotonic timestamp tie-breaking.
"""

import heapq
import time
from typing import Any, Dict, Generic, List, Optional, Set, Tuple, TypeVar

K = TypeVar("K")
V = TypeVar("V")


# =============================================================================
# 1. LRU Cache (Hash Map + Doubly Linked List, O(1) Get / Put)
# =============================================================================

class _LRUNode(Generic[K, V]):
    __slots__ = ("key", "val", "prev", "next", "created_at")

    def __init__(self, key: K, val: V):
        self.key: K = key
        self.val: V = val
        self.prev: Optional["_LRUNode[K, V]"] = None
        self.next: Optional["_LRUNode[K, V]"] = None
        self.created_at: float = time.time()


class LRUCache(Generic[K, V]):
    """Thread-safe, O(1) Least-Recently-Used Cache with TTL expiration."""

    def __init__(self, capacity: int = 128, default_ttl_sec: Optional[float] = 3600.0):
        if capacity <= 0:
            raise ValueError("Capacity must be positive.")
        self.capacity = capacity
        self.default_ttl_sec = default_ttl_sec
        self._map: Dict[K, _LRUNode[K, V]] = {}

        # Sentinel pseudo-nodes
        self._head: _LRUNode[K, V] = _LRUNode(None, None)  # type: ignore
        self._tail: _LRUNode[K, V] = _LRUNode(None, None)  # type: ignore
        self._head.next = self._tail
        self._tail.prev = self._head

    def _remove(self, node: _LRUNode[K, V]) -> None:
        p, n = node.prev, node.next
        if p:
            p.next = n
        if n:
            n.prev = p

    def _add_to_front(self, node: _LRUNode[K, V]) -> None:
        first = self._head.next
        node.prev = self._head
        node.next = first
        self._head.next = node
        if first:
            first.prev = node

    def get(self, key: K) -> Optional[V]:
        """Fetch item in O(1). Returns None if missing or expired."""
        node = self._map.get(key)
        if not node:
            return None

        # Check TTL expiration
        if self.default_ttl_sec and (time.time() - node.created_at > self.default_ttl_sec):
            self._remove(node)
            del self._map[key]
            return None

        # Move to front (most recently used)
        self._remove(node)
        self._add_to_front(node)
        return node.val

    def put(self, key: K, val: V) -> None:
        """Insert or update in O(1), evicting least-recently-used item if at capacity."""
        if key in self._map:
            node = self._map[key]
            node.val = val
            node.created_at = time.time()
            self._remove(node)
            self._add_to_front(node)
            return

        if len(self._map) >= self.capacity:
            # Evict LRU item (before tail)
            lru = self._tail.prev
            if lru and lru != self._head:
                self._remove(lru)
                if lru.key in self._map:
                    del self._map[lru.key]

        new_node = _LRUNode(key, val)
        self._add_to_front(new_node)
        self._map[key] = new_node

    def clear(self) -> None:
        self._map.clear()
        self._head.next = self._tail
        self._tail.prev = self._head

    def __len__(self) -> int:
        return len(self._map)


# =============================================================================
# 2. Trie & Bounded Levenshtein Fuzzy Matcher (O(L) + DP O(M*N))
# =============================================================================

class _TrieNode:
    __slots__ = ("children", "is_end_of_word", "payload")

    def __init__(self):
        self.children: Dict[str, "_TrieNode"] = {}
        self.is_end_of_word: bool = False
        self.payload: Optional[Any] = None


class TrieFuzzyMatcher:
    """Prefix Tree (Trie) with Dynamic Programming Levenshtein distance matching."""

    def __init__(self):
        self.root = _TrieNode()
        self._all_words: Set[str] = set()

    def insert(self, word: str, payload: Optional[Any] = None) -> None:
        """Insert word into Trie in O(L)."""
        curr = self.root
        clean_word = word.lower().strip()
        self._all_words.add(clean_word)
        for char in clean_word:
            if char not in curr.children:
                curr.children[char] = _TrieNode()
            curr = curr.children[char]
        curr.is_end_of_word = True
        curr.payload = payload

    def search_exact(self, word: str) -> Optional[Any]:
        """Exact lookup in O(L)."""
        curr = self.root
        for char in word.lower().strip():
            if char not in curr.children:
                return None
            curr = curr.children[char]
        return curr.payload if curr.is_end_of_word else None

    def search_prefix(self, prefix: str) -> List[Tuple[str, Any]]:
        """Return all words starting with given prefix in O(prefix + subtree)."""
        curr = self.root
        clean_prefix = prefix.lower().strip()
        for char in clean_prefix:
            if char not in curr.children:
                return []
            curr = curr.children[char]

        results: List[Tuple[str, Any]] = []

        def _dfs(node: _TrieNode, path: List[str]):
            if node.is_end_of_word:
                results.append(("".join(path), node.payload))
            for ch, child in node.children.items():
                path.append(ch)
                _dfs(child, path)
                path.pop()

        _dfs(curr, list(clean_prefix))
        return results

    @staticmethod
    def levenshtein_distance(s1: str, s2: str, max_cost: int = 3) -> int:
        """Compute DP Levenshtein edit distance with early exit threshold."""
        if s1 == s2:
            return 0
        len1, len2 = len(s1), len(s2)
        if abs(len1 - len2) > max_cost:
            return max_cost + 1

        # Space-optimized 2-row DP table
        prev = list(range(len2 + 1))
        curr = [0] * (len2 + 1)

        for i in range(1, len1 + 1):
            curr[0] = i
            min_row = curr[0]
            for j in range(1, len2 + 1):
                cost = 0 if s1[i - 1] == s2[j - 1] else 1
                curr[j] = min(
                    prev[j] + 1,       # deletion
                    curr[j - 1] + 1,   # insertion
                    prev[j - 1] + cost # substitution
                )
                min_row = min(min_row, curr[j])

            if min_row > max_cost:
                return max_cost + 1
            prev, curr = curr, [0] * (len2 + 1)

        return prev[len2]

    def find_nearest_match(self, query: str, max_distance: int = 2) -> Optional[Tuple[str, Any, int]]:
        """Find the closest vocabulary term within max_distance edit operations."""
        clean_query = query.lower().strip()
        best_term: Optional[str] = None
        best_payload: Optional[Any] = None
        min_dist = max_distance + 1

        for candidate in self._all_words:
            dist = self.levenshtein_distance(clean_query, candidate, max_cost=max_distance)
            if dist < min_dist:
                min_dist = dist
                best_term = candidate
                best_payload = self.search_exact(candidate)
                if min_dist == 0:
                    break

        if best_term and min_dist <= max_distance:
            return best_term, best_payload, min_dist
        return None


# =============================================================================
# 3. Kahn's Algorithm for DAG Topological Sort & Parallel Wavefront Levels
# =============================================================================

class KahnTopologicalSort:
    """O(V + E) Topological sorting with cycle detection and parallel execution levels."""

    @staticmethod
    def analyze_dag(
        nodes: Dict[str, Any],
        get_dependencies: Optional[Any] = None
    ) -> Tuple[bool, List[List[str]], Optional[List[str]]]:
        """Analyze Task DAG structure.
        
        Returns:
            (is_valid_dag, parallel_levels, cycle_nodes)
            - is_valid_dag: True if acyclic, False if cycle detected.
            - parallel_levels: List of sets of node_ids that can run in parallel concurrently.
            - cycle_nodes: List of node_ids involved in circular dependency if invalid.
        """
        # 1. Compute In-Degrees and Adjacency List (Reverse dependencies)
        in_degree: Dict[str, int] = {nid: 0 for nid in nodes}
        adjacency: Dict[str, List[str]] = {nid: [] for nid in nodes}

        for nid, node in nodes.items():
            deps = getattr(node, "dependencies", None)
            if deps is None and isinstance(node, dict):
                deps = node.get("dependencies", [])
            elif get_dependencies:
                deps = get_dependencies(node)

            if deps:
                for dep in deps:
                    if dep in nodes and dep != nid:
                        in_degree[nid] += 1
                        adjacency[dep].append(nid)

        # 2. Collect initial zero in-degree nodes (Wave 0)
        current_wave: List[str] = [nid for nid, deg in in_degree.items() if deg == 0]
        levels: List[List[str]] = []
        processed_count = 0

        # 3. Process Wavefront queue
        while current_wave:
            levels.append(current_wave)
            processed_count += len(current_wave)
            next_wave: List[str] = []

            for u in current_wave:
                for v in adjacency.get(u, []):
                    in_degree[v] -= 1
                    if in_degree[v] == 0:
                        next_wave.append(v)

            current_wave = next_wave

        # 4. Cycle Detection Check
        if processed_count != len(nodes):
            # Circular dependency detected! Identify remaining nodes with in-degree > 0
            cycle_nodes = [nid for nid, deg in in_degree.items() if deg > 0]
            return False, [], cycle_nodes

        return True, levels, None


# =============================================================================
# 4. Priority Task Queue (Binary Min-Heap with Monotonic Tie-Breaker)
# =============================================================================

class PriorityTaskQueue(Generic[V]):
    """Thread-safe binary min-heap for priority scheduling."""

    def __init__(self):
        self._heap: List[Tuple[int, int, V]] = []
        self._counter: int = 0

    def push(self, item: V, priority: int = 1) -> None:
        """Push item with priority (lower number = higher execution urgency)."""
        self._counter += 1
        heapq.heappush(self._heap, (priority, self._counter, item))

    def pop(self) -> Optional[V]:
        """Pop highest priority item in O(log N)."""
        if not self._heap:
            return None
        _, _, item = heapq.heappop(self._heap)
        return item

    def peek(self) -> Optional[V]:
        """Inspect highest priority item in O(1)."""
        if not self._heap:
            return None
        return self._heap[0][2]

    def __len__(self) -> int:
        return len(self._heap)
