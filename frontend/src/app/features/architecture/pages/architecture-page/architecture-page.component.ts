import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { getApiUrl } from '../../../../core/config/api-config';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';
import { TelemetryEvent } from '../../../../core/models/telemetry.model';

export type SubsystemTabId =
  | 'ALL'
  | 'CORE_GATEWAY'
  | 'SUPERVISION_DAG'
  | 'INTELLIGENCE_MODELS'
  | 'MEMORY_RAG_MCP'
  | 'AUTOMATION_OS';

export type NodeStatus = 'HEALTHY' | 'ACTIVE' | 'STANDBY' | 'DEGRADED' | 'READY';

export interface ArchitectureNode {
  id: string;
  name: string;
  tabId: 'CORE_GATEWAY' | 'SUPERVISION_DAG' | 'INTELLIGENCE_MODELS' | 'MEMORY_RAG_MCP' | 'AUTOMATION_OS';
  subsystem: string;
  role: string;
  filePath: string;
  status: NodeStatus;
  latency: string;
  memoryFootprint?: string;
  capabilities: string[];
  activeConnections: {
    inbound: string[];
    outbound: string[];
  };
  specs: Record<string, string>;
  summary: string;
  recentEvents?: ABHIEvent[];
}

export interface ABHIEvent {
  id: string;
  category: string;
  source: string;
  type: string;
  status?: string;
  payload?: Record<string, any>;
  timestamp: number;
}

export interface SubsystemTabDef {
  id: SubsystemTabId;
  title: string;
  tag: string;
  icon: string;
  headline: string;
  summary: string;
}

export interface PipelineStageDef {
  stageNumber: number;
  tabId: 'CORE_GATEWAY' | 'SUPERVISION_DAG' | 'INTELLIGENCE_MODELS' | 'MEMORY_RAG_MCP' | 'AUTOMATION_OS';
  name: string;
  tagline: string;
  flowDirection: string;
  flowBadge: string;
  icon: string;
}

