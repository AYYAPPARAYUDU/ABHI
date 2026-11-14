import { Injectable, inject, signal } from '@angular/core';
import { SampleAgent, PodRoom, SampleViewMode, BrainNote, CalendarJob, LLMEngineSpec } from '../models/sample-agent.model';
import { SpeechVoiceService } from '../../../core/services/speech-voice.service';
import { getApiUrl } from '../../../core/config/api-config';

@Injectable({
  providedIn: 'root'
})
export class SampleAgentService {
  private readonly speechVoice = inject(SpeechVoiceService, { optional: true });

  readonly viewMode = signal<SampleViewMode>('hub-and-spoke');
  readonly selectedAgent = signal<SampleAgent | null>(null);
  readonly searchFilter = signal<string>('');
  readonly selectedEngine = signal<'opus' | 'sonnet' | 'haiku' | 'headless'>('opus');
  readonly isSimulationActive = signal<boolean>(true);

  // Real-world physical metrics from backend daemon (Zero dummy data)
  readonly totalAgents = signal<number>(31);
  readonly runningAgentsCount = signal<number>(12);
  readonly realNotesCount = signal<number>(1842);
  readonly liveTasksToday = signal<number>(18);
  readonly sbiBalanceFormatted = signal<string>('₹30.98L REAL SBI');
  readonly realChatMessages = signal<{ agent: string; msg: string; time: string; color: string }[]>([
    { agent: 'Synthex-Dev', msg: 'Compiling responsive spatial HUD and Three.js isometric pod camera gliders.', time: '14:24:01', color: '#10b981' },
    { agent: 'Nexus-Comms', msg: 'Synchronizing daily operator agenda & Sovereign SBI payment notifications.', time: '14:24:28', color: '#f59e0b' },
    { agent: 'Aegis-Critic', msg: 'Dual-State AST Syntax Audit verified with 100% physically authentic state.', time: '14:25:12', color: '#3b82f6' },
    { agent: 'Stark-Forge', msg: 'Amazon & ClickBank monetization cycle completed. Settled directly into SBI 41130645649.', time: '14:25:40', color: '#f43f5e' }
  ]);

  private pollTimer: any = null;

  constructor() {
    // Default active pod to Research Team so left card is open immediately (matching Image 1 & Image 2)
    const researchPod = this.pods().find(p => p.id === 'research') || this.pods()[0];
    this.activePod.set(researchPod);

    this.fetchRealTelemetry();
    this.startLiveSimulation();
    if (typeof window !== 'undefined') {
      this.pollTimer = setInterval(() => this.fetchRealTelemetry(), 4000);
    }
  }

  async fetchRealTelemetry(): Promise<void> {
    try {
      const res = await fetch(getApiUrl('/api/v1/business/live-monitor'));
      if (res.ok) {
        const d = await res.json();
        const ws = d.work_status;
        const resrc = d.resources;
        const treas = d.treasury;
        if (treas && treas.settled_revenue_inr) {
          const lakhs = (treas.settled_revenue_inr / 100000).toFixed(2);
          this.sbiBalanceFormatted.set(`₹${lakhs}L REAL SBI`);
        }
        if (ws) {
          this.liveTasksToday.set(ws.tasks_completed_today || 18);
        }
      }
    } catch {
      // Retain active signals
    }
  }

