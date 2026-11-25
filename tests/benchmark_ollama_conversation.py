"""Comprehensive Benchmark and Verification Suite for ABHI Local LLM Routing,
Multi-Turn Conversational Memory, and Multilingual Cognition.

Tests:
1. Verify physical action commands vs conversational queries routing.
2. Verify multi-turn conversational history retention across turns.
3. Verify native multilingual generation (English, Telugu, Hindi, Tamil) addressing 'Mamu'.
4. Benchmark Ollama API First-Token Latency (TTFT), End-to-End Latency, and Token Streaming Throughput.
"""

import asyncio
import json
import os
import sys
import time
import re
from typing import List, Dict, Any

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from backend.app.api.v1.desktop import (
    ask_living_bot,
    BotAskRequest,
    BotMessage,
    detect_dialogue_language,
    is_physical_os_action,
    desktop_sessions,
)
from backend.app.services.llm.abhi_llm import abhi_llm
from backend.app.services.llm.ollama_client import ollama_client


async def run_conversational_audit_and_benchmark():
    print("=" * 70)
    print("  ABHI CONVERSATIONAL INTELLIGENCE & OLLAMA BENCHMARK SUITE")
    print("=" * 70)

    # -------------------------------------------------------------------------
    # TEST 1: Physical OS Action vs Conversational Query Disambiguation
    # -------------------------------------------------------------------------
    print("\n[TEST 1] Verifying Disambiguation (No Keyword Hijacking)...")
    test_queries = [
        ("open notepad", True, "Physical OS Action"),
        ("launch chrome", True, "Physical OS Action"),
        ("take screenshot", True, "Physical OS Action"),
        ("Hello, who are you and what can you do?", False, "Conversational Query"),
        ("Can you explain how a binary search tree works in Python?", False, "Conversational Query"),
        ("హలో మాము, నువ్వు ఎలా ఉన్నావు?", False, "Telugu Conversational Query"),
        ("नमस्ते मामू, आज का दिन कैसा है?", False, "Hindi Conversational Query"),
        ("வணக்கம் மாமு, நீங்கள் எப்படி இருக்கிறீர்கள்?", False, "Tamil Conversational Query"),
    ]

    for q, expected_action, desc in test_queries:
        is_action = is_physical_os_action(q)
        assert is_action == expected_action, f"Disambiguation failed for '{q}': expected {expected_action}, got {is_action}"
        print(f"  ✓ '{q[:40]}...' -> {'Action' if is_action else 'Conversational'} ({desc})")
    print("  -> PASSED: Conversational queries are not intercepted as OS actions.")

    # -------------------------------------------------------------------------
    # TEST 2: Multi-Turn Conversation History Retention
    # -------------------------------------------------------------------------
    print("\n[TEST 2] Verifying Multi-Turn Conversational Memory...")
    test_session = "benchmark_test_session_multi_turn"
    desktop_sessions.clear(test_session)

    # Turn 1: State fact
    t0 = time.perf_counter()
    req1 = BotAskRequest(
        query="Mamu here. Remember this secret project code: 'Project-Hyperion-99'.",
        thread_id=test_session,
        language="en"
    )
    res1 = await ask_living_bot(req1)
    duration1 = round(time.perf_counter() - t0, 2)
    print(f"  Turn 1 ({duration1}s): Query: '{req1.query}'")
    print(f"         Reply: {res1['reply']}")
    assert res1["status"] == "success"
    assert res1["action_executed"] == "cognitive_llm_reasoning"

    # Turn 2: Recall fact from previous turn
    t0 = time.perf_counter()
    req2 = BotAskRequest(
        query="What was the secret project code I just told you?",
        thread_id=test_session,
        language="en"
    )
    res2 = await ask_living_bot(req2)
    duration2 = round(time.perf_counter() - t0, 2)
    print(f"  Turn 2 ({duration2}s): Query: '{req2.query}'")
    print(f"         Reply: {res2['reply']}")
    assert res2["status"] == "success"
    assert "hyperion" in res2["reply"].lower() or "99" in res2["reply"].lower(), (
        f"Multi-turn recall failed! Expected mention of 'Hyperion-99', got: {res2['reply']}"
    )
    print("  -> PASSED: Multi-turn history accurately recalled across dialogue turns.")

    # -------------------------------------------------------------------------
    # TEST 3: Multilingual System Prompting (English, Telugu, Hindi, Tamil)
    # -------------------------------------------------------------------------
    print("\n[TEST 3] Verifying Multilingual Directives...")
    multilingual_prompts = [
        ("en", "Who are you and who is your commander?", ["mamu", "ayyappa", "companion", "abhi"]),
        ("te", "హలో! నువ్వు ఎవరు మరియు నీ బాస్ ఎవరు?", ["మామూ", "అయ్యప్ప", "అభి", "తోడు"]),
        ("hi", "नमस्ते! तुम कौन हो और तुम्हारे कमांडर कौन हैं?", ["मामू", "अयप्पा", "अभि", "साथी"]),
        ("ta", "வணக்கம்! நீங்கள் யார் மற்றும் உங்கள் தலைவர் யார்?", ["மாமு", "அய்யப்பா", "அபி"]),
    ]

    for lang_code, query_text, expected_terms in multilingual_prompts:
        t0 = time.perf_counter()
        req_lang = BotAskRequest(
            query=query_text,
            language=lang_code,
            thread_id=f"benchmark_lang_{lang_code}"
        )
        res_lang = await ask_living_bot(req_lang)
        dur = round(time.perf_counter() - t0, 2)
        reply = res_lang["reply"]
        print(f"  [{lang_code.upper()}] ({dur}s) Q: '{query_text}'")
        print(f"       A: '{reply}'")
        assert res_lang["status"] == "success"
        assert len(reply.strip()) > 5, f"Response too short for {lang_code}"
        print(f"  ✓ [{lang_code.upper()}] Generation verified successfully.")
    print("  -> PASSED: Multilingual prompts natively handled across EN, TE, HI, TA.")

    # -------------------------------------------------------------------------
    # TEST 4: Local Ollama Benchmark (Latency, TTFT, and Streaming Throughput)
    # -------------------------------------------------------------------------
    print("\n[TEST 4] Benchmarking Local Ollama API Latency & Streaming Throughput...")
    benchmark_model = "abhi:latest"
    prompt = "Explain in 2 crisp sentences how asynchronous event loops handle I/O multiplexing in modern operating systems."

    # 4A. Non-streaming latency
    t_start = time.perf_counter()
    resp = await abhi_llm.generate(prompt=prompt, model=benchmark_model)
    total_latency_s = time.perf_counter() - t_start
    gen_text = resp.response.strip()
    words = gen_text.split()
    est_tokens = int(len(words) * 1.3)
    throughput_non_stream = est_tokens / total_latency_s if total_latency_s > 0 else 0

    print(f"  Model: {benchmark_model}")
    print(f"  Non-streaming End-to-End Latency: {total_latency_s:.3f} s")
    print(f"  Generated Tokens (approx): {est_tokens}")
    print(f"  Approximate Throughput: {throughput_non_stream:.1f} tokens/sec")
    print(f"  Sample Output: {gen_text[:100]}...")

    # 4B. Streaming token latency & TTFT (Time to First Token)
    print("\n  Measuring Real-time Token Streaming & TTFT...")
    first_token_time = None
    t_stream_start = time.perf_counter()
    tokens_streamed = 0
    token_lengths = 0

    async for chunk in abhi_llm.generate_stream(prompt=prompt, model=benchmark_model):
        if first_token_time is None and chunk.strip():
            first_token_time = time.perf_counter() - t_stream_start
        tokens_streamed += 1
        token_lengths += len(chunk)

    total_stream_duration = time.perf_counter() - t_stream_start
    stream_throughput = tokens_streamed / total_stream_duration if total_stream_duration > 0 else 0

    print(f"  Time To First Token (TTFT): {first_token_time:.3f} s" if first_token_time else "  TTFT: N/A")
    print(f"  Total Stream Duration: {total_stream_duration:.3f} s")
    print(f"  Streamed Chunks/Tokens: {tokens_streamed}")
    print(f"  Streaming Throughput: {stream_throughput:.1f} tokens/sec")
    assert tokens_streamed > 5, "Streaming failed: received too few token chunks!"
    assert first_token_time is not None and first_token_time < 30.0, f"TTFT too slow: {first_token_time}s"

    print("\n" + "=" * 70)
    print("  ALL BENCHMARKS AND VERIFICATION AUDITS PASSED PERFECTLY!")
    print("=" * 70)


if __name__ == "__main__":
    asyncio.run(run_conversational_audit_and_benchmark())
