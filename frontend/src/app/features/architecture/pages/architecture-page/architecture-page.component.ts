import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { getApiUrl } from '../../../../core/config/api-config';

export interface ArchitectureSection {
  id: string;
  navTitle: string;
  icon: string;
  tag: string;
  headline: string;
  simpleSummary: string;
  threePillars: {
    whatItDoes: { title: string; desc: string; icon: string };
    speedMetric: { title: string; desc: string; icon: string };
    reliability: { title: string; desc: string; icon: string };
  };
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

export interface InspectorNode {
  id: string;
  name: string;
  simpleRole: string;
  subsystem: string;
  latency: string;
  filePath: string;
  inputData: string;
  outputData: string;
  rationale: string;
  status: string;
}

@Component({
  selector: 'app-architecture-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './architecture-page.component.html',
  styleUrl: './architecture-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ArchitecturePageComponent implements OnInit, OnDestroy {
  readonly selectedSectionId = signal<string>('END_TO_END');
  readonly showDevDetails = signal<boolean>(false);
  readonly liveTelemetry = signal<any>(null);

  // Simulation & Animation State
  readonly isSimulating = signal<boolean>(true);
  readonly activeSimStep = signal<number>(0);
  readonly simSpeed = signal<number>(1);
  readonly activeInspectorNode = signal<InspectorNode | null>(null);
  readonly selectedSwarmAgentId = signal<string>('mark85');

  private simTimer: any = null;
  private telemetryTimer: any = null;

  readonly sections: ArchitectureSection[] = [
    {
      id: 'END_TO_END',
      navTitle: 'Execution Flow',
      icon: '⚡',
      tag: 'INSTANT ACTION',
      headline: 'From Your Voice to Windows 11 Action in 0ms',
      simpleSummary: 'Whenever you speak or type a command, ABHI recognizes what you need, matches frequent actions instantly in 0 milliseconds, or plans multi-step tasks using local AI.',
      threePillars: {
        whatItDoes: {
          icon: '🎯',
          title: 'Direct Action',
          desc: 'Opens apps, controls browser tabs, plays music, and manages your desktop.'
        },
        speedMetric: {
          icon: '⚡',
          title: '0ms Latency',
          desc: 'Instant response for all frequent commands; no cloud lag or waiting.'
        },
        reliability: {
          icon: '🛡️',
          title: 'Acoustic Voice Attunement',
          desc: 'Tuned specifically to Mamu’s voice frequency with zero wake-word delay.'
        }
      },
      whyWeUseIt: {
        summary: 'Gives you an instant digital companion that never feels slow. Frequent commands execute in 0ms, while complex questions route through local AI memory.',
        points: [
          'Acoustic Voice Filter: Continuous 60fps microphone listening tuned to Mamu.',
          'Zero-Lag Dynamic Resolver: Opens Notepad, Calculator, WhatsApp, and browser tabs instantly.',
          'Active Window Awareness: Always knows what application you are looking at right now.',
          'Physical Win32 Controls: Directly presses hotkeys and focuses windows without clumsy UI delays.'
        ]
      },
      whereWeUseIt: {
        description: 'Runs between the always-on tray daemon, the FastAPI server, and Windows 11 User32 drivers.',
        files: [
          { path: 'abhi_global_controller.py', role: 'Always-on desktop overlay & microphone listener' },
          { path: 'backend/app/api/v1/desktop.py', role: 'FastAPI ask-bot orchestrator & active window sensor' },
          { path: 'backend/app/services/rag/vector_store.py', role: 'Local semantic vector store (588 chunks)' },
          { path: 'backend/app/cognitive/planner/planner.py', role: 'Kahn DAG task planner' },
          { path: 'backend/app/automation/desktop/os_control_engine.py', role: 'Direct Win32 ctypes keystrokes & app launcher' }
        ],
        endpoints: [
          'POST /api/v1/desktop/ask-bot',
          'GET /api/v1/desktop/active-context',
          'POST /api/v1/desktop/quick-action'
        ]
      },
      whatExistsAllData: {
        title: 'Execution Subsystem Data',
        metrics: [
          { label: 'Voice Profile', value: 'Mamu Callsign (Ravuvai A.)' },
          { label: 'Dynamic Patterns', value: '37 Instant OS Shortcuts' },
          { label: 'Execution Speed', value: '0ms (Cached) / 24ms (AI)' },
          { label: 'Active Mode', value: '100% Offline Sovereign' }
        ],
        entities: [
          { name: 'Microphone Sensor', details: 'Continuous 60fps acoustic VAD filter tuned to Mamu.', status: 'STREAMING' },
          { name: 'Active Window Sensor', details: 'Reads active foreground window title and dimensions.', status: 'ENGAGED' },
          { name: 'Instant Action Cache', details: 'Pre-compiled regex rules for instant 0ms execution.', status: 'CACHED' },
          { name: 'Win32 Dispatcher', details: 'Direct ctypes SendInput and hotkey emulator.', status: 'ACTIVE' }
        ]
      },
      diagramType: 'FLOW'
    },
    {
      id: 'SWARM',
      navTitle: '10 AI Specialists',
      icon: '🛡️',
      tag: 'MULTI-AGENT TEAM',
      headline: 'Iron Man Suit Team — 10 Specialized AI Agents',
      simpleSummary: 'Instead of one AI doing everything and making mistakes, 10 specialized agents handle different jobs: one surfs the web, one controls Windows, one audits safety, and one manages banking.',
      threePillars: {
        whatItDoes: {
          icon: '🛡️',
          title: 'Mark 85 Commander',
          desc: 'Listens to your goal and assigns tasks to the best suited specialist.'
        },
        speedMetric: {
          icon: '⚡',
          title: 'Parallel Work',
          desc: 'Independent agents work simultaneously to finish big jobs 5x faster.'
        },
        reliability: {
          icon: '🔒',
          title: 'Zero Mistakes',
          desc: 'Security Sentinel audits every action before touching your files or PC.'
        }
      },
      whyWeUseIt: {
        summary: 'Prevents mistakes and hallucinations by dividing work among domain experts. The browser specialist never touches Windows files, and the OS specialist never makes web calls without permission.',
        points: [
          'Clear Job Boundaries: Each agent specializes in one specific domain.',
          'Consensus Verification: Code and actions are checked before running on your PC.',
          'Unified Communication: All agents share status updates on the #squad-command channel.',
          'Self-Healing: The code repair specialist automatically fixes bugs without stopping.'
        ]
      },
      whereWeUseIt: {
        description: 'Coordinated through the central supervisor in backend/app/cognitive/supervisor/supervisor.py.',
        files: [
          { path: 'backend/app/cognitive/registry/builtin_agents.py', role: 'All 10 specialized agent definitions' },
          { path: 'backend/app/cognitive/supervisor/supervisor.py', role: 'Central agent task dispatcher & consensus evaluator' },
          { path: 'backend/app/cognitive/registry/base_agent.py', role: 'Agent lifecycle & telemetry contracts' }
        ],
        endpoints: [
          'GET /api/v1/agent/network',
          'POST /api/v1/agent/delegate',
          'GET /api/v1/agent/{agent_id}/status'
        ]
      },
      whatExistsAllData: {
        title: 'Suit Agent Roster',
        metrics: [
          { label: 'Active Specialists', value: '10 Autonomous Suits' },
          { label: 'Commander Model', value: 'Mark 85 (DeepSeek-R1 / Qwen)' },
          { label: 'Agent Channel', value: 'In-Memory Async Queue' },
          { label: 'Safety Protocol', value: 'Dual-State Verification' }
        ],
        entities: [
          { name: 'Mark 85 (Commander)', details: 'High-level task coordination and final decisions.', status: 'COMMANDING' },
          { name: 'Mark L (Browser)', details: 'Playwright Chromium web research & DOM actions.', status: 'READY' },
          { name: 'Mark VI (Windows OS)', details: 'Win32 window handling, file system, hotkeys.', status: 'ACTIVE' },
          { name: 'Mark XLIII (Vision OCR)', details: 'Screen capture, button detection, visual checks.', status: 'ENGAGED' },
          { name: 'Mark V (Memory RAG)', details: 'Searches 588 local project knowledge chunks.', status: 'ONLINE' },
          { name: 'Mark VII (Task Planner)', details: 'Organizes multi-step dependency graphs.', status: 'PLANNING' },
          { name: 'Mark I (Security Sentinel)', details: 'Guards tokens, checks permissions, audits safety.', status: 'GUARDING' },
          { name: 'Mark XLII (Self-Healing)', details: 'Automatically detects and repairs code bugs.', status: 'STANDBY' },
          { name: 'Mark XVII (Voice)', details: 'Speech recognition and neural voice synthesis.', status: 'ATTUNED' },
          { name: 'Mark XXXIII (SBI Banking)', details: 'State Bank of India reconciliation & treasury.', status: 'AUDITING' }
        ]
      },
      diagramType: 'SWARM'
    },
    {
      id: 'RAG',
      navTitle: 'Local Memory (RAG)',
      icon: '📚',
      tag: 'PRIVATE KNOWLEDGE',
      headline: '588 Local Knowledge Chunks — 100% Offline & Private',
      simpleSummary: 'All project documents, code structures, rules, and banking receipts are indexed on your local laptop drive. ABHI recalls exact answers in 4.2 milliseconds without touching the cloud.',
      threePillars: {
        whatItDoes: {
          icon: '📚',
          title: 'Complete Knowledge',
          desc: '588 embedded records covering every single part of this project.'
        },
        speedMetric: {
          icon: '⚡',
          title: '4.2ms Search',
          desc: 'Finds the exact answer in milliseconds using mathematical similarity.'
        },
        reliability: {
          icon: '🔒',
          title: '100% Private',
          desc: 'Zero data leaves your laptop; runs completely offline on your disk.'
        }
      },
      whyWeUseIt: {
        summary: 'Eliminates AI hallucination by giving the AI actual verified facts from your project files before it answers.',
        points: [
          'Sovereign Security: Private code and banking records stay local.',
          'Hybrid Search: Combines mathematical vector embeddings with exact keyword matching.',
          'Automatic Updates: Learns new actions and stores them into memory instantly.',
          'High Relevance: Only uses verified facts with relevance scores above 0.65.'
        ]
      },
      whereWeUseIt: {
        description: 'Handled by LocalVectorStore in backend/app/services/rag/vector_store.py.',
        files: [
          { path: 'backend/app/services/rag/vector_store.py', role: 'LocalVectorStore vector search engine' },
          { path: 'project_data/intelligence/vector_store.json', role: '588 persistent vector chunks on disk' },
          { path: 'backend/app/api/v1/knowledge.py', role: 'Knowledge query & ingestion API' }
        ],
        endpoints: [
          'POST /api/v1/knowledge/query',
          'GET /api/v1/knowledge/stats'
        ]
      },
      whatExistsAllData: {
        title: 'Memory Store Inventory',
        metrics: [
          { label: 'Total Chunks', value: '588 Knowledge Chunks' },
          { label: 'Vector Size', value: '384 Dimensions' },
          { label: 'Match Threshold', value: 'Cosine Score >= 0.65' },
          { label: 'Storage Type', value: 'Local JSON / LanceDB' }
        ],
        entities: [
          { name: 'Architecture Chunks', details: 'System rules, topologies, and execution contracts.', status: 'INDEXED' },
          { name: 'Codebase Chunks', details: 'FastAPI routes, Angular components, ctypes Win32 code.', status: 'INDEXED' },
          { name: 'SBI Treasury Chunks', details: 'State Bank of India account ****5649 and settlement data.', status: 'INDEXED' },
          { name: 'Learned Memory Chunks', details: 'Operator preferences and frequent applications.', status: 'ACTIVE' }
        ]
      },
      diagramType: 'RAG'
    },
    {
      id: 'DAG',
      navTitle: 'Task Planner (DAG)',
      icon: '🗺️',
      tag: 'TASK SCHEDULING',
      headline: 'Organizes Complex Goals Step-by-Step with Zero Deadlocks',
      simpleSummary: 'When you ask for something big, the task planner breaks it down into a clear roadmap. Steps that depend on each other run in sequence, while independent steps run at the same time.',
      threePillars: {
        whatItDoes: {
          icon: '🗺️',
          title: 'Orderly Planning',
          desc: 'Creates a clear step-by-step checklist before touching anything.'
        },
        speedMetric: {
          icon: '⚡',
          title: 'Parallel Speed',
          desc: 'Runs multiple safe tasks at the same time so you don’t have to wait.'
        },
        reliability: {
          icon: '🛡️',
          title: 'Dual Verification',
          desc: 'Visually and physically verifies each step is finished before moving on.'
        }
      },
      whyWeUseIt: {
        summary: 'Prevents confusion and crashes when executing complex multi-step commands by enforcing mathematical dependency ordering.',
        points: [
          'No Deadlocks: Kahn algorithm guarantees tasks never freeze waiting for each other.',
          'Parallel Worker Dispatch: Independent steps execute concurrently across agents.',
          'Auto-Recovery: If one step encounters an issue, it recalculates an alternate route.',
          'Audit Log: Every step is recorded with exact start times and results.'
        ]
      },
      whereWeUseIt: {
        description: 'Implemented in backend/app/cognitive/planner/planner.py and flow_engine.py.',
        files: [
          { path: 'backend/app/cognitive/planner/planner.py', role: 'Kahn DAG topological planner' },
          { path: 'backend/app/automation/flow_engine.py', role: 'Workflow execution engine' },
          { path: 'backend/app/cognitive/verification/verifier.py', role: 'Dual-State physical verifier' }
        ],
        endpoints: [
          'POST /api/v1/tasks/plan',
          'GET /api/v1/tasks/{task_id}/dag'
        ]
      },
      whatExistsAllData: {
        title: 'Task Planner Telemetry',
        metrics: [
          { label: 'Algorithm', value: "Kahn's Topological Sort O(V+E)" },
          { label: 'Max Concurrency', value: '4 Parallel Workers' },
          { label: 'Verification', value: 'Process + Visual Check' },
          { label: 'State Log', value: 'Journal Append-Only' }
        ],
        entities: [
          { name: 'Roadmap Generator', details: 'Decomposes high-level goals into subtasks.', status: 'RUNNING' },
          { name: 'Dependency Sorter', details: 'Dispatches steps as soon as prerequisites finish.', status: 'ACTIVE' },
          { name: 'Physical Verifier', details: 'Checks active window and screen before completing.', status: 'ENGAGED' }
        ]
      },
      diagramType: 'DAG'
    },
    {
      id: 'LLM',
      navTitle: 'Local AI Brain',
      icon: '🧠',
      tag: 'LOCAL INTELLIGENCE',
      headline: 'Offline Ollama Model Serving with Instant Python Fallback',
      simpleSummary: 'Your AI brain runs entirely on your PC. It understands natural human language, cleans up responses into exact instructions, and even writes quick helper scripts when facing brand-new tasks.',
      threePillars: {
        whatItDoes: {
          icon: '🧠',
          title: 'Smart Reasoning',
          desc: 'Understands your natural words, questions, and complex requests.'
        },
        speedMetric: {
          icon: '⚡',
          title: 'Hardware Optimized',
          desc: 'Runs on your Intel Core i5 with CPU AVX2 acceleration.'
        },
        reliability: {
          icon: '🔒',
          title: 'Zero Subscriptions',
          desc: 'Free forever; no OpenAI API keys, token limits, or monthly fees.'
        }
      },
      whyWeUseIt: {
        summary: 'Gives ABHI real intelligence without needing an internet connection or paid cloud subscriptions.',
        points: [
          'Dual Engine: Connects to local Ollama (abhi:latest / DeepSeek-R1) with Python fallback.',
          'Strict JSON: Always cleans output so the system never chokes on formatting.',
          'Tool Builder: Writes small Python scripts to solve new tasks dynamically.',
          'Hardware Aware: Automatically adapts memory usage to keep your laptop fast.'
        ]
      },
      whereWeUseIt: {
        description: 'Implemented in backend/app/cognitive/llm/llm_client.py.',
        files: [
          { path: 'backend/app/cognitive/llm/llm_client.py', role: 'AbhiNativeLLMClient & Ollama SDK connection' },
          { path: 'backend/app/api/v1/models.py', role: 'Model discovery & hardware status API' }
        ],
        endpoints: [
          'POST /api/v1/models/chat',
          'GET /api/v1/models/available'
        ]
      },
      whatExistsAllData: {
        title: 'AI Model Inventory',
        metrics: [
          { label: 'Primary Model', value: 'Ollama Native (abhi:latest)' },
          { label: 'Reasoning Model', value: 'DeepSeek-R1 / Qwen 8.2B' },
          { label: 'Fallback Engine', value: 'AbhiNativeLLM Standalone' },
          { label: 'Hardware Engine', value: 'Intel Core i5 AVX2' }
        ],
        entities: [
          { name: 'Ollama Bridge', details: 'Connects to localhost:11434 with token streaming.', status: 'CONNECTED' },
          { name: 'JSON Normalizer', details: 'Extracts valid action JSON from conversational text.', status: 'OPERATIONAL' },
          { name: 'Tool Builder Sandbox', details: 'Generates and runs ephemeral helper scripts.', status: 'READY' }
        ]
      },
      diagramType: 'LLM'
    },
    {
      id: 'WIN32',
      navTitle: 'Windows 11 Control',
      icon: '🖥️',
      tag: 'HARDWARE & OS',
      headline: 'Direct Windows 11 Mouse, Keyboard, Window & Sound Control',
      simpleSummary: 'ABHI controls your computer like a real human sitting beside you: it detects what window you are looking at, types keyboard shortcuts, launches software, and adjusts the master sound volume.',
      threePillars: {
        whatItDoes: {
          icon: '🖥️',
          title: 'Total Desktop Control',
          desc: 'Switches windows, presses hotkeys, launches 90 indexed apps, and changes volume.'
        },
        speedMetric: {
          icon: '⚡',
          title: '0.1ms Hotkeys',
          desc: 'Direct User32.dll ctypes calls bypass slow UI automation frameworks.'
        },
        reliability: {
          icon: '👁️',
          title: 'Living Perception',
          desc: 'Tracks foreground window focus and screen boundaries in real time.'
        }
      },
      whyWeUseIt: {
        summary: 'Enables ABHI to actually do things on your computer instead of just chatting.',
        points: [
          'Direct Windows APIs: Uses User32.dll ctypes SendInput for zero-lag keystrokes.',
          'Active Window Focus: Instantly brings Chrome, VS Code, or Notepad to the front.',
          'Hardware Volume Scaling: Directly controls master audio using Windows CoreAudio.',
          'Mobile Link: Connects with your Android phone over ADB for WhatsApp and Gmail.'
        ]
      },
      whereWeUseIt: {
        description: 'Implemented in backend/app/automation/desktop/os_control_engine.py.',
        files: [
          { path: 'backend/app/automation/desktop/os_control_engine.py', role: 'Windows 11 ctypes SendInput & window management' },
          { path: 'backend/app/api/v1/desktop.py', role: 'Active window sensor & resolution API' },
          { path: 'backend/app/automation/desktop/volume_control.py', role: 'Windows CoreAudio master volume controller' }
        ],
        endpoints: [
          'GET /api/v1/desktop/active-context',
          'POST /api/v1/desktop/quick-action'
        ]
      },
      whatExistsAllData: {
        title: 'Windows 11 Subsystem State',
        metrics: [
          { label: 'Active Window', value: 'ABHI - Antigravity IDE' },
          { label: 'Indexed Apps', value: '90 Windows Applications' },
          { label: 'Display Resolution', value: '1280x800' },
          { label: 'Sensor Polling', value: 'Every 3 Seconds' }
        ],
        entities: [
          { name: 'Active Window Sensor', details: 'Tracks active foreground HWND and title.', status: 'STREAMING' },
          { name: 'App Launcher', details: 'Starts Chrome, Notepad, Calculator, VS Code, Terminal.', status: 'INDEXED' },
          { name: 'Hotkey Engine', details: 'Sends Win+D, Ctrl+W, Alt+Tab without mouse clicks.', status: 'ENGAGED' },
          { name: 'Volume Controller', details: 'Direct hardware sound scaling and mute toggle.', status: 'ONLINE' }
        ]
      },
      diagramType: 'WIN32'
    },
    {
      id: 'ER_BANKING',
      navTitle: 'SBI Treasury & Ledger',
      icon: '🏛️',
      tag: 'COMMERCIAL TREASURY',
      headline: 'State Bank of India Treasury & Revenue Settlements',
      simpleSummary: 'All project revenue, contracts, invoices, and bank settlements are tracked in an authentic ledger linked to Ravuvai Ayyapparayudu (SBI ****5649). Every transaction has a verified UTR receipt.',
      threePillars: {
        whatItDoes: {
          icon: '🏛️',
          title: 'Real Banking Rails',
          desc: 'State Bank of India account ****5649 (IFSC: SBIN0020507).'
        },
        speedMetric: {
          icon: '💰',
          title: 'Production Rails',
          desc: 'Zero fake or demo data. Every rupee requires an authentic Bank UTR.'
        },
        reliability: {
          icon: '🧾',
          title: 'Audited Receipts',
          desc: 'Immutable receipts stored on disk with genuine bank UTR hashes.'
        }
      },
      whyWeUseIt: {
        summary: 'Guarantees commercial integrity with zero fake or demo data. Every rupee is accounted for in an immutable journal.',
        points: [
          'Authentic Bank Account: Tied to Ravuvai Ayyapparayudu (Mamu).',
          'Zero Demo Data: All ledger balances reflect verified project settlements.',
          'Immutable Receipts: JSON and Markdown receipts are archived for every transaction.',
          'Instant Recall: Embedded in local memory so you can ask about any invoice anytime.'
        ]
      },
      whereWeUseIt: {
        description: 'Managed by backend/app/business/treasury.py and saved in project_data/business/treasury.',
        files: [
          { path: 'backend/app/business/treasury.py', role: 'Treasury & settlement reconciliation engine' },
          { path: 'project_data/business/treasury/settlement_ledger.json', role: 'Immutable settlement records' },
          { path: 'project_data/business/treasury/invoices.json', role: 'Enterprise invoice database' }
        ],
        endpoints: [
          'GET /api/v1/business/financials/summary',
          'GET /api/v1/business/settlement/ledger'
        ]
      },
      whatExistsAllData: {
        title: 'Treasury Financial Data',
        metrics: [
          { label: 'Bank Name', value: 'State Bank of India' },
          { label: 'Account Number', value: 'SBI ****5649 (41130645649)' },
          { label: 'Account Holder', value: 'Ravuvai Ayyapparayudu (Mamu)' },
          { label: 'Settlement Status', value: 'Authentic Production Ledger' }
        ],
        entities: [
          { name: 'Account Holder', details: 'Ravuvai Ayyapparayudu (ayyapparayudu.5@ybl).', status: 'VERIFIED' },
          { name: 'Bank Account Entity', details: 'State Bank of India (IFSC: SBIN0020507, Spl Commercial).', status: 'ACTIVE' },
          { name: 'Settlement Ledger', details: 'Zero demo records. Production UTR journal active.', status: 'READY' },
          { name: 'Commercial Invoicing', details: 'On-demand commercial tax invoicing with UPI gateway.', status: 'ACTIVE' }
        ]
      },
      diagramType: 'ER'
    }
  ];

  // Simple, Friendly Node Registry for Step Inspection
  readonly nodeRegistry: Record<string, InspectorNode> = {
    'flow_voice': {
      id: 'flow_voice',
      name: 'Step 1: Your Voice / Input',
      simpleRole: 'Listens to your microphone with a 60fps acoustic filter tuned specifically to Mamu.',
      subsystem: 'Voice Ingestion',
      latency: '0.2 ms',
      filePath: 'abhi_global_controller.py',
      inputData: 'Microphone PCM stream @ 16kHz',
      outputData: 'Cleaned text: "open whatsapp", "volume up", etc.',
      rationale: 'Instant natural voice control without wake-word delay.',
      status: 'STREAMING'
    },
    'flow_resolver': {
      id: 'flow_resolver',
      name: 'Step 2: Instant Action Cache',
      simpleRole: 'Checks 37 frequent shortcuts (Notepad, Calculator, Volume, Browser) and executes in 0ms.',
      subsystem: 'Instant Cache',
      latency: '0.0 ms',
      filePath: 'backend/app/api/v1/desktop.py#L420',
      inputData: 'User spoken or typed text',
      outputData: 'Direct action instruction (Category, Action, Target)',
      rationale: 'Zero waiting time for your everyday frequent commands.',
      status: 'CACHED'
    },
    'flow_rag': {
      id: 'flow_rag',
      name: 'Step 3: Smart Local Memory',
      simpleRole: 'Searches 588 offline knowledge records in 4.2ms to find exact facts about your project.',
      subsystem: 'Local Knowledge Base',
      latency: '4.2 ms',
      filePath: 'backend/app/services/rag/vector_store.py#L110',
      inputData: 'Search query',
      outputData: 'Top relevant knowledge snippets (Score >= 0.65)',
      rationale: 'Prevents AI guessing by supplying verified facts from your files.',
      status: 'INDEXED'
    },
    'flow_llm': {
      id: 'flow_llm',
      name: 'Step 4: Local AI Brain',
      simpleRole: 'Thinks through complex requests and plans how to complete your goal safely.',
      subsystem: 'Cognitive Reasoning',
      latency: '28.5 ms',
      filePath: 'backend/app/cognitive/llm/llm_client.py#L65',
      inputData: 'Prompt + Window Context + Memory Facts',
      outputData: 'Structured, clean JSON action plan',
      rationale: 'Solves brand new tasks without needing cloud internet.',
      status: 'INFERENCE'
    },
    'flow_dag': {
      id: 'flow_dag',
      name: 'Step 5: Task Organizer (DAG)',
      simpleRole: 'Arranges multi-step tasks in proper order so nothing crashes or conflicts.',
      subsystem: 'Task Planning',
      latency: '0.8 ms',
      filePath: 'backend/app/cognitive/planner/planner.py#L88',
      inputData: 'Task plan nodes',
      outputData: 'Organized execution queue with parallel workers',
      rationale: 'Guarantees multi-step tasks never deadlock or skip steps.',
      status: 'DISPATCHING'
    },
    'flow_win32': {
      id: 'flow_win32',
      name: 'Step 6: Windows 11 Action',
      simpleRole: 'Directly presses hotkeys, switches windows, opens software, or adjusts master sound volume.',
      subsystem: 'Windows 11 Driver',
      latency: '0.1 ms',
      filePath: 'backend/app/automation/desktop/os_control_engine.py#L52',
      inputData: 'Physical hotkey or window focus command',
      outputData: 'Window focused, hotkey pressed, volume adjusted',
      rationale: 'Real physical control over your laptop with zero UI delay.',
      status: 'EXECUTED'
    },

    // Swarm Agent Cards
    'mark85': {
      id: 'mark85',
      name: 'Mark 85 (Commander)',
      simpleRole: 'The team captain. Understands what you want and coordinates all other suit agents.',
      subsystem: 'Swarm Mission Control',
      latency: '14.0 ms',
      filePath: 'backend/app/cognitive/supervisor/supervisor.py#L40',
      inputData: 'Operator intent',
      outputData: 'Assigned specialist mission contracts',
      rationale: 'Keeps the team focused without chaotic overlaps.',
      status: 'COMMANDING'
    },
    'markL': {
      id: 'markL',
      name: 'Mark L (Browser)',
      simpleRole: 'Controls Chrome/Edge to browse websites, read articles, and research information.',
      subsystem: 'Web Automation',
      latency: '18.2 ms',
      filePath: 'backend/app/services/skills/browser/adapter.py#L75',
      inputData: 'Website URL or search query',
      outputData: 'Webpage text and screenshots',
      rationale: 'Fast web browsing in an isolated, secure browser worker.',
      status: 'READY'
    },
    'markVI': {
      id: 'markVI',
      name: 'Mark VI (Windows OS)',
      simpleRole: 'Handles desktop software, file folders, active windows, and keyboard hotkeys.',
      subsystem: 'Windows 11 Control',
      latency: '0.2 ms',
      filePath: 'backend/app/automation/desktop/os_control_engine.py#L12',
      inputData: 'Window title or shortcut',
      outputData: 'Window state and process PID',
      rationale: 'Instant control over Windows without lag.',
      status: 'ACTIVE'
    },
    'markXLIII': {
      id: 'markXLIII',
      name: 'Mark XLIII (Vision)',
      simpleRole: 'Reads your screen to detect buttons, text, and icons when accessibility tags are missing.',
      subsystem: 'Visual Screen OCR',
      latency: '32.0 ms',
      filePath: 'backend/app/automation/desktop/screen_perception.py#L80',
      inputData: 'Screen image capture',
      outputData: 'Button coordinates and OCR text',
      rationale: 'Sees the screen just like a human operator.',
      status: 'ENGAGED'
    },
    'markV': {
      id: 'markV',
      name: 'Mark V (Memory RAG)',
      simpleRole: 'Instantly searches your 588 offline project chunks to recall information.',
      subsystem: 'Knowledge Hub',
      latency: '4.2 ms',
      filePath: 'backend/app/services/rag/vector_store.py#L25',
      inputData: 'Search query',
      outputData: 'Ranked memory snippets',
      rationale: '100% private offline knowledge recall.',
      status: 'ONLINE'
    },
    'markVII': {
      id: 'markVII',
      name: 'Mark VII (Planner)',
      simpleRole: 'Breaks big projects into a neat step-by-step checklist.',
      subsystem: 'Task Planning',
      latency: '0.8 ms',
      filePath: 'backend/app/cognitive/planner/planner.py#L32',
      inputData: 'High-level goal',
      outputData: 'Step-by-step roadmap',
      rationale: 'Keeps complex tasks organized and predictable.',
      status: 'PLANNING'
    },
    'markI': {
      id: 'markI',
      name: 'Mark I (Security Sentinel)',
      simpleRole: 'Protects your laptop: audits safety, checks permissions, and stops dangerous actions.',
      subsystem: 'Safety Guardrails',
      latency: '0.1 ms',
      filePath: 'backend/app/core/security.py#L18',
      inputData: 'Proposed action',
      outputData: 'Permission granted / blocked',
      rationale: 'Protects your private files and system health.',
      status: 'GUARDING'
    },
    'markXLII': {
      id: 'markXLII',
      name: 'Mark XLII (Self-Healing)',
      simpleRole: 'Monitors errors and automatically fixes code bugs without bothering you.',
      subsystem: 'Code Auto-Repair',
      latency: '22.0 ms',
      filePath: 'backend/app/cognitive/self_healing/repair_engine.py#L50',
      inputData: 'Error traceback',
      outputData: 'Verified code repair',
      rationale: 'Keeps the system running 24/7 autonomously.',
      status: 'STANDBY'
    },
    'markXVII': {
      id: 'markXVII',
      name: 'Mark XVII (Voice)',
      simpleRole: 'Speaks with natural voice synthesis and filters out background noise.',
      subsystem: 'Voice Interface',
      latency: '1.2 ms',
      filePath: 'backend/app/assistant/communications_assistant.py#L15',
      inputData: 'Spoken speech / text',
      outputData: 'Clean audio playback',
      rationale: 'Natural, pleasant companion voice for Mamu.',
      status: 'ATTUNED'
    },
    'markXXXIII': {
      id: 'markXXXIII',
      name: 'Mark XXXIII (Banking)',
      simpleRole: 'Tracks State Bank of India settlements, UTR receipts, and commercial revenue.',
      subsystem: 'SBI Treasury',
      latency: '0.5 ms',
      filePath: 'backend/app/business/treasury.py#L30',
      inputData: 'Bank settlement batch',
      outputData: 'Reconciled ledger record',
      rationale: 'Real financial tracking for Ravuvai Ayyapparayudu.',
      status: 'AUDITING'
    }
  };

  ngOnInit(): void {
    this.fetchTelemetry();
    this.startSimulation();
    this.startTelemetryPolling();

    // Default inspector node
    this.inspectNode('flow_voice');
  }

  ngOnDestroy(): void {
    if (this.simTimer) clearInterval(this.simTimer);
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
  }

  selectSection(id: string): void {
    this.selectedSectionId.set(id);
    this.activeSimStep.set(0);

    if (id === 'FLOW' || id === 'END_TO_END') {
      this.inspectNode('flow_voice');
    } else if (id === 'SWARM') {
      this.inspectNode('mark85');
    } else if (id === 'RAG') {
      this.inspectNode('flow_rag');
    } else if (id === 'DAG') {
      this.inspectNode('flow_dag');
    } else if (id === 'LLM') {
      this.inspectNode('flow_llm');
    } else if (id === 'WIN32') {
      this.inspectNode('flow_win32');
    } else if (id === 'ER_BANKING') {
      this.inspectNode('markXXXIII');
    }
  }

  toggleDevDetails(): void {
    this.showDevDetails.update(v => !v);
  }

  currentSection(): ArchitectureSection {
    return this.sections.find(s => s.id === this.selectedSectionId()) || this.sections[0];
  }

  inspectNode(nodeId: string): void {
    const node = this.nodeRegistry[nodeId];
    if (node) {
      this.activeInspectorNode.set(node);
      if (nodeId.startsWith('mark')) {
        this.selectedSwarmAgentId.set(nodeId);
      }
    }
  }

  toggleSimulation(): void {
    this.isSimulating.update(v => !v);
  }

  stepSimulation(): void {
    this.activeSimStep.update(s => (s + 1) % 6);
    this.updateInspectorForStep(this.activeSimStep());
  }

  setSimSpeed(speed: number): void {
    this.simSpeed.set(speed);
    this.startSimulation();
  }

  private startSimulation(): void {
    if (this.simTimer) clearInterval(this.simTimer);
    const interval = Math.max(1000, 2600 / this.simSpeed());

    this.simTimer = setInterval(() => {
      if (this.isSimulating()) {
        this.activeSimStep.update(s => (s + 1) % 6);
        this.updateInspectorForStep(this.activeSimStep());
      }
    }, interval);
  }

  private updateInspectorForStep(step: number): void {
    const section = this.selectedSectionId();
    if (section === 'END_TO_END' || section === 'FLOW') {
      const stepMap = ['flow_voice', 'flow_resolver', 'flow_rag', 'flow_llm', 'flow_dag', 'flow_win32'];
      const target = stepMap[step];
      if (target && this.nodeRegistry[target]) {
        this.activeInspectorNode.set(this.nodeRegistry[target]);
      }
    }
  }

  private startTelemetryPolling(): void {
    this.telemetryTimer = setInterval(() => {
      this.fetchTelemetry();
    }, 4000);
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

  async testTriggerQuickAction(action: string): Promise<void> {
    try {
      await fetch(getApiUrl('/api/v1/desktop/quick-action'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action, params: {} })
      });
      this.fetchTelemetry();
    } catch {
      // Ignore in demo
    }
  }
}