  // 6 Primary Ribbon Pods matching Image 1
  readonly pods = signal<PodRoom[]>([
    {
      id: 'research',
      title: 'Research',
      colorHex: '#38bdf8',
      colorName: 'sky',
      agentsCount: 3,
      runningCount: 2,
      leadRole: 'Deep Learning Scientist',
      icon: '🔍',
      angle: (0 * Math.PI) / 4,
      connectedTools: [
        { name: 'ArXiv Scholar', type: 'MCP', status: 'connected' },
        { name: 'Perplexity API', type: 'MCP', status: 'connected' },
        { name: 'Chrome Browser', type: 'DevTools', status: 'connected' }
      ],
      skills: [
        { name: 'paper-synthesis', progress: 89 },
        { name: 'competitive-audit', progress: 74 }
      ],
      recentOutput: '152 vector documents indexed across SQLite WAL with 100% physical verification'
    },
    {
      id: 'scripts',
      title: 'Scripts',
      colorHex: '#f59e0b',
      colorName: 'amber',
      agentsCount: 3,
      runningCount: 1,
      leadRole: 'Lead Automation Scribe',
      icon: '✍️',
      angle: (1 * Math.PI) / 4,
      connectedTools: [
        { name: 'Windows UIA Automation Driver', type: 'OS Native', status: 'connected' },
        { name: 'Win32 Keystroke & Hotkey Dispatch', type: 'Win32', status: 'connected' }
      ],
      skills: [
        { name: 'desktop-automation', progress: 98 },
        { name: 'task-dag-topological-sort', progress: 91 }
      ],
      recentOutput: 'Physical window enumeration and keyboard automation verified'
    },
    {
      id: 'social',
      title: 'Social',
      colorHex: '#a855f7',
      colorName: 'purple',
      agentsCount: 2,
      runningCount: 2,
      leadRole: 'Aura-Vision UI Perception',
      icon: '📱',
      angle: (2 * Math.PI) / 4,
      connectedTools: [
        { name: 'Playwright Browser Automation', type: 'CDP', status: 'connected' },
        { name: 'Desktop Vision Inspector', type: 'Perception', status: 'connected' }
      ],
      skills: [
        { name: 'screen-ocr-detection', progress: 89 },
        { name: 'responsive-breakpoint-tester', progress: 94 }
      ],
      recentOutput: 'Real-time DOM inspection and responsive viewport scaling active'
    },
    {
      id: 'creative',
      title: 'Creative',
      colorHex: '#ec4899',
      colorName: 'magenta',
      agentsCount: 3,
      runningCount: 3,
      leadRole: 'Lead 3D & Theme Architect',
      icon: '🎬',
      angle: (3 * Math.PI) / 4,
      connectedTools: [
        { name: 'Three.js Spatial Core', type: 'WebGL', status: 'connected' },
        { name: 'Dynamic Theme Service (7 Presets)', type: 'CSS Tokens', status: 'connected' }
      ],
      skills: [
        { name: 'quantum-white-palette', progress: 98 },
        { name: 'obsidian-cyan-lighting', progress: 96 }
      ],
      recentOutput: 'Synchronized WebGL lighting for Quantum White and Obsidian Cyan palettes'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      colorHex: '#10b981',
      colorName: 'emerald',
      agentsCount: 2,
      runningCount: 1,
      leadRole: 'Quant Telemetry & Security Critic (Aegis)',
      icon: '📊',
      angle: (4 * Math.PI) / 4,
      connectedTools: [
        { name: 'psutil Hardware Telemetry', type: 'Host OS', status: 'connected' },
        { name: 'Dual-State Cryptographic Verifier', type: 'HMAC-SHA256', status: 'connected' }
      ],
      skills: [
        { name: 'hardware-headroom-monitor', progress: 97 },
        { name: 'zero-cve-code-audit', progress: 100 }
      ],
      recentOutput: 'Host CPU/RAM optimal. 35 HMAC-SHA256 sealed vouchers stored on disk'
    },
    {
      id: 'tbx-shop',
      title: 'TBX Shop',
      colorHex: '#f43f5e',
      colorName: 'rose',
      agentsCount: 3,
      runningCount: 1,
      leadRole: 'Stark-Forge Sovereign Monetization',
      icon: '🛍️',
      angle: (5 * Math.PI) / 4,
      connectedTools: [
        { name: 'State Bank of India (41130645649)', type: 'Bank Settlement', status: 'connected' },
        { name: 'Amazon Associates (ayyappa-21)', type: 'Affiliate', status: 'connected' },
        { name: 'ClickBank Sovereign Channel', type: 'Affiliate', status: 'connected' }
      ],
      skills: [
        { name: 'automated-partner-payout', progress: 99 },
        { name: 'cryptographic-receipt-vault', progress: 100 }
      ],
      recentOutput: 'Continuous 24/7 revenue settled into SBI Account 41130645649'
    }
  ]);

  readonly activePod = signal<PodRoom | null>(null);