@Component({
  selector: 'app-architecture-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './architecture-page.component.html',
  styleUrl: './architecture-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchitecturePageComponent implements OnInit, OnDestroy {
  readonly telemetryService = inject(TelemetryService);

  // Active Tab & Subsystem state - default 'ALL' for expansive full viewport overview
  readonly selectedTabId = signal<SubsystemTabId>('ALL');
  readonly selectedStatusFilter = signal<string>('ALL');
  readonly searchQuery = signal<string>('');
  readonly zoomLevel = signal<number>(1.0);
  readonly inspectorView = signal<'INSPECTOR' | 'FEED'>('INSPECTOR');

  // Collapsible Technical Inspector Dock
  readonly isInspectorOpen = signal<boolean>(true);
  readonly copiedPath = signal<string | null>(null);

  // Selected Node
  readonly activeInspectorNode = signal<ArchitectureNode | null>(null);

  // Live Telemetry & Introspection Data
  readonly liveIntrospection = signal<any>(null);
  readonly liveHealth = signal<any>(null);
  readonly liveHardwareTelemetry = signal<any>(null);
  readonly activeContext = signal<any>(null);
  readonly isRefreshing = signal<boolean>(false);
  readonly lastRefreshed = signal<string>('Connecting...');

  // Live Event Feed
  readonly liveEvents = signal<ABHIEvent[]>([]);
  readonly isStreamPaused = signal<boolean>(false);
  readonly eventCategoryFilter = signal<string>('ALL');
  readonly autoScrollEvents = signal<boolean>(true);

  private telemetrySub: Subscription | null = null;
  private pollTimer: any = null;

  // Pipeline Stages definition for expansive ALL view
  readonly pipelineStages: PipelineStageDef[] = [
    {
      stageNumber: 1,
      tabId: 'CORE_GATEWAY',
      name: 'Stage 1: Core & Ingestion Gateway',
      tagline: 'Perception, Audio VAD, Win32 Hooks & REST/WS Routing',
      flowDirection: 'Input → Perception → Router',
      flowBadge: 'Voice / Text / HWND Sensor Stream',
      icon: '⚡'
    },
    {
      stageNumber: 2,
      tabId: 'SUPERVISION_DAG',
      name: 'Stage 2: Supervision & Topological DAG',
      tagline: 'CentralSupervisor, Kahn Acyclic Scheduler & Physical Verifier',
      flowDirection: 'Intent → DAG Schedule → Worker Pool',
      flowBadge: 'Consensus Quorum & Lease Locks',
      icon: '🛡️'
    },
    {
      stageNumber: 3,
      tabId: 'INTELLIGENCE_MODELS',
      name: 'Stage 3: Intelligence & Local Neural Models',
      tagline: 'abhi:latest, qwen3:8b, 10 Iron Man Specialists & VRAM Mutex',
      flowDirection: 'Plan Step → Reasoning Engine → Tool Plan',
      flowBadge: 'DirectML / CUDA Headroom (1.5GB Reserve)',
      icon: '🧠'
    },
    {
      stageNumber: 4,
      tabId: 'MEMORY_RAG_MCP',
      name: 'Stage 4: Memory, Vector RAG & MCP Sandbox',
      tagline: 'LanceDB 588 Chunks, SQLite WAL Databases & 7 Standard Tools',
      flowDirection: 'Query → 384d Embedding → Grounded Tool Calls',
      flowBadge: 'Apache Arrow + Sub-ms WAL Commits',
      icon: '📚'
    },
    {
      stageNumber: 5,
      tabId: 'AUTOMATION_OS',
      name: 'Stage 5: Desktop Actuation & Closed-Loop OS Verification',
      tagline: 'User32 SendInput 0.1ms, Playwright Stealth & DualState Proof',
      flowDirection: 'Tool Call → Win32/CDP Action → Physical HWND Proof',
      flowBadge: 'Zero Simulation / Cryptographic Proof',
      icon: '🖥️'
    }
  ];

  // 6 Subsystem Tabs Definition (including ALL)
  readonly subsystemTabs: SubsystemTabDef[] = [
    {
      id: 'ALL',
      title: '⚡ All Subsystems',
      tag: 'END-TO-END PIPELINE MATRIX',
      icon: '⚡',
      headline: 'Unified 5-Stage Autonomous Execution Pipeline',
      summary: 'Expansive end-to-end trace from local user ingestion through topological supervision, neural reasoning, hybrid memory retrieval, to physical Win32 OS actuation.'
    },
    {
      id: 'CORE_GATEWAY',
      title: '1. Core & Gateway',
      tag: 'INGESTION & ROUTING',
      icon: '⚡',
      headline: 'API Gateway, Unified Conversation Gateway & Perception Pipeline',
      summary: 'Central communication nexus handling local FastAPI requests, multimodal conversation ingestion, and continuous desktop sensor streams.'
    },
    {
      id: 'SUPERVISION_DAG',
      title: '2. Supervision & DAG',
      tag: 'ORCHESTRATION & STATE',
      icon: '🛡️',
      headline: 'CentralSupervisor, DAG Task Planner & Dual-State Physical Verifier',
      summary: 'Autonomous state machine executing Kahn topological plans with strict dual-state physical verification before marking tasks COMPLETED.'
    },
    {
      id: 'INTELLIGENCE_MODELS',
      title: '3. Intelligence & Models',
      tag: 'LOCAL COGNITION & VRAM',
      icon: '🧠',
      headline: 'Physical Ollama Engines vs Logical Specialists & Resource Scheduler',
      summary: 'Local neural model serving (abhi:latest, qwen3:8b, all-minilm:latest) mapped to 10 autonomous Iron Man specialist suits under strict VRAM scheduling.'
    },
    {
      id: 'MEMORY_RAG_MCP',
      title: '4. Memory, RAG & MCP',
      tag: 'PERSISTENCE & TOOLS',
      icon: '📚',
      headline: 'LanceDB Vector Store, SQLite WAL Databases & 7 Standard MCP Tools',
      summary: 'Sub-millisecond hybrid vector retrieval across 588+ local knowledge chunks, ACID write-ahead transaction logs, and sandboxed Model Context Protocol tool execution.'
    },
    {
      id: 'AUTOMATION_OS',
      title: '5. Automation & OS',
      tag: 'PHYSICAL DESKTOP ACTUATION',
      icon: '🖥️',
      headline: 'Windows 11 OS Worker, Playwright Browser, LeaseManager & Event Bus',
      summary: 'Direct User32 ctypes SendInput hotkeys, headless Playwright browser workers, exclusive OS lease allocation, and zero-copy shared ring buffer telemetry.'
    }
  ];

  // Canonical Nodes Database covering all 5 subsystems
  readonly allNodes = signal<ArchitectureNode[]>([
    // ========================================================
    // TAB 1: CORE & GATEWAY
    // ========================================================
    {
      id: 'api_gateway',
      name: 'API Gateway (FastAPI 8000)',
      tabId: 'CORE_GATEWAY',
      subsystem: 'Core & Gateway',
      role: 'Foundational HTTP/WS Gateway with CORS, GZip, Lifespan & Security Headers',
      filePath: 'backend/app/main.py',
      status: 'HEALTHY',
      latency: '0.8 ms',
      memoryFootprint: '42.8 MB',
      capabilities: [
        'FastAPI 0.115+ REST Routing',
        'SecurityHeaders & LocalAuth Middleware',
        'GZip Response Compression',
        'Lifespan Startup/Shutdown Orchestrator',
        'Async Windows Proactor Resilience'
      ],
      activeConnections: {
        inbound: ['Angular 22 Frontend (Port 4200)', 'Windows System Tray Daemon', 'Local Desktop Hotkeys'],
        outbound: ['All /api/v1 Subsystem Routers', 'SQLite WAL Databases', 'Ollama Local Daemon (:11434)']
      },
      specs: {
        'Framework': 'FastAPI / Starlette',
        'Python Version': '3.14.0 Windows-x64',
        'Host Binding': '127.0.0.1:8000',
        'Concurrency': 'Asyncio Single-Threaded Event Loop',
        'Protocol Support': 'HTTP/1.1, WebSocket, SSE'
      },
      summary: 'The central ingress gateway for all UI actions, background loops, and external device communication.'
    },
    {
      id: 'conv_gateway',
      name: 'Unified Conversation Gateway',
      tabId: 'CORE_GATEWAY',
      subsystem: 'Core & Gateway',
      role: 'Unified conversational ingress, multimodal intent parsing and streaming token dispatcher',
      filePath: 'backend/app/api/v1/agent.py',
      status: 'ACTIVE',
      latency: '1.2 ms',
      memoryFootprint: '18.4 MB',
      capabilities: [
        'Multimodal Voice & Text Ingestion',
        'Intent Classification & Disambiguation',
        'Multilingual Decoding (EN, TE, HI, TA)',
        'Server-Sent Events (SSE) Streaming',
        'Active Session Token Authentication'
      ],
      activeConnections: {
        inbound: ['API Gateway /api/v1/agent-gateway', 'Microphone Speech Recognition', 'Web HUD Input'],
        outbound: ['CentralSupervisor', 'Perception Pipeline', 'Neural Voice Synthesis']
      },
      specs: {
        'Endpoints': 'POST /api/v1/agent-gateway, GET /api/v1/agent/network',
        'Streaming Latency': 'First Token < 65ms',
        'Queue Strategy': 'Async Priority Queue'
      },
      summary: 'Ingests voice and text commands, maps intent to appropriate specialists, and streams continuous execution feedback.'
    },
    {
      id: 'perception_pipeline',
      name: 'Shared Perception Pipeline',
      tabId: 'CORE_GATEWAY',
      subsystem: 'Core & Gateway',
      role: 'Continuous acoustic VAD microphone sensor and active window UI state scanner',
      filePath: 'backend/app/api/v1/perception.py',
      status: 'ACTIVE',
      latency: '24.0 ms',
      memoryFootprint: '64.2 MB',
      capabilities: [
        '60fps Acoustic VAD Speech Filter tuned to Mamu',
        'Active Foreground Window Sensor (HWND & Title)',
        'Display Screen Capture & Visual Perception',
        'Tesseract / Vision OCR Bounding Box Grounding',
        'Ambient Audio Noise Suppression'
      ],
      activeConnections: {
        inbound: ['Microphone PCM Audio Stream (16kHz)', 'Windows User32 Sensor Hook', 'GDI Screen Blit'],
        outbound: ['CentralSupervisor', 'DualStateVerifier', 'Grounding Resolver']
      },
      specs: {
        'Audio Sampling': '16,000 Hz 16-bit Mono',
        'Polling Frequency': 'Every 3.0 Seconds (Active Context)',
        'Grounding Levels': 'Level 1 UIA, Level 2 DOM, Level 3 OCR'
      },
      summary: 'Continuously feeds real-time physical perception of the Windows desktop and microphone to the cognitive core.'
    },

    // ========================================================
    // TAB 2: SUPERVISION & DAG
    // ========================================================
    {
      id: 'central_supervisor',
      name: 'CentralSupervisor',
      tabId: 'SUPERVISION_DAG',
      subsystem: 'Supervision & DAG',
      role: 'Autonomous high-level state machine orchestrator and multi-agent consensus arbiter',
      filePath: 'backend/app/cognitive/supervisor/supervisor.py',
      status: 'ACTIVE',
      latency: '3.5 ms',
      memoryFootprint: '34.6 MB',
      capabilities: [
        'Finite State Machine (IDLE -> PLANNING -> EXECUTING -> VERIFYING)',
        'Multi-Agent Task Delegation Contract Verification',
        'Dual Consensus Cross-Examination',
        'Emergency Stop & Rollback Dispatcher',
        'Execution Journal State Persistence'
      ],
      activeConnections: {
        inbound: ['Unified Conversation Gateway', 'Perception Pipeline'],
        outbound: ['DAG Task Planner', 'Cognitive Agent Registry', 'DualStateVerifier']
      },
      specs: {
        'State Pattern': 'Hierarchical FSM',
        'Consensus Quorum': '2/3 Agreement for Critical Destructive Actions',
        'Reentrancy Guard': 'Asyncio Lock per Task'
      },
      summary: 'Coordinates execution flow, verifies specialist proposals, and guarantees system-wide alignment.'
    },
    {
      id: 'dag_planner',
      name: 'DAG Task Planner',
      tabId: 'SUPERVISION_DAG',
      subsystem: 'Supervision & DAG',
      role: 'Topological task scheduler decomposing complex objectives into acyclic dependency graphs',
      filePath: 'backend/app/cognitive/planner/planner.py',
      status: 'HEALTHY',
      latency: '0.8 ms',
      memoryFootprint: '12.1 MB',
      capabilities: [
        "Kahn's Topological Sort Algorithm O(V+E)",
        'Acyclic Dependency Guarantee & Loop Detection',
        'Parallel Subtask Dispatch (Up to 4 Concurrent Workers)',
        'Dynamic Replanning on Unexpected Obstacles',
        'Step Dependency Validation Matrix'
      ],
      activeConnections: {
        inbound: ['CentralSupervisor'],
        outbound: ['WorkerLifecycleManager', 'Flow Engine', 'Execution Journal Database']
      },
      specs: {
        'Algorithm': "Kahn's Topological Sort",
        'Max Concurrency': '4 Parallel Workers',
        'Deadlock Protection': 'Tarjan Strongly Connected Component Check'
      },
      summary: 'Plans the precise step-by-step roadmap for all multi-action missions with mathematical deadlock prevention.'
    },
    {
      id: 'dual_state_verifier',
      name: 'DualStateVerifier',
      tabId: 'SUPERVISION_DAG',
      subsystem: 'Supervision & DAG',
      role: 'Closed-loop physical verification engine auditing observed system state before marking tasks COMPLETED',
      filePath: 'backend/app/cognitive/verification/verifier.py',
      status: 'ACTIVE',
      latency: '4.5 ms',
      memoryFootprint: '19.8 MB',
      capabilities: [
        'Physical Win32 State Observation (HWND / PID)',
        'DOM Mutation & URL Verification for Web Actions',
        'Visual Screen Confirmation via Difference Hash',
        'Zero-Simulation Enforcement (Rejects Fake Passes)',
        'Immutable Cryptographic Audit Proof Generation'
      ],
      activeConnections: {
        inbound: ['Windows Desktop OS Worker', 'Playwright Browser Worker'],
        outbound: ['CentralSupervisor', 'Execution Journal Database', 'Telemetry Event Bus']
      },
      specs: {
        'Verification Rule': 'Target Window + Process PID + Visual OCR Proof',
        'Tolerance': '0 Fake Passes Permitted',
        'Timeout': '5.0 Seconds per Physical Check'
      },
      summary: 'Mandatory enforcement layer ensuring no action is marked completed unless physical proof is observed.'
    },
    {
      id: 'worker_lifecycle',
      name: 'WorkerLifecycleManager',
      tabId: 'SUPERVISION_DAG',
      subsystem: 'Supervision & DAG',
      role: 'Lifecycle guardian managing OS worker processes, lease acquisition, and heartbeat health',
      filePath: 'backend/app/automation/worker_manager.py',
      status: 'ACTIVE',
      latency: '1.0 ms',
      memoryFootprint: '15.2 MB',
      capabilities: [
        'Isolated Subprocess / Worker Management',
        'Heartbeat Polling & Stale Worker Termination',
        'Autonomous Crash Detection & Respawn',
        'Exclusive Resource Lease Coordination',
        'IPC Message Queue Monitoring'
      ],
      activeConnections: {
        inbound: ['DAG Task Planner', 'CentralSupervisor'],
        outbound: ['Windows Desktop OS Worker', 'Playwright Browser Worker', 'LeaseManager']
      },
      specs: {
        'Heartbeat Interval': '2.0 Seconds',
        'Unresponsive Timeout': '10.0 Seconds',
        'Auto-Respawn Limit': '3 Attempts before Degraded Mode'
      },
      summary: 'Maintains healthy background worker pools and enforces strict execution boundaries.'
    },

    // ========================================================
    // TAB 3: INTELLIGENCE & MODELS
    // ========================================================
    {
      id: 'ollama_abhi_latest',
      name: 'Ollama: abhi:latest (5.2GB)',
      tabId: 'INTELLIGENCE_MODELS',
      subsystem: 'Intelligence & Models',
      role: 'Primary sovereign cognitive core tuned for local agent autonomy and rapid intent decomposition',
      filePath: 'Local Ollama Storage / localhost:11434',
      status: 'ACTIVE',
      latency: '18.5 ms / tok',
      memoryFootprint: '5,214 MB (VRAM/RAM)',
      capabilities: [
        'Custom ABHI Sovereign System Prompt & Grounding',
        '0ms Frequent Action Pattern Decomposition',
        'Strict JSON Structured Action Formatting',
        'Multi-Step Reasoning & Tool Argument Generation',
        'Autonomous Win32 Script Synthesis'
      ],
      activeConnections: {
        inbound: ['ModelResourceScheduler'],
        outbound: ['CentralSupervisor', 'Mark 85 Commander Specialist']
      },
      specs: {
        'Model Size': '5.2 GB',
        'Parameters': '8B Q4_K_M Quantized',
        'Context Window': '8,192 Tokens',
        'Acceleration': 'DirectML / NVIDIA CUDA / CPU AVX2',
        'Base Architecture': 'Qwen2.5 / DeepSeek Hybrid'
      },
      summary: 'The primary local model executing reasoning, conversation, and action planning 100% offline.'
    },
    {
      id: 'ollama_qwen3_8b',
      name: 'Ollama: qwen3:8b (5.2GB)',
      tabId: 'INTELLIGENCE_MODELS',
      subsystem: 'Intelligence & Models',
      role: 'Advanced reasoning and mathematical synthesis model deployed for complex coding and deep analysis',
      filePath: 'Local Ollama Storage / localhost:11434',
      status: 'STANDBY',
      latency: '22.0 ms / tok',
      memoryFootprint: '5,280 MB',
      capabilities: [
        'Deep Step-by-Step Chain-of-Thought Reasoning',
        'Complex Python & TypeScript Code Synthesis',
        'Mathematical Verification & Inversion Analysis',
        'Root Cause Diagnosis for Runtime Self-Healing',
        'Extended Multi-Turn Context Processing'
      ],
      activeConnections: {
        inbound: ['ModelResourceScheduler'],
        outbound: ['Mark XLII Self-Healing', 'Mark VII Task Planner']
      },
      specs: {
        'Model Size': '5.2 GB',
        'Parameters': '8.2B Parameters',
        'Context Window': '32,768 Tokens',
        'VRAM Headroom Strategy': 'Loaded on demand via Scheduler sequential lock'
      },
      summary: 'High-capability analytical engine summoned when primary reasoning requires mathematical or code depth.'
    },
    {
      id: 'ollama_all_minilm',
      name: 'Ollama: all-minilm:latest (45.9MB)',
      tabId: 'INTELLIGENCE_MODELS',
      subsystem: 'Intelligence & Models',
      role: 'High-speed 384-dimensional dense semantic embedding engine powering hybrid local vector RAG',
      filePath: 'Local Ollama Storage / localhost:11434',
      status: 'ACTIVE',
      latency: '2.1 ms / query',
      memoryFootprint: '45.9 MB',
      capabilities: [
        '384-Dimensional Dense Vector Generation',
        'Sub-Millisecond Semantic Document Embedding',
        'High Throughput (> 1,200 Chunks/Sec on CPU)',
        'Cross-Lingual Semantic Space Mapping',
        'Zero Cloud Dependency Embedding Pipeline'
      ],
      activeConnections: {
        inbound: ['ModelResourceScheduler', 'Knowledge Ingestion Pipeline'],
        outbound: ['LanceDB Vector Store', 'PersonalMemoryManager']
      },
      specs: {
        'Model Size': '45.9 MB',
        'Embedding Dimensions': '384 Float32',
        'Batch Size': '32 Chunks concurrent',
        'Execution Engine': 'CPU AVX2 Optimized'
      },
      summary: 'Ultra-lightweight vector encoder generating embeddings for all project knowledge and personal memories.'
    },
    {
      id: 'logical_specialists',
      name: '10 Logical Specialist Roles (Swarm)',
      tabId: 'INTELLIGENCE_MODELS',
      subsystem: 'Intelligence & Models',
      role: 'Domain-separated Iron Man suit specialists dividing responsibility across PC control, web, safety and banking',
      filePath: 'backend/app/cognitive/registry/builtin_agents.py',
      status: 'HEALTHY',
      latency: '3.0 ms',
      memoryFootprint: '28.4 MB',
      capabilities: [
        'Mark 85 (Commander) - Team captain & goal planner',
        'Mark L (Browser) - Playwright web research',
        'Mark VI (Windows OS) - User32 desktop automation',
        'Mark XLIII (Vision OCR) - Screen perception',
        'Mark V (Memory RAG) - Local 588 chunk search',
        'Mark VII (Planner) - Kahn DAG scheduling',
        'Mark I (Security Sentinel) - Policy audit guard',
        'Mark XLII (Self-Healing) - Automatic code repair',
        'Mark XVII (Voice) - Neural acoustic speech',
        'Mark XXXIII (SBI Banking) - Sovereign financial ledger'
      ],
      activeConnections: {
        inbound: ['CentralSupervisor'],
        outbound: ['ModelResourceScheduler', 'Domain Automation Adapters']
      },
      specs: {
        'Specialist Count': '10 Autonomous Roles',
        'Isolation Protocol': 'Restricted capability boundaries per suit',
        'Inter-Suit Channel': 'Async In-Memory Queue (#squad-command)'
      },
      summary: 'Architectural separation of powers ensuring single-responsibility execution across all tasks.'
    },
    {
      id: 'model_resource_scheduler',
      name: 'ModelResourceScheduler',
      tabId: 'INTELLIGENCE_MODELS',
      subsystem: 'Intelligence & Models',
      role: 'Hardware-aware VRAM watchdog and sequential model swapping scheduler',
      filePath: 'backend/app/runtime/resources/resource_manager.py',
      status: 'ACTIVE',
      latency: '0.4 ms',
      memoryFootprint: '8.5 MB',
      capabilities: [
        'Hardware VRAM Headroom Tracking (8GB GPU / 16GB RAM)',
        'Sequential Mutex Lock preventing concurrent model collisions',
        'OOM Hazard Prevention & Dynamic CPU Offloading',
        'Model Warm-Up & Keep-Alive Duration Management',
        'Thermal Throttle & Battery State Awareness'
      ],
      activeConnections: {
        inbound: ['Ollama Client Adapter', 'CentralSupervisor'],
        outbound: ['Physical Ollama Models', 'Hardware Engine psutil/nvml']
      },
      specs: {
        'Minimum Free VRAM Target': '1,500 MB Headroom',
        'Lock Strategy': 'Asyncio FIFO Mutex',
        'Degraded Fallback': 'Automated switch to AbhiNativeLLM Standalone'
      },
      summary: 'Safeguards laptop hardware resources by sequentially swapping heavy models and preventing memory exhaustion.'
    },

    // ========================================================
    // TAB 4: MEMORY, RAG & MCP
    // ========================================================
    {
      id: 'lancedb_vector_store',
      name: 'LanceDB Vector Store (588+ Chunks)',
      tabId: 'MEMORY_RAG_MCP',
      subsystem: 'Memory, RAG & MCP',
      role: 'Sub-millisecond hybrid vector storage index powering 100% offline local knowledge recall',
      filePath: 'backend/app/services/rag/vector_store.py',
      status: 'ACTIVE',
      latency: '4.2 ms',
      memoryFootprint: '78.5 MB',
      capabilities: [
        'Dense Vector Cosine Similarity Search (Threshold >= 0.65)',
        'BM25 Full-Text Keyword Hybrid Reranking',
        'Persistent Disk Storage via Apache Arrow / LanceDB format',
        'Dynamic Incremental Embedding Update on File Change',
        'Zero Cloud Transmission Sovereign Storage'
      ],
      activeConnections: {
        inbound: ['Mark V Memory Specialist', 'Knowledge API /api/v1/knowledge'],
        outbound: ['all-minilm:latest Embeddings', 'Local NVMe Storage']
      },
      specs: {
        'Indexed Chunks': '588 Knowledge Chunks',
        'Vector Dimensions': '384 Dimensions',
        'Average Query Latency': '4.2 Milliseconds',
        'Format': 'Apache Arrow Columnar'
      },
      summary: 'Contains the complete architectural rules, codebase blueprints, and operational facts of the ABHI project.'
    },
    {
      id: 'sqlite_wal_dbs',
      name: 'SQLite WAL DBs (system.db & execution_journal.db)',
      tabId: 'MEMORY_RAG_MCP',
      subsystem: 'Memory, RAG & MCP',
      role: 'ACID transaction engine configured with Write-Ahead Logging for zero lock collisions',
      filePath: 'backend/database/system.db',
      status: 'HEALTHY',
      latency: '0.3 ms',
      memoryFootprint: '22.1 MB',
      capabilities: [
        'Write-Ahead Logging (WAL) Mode Concurrency',
        'Append-Only Execution Audit Trail (execution_journal.db)',
        'System Configuration & Agent Profile Store (system.db)',
        'Zero Lock Collisions on Simultaneous Read/Write',
        'Automatic Checkpoint & Vacuum Maintenance'
      ],
      activeConnections: {
        inbound: ['All FastAPI Subsystem Routers', 'DualStateVerifier', 'CentralSupervisor'],
        outbound: ['Local Host File System']
      },
      specs: {
        'Journal Mode': 'WAL (Write-Ahead Logging)',
        'Busy Timeout': '5,000 Milliseconds',
        'Synchronous Setting': 'NORMAL (Balanced Safety & Speed)',
        'Integrity Check': 'Automated PRAGMA verification on startup'
      },
      summary: 'High-durability local database maintaining immutable records of every task, action, and configuration.'
    },
    {
      id: 'personal_memory_mgr',
      name: 'PersonalMemoryManager',
      tabId: 'MEMORY_RAG_MCP',
      subsystem: 'Memory, RAG & MCP',
      role: 'Cross-session episodic memory manager tracking operator habits, preferences, and frequent workflows',
      filePath: 'backend/app/services/memory/personal_memory.py',
      status: 'ACTIVE',
      latency: '1.5 ms',
      memoryFootprint: '16.8 MB',
      capabilities: [
        'Long-Term Episodic Memory Indexing',
        'Operator Preference Extraction (Callsign: Mamu)',
        'Contextual Fact Synthesis for Conversational Continuity',
        'Temporal Decay & Recency Reranking',
        'Privacy Boundary Shielding (No telemetry leak)'
      ],
      activeConnections: {
        inbound: ['Unified Conversation Gateway', 'CentralSupervisor'],
        outbound: ['LanceDB Vector Store', 'SQLite Databases']
      },
      specs: {
        'Operator Entity': 'Ravuvai Ayyapparayudu (Mamu)',
        'Retention Horizon': 'Permanent Local Storage',
        'Privacy Policy': '100% Offline Sovereign'
      },
      summary: 'Enables ABHI to remember operator habits, preferred apps, and communication patterns across restarts.'
    },
    {
      id: 'mcp_tools_suite',
      name: '7 Standard MCP (Model Context Protocol) Tools',
      tabId: 'MEMORY_RAG_MCP',
      subsystem: 'Memory, RAG & MCP',
      role: 'Sandboxed tool execution interface conforming to the standardized Model Context Protocol',
      filePath: 'backend/app/services/skills/mcp/',
      status: 'HEALTHY',
      latency: '1.8 ms',
      memoryFootprint: '24.0 MB',
      capabilities: [
        'mcp_filesystem: Sandboxed read/write/stat within project boundaries',
        'mcp_win32_shell: Direct non-destructive process invocation',
        'mcp_browser_playwright: Headless web navigation & element queries',
        'mcp_sql_inspector: Read-only SQLite WAL query tool',
        'mcp_rag_recall: Semantic vector similarity extraction',
        'mcp_device_adb: POCO X6 Android bridge communication',
        'mcp_sbi_treasury: State Bank of India ledger reconciliation'
      ],
      activeConnections: {
        inbound: ['CentralSupervisor', 'Specialist Suits'],
        outbound: ['Windows 11 Kernel', 'Playwright Engine', 'SQLite', 'LanceDB', 'ADB Bridge']
      },
      specs: {
        'Protocol Standard': 'Model Context Protocol (JSON-RPC 2.0)',
        'Total Tools Registered': '7 Operational MCP Tools',
        'Execution Sandbox': 'Strict Permission Bounds per Tool'
      },
      summary: 'Provides standardized, auditable tools for specialists to interact with files, databases, and devices safely.'
    },

    // ========================================================
    // TAB 5: AUTOMATION & OS
    // ========================================================
    {
      id: 'win32_os_worker',
      name: 'Windows Desktop OS Worker',
      tabId: 'AUTOMATION_OS',
      subsystem: 'Automation & OS',
      role: 'Native Windows 11 automation driver executing direct ctypes SendInput hotkeys and window operations',
      filePath: 'backend/app/automation/desktop/os_control_engine.py',
      status: 'ACTIVE',
      latency: '0.1 ms',
      memoryFootprint: '28.7 MB',
      capabilities: [
        'Direct Win32 ctypes SendInput for 0.1ms Hotkeys (Win+D, Alt+Tab, Ctrl+W)',
        'User32.dll Foreground Window Hook & Dimension Positioning',
        'Windows CoreAudio Master Volume Scaling & Mute Toggle',
        'Fast Application Launcher indexing 90 Windows Applications',
        'Mouse Click & Cursor Coordination without slow UI Automation hooks'
      ],
      activeConnections: {
        inbound: ['WorkerLifecycleManager', 'Mark VI Windows OS Specialist'],
        outbound: ['Windows 11 Desktop Kernel (User32 / Kernel32 / GDI32)']
      },
      specs: {
        'API Interface': 'Direct Win32 ctypes C-Library Calls',
        'Keystroke Latency': '0.1 Milliseconds',
        'Indexed Applications': '90 Windows Desktop Apps',
        'Display Context': '1280x800 Native Resolution'
      },
      summary: 'Gives ABHI physical hands on the computer to switch apps, type hotkeys, and adjust hardware volume in 0ms.'
    },
    {
      id: 'playwright_browser_worker',
      name: 'Playwright Browser Worker',
      tabId: 'AUTOMATION_OS',
      subsystem: 'Automation & OS',
      role: 'Isolated Chromium/Edge browser automation worker for research and web navigation',
      filePath: 'backend/app/automation/browser/browser_manager.py',
      status: 'READY',
      latency: '12.0 ms',
      memoryFootprint: '115.4 MB',
      capabilities: [
        'Headless & Headed Chromium Instance Management',
        'Stealth Anti-Detection Profile Navigation',
        'DOM Accessibility Tree Traversal & Evaluation',
        'Clean Text Extraction & Full-Page Screenshotting',
        'Ephemeral Incognito Session Isolation'
      ],
      activeConnections: {
        inbound: ['WorkerLifecycleManager', 'Mark L Browser Specialist'],
        outbound: ['Chrome DevTools Protocol (CDP)', 'Target Web Hosts']
      },
      specs: {
        'Engine': 'Playwright Chromium',
        'Channel': 'Local Chrome / Edge Binary',
        'Isolation': 'Fresh Browser Context per Task',
        'Security': 'No Cookie / Credential Exfiltration'
      },
      summary: 'Executes high-speed web browsing, data scraping, and verification in an isolated browser process.'
    },
    {
      id: 'lease_manager',
      name: 'LeaseManager',
      tabId: 'AUTOMATION_OS',
      subsystem: 'Automation & OS',
      role: 'Exclusive hardware lease coordinator enforcing single-writer access to mouse, keyboard and windows',
      filePath: 'backend/app/automation/lease_manager.py',
      status: 'ACTIVE',
      latency: '0.2 ms',
      memoryFootprint: '6.4 MB',
      capabilities: [
        'Single-Writer OS Resource Lock (Prevents worker input conflicts)',
        'Time-To-Live (TTL) Leases with Automatic Expiration',
        'Dead-Man Heartbeat Watchdog',
        'Instant Revocation on Emergency Stop or User Takeover',
        'Active vs Revoked Lease Audit Metrics'
      ],
      activeConnections: {
        inbound: ['CentralSupervisor', 'Mark I Security Sentinel'],
        outbound: ['Windows Desktop OS Worker', 'Playwright Browser Worker']
      },
      specs: {
        'Default Lease TTL': '15.0 Seconds',
        'Lock Granularity': 'System-wide Mouse / Keyboard Mutex',
        'Revocation Latency': '< 1.0 Millisecond'
      },
      summary: 'Prevents multiple workers from fighting over the keyboard or mouse, guaranteeing orderly execution.'
    },
    {
      id: 'shared_event_bus',
      name: 'SharedEventBus Ring Buffer',
      tabId: 'AUTOMATION_OS',
      subsystem: 'Automation & OS',
      role: 'Zero-copy in-memory ring buffer broadcasting telemetry events across backend and frontend WebSocket',
      filePath: 'backend/app/core/event_bus.py',
      status: 'ACTIVE',
      latency: '0.05 ms',
      memoryFootprint: '14.2 MB',
      capabilities: [
        'Fixed-Size In-Memory Ring Buffer (500 ABHIEvent Capacity)',
        'Zero-Copy Async Event Pub/Sub Broadcasting',
        'WebSocket Streaming to /ws/telemetry',
        'Client Replay Buffer for Reconnecting UI Instances',
        'Category & Source Channel Filtering'
      ],
      activeConnections: {
        inbound: ['All Cognitive Agents', 'All Background Workers', 'DualStateVerifier'],
        outbound: ['WebSocket /ws/telemetry', 'Angular TelemetryService', 'Console Logs']
      },
      specs: {
        'Buffer Capacity': '500 Events Max',
        'Overflow Policy': 'FIFO Overwrite Oldest (No Memory Leak)',
        'Broadcast Latency': '0.05 Milliseconds'
      },
      summary: 'The live nervous system broadcasting every state change, verification proof, and sensor reading.'
    }
  ]);

  // Computed Filtered Nodes
  readonly filteredNodes = computed(() => {
    const tab = this.selectedTabId();
    const query = this.searchQuery().trim().toLowerCase();
    const statusFilter = this.selectedStatusFilter();

    return this.allNodes().filter(node => {
      // Tab check: if 'ALL', match all subsystems
      const matchesTab = tab === 'ALL' || node.tabId === tab;

      // Status check
      const matchesStatus = statusFilter === 'ALL' || node.status === statusFilter;

      // Search query check
      const matchesQuery =
        !query ||
        node.name.toLowerCase().includes(query) ||
        node.subsystem.toLowerCase().includes(query) ||
        node.role.toLowerCase().includes(query) ||
        node.filePath.toLowerCase().includes(query) ||
        node.capabilities.some(c => c.toLowerCase().includes(query));

      return matchesTab && matchesStatus && matchesQuery;
    });
  });

  // Computed Stage to Nodes mapping for expansive ALL pipeline view
  readonly stageNodesMap = computed(() => {
    const nodes = this.filteredNodes();
    const map = new Map<string, ArchitectureNode[]>();
    for (const stage of this.pipelineStages) {
      map.set(stage.tabId, nodes.filter(n => n.tabId === stage.tabId));
    }
    return map;
  });

  // Computed Node Stats per Tab
  readonly tabCounts = computed(() => {
    const map = new Map<SubsystemTabId, number>();
    map.set('ALL', this.allNodes().length);
    for (const tab of this.subsystemTabs) {
      if (tab.id !== 'ALL') {
        map.set(tab.id, this.allNodes().filter(n => n.tabId === tab.id).length);
      }
    }
    return map;
  });

  // Current active tab object
  readonly currentTab = computed(() => {
    return this.subsystemTabs.find(t => t.id === this.selectedTabId()) || this.subsystemTabs[0];
  });

  // Filtered live events for feed
  readonly filteredLiveEvents = computed(() => {
    const cat = this.eventCategoryFilter();
    const events = this.liveEvents();
    if (cat === 'ALL') return events;
    return events.filter(e => e.category.toUpperCase() === cat.toUpperCase());
  });

  // Filtered live events for active inspector node
  readonly nodeRecentEvents = computed(() => {
    const node = this.activeInspectorNode();
    if (!node) return [];
    const nodeId = node.id.toLowerCase();
    const nodeName = node.name.toLowerCase();

    return this.liveEvents().filter(e => {
      const src = (e.source || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();
      const type = (e.type || '').toLowerCase();
      return (
        src.includes(nodeId) ||
        nodeId.includes(src) ||
        nodeName.includes(src) ||
        cat.includes(nodeId) ||
        type.includes(nodeId)
      );
    }).slice(0, 10);
  });

  ngOnInit(): void {
    // Initial fetch of live introspection & health
    this.refreshAllIntrospection();

    // Default select first node
    const initialNode = this.allNodes()[0];
    if (initialNode) {
      this.activeInspectorNode.set(initialNode);
    }

    // Subscribe to live telemetry events from WebSocket service
    this.telemetrySub = this.telemetryService.events$.subscribe((event: TelemetryEvent) => {
      if (!this.isStreamPaused()) {
        this.handleIncomingTelemetryEvent(event);
      }
    });

    // Populate initial buffer from service if already connected
    const existing = this.telemetryService.eventBuffer();
    if (existing && existing.length > 0) {
      existing.slice(-25).forEach(e => this.handleIncomingTelemetryEvent(e));
    }

    // Setup periodic 8s polling for live introspection and health
    this.pollTimer = setInterval(() => {
      this.pollIntrospectionSilently();
    }, 8000);
  }

  ngOnDestroy(): void {
    if (this.telemetrySub) {
      this.telemetrySub.unsubscribe();
      this.telemetrySub = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // User Actions
  selectTab(tabId: SubsystemTabId): void {
    this.selectedTabId.set(tabId);
    if (tabId !== 'ALL') {
      const firstNode = this.allNodes().find(n => n.tabId === tabId);
      if (firstNode) {
        this.activeInspectorNode.set(firstNode);
      }
    }
  }

  selectNode(node: ArchitectureNode): void {
    this.activeInspectorNode.set(node);
    this.inspectorView.set('INSPECTOR');
    this.isInspectorOpen.set(true);
  }

  toggleInspector(): void {
    this.isInspectorOpen.update(v => !v);
  }

  closeInspector(): void {
    this.isInspectorOpen.set(false);
  }

  setStatusFilter(status: string): void {
    this.selectedStatusFilter.set(status);
  }

  setInspectorView(view: 'INSPECTOR' | 'FEED'): void {
    this.inspectorView.set(view);
  }

  toggleStreamPause(): void {
    this.isStreamPaused.update(v => !v);
  }

  toggleAutoScroll(): void {
    this.autoScrollEvents.update(v => !v);
  }

  setCategoryFilter(cat: string): void {
    this.eventCategoryFilter.set(cat);
  }

  // Zoom controls
  zoomIn(): void {
    this.zoomLevel.update(z => Math.min(1.4, Math.round((z + 0.1) * 10) / 10));
  }

  zoomOut(): void {
    this.zoomLevel.update(z => Math.max(0.7, Math.round((z - 0.1) * 10) / 10));
  }

  resetZoom(): void {
    this.zoomLevel.set(1.0);
  }

  // Copy helper with feedback
  async copyFilePath(path: string): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(path);
        this.copiedPath.set(path);
        setTimeout(() => {
          if (this.copiedPath() === path) {
            this.copiedPath.set(null);
          }
        }, 1800);
      }
    } catch {
      // Fallback
    }
  }

  // Live Refresh Pipeline
  async refreshAllIntrospection(): Promise<void> {
    this.isRefreshing.set(true);
    await Promise.allSettled([
      this.fetchArchitectureIntrospection(),
      this.fetchSystemHealth(),
      this.fetchHardwareTelemetry(),
      this.fetchActiveContext()
    ]);
    this.isRefreshing.set(false);
    this.lastRefreshed.set(new Date().toLocaleTimeString());
  }

  private async pollIntrospectionSilently(): Promise<void> {
    await Promise.allSettled([
      this.fetchArchitectureIntrospection(),
      this.fetchSystemHealth(),
      this.fetchHardwareTelemetry(),
      this.fetchActiveContext()
    ]);
    this.lastRefreshed.set(new Date().toLocaleTimeString());
  }

  private async fetchArchitectureIntrospection(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/architecture/introspection'));
      if (res.ok) {
        const data = await res.json();
        this.liveIntrospection.set(data);
        this.mergeIntrospectionData(data);
      }
    } catch {
      // Graceful fallback to synthesized health
    }
  }

  private async fetchSystemHealth(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/health'));
      if (res.ok) {
        const data = await res.json();
        this.liveHealth.set(data);
        this.applyHealthToNodes(data);
      }
    } catch {
      // Graceful fallback
    }
  }

  private async fetchHardwareTelemetry(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/health/system-telemetry'));
      if (res.ok) {
        const data = await res.json();
        this.liveHardwareTelemetry.set(data);
      }
    } catch {
      // Graceful fallback
    }
  }

  private async fetchActiveContext(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/desktop/active-context'));
      if (res.ok) {
        const data = await res.json();
        this.activeContext.set(data);
      }
    } catch {
      // Graceful fallback
    }
  }

  private mergeIntrospectionData(data: any): void {
    if (!data || !data.components) return;

    this.allNodes.update(nodes => {
      return nodes.map(node => {
        const remote = data.components[node.id] || (data.subsystems && data.subsystems[node.id]);
        if (!remote) return node;

        const updatedStatus: NodeStatus =
          remote.status === 'HEALTHY' || remote.status === 'ACTIVE' || remote.status === 'STANDBY' || remote.status === 'DEGRADED' || remote.status === 'READY'
            ? remote.status
            : node.status;

        return {
          ...node,
          status: updatedStatus,
          latency: remote.latency || node.latency,
          memoryFootprint: remote.memoryFootprint || remote.memory || node.memoryFootprint,
          capabilities: remote.capabilities ? [...remote.capabilities] : node.capabilities,
          activeConnections: remote.activeConnections || node.activeConnections,
          specs: remote.specs ? { ...node.specs, ...remote.specs } : node.specs
        };
      });
    });

    // Update active inspector node if matched
    const current = this.activeInspectorNode();
    if (current) {
      const refreshed = this.allNodes().find(n => n.id === current.id);
      if (refreshed) {
        this.activeInspectorNode.set(refreshed);
      }
    }
  }

  private applyHealthToNodes(health: any): void {
    if (!health || !health.subsystems) return;
    const subs = health.subsystems;

    this.allNodes.update(nodes => {
      return nodes.map(node => {
        if (node.id === 'api_gateway') {
          return { ...node, status: subs.api_gateway === 'healthy' ? 'HEALTHY' : 'DEGRADED' };
        }
        if (node.id === 'sqlite_wal_dbs') {
          return { ...node, status: subs.database_sqlite === 'healthy' ? 'HEALTHY' : 'DEGRADED' };
        }
        if (node.id === 'ollama_abhi_latest' || node.id === 'model_resource_scheduler') {
          const healthy = subs.ollama_service === 'healthy' || subs.abhi_llm_core === 'healthy';
          return { ...node, status: healthy ? 'ACTIVE' : 'DEGRADED' };
        }
        return node;
      });
    });
  }

  private handleIncomingTelemetryEvent(raw: TelemetryEvent): void {
    const rawAny = raw as any;
    const category = (rawAny.category || raw.channel || 'SYSTEM').toUpperCase();
    const source = rawAny.source || raw.component || 'core';
    const type = raw.type || 'EVENT';
    const timestamp = raw.timestamp || Date.now();

    const formatted: ABHIEvent = {
      id: raw.id || `evt_${timestamp}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      source,
      type,
      status: raw.status || 'OK',
      payload: raw.payload || {},
      timestamp
    };

    // Prepend to liveEvents, keeping up to 100 events
    this.liveEvents.update(list => [formatted, ...list.slice(0, 99)]);
  }

  // Quick Action trigger to test component interactivity
  async pingComponent(nodeId: string): Promise<void> {
    try {
      await fetch(getApiUrl('/api/v1/desktop/quick-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ping_node', params: { node_id: nodeId } })
      });
      await this.refreshAllIntrospection();
    } catch {
      // Graceful
    }
  }
}
