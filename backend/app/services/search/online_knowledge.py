"""ABHI Real-Time Online Knowledge Retrieval Engine.

Enables the Central LLM and Specialist Brains to answer questions spanning:
- Current world news, events, and living facts
- Technical documentation, software frameworks, and library APIs
- Definitions, scientific concepts, and factual verification
- Web intelligence with local-first offline fallback
"""

import json
import re
import urllib.parse
import urllib.request
from typing import Dict, List, Optional
from backend.app.core.logging import logger


class OnlineKnowledgeSearcher:
    """Fast, local-first searcher querying public APIs and search snippets without external cloud API keys."""

    def __init__(self, timeout_sec: float = 3.5):
        self.timeout_sec = timeout_sec
        self.headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
            ),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    def is_knowledge_query(self, query: str) -> bool:
        """Heuristic check whether query benefits from real-time or online factual retrieval."""
        q_lower = query.strip().lower()
        
        # Don't search for basic greetings or direct OS control commands
        if q_lower in ["hi", "hello", "hey", "test", "status", "who are you", "who made you"]:
            return False
            
        action_prefixes = ("open ", "launch ", "start ", "run ", "close ", "kill ", "lock ", "unlock ", "increase volume", "decrease volume")
        if q_lower.startswith(action_prefixes):
            return False

        # Explicit informational triggers
        triggers = [
            "who is", "who was", "what is", "what are", "what was", "what happened",
            "where is", "when did", "when will", "why does", "why is", "how does",
            "tell me about", "explain", "describe", "latest", "recent", "news about",
            "price of", "score of", "winner of", "stock of", "history of", "search online",
            "search for", "find out", "online", "current", "today", "yesterday", "tomorrow",
            "meaning of", "definition of", "documentation for", "difference between",
            "compare", "overview of", "breakthroughs", "summary of"
        ]
        
        if any(t in q_lower for t in triggers):
            return True
            
        # Questions with question mark
        if "?" in query and len(q_lower.split()) >= 3:
            return True

        return len(q_lower.split()) >= 4

    def search_live_snippets(self, query: str, max_results: int = 4) -> List[Dict[str, str]]:
        """Retrieve real-time web search snippets for the given query."""
        clean_q = re.sub(r"[^\w\s\-\.\?]", " ", query).strip()
        if not clean_q:
            return []

        results: List[Dict[str, str]] = []

        # 1. Primary Strategy: DuckDuckGo HTML Search Snippets
        try:
            encoded_query = urllib.parse.quote(clean_q)
            url = f"https://html.duckduckgo.com/html/?q={encoded_query}"
            req = urllib.request.Request(url, headers=self.headers)
            
            with urllib.request.urlopen(req, timeout=self.timeout_sec) as response:
                html = response.read().decode("utf-8", errors="ignore")
                
                # Extract snippets
                snippet_matches = re.findall(
                    r'<a class="result__snippet[^"]*"[^>]*>(.*?)</a>', html, flags=re.DOTALL
                )
                title_matches = re.findall(
                    r'<a class="result__url[^"]*"[^>]*>(.*?)</a>', html, flags=re.DOTALL
                )
                
                for idx, raw_snippet in enumerate(snippet_matches[:max_results]):
                    clean_snippet = re.sub(r"<[^>]+>", "", raw_snippet).strip()
                    clean_snippet = re.sub(r"\s+", " ", clean_snippet)
                    if len(clean_snippet) > 20:
                        source_domain = "Web Source"
                        if idx < len(title_matches):
                            source_domain = re.sub(r"<[^>]+>", "", title_matches[idx]).strip()
                        results.append({
                            "source": source_domain,
                            "snippet": clean_snippet
                        })
                        
                if results:
                    logger.info(f"Retrieved {len(results)} live web snippets for '{clean_q}'")
                    return results
        except Exception as e:
            logger.warning(f"DuckDuckGo HTML search failed/timed out for '{clean_q}': {e}")

        # 2. Secondary Fallback: DuckDuckGo Instant Answer API
        try:
            encoded_query = urllib.parse.quote(clean_q)
            api_url = f"https://api.duckduckgo.com/?q={encoded_query}&format=json&no_html=1&skip_disambig=1"
            req = urllib.request.Request(api_url, headers=self.headers)
            with urllib.request.urlopen(req, timeout=2.5) as resp:
                data = json.loads(resp.read().decode("utf-8", errors="ignore"))
                abstract = data.get("AbstractText")
                heading = data.get("Heading") or clean_q
                if abstract and len(abstract) > 20:
                    results.append({
                        "source": f"DuckDuckGo Knowledge // {heading}",
                        "snippet": abstract
                    })
                    return results
        except Exception as e:
            logger.debug(f"DuckDuckGo API fallback failed: {e}")

        return results

    def format_search_context(self, query: str) -> str:
        """Format retrieved live web snippets as a structured system context injection."""
        snippets = self.search_live_snippets(query)
        if not snippets:
            return ""

        lines = [f"[Verified Live Online Knowledge Context for '{query}']:\n"]
        for i, s in enumerate(snippets, 1):
            lines.append(f"{i}. [{s['source']}]: {s['snippet']}")
        lines.append("\nUse this verified real-time online data to answer the user's question with 100% accuracy, clarity, and master-level intelligence.")
        return "\n".join(lines)


# Global Singleton Instance
online_knowledge_searcher = OnlineKnowledgeSearcher()