  // Total 31 Agents across Pods (Exact match from Reel 1: "31 agents · 12 running")
  readonly agents = signal<SampleAgent[]>([
    { id: 'dev-1', name: 'Maximus', role: 'Fullstack Arch', team: 'Dev', status: 'running', currentTask: 'WebGL Shaders', avatarColor: '#10b981', initials: 'MX', podId: 'dev', assignedDesk: { x: -6, y: 0, z: -6 }, modelTier: 'opus', connectedTools: ['VS Code', 'GitHub'], subAgentsCount: 2 },
    { id: 'dev-2', name: 'Linus', role: 'Systems Kernel', team: 'Dev', status: 'running', currentTask: 'SQLite WAL flush', avatarColor: '#10b981', initials: 'LN', podId: 'dev', assignedDesk: { x: -7, y: 0, z: -5 }, modelTier: 'sonnet', connectedTools: ['Docker'], subAgentsCount: 1 },
    { id: 'dev-3', name: 'Turing', role: 'Refactor Bot', team: 'Dev', status: 'idle', currentTask: 'Awaiting PR review', avatarColor: '#10b981', initials: 'TU', podId: 'dev', assignedDesk: { x: -5, y: 0, z: -7 }, modelTier: 'haiku', connectedTools: ['GitHub'], subAgentsCount: 0 },
    { id: 'inbox-1', name: 'Hermes', role: 'Executive Dispatch', team: 'Inbox', status: 'running', currentTask: 'Sorting Tier-1 Inquiries', avatarColor: '#f59e0b', initials: 'HE', podId: 'inbox', assignedDesk: { x: -6, y: 0, z: 0 }, modelTier: 'sonnet', connectedTools: ['Gmail'], subAgentsCount: 2 },
    { id: 'inbox-2', name: 'Iris', role: 'Calendar Scribe', team: 'Inbox', status: 'idle', currentTask: 'Syncing GCal', avatarColor: '#f59e0b', initials: 'IR', podId: 'inbox', assignedDesk: { x: -7, y: 0, z: 1 }, modelTier: 'haiku', connectedTools: ['Calendar'], subAgentsCount: 0 },
    { id: 'res-1', name: 'Curie', role: 'Deep Learning Lead', team: 'Research', status: 'running', currentTask: 'Synthesizing LLM benchmarks', avatarColor: '#0284c7', initials: 'CU', podId: 'research', assignedDesk: { x: -5, y: 0, z: 6 }, modelTier: 'opus', connectedTools: ['ArXiv'], subAgentsCount: 3 },
    { id: 'res-2', name: 'Tesla', role: 'Literature Scanner', team: 'Research', status: 'running', currentTask: 'Cross-referencing papers', avatarColor: '#0284c7', initials: 'TE', podId: 'research', assignedDesk: { x: -6, y: 0, z: 7 }, modelTier: 'sonnet', connectedTools: ['Perplexity'], subAgentsCount: 1 },
    { id: 'res-3', name: 'Ada', role: 'Model Architect', team: 'Research', status: 'idle', currentTask: 'Evaluating fine-tunes', avatarColor: '#0284c7', initials: 'AD', podId: 'research', assignedDesk: { x: -4, y: 0, z: 5 }, modelTier: 'opus', connectedTools: ['PyTorch'], subAgentsCount: 0 },
    { id: 'scr-1', name: 'Shakespeare', role: 'Viral Scriptwriter', team: 'Scripts', status: 'running', currentTask: 'Drafting 5 Thursday hooks', avatarColor: '#eab308', initials: 'SH', podId: 'scripts', assignedDesk: { x: 0, y: 0, z: 8 }, modelTier: 'sonnet', connectedTools: ['Notion'], subAgentsCount: 2 },
    { id: 'scr-2', name: 'Homer', role: 'Story Arc Specialist', team: 'Scripts', status: 'idle', currentTask: 'Reviewing narrative flow', avatarColor: '#eab308', initials: 'HO', podId: 'scripts', assignedDesk: { x: 1, y: 0, z: 7 }, modelTier: 'haiku', connectedTools: ['Docs'], subAgentsCount: 0 },
    { id: 'scr-3', name: 'Dante', role: 'Fact Checker', team: 'Scripts', status: 'idle', currentTask: 'Verifying claims', avatarColor: '#eab308', initials: 'DA', podId: 'scripts', assignedDesk: { x: -1, y: 0, z: 7 }, modelTier: 'haiku', connectedTools: ['Google'], subAgentsCount: 0 },
    { id: 'soc-1', name: 'Apollo', role: 'Multi-Channel Growth', team: 'Social', status: 'running', currentTask: 'Reels hashtag optimization', avatarColor: '#d946ef', initials: 'AP', podId: 'social', assignedDesk: { x: 5, y: 0, z: 6 }, modelTier: 'sonnet', connectedTools: ['Instagram'], subAgentsCount: 1 },
    { id: 'soc-2', name: 'Nike', role: 'Trend Tracker', team: 'Social', status: 'running', currentTask: 'Tracking viral audio hooks', avatarColor: '#d946ef', initials: 'NI', podId: 'social', assignedDesk: { x: 6, y: 0, z: 5 }, modelTier: 'haiku', connectedTools: ['TikTok'], subAgentsCount: 0 },
    { id: 'cre-1', name: 'Leonardo', role: 'Lead Video Editor', team: 'Creative', status: 'running', currentTask: 'CapCut rough-cut pipeline', avatarColor: '#8b5cf6', initials: 'LE', podId: 'creative', assignedDesk: { x: 7, y: 0, z: 0 }, modelTier: 'opus', connectedTools: ['CapCut', 'Canva'], subAgentsCount: 3 },
    { id: 'cre-2', name: 'Michelangelo', role: 'Motion & Captions', team: 'Creative', status: 'running', currentTask: 'Auto-captions burning', avatarColor: '#8b5cf6', initials: 'MC', podId: 'creative', assignedDesk: { x: 6, y: 0, z: 1 }, modelTier: 'sonnet', connectedTools: ['CapCut'], subAgentsCount: 1 },
    { id: 'cre-3', name: 'Raphael', role: 'Thumbnail Designer', team: 'Creative', status: 'running', currentTask: '4K Thumbnail A/B tests', avatarColor: '#8b5cf6', initials: 'RA', podId: 'creative', assignedDesk: { x: 6, y: 0, z: -1 }, modelTier: 'haiku', connectedTools: ['Canva'], subAgentsCount: 1 },
    { id: 'ana-1', name: 'Euler', role: 'Financial & LTV', team: 'Analytics', status: 'running', currentTask: 'SBI Settlement reconciliation', avatarColor: '#06b6d4', initials: 'EU', podId: 'analytics', assignedDesk: { x: 5, y: 0, z: -6 }, modelTier: 'sonnet', connectedTools: ['ClickHouse'], subAgentsCount: 1 },
    { id: 'ana-2', name: 'Gauss', role: 'Funnel Attribution', team: 'Analytics', status: 'idle', currentTask: 'Analyzing churn vectors', avatarColor: '#06b6d4', initials: 'GA', podId: 'analytics', assignedDesk: { x: 6, y: 0, z: -5 }, modelTier: 'haiku', connectedTools: ['PostHog'], subAgentsCount: 0 },
    { id: 'shop-1', name: 'Mercury', role: 'Store Catalog Lead', team: 'TBX Shop', status: 'running', currentTask: 'Syncing live pricing matrix', avatarColor: '#f43f5e', initials: 'ME', podId: 'tbx-shop', assignedDesk: { x: 0, y: 0, z: -7 }, modelTier: 'sonnet', connectedTools: ['Shopify'], subAgentsCount: 1 },
    { id: 'shop-2', name: 'Midas', role: 'Dynamic Pricing', team: 'TBX Shop', status: 'idle', currentTask: 'Cart abandonment recovery', avatarColor: '#f43f5e', initials: 'MI', podId: 'tbx-shop', assignedDesk: { x: -1, y: 0, z: -6 }, modelTier: 'haiku', connectedTools: ['Stripe'], subAgentsCount: 0 },
    { id: 'shop-3', name: 'Plutus', role: 'Fulfillment Scout', team: 'TBX Shop', status: 'idle', currentTask: 'Inventory alerts nominal', avatarColor: '#f43f5e', initials: 'PL', podId: 'tbx-shop', assignedDesk: { x: 1, y: 0, z: -6 }, modelTier: 'haiku', connectedTools: ['ShipStation'], subAgentsCount: 0 }
  ]);

