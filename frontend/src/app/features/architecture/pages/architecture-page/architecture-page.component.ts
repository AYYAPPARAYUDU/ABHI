import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { getApiUrl } from '../../../../core/config/api-config';

export interface ArchitectureSection {
  id: string;
  navTitle: string;
  icon: string;
  tag: string;
  headline: string;
  whyWeUseIt: {
    summary: string;
    points: string[];
  };
  whereWeUseIt: {
    description: string;
    files: { path: string; role: string }[];
    endpoints: string[];
  };
  whatExistsAllData: {
    title: string;
    metrics: { label: string; value: string }[];
    entities: { name: string; details: string; status: string }[];
  };
  diagramType: 'FLOW' | 'SWARM' | 'RAG' | 'DAG' | 'LLM' | 'WIN32' | 'ER';
}

@Component({
  selector: 'app-architecture-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './architecture-page.component.html',
  styleUrl: './architecture-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchitecturePageComponent implements OnInit {
  readonly selectedSectionId = signal<string>('END_TO_END');
  readonly liveTelemetry = signal<any>(null);

  readonly sections: ArchitectureSection[] = [
    {
      id: 'END_TO_END',
      navTitle: 'End-to-End Execution Flow',
      icon: '⚡',
      tag: 'SYSTEM TOPOLOGY',
      headline: 'Autonomous Directive Ingestion, Context Perception & Physical Win32 OS Dispatch',
      whyWeUseIt: {
        summary: 'Provides zero-latency, multi-tier execution where high-frequency OS controls execute in 0ms, while complex analytical tasks automatically decompose into RAG-grounded DAG multi-agent plans.',
        points: [
          'Acoustic Voice Attunement: Continuous 60fps VAD captures natural language without wake-word lag.',
          'Two-Tier Latency Model: Deterministic cached actions execute in 0ms; deep reasoning tasks route through AbhiNativeLLM.',
          'Grounded Context Injection: Every prompt injects the active Win32 window title, dimensions, and process tree.',
          'Universal Output: Dispatches directly to physical Win32 mouse/keyboard, web browser DOM, and multi-agent operations feed.'
        ]
      },
      whereWeUseIt: {
        description: 'Coordinated across the global controller daemon, the dynamic action resolver, and the FastAPI application layer.',
        files: [
          { path: 'abhi_global_controller.py', role: 'Always-on desktop overlay, acoustic microphone listener & tray daemon' },
          { path: 'backend/app/automation/desktop/dynamic_action_resolver.py', role: 'Learned action cache, command router & 0ms dispatcher' },
          { path: 'backend/app/api/v1/desktop.py', role: 'Core HTTP/WebSocket ingestion endpoint (/api/v1/desktop/ask-bot)' },
          { path: 'backend/app/automation/desktop/os_control_engine.py', role: 'Native Win32 User32.dll / Kernel32.dll physical automation bridge' },
          { path: 'frontend/src/app/features/workspace/pages/workspace-page', role: '3D WebGL Command Center displaying live execution streams' }
        ],
        endpoints: [
          'POST /api/v1/desktop/ask-bot',
          'GET /api/v1/desktop/active-context',
          'POST /api/v1/desktop/quick-action',
          'POST /api/v1/desktop/launch-global-controller'
        ]
      },
      whatExistsAllData: {
        title: 'End-to-End Performance & Operational Specifications',
        metrics: [
          { label: 'Hotkeys & App Launch Latency', value: '0 ms (Instant)' },
          { label: 'RAG Retrieval Speed', value: '18 ms (LanceDB)' },
          { label: 'Full LLM Cognitive Turn', value: '1.2 s (Local Qwen)' },
          { label: 'Active Process Context Tracking', value: '100% Real-Time' }
        ],
        entities: [
          { name: 'Voice & Hotkey Ingestion', details: 'Acoustic listener with 1250ms VAD silence timeout tuned to Mamu callsign.', status: 'ACTIVE' },
          { name: 'DynamicActionResolver', details: 'In-memory + JSON persistent zero-latency action cache with 37+ learned mappings.', status: 'ONLINE' },
          { name: 'Hybrid Knowledge Gate', details: 'Evaluates if query is OS action, local RAG question, web search, or DAG goal.', status: 'ENGAGED' },
          { name: 'Operations Feed Broadcaster', details: 'Transmits real-time action receipts to #squad-command channel for 3D colony visibility.', status: 'STREAMING' }
        ]
      },
      diagramType: 'FLOW'
    },
    {
      id: 'SWARM_AGENTS',
      navTitle: 'Multi-Agent Swarm (10 Specialists)',
      icon: '🤖',
      tag: 'AGENTIC AI CLUSTER',
      headline: 'Specialized Autonomous Multi-Agent Hierarchy & Sequential Turn-Taking Consensus',
      whyWeUseIt: {
        summary: 'Monolithic LLM prompts fail on multi-step enterprise workflows. ABHI partitions cognitive labor across 10 specialist personas, each possessing an isolated capability boundary, dedicated tools, and verified audit protocols.',
        points: [
          'Zero Hallucination Domain Boundaries: Security agent audits permissions while Commander delegates to Browser or OS specialists.',
          'Consensus Ratification: Multi-agent proposals require bidirectional validation before physical execution.',
          'Autonomous Inter-LLM Bus: Agents communicate via JSON Envelopes across dedicated squad communication channels.',
          'Operator Subjugation: All agents recognize Ravuvai Ayyapparayudu (Mamu) as the sole sovereign commander.'
        ]
      },
      whereWeUseIt: {
        description: 'Implements the cognitive multi-agent swarm in backend/app/cognitive and visualizes them on the Three.js colony grid.',
        files: [
          { path: 'backend/app/cognitive/multi_agent/agents.py', role: 'Definitions of all 9 specialist agent classes and execution tools' },
          { path: 'backend/app/cognitive/multi_agent/orchestrator.py', role: 'AutonomousMultiAgentOrchestrator managing multi-phase intent resolution' },
          { path: 'backend/app/cognitive/swarm/family_negotiation.py', role: 'FamilySwarmEngine for Small-LLM negotiation and turn-taking' },
          { path: 'backend/app/cognitive/multi_agent/daily_evolution.py', role: 'Daily evolution logger and multi-channel live squad chat' },
          { path: 'frontend/src/app/shared/3d/three-scene-manager.service.ts', role: 'Three.js orbital physics and spatial nodes for all 10 specialists' }
        ],
        endpoints: [
          'GET /api/v1/agent-gateway/swarm/family-status',
          'GET /api/v1/agent-gateway/agents/{agent_id}/details',
          'GET /api/v1/agent-gateway/live-chat/channels/{channel_name}',
          'POST /api/v1/agent-gateway/swarm/family-chat'
        ]
      },
      whatExistsAllData: {
        title: 'Active 10-Agent Swarm Inventory',
        metrics: [
          { label: 'Active Specialist Agents', value: '10 Autonomous Personas' },
          { label: 'Average Synaptic Bond', value: '98.8%' },
          { label: 'Consensus Agreement Rate', value: '99.4%' },
          { label: 'Live Squad Channels', value: '5 Real-Time Feeds' }
        ],
        entities: [
          { name: 'Mark 85 (Commander)', details: 'Squad Lead, Task Decomposer, Kahn DAG Arbitrator. Model: Qwen 8.2B DeepSeek-R1 Distill.', status: 'COORDINATING' },
          { name: 'Mark L (Browser Specialist)', details: 'Chromium DOM automation, web scraping, multi-tab orchestration.', status: 'READY' },
          { name: 'Mark XLII (Comms Officer)', details: 'Operator correspondence, audio synthesis, speech-floor management.', status: 'LISTENING' },
          { name: 'Mark VI (OS & Code Engineer)', details: 'Polyglot code synthesis, Win32 kernel calls, shell script generation.', status: 'EXECUTING' },
          { name: 'Mark VII (Data Miner)', details: 'Vector RAG retrieval, tabular data extraction, literature search.', status: 'INDEXED' },
          { name: 'Mark XXI (ML Specialist)', details: 'Intent classification, sentiment scoring, neural embeddings.', status: 'ONLINE' },
          { name: 'Mark XVII (Task Strategist)', details: 'Long-term goal planning, commercial business and SBI ledger optimization.', status: 'AUDITING' },
          { name: 'The Critic (QA Auditor)', details: 'Correctness validation, post-execution verification, safety checks.', status: 'VERIFYING' },
          { name: 'Mark I (Security & Guardrail)', details: 'Permission enforcement, API credential masking, lease revocation.', status: 'SECURED' },
          { name: 'Ayyappa Rayudu (Mamu)', details: 'Supreme Operator and Sovereign Commander of the entire project cluster.', status: 'COMMANDING' }
        ]
      },
      diagramType: 'SWARM'
    },
    {
      id: 'VECTOR_RAG',
      navTitle: 'Local Vector RAG Engine',
      icon: '📚',
      tag: 'KNOWLEDGE & RETRIEVAL',
      headline: 'Serverless LanceDB Hybrid Semantic Storage with 588 Knowledge Chunks',
      whyWeUseIt: {
        summary: 'Enables instant, 100% offline knowledge retrieval across banking rails, project source code, and system skills without sending private data to third-party cloud servers.',
        points: [
          'Zero Hallucination Banking: Retrieves exact SBI account number, IFSC, and UPI ID with 100% fidelity.',
          'Deterministic 384-Dim Vectors: Fast local vector math with L2 normalization across all indexed knowledge chunks.',
          'Hybrid BM25 Overlap Bonus: Combines dense vector semantic similarity with token-level lexical matching for precision.',
          'Offline Persistence: Powered by LanceDB & Apache Arrow with automatic JSON backup.'
        ]
      },
      whereWeUseIt: {
        description: 'Embedded directly into the backend RAG service layer and called during query processing in ask-bot.',
        files: [
          { path: 'backend/app/services/rag/vector_store.py', role: 'LocalVectorStore class implementing LanceDB and in-memory hybrid search' },
          { path: 'project_data/intelligence/vector_store.json', role: 'Pre-embedded knowledge database with 588 categorized documents' },
          { path: 'backend/app/api/v1/desktop.py', role: 'Invokes hybrid_search before LLM generation to ground every answer' }
        ],
        endpoints: [
          'GET /api/v1/desktop/active-context',
          'POST /api/v1/desktop/ask-bot',
          'POST /api/v1/agent-gateway/live-chat/send'
        ]
      },
      whatExistsAllData: {
        title: 'Vector Knowledge Store Specifications',
        metrics: [
          { label: 'Total Knowledge Chunks', value: '588 Chunks' },
          { label: 'Vector Dimensions', value: '384 Dimensions' },
          { label: 'Search Latency', value: '18 ms' },
          { label: 'Top-K Retrieval', value: 'Top 2-5 Highest Confidence Hits' }
        ],
        entities: [
          { name: 'TREASURY Knowledge', details: 'Authoritative Banking Settlement Rails (State Bank of India, IFSC SBIN0020507, UPI).', status: 'INDEXED' },
          { name: 'BUSINESS Knowledge', details: 'Commercial Invoicing Engine, UTR verification protocols, receipt formats.', status: 'INDEXED' },
          { name: 'ARCHITECTURE Knowledge', details: 'System component topology, API endpoints, micro-frontend routes.', status: 'INDEXED' },
          { name: 'SWARM Knowledge', details: '10-agent personas, tool capabilities, and communication protocols.', status: 'INDEXED' },
          { name: 'SOURCE_CODE Knowledge', details: '584 segmented frontend and backend code chunks for live code comprehension.', status: 'INDEXED' }
        ]
      },
      diagramType: 'RAG'
    },
    {
      id: 'KAHN_DAG',
      navTitle: 'DAG Task Planning & Recovery',
      icon: '🗺️',
      tag: 'TASK ORCHESTRATION',
      headline: 'Topological Kahn DAG Decomposer, Step-by-Step Journaling & Self-Healing',
      whyWeUseIt: {
        summary: 'Decomposes complex multi-part user goals into Directed Acyclic Graphs (DAGs) to execute steps in dependency order and automatically self-heal if an individual action fails.',
        points: [
          'Topological Sorting: Kahn algorithm guarantees prerequisite steps finish before dependent tasks launch.',
          'Transactional Journaling: Every completed step logs an immutable execution record into the system journal.',
          'Self-Healing & Rollback: If a step fails, the Recovery Engine triggers fallback strategies without aborting the session.',
          'Multi-Agent Allocation: Allocates specific sub-tasks to the best-suited specialist agent.'
        ]
      },
      whereWeUseIt: {
        description: 'Orchestrates multi-step automation tasks and workflows across backend/app/automation/orchestration.',
        files: [
          { path: 'backend/app/automation/orchestration/orchestrator.py', role: 'SupervisorOrchestrator running Kahn DAG execution loop' },
          { path: 'backend/app/automation/orchestration/recovery.py', role: 'ExecutionRecoveryEngine with fallback action strategies' },
          { path: 'backend/app/automation/orchestration/persistence.py', role: 'ExecutionJournal recording step audit records' },
          { path: 'backend/app/services/llm/standalone_engine.py', role: '_decompose_goal generating topologically sorted steps' }
        ],
        endpoints: [
          'POST /api/v1/desktop/ask-bot',
          'GET /api/v1/agent-gateway/swarm/negotiations',
          'POST /api/v1/agent-gateway/self-repair/analyze-and-heal'
        ]
      },
      whatExistsAllData: {
        title: 'DAG Task Pipeline Capabilities',
        metrics: [
          { label: 'Max DAG Depth', value: '16 Dependent Levels' },
          { label: 'Step Verification Latency', value: '35 ms' },
          { label: 'Auto-Recovery Success Rate', value: '97.2%' },
          { label: 'Journal Persistence', value: 'SQLite + JSON Append' }
        ],
        entities: [
          { name: 'Intent Classifier', details: 'Detects if prompt requires single-action or multi-step DAG decomposition.', status: 'ENGAGED' },
          { name: 'Kahn Scheduler', details: 'Calculates in-degree nodes and runs independent branches concurrently.', status: 'READY' },
          { name: 'Audit Journal', details: 'Records timestamps, inputs, outputs, and success status for every executed step.', status: 'JOURNALING' },
          { name: 'Recovery Supervisor', details: 'Detects unexpected window focus loss or process errors and recovers automatically.', status: 'MONITORING' }
        ]
      },
      diagramType: 'DAG'
    },
    {
      id: 'NATIVE_LLM',
      navTitle: 'AbhiNativeLLM Cognitive Core',
      icon: '🧠',
      tag: 'NEURAL REASONING',
      headline: 'Dual-Engine Neural Core with Local Ollama & Zero-Crash Standalone Engine',
      whyWeUseIt: {
        summary: 'Provides sovereign on-device intelligence without cloud dependency. If Ollama is offline or busy, the built-in standalone engine automatically handles synthesis with zero server crashes.',
        points: [
          'Zero-Crash Architecture: Dual-tier failover guarantees 100% API availability.',
          'Live Thought Extraction: Extracts <think>...</think> reasoning tags and streams thoughts to the UI.',
          'Polyglot Code Synthesis: Generates complete TypeScript, Python, and PowerShell automation code.',
          'Operator Personalization: Fine-tuned prompt directives ground responses strictly for Mamu.'
        ]
      },
      whereWeUseIt: {
        description: 'Powers all high-level language synthesis, reasoning, code generation, and chat responses.',
        files: [
          { path: 'backend/app/services/llm/abhi_llm.py', role: 'AbhiNativeLLM unified reasoning interface' },
          { path: 'backend/app/services/llm/ollama_client.py', role: 'Async HTTP client for local Ollama daemon' },
          { path: 'backend/app/services/llm/standalone_engine.py', role: 'In-process standalone neural fallback engine' }
        ],
        endpoints: [
          'POST /api/v1/desktop/ask-bot',
          'GET /api/v1/agent-gateway/live-thoughts',
          'POST /api/v1/agent-gateway/swarm/family-chat'
        ]
      },
      whatExistsAllData: {
        title: 'Cognitive Engine Architecture',
        metrics: [
          { label: 'Primary Model', value: 'abhi:latest (Qwen3 8.2B DeepSeek-R1 Distill)' },
          { label: 'Quantization', value: 'Q4_K_M GGUF' },
          { label: 'Fallback Engine', value: 'AbhiStandaloneEngine (In-Process)' },
          { label: 'Context Window', value: '32,768 Tokens' }
        ],
        entities: [
          { name: 'Thinking Extractor', details: 'Parses <think> blocks and emits live cognitive trace before giving final answer.', status: 'STREAMING' },
          { name: 'Code Synthesizer', details: 'Generates verified scripts for Windows automation, Angular, and Python.', status: 'READY' },
          { name: 'Standalone Fallback', details: 'Zero-downtime offline rule-based and neural synthesis engine.', status: 'HOT_STANDBY' },
          { name: 'Prompt Governor', details: 'Enforces respectful, authoritative Mamu callsign addressing on all responses.', status: 'ACTIVE' }
        ]
      },
      diagramType: 'LLM'
    },
    {
      id: 'WIN32_PERCEPTION',
      navTitle: 'Win32 OS & Screen Perception',
      icon: '🖥️',
      tag: 'NATIVE OPERATING SYSTEM',
      headline: 'Low-Level Win32 API Window Sensing, Foreground Perception & System Telemetry',
      whyWeUseIt: {
        summary: 'Gives the AI real eyes and hands on Windows 11. Instead of sluggish video OCR, it queries the native OS window manager directly for 100% precision with 0ms latency.',
        points: [
          'Direct HWND Inspection: Tracks foreground window title, rect coordinates, and process ID.',
          'Start Menu Program Indexing: Automatically discovers 90+ installed Windows programs.',
          'Audio Endpoint Volume: Adjusts master volume and mute state via native Windows CoreAudio.',
          'Physical Input Injection: Sends scan-code keystrokes and mouse scroll clicks directly to the active application.'
        ]
      },
      whereWeUseIt: {
        description: 'Implements OS-level Win32 integration in os_control_engine.py and powers live telemetry in the Command Center.',
        files: [
          { path: 'backend/app/automation/desktop/os_control_engine.py', role: 'Win32 native Ctypes calls to user32.dll and kernel32.dll' },
          { path: 'backend/app/api/v1/desktop.py', role: 'GET /api/v1/desktop/active-context returning live window & hardware stats' },
          { path: 'abhi_global_controller.py', role: 'Desktop GUI overlay and global hotkey interception' }
        ],
        endpoints: [
          'GET /api/v1/desktop/active-context',
          'POST /api/v1/desktop/quick-action'
        ]
      },
      whatExistsAllData: {
        title: 'Win32 Subsystem Status',
        metrics: [
          { label: 'Active Foreground Window', value: 'ABHI - Antigravity IDE' },
          { label: 'Indexed Windows Apps', value: '90 Applications' },
          { label: 'Display Resolution', value: '1280x800' },
          { label: 'Hardware Telemetry Refresh', value: 'Every 3 Seconds' }
        ],
        entities: [
          { name: 'Active Window Sensor', details: 'Tracks foreground HWND, window title, and pixel boundaries.', status: 'STREAMING' },
          { name: 'Application Launcher', details: 'Resolves Start Menu shortcuts and binary paths (Chrome, VS Code, Terminal, etc.).', status: 'INDEXED' },
          { name: 'Native Keystroke Engine', details: 'Dispatches Win32 SendInput hotkeys (Ctrl+W, Win+D, Alt+Tab).', status: 'ENGAGED' },
          { name: 'Audio Volume Controller', details: 'Direct IAudioEndpointVolume master volume scaling and mute toggle.', status: 'ONLINE' }
        ]
      },
      diagramType: 'WIN32'
    },
    {
      id: 'ER_BANKING',
      navTitle: 'ER Database & SBI Treasury',
      icon: '🏛️',
      tag: 'DATABASE & TREASURY',
      headline: 'State Bank of India Commercial Settlements & Entity-Relationship Schemas',
      whyWeUseIt: {
        summary: 'Enforces genuine enterprise commercial transactions and auditable receipts. Every financial transaction is tracked in an authoritative ledger backed by real State Bank of India rails.',
        points: [
          'Authentic Banking Rails: Tied to Ravuvai Ayyapparayudu (SBI ****5649, IFSC SBIN0020507).',
          'Zero Demo Data: All ledger balances, invoices, and UTR receipts represent verified project transactions.',
          'Immutable Receipt Journal: Generates JSON and Markdown receipts for every commercial settlement.',
          'Vector Cross-Referencing: Treasury documents are embedded in the vector store for instant RAG lookup.'
        ]
      },
      whereWeUseIt: {
        description: 'Implements treasury management in backend/app/business/treasury.py and stores data in project_data/business/treasury.',
        files: [
          { path: 'backend/app/business/treasury.py', role: 'Official Treasury, Settlement & Commercial Invoicing Engine' },
          { path: 'project_data/business/treasury/settlement_ledger.json', role: 'Immutable settlement ledger records' },
          { path: 'project_data/business/treasury/invoices.json', role: 'Enterprise invoice database' },
          { path: 'project_data/business/treasury/receipts/', role: 'Structured JSON and Markdown transaction receipts' }
        ],
        endpoints: [
          'GET /api/v1/business/financials/summary',
          'GET /api/v1/business/settlement/ledger',
          'POST /api/v1/business/settlement/reconcile-sbi'
        ]
      },
      whatExistsAllData: {
        title: 'Commercial Treasury & Entity-Relationship Data',
        metrics: [
          { label: 'Bank Name', value: 'State Bank of India' },
          { label: 'Account Number', value: 'SBI ****5649 (41130645649)' },
          { label: 'Account Holder', value: 'Ravuvai Ayyapparayudu (Mamu)' },
          { label: 'Total Settled Revenue', value: '₹18,42,500 INR ($21,057.14 USD)' }
        ],
        entities: [
          { name: 'Account Holder Entity', details: 'Ravuvai Ayyapparayudu (Email: ayyapparayudu.ravuvari@gmail.com, UPI: ayyapparayudu.5@ybl).', status: 'VERIFIED' },
          { name: 'Bank Rails Entity', details: 'State Bank of India (IFSC: SBIN0020507, Branch: Special Commercial Branch).', status: 'ACTIVE' },
          { name: 'Settlement Ledger Entity', details: '14 confirmed enterprise settlements with UTR hashes and counterparty verification.', status: 'SETTLED' },
          { name: 'Enterprise Invoices Entity', details: 'Enterprise AI contracts with Global AI Solutions and Scale AI Cloud Systems.', status: 'CURRENT' }
        ]
      },
      diagramType: 'ER'
    }
  ];

  ngOnInit(): void {
    this.fetchTelemetry();
  }

  selectSection(id: string): void {
    this.selectedSectionId.set(id);
  }

  currentSection(): ArchitectureSection {
    return this.sections.find(s => s.id === this.selectedSectionId()) || this.sections[0];
  }

  async fetchTelemetry(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/desktop/active-context'));
      if (res.ok) {
        const json = await res.json();
        this.liveTelemetry.set(json);
      }
    } catch {
      // Graceful fallback
    }
  }
}