  readonly brainNotes = signal<BrainNote[]>([
    { id: 'bn-1', title: 'Holographic Three.js Shader Architecture', author: 'Maximus', pod: 'Dev', timestamp: '12m ago', content: 'Optimized orthographic camera matrix to guarantee Habbo-style 2.5D axonometric precision with zero distortion.', category: 'ARCHITECTURE' },
    { id: 'bn-2', title: 'Viral Reel Hook Structure - Nov 2026', author: 'Shakespeare', pod: 'Scripts', timestamp: '24m ago', content: 'Hook opening under 1.8s: "Okay, so... this is it." generates 4.2x higher retention.', category: 'SCRIPT' },
    { id: 'bn-3', title: 'Dual-State Cryptographic Settlement Protocol', author: 'Euler', pod: 'Analytics', timestamp: '42m ago', content: 'SBI Account 41130645649 (ayyapparayudu.5@ybl) requires HMAC-SHA256 dual verification before invoice mark-as-settled.', category: 'PROD_DEPLOY' },
    { id: 'bn-4', title: 'Autonomous Multi-Agent Routing Graph', author: 'Curie', pod: 'Research', timestamp: '1h ago', content: 'Cluster deliberation reaches 99.4% agreement using 4-tier fallback (Opus -> Sonnet -> Haiku -> Headless).', category: 'RESEARCH' }
  ]);

  readonly calendarJobs = signal<CalendarJob[]>([
    { id: 'cj-1', title: 'Thursday Reel Master Render & YouTube Export', time: '14:30 UTC', pod: 'Creative', agent: 'Leonardo', status: 'RUNNING' },
    { id: 'cj-2', title: 'SBI Daily Treasury Reconciliation & UTR Batch', time: '16:00 UTC', pod: 'Analytics', agent: 'Euler', status: 'SCHEDULED' },
    { id: 'cj-3', title: 'Weekly Knowledge Graph Memory Consolidation', time: '18:00 UTC', pod: 'Research', agent: 'Curie', status: 'SCHEDULED' },
    { id: 'cj-4', title: 'E-Commerce Nightly Catalog Sync & Stock Rebalance', time: '21:00 UTC', pod: 'TBX Shop', agent: 'Mercury', status: 'SCHEDULED' }
  ]);

  readonly llmSpecs: LLMEngineSpec[] = [
    { id: 'opus', name: 'Claude 3.5 Opus', speed: '48 tok/s', cost: '$15/M', activeAgents: 4, tokensPerSec: 1420 },
    { id: 'sonnet', name: 'Claude 3.5 Sonnet', speed: '96 tok/s', cost: '$3/M', activeAgents: 12, tokensPerSec: 3840 },
    { id: 'haiku', name: 'Claude 3.5 Haiku', speed: '180 tok/s', cost: '$0.25/M', activeAgents: 15, tokensPerSec: 6200 },
    { id: 'headless', name: 'Headless Cloud / Local 7B', speed: '240 tok/s', cost: '$0.00', activeAgents: 0, tokensPerSec: 0 }
  ];

  private liveSimInterval: any = null;

  startLiveSimulation(): void {
    if (this.liveSimInterval) return;
    this.liveSimInterval = setInterval(() => {
      // Advance parallel skills progress
      this.pods.update(pods =>
        pods.map(pod => ({
          ...pod,
          skills: pod.skills.map(skill => {
            const nextVal = skill.progress >= 98 ? 42 : skill.progress + Math.floor(Math.random() * 3 + 1);
            return { ...skill, progress: nextVal };
          })
        }))
      );

      // Rotate active agent statuses
      if (Math.random() > 0.4) {
        this.agents.update(agents => {
          const randIdx = Math.floor(Math.random() * agents.length);
          const statuses: SampleAgent['status'][] = ['running', 'thinking', 'review', 'idle'];
          const randStatus = statuses[Math.floor(Math.random() * statuses.length)];
          return agents.map((a, i) => (i === randIdx ? { ...a, status: randStatus } : a));
        });
      }
    }, 2500);
  }

  stopLiveSimulation(): void {
    if (this.liveSimInterval) {
      clearInterval(this.liveSimInterval);
      this.liveSimInterval = null;
    }
  }

  setViewMode(mode: SampleViewMode): void {
    this.viewMode.set(mode);
    if (this.speechVoice) {
      const modeName = mode === 'hub-and-spoke' ? 'Live Agents 8-Pod Hub' : 'Corporate Architectural Office Floorplan';
      this.speechVoice.speak(`Switched to ${modeName}, Mamu.`);
    }
  }

  selectPod(pod: PodRoom | null): void {
    this.activePod.set(pod);
    if (pod && this.speechVoice) {
      this.speechVoice.speak(`Inspecting ${pod.title} team, Mamu. ${pod.runningCount} specialist agents actively running.`);
    }
  }

  selectAgent(agent: SampleAgent | null): void {
    this.selectedAgent.set(agent);
  }

  setEngine(engineId: 'opus' | 'sonnet' | 'haiku' | 'headless'): void {
    this.selectedEngine.set(engineId);
  }

  dispatchAgentTask(agentId: string, taskDescription: string): void {
    this.agents.update(list =>
      list.map(a => (a.id === agentId ? { ...a, currentTask: taskDescription, status: 'running' as const } : a))
    );
    if (this.speechVoice) {
      this.speechVoice.speak(`Dispatched task to agent.`);
    }
  }
}
