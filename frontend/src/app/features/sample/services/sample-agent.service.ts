import { Injectable, signal, computed, inject } from '@angular/core';
import {
  SampleAgent,
  AgentTeam,
  OfficeRoom,
  OfficeEntity,
  ApprovalRequest,
  SharedBrainMemory,
  SampleLayoutMode,
  SubAgentTask,
  AgentLogEntry
} from '../models/sample-agent.model';
import { SpeechVoiceService } from '../../../core/services/speech-voice.service';

@Injectable({
  providedIn: 'root'
})
export class SampleAgentService {
  private speechVoice = inject(SpeechVoiceService, { optional: true });

  // Layout mode: Workspace 1 (31 Agents Enterprise), Workspace 2 (10-Room Walkable Office), Workspace 3 (3D Holo-Matrix)
  readonly layoutMode = signal<SampleLayoutMode>('workspace-1');

  // Search & Filtering
  readonly searchQuery = signal<string>('');
  readonly selectedTeamId = signal<string>('all');
  readonly selectedRoomId = signal<string>('all');
  readonly selectedStatus = signal<string>('all');
  readonly simulationSpeed = signal<number>(1);
  readonly isSimulationPaused = signal<boolean>(false);

  // Inspected objects
  readonly selectedAgent = signal<SampleAgent | null>(null);
  readonly selectedRoom = signal<OfficeRoom | null>(null);
  readonly selectedEntity = signal<OfficeEntity | null>(null);
  readonly activeApprovalModal = signal<ApprovalRequest | null>(null);
  readonly showMissionModal = signal<boolean>(false);

  // Live Ticker Message
  readonly tickerFeed = signal<{ id: string; time: string; text: string; tag: string }[]>([
    { id: '1', time: '12:00:14', text: 'GitHub Hunter: Scanned 140 trending repos on GitHub', tag: 'RESEARCH' },
    { id: '2', time: '12:00:30', text: 'Creative Team: AutoCutter spawned 3 parallel sub-agents', tag: 'CREATIVE' },
    { id: '3', time: '12:00:45', text: 'Shared Brain: Synced 1,024 vector embeddings to local cache', tag: 'BRAIN' },
    { id: '4', time: '12:01:02', text: 'Human Gatekeeper: Pending approval on YouTube upload #842', tag: 'SAFETY' }
  ]);

  // 8 Specialized Teams
  readonly teams = signal<AgentTeam[]>([
    {
      id: 'team-research',
      name: 'Research & Intelligence',
      icon: '🔍',
      color: '#38bdf8',
      leadAgentId: 'agent-hunter',
      description: 'Scans GitHub, arXiv, tech blogs & competitive signals every morning.',
      agentCount: 4,
      activeTasks: 2,
      mcpIntegrations: ['github-mcp', 'arxiv-fetcher', 'tavily-search']
    },
    {
      id: 'team-scripts',
      name: 'Scripts & Hooks',
      icon: '✍️',
      color: '#a855f7',
      leadAgentId: 'agent-hooksmith',
      description: 'Engineers viral 3-second hooks, storytelling arcs & A/B retention formulas.',
      agentCount: 4,
      activeTasks: 1,
      mcpIntegrations: ['gemini-flash', 'claude-haiku', 'retention-analyzer']
    },
    {
      id: 'team-creative',
      name: 'Creative & Video Studio',
      icon: '🎬',
      color: '#ec4899',
      leadAgentId: 'agent-autocutter',
      description: 'Autonomous video cut, Whisper transcription, sub-agent kinetic captions & audio mastering.',
      agentCount: 5,
      activeTasks: 3,
      mcpIntegrations: ['ffmpeg-core', 'whisper-local', 'remotion-worker']
    },
    {
      id: 'team-social',
      name: 'Social & Distribution',
      icon: '📢',
      color: '#f59e0b',
      leadAgentId: 'agent-reels-dispatch',
      description: 'Schedules and distributes multi-format content to YouTube, X, Reels & LinkedIn.',
      agentCount: 4,
      activeTasks: 1,
      mcpIntegrations: ['x-api-v2', 'meta-graph', 'youtube-data-v3']
    },
    {
      id: 'team-code',
      name: 'Autonomous Engineering',
      icon: '💻',
      color: '#10b981',
      leadAgentId: 'agent-claude-core',
      description: 'Claude Code and Antigravity agents running git worktrees, tests, and automated fixes.',
      agentCount: 4,
      activeTasks: 2,
      mcpIntegrations: ['claude-code-cli', 'antigravity-hub', 'git-daemon']
    },
    {
      id: 'team-safety',
      name: 'QA & Human Gatekeeper',
      icon: '🛡️',
      color: '#ef4444',
      leadAgentId: 'agent-gatekeeper',
      description: 'Nothing big goes out without operator approval. Risk auditing, secret scanning & policy guardrails.',
      agentCount: 3,
      activeTasks: 1,
      mcpIntegrations: ['pii-scanner', 'human-approval-gate', 'diff-auditor']
    },
    {
      id: 'team-analytics',
      name: 'Analytics & Cost Telemetry',
      icon: '📊',
      color: '#06b6d4',
      leadAgentId: 'agent-cost-guard',
      description: 'Real-time token spend, retention heatmaps, conversion rates & TTFT latency monitoring.',
      agentCount: 4,
      activeTasks: 1,
      mcpIntegrations: ['langfuse', 'prometheus', 'token-meter']
    },
    {
      id: 'team-operations',
      name: 'Operations & Orchestration',
      icon: '⚡',
      color: '#8b5cf6',
      leadAgentId: 'agent-chief-pm',
      description: 'Daily standup coordination, DAG dependency resolution & Shared Brain synaptic synchronization.',
      agentCount: 3,
      activeTasks: 2,
      mcpIntegrations: ['dag-engine', 'shared-brain-mcp', 'event-bus']
    }
  ]);

  // 31 Specialized Real-World Agents
  readonly agents = signal<SampleAgent[]>([
    // TEAM 1: RESEARCH (4 agents)
    {
      id: 'agent-hunter',
      name: 'GitHub Hunter',
      codename: 'HNT-01',
      teamId: 'team-research',
      teamName: 'Research & Intelligence',
      role: 'Morning GitHub Trending & Repo Scraper',
      avatar: '🕵️‍♂️',
      status: 'working',
      statusMessage: 'Scanning GitHub trending repositories in TypeScript & Python',
      currentTask: 'Ingesting 140 GitHub stars diffs & extracting architecture patterns',
      progress: 74,
      subAgents: [
        { id: 'sub-h1', name: 'Repo Cloner', role: 'Cloning README & license metadata', status: 'completed', progress: 100, elapsedMs: 410 },
        { id: 'sub-h2', name: 'AST Parser', role: 'Analyzing exported modules & hooks', status: 'running', progress: 68, elapsedMs: 1200 }
      ],
      toolsUsed: ['github_trending_api', 'git_shallow_clone', 'markdown_parser'],
      mcpServers: ['github-mcp', 'tavily-search'],
      tokensUsed: 14250,
      costEstimate: '$0.021',
      recentLogs: [
        { timestamp: '12:00:10', level: 'info', text: 'Started daily GitHub scan for topics: [agent, autonomous, mcp]' },
        { timestamp: '12:00:25', level: 'action', text: 'Fetched top 30 trending repos. Found 3 breakout LLM tools.', toolCall: 'github_search(q="stars:>500 created:>2026-10-01")' },
        { timestamp: '12:00:45', level: 'info', text: 'Saved curated digest into Shared Brain key: research.daily_github' }
      ],
      roomId: 'room-research',
      roomName: 'Research & Intelligence Lab',
      x: 20,
      y: 35
    },
    {
      id: 'agent-radar',
      name: 'Tech Radar Sentinel',
      codename: 'RDR-02',
      teamId: 'team-research',
      teamName: 'Research & Intelligence',
      role: 'Emerging Framework & Library Tracker',
      avatar: '📡',
      status: 'idle',
      statusMessage: 'Watching HackerNews & X dev feeds for package releases',
      currentTask: 'Standby for hourly pulse trigger',
      progress: 0,
      subAgents: [],
      toolsUsed: ['hn_algolia_api', 'pypi_changes_feed'],
      mcpServers: ['tavily-search'],
      tokensUsed: 8400,
      costEstimate: '$0.012',
      recentLogs: [
        { timestamp: '11:45:00', level: 'info', text: 'Completed check on 50 top npm dependencies' }
      ],
      roomId: 'room-research',
      roomName: 'Research & Intelligence Lab',
      x: 35,
      y: 40
    },
    {
      id: 'agent-arxiv',
      name: 'Paper Digest Bot',
      codename: 'ARX-03',
      teamId: 'team-research',
      teamName: 'Research & Intelligence',
      role: 'ArXiv & Science Preprint Summarizer',
      avatar: '📄',
      status: 'working',
      statusMessage: 'Synthesizing reasoning benchmark papers into 3-bullet briefings',
      currentTask: 'Extracting test-time compute scaling laws from 4 new preprints',
      progress: 42,
      subAgents: [],
      toolsUsed: ['arxiv_api', 'pdf_text_extractor'],
      mcpServers: ['arxiv-fetcher'],
      tokensUsed: 22100,
      costEstimate: '$0.033',
      recentLogs: [
        { timestamp: '11:58:10', level: 'action', text: 'Downloaded paper 2611.08412v1.pdf', toolCall: 'arxiv_fetch(id="2611.08412")' }
      ],
      roomId: 'room-research',
      roomName: 'Research & Intelligence Lab',
      x: 28,
      y: 65
    },
    {
      id: 'agent-intel',
      name: 'Market Intelligence',
      codename: 'INT-04',
      teamId: 'team-research',
      teamName: 'Research & Intelligence',
      role: 'Competitor Architecture & Pricing Auditor',
      avatar: '📊',
      status: 'idle',
      statusMessage: 'Market benchmark matrix up to date',
      currentTask: 'Idle awaiting next scheduled sweep',
      progress: 0,
      subAgents: [],
      toolsUsed: ['web_scraper', 'diff_matrix'],
      mcpServers: ['tavily-search'],
      tokensUsed: 5400,
      costEstimate: '$0.008',
      recentLogs: [
        { timestamp: '11:30:15', level: 'info', text: 'Audited 12 AI developer platforms for token pricing shifts' }
      ],
      roomId: 'room-research',
      roomName: 'Research & Intelligence Lab',
      x: 45,
      y: 55
    },

    // TEAM 2: SCRIPTS & HOOKS (4 agents)
    {
      id: 'agent-hooksmith',
      name: 'Viral Hooksmith',
      codename: 'HOK-01',
      teamId: 'team-scripts',
      teamName: 'Scripts & Hooks',
      role: 'First-3-Second Hook & Tension Engineer',
      avatar: '🪝',
      status: 'working',
      statusMessage: 'Drafting 5 visual & verbal opening hooks for Reel #42',
      currentTask: 'Formula: Curiosity Gap + Physical Proof + Impossible Outcome',
      progress: 88,
      subAgents: [
        { id: 'sub-hk1', name: 'Curiosity Scorer', role: 'Predicting retention drop at 0:02s', status: 'completed', progress: 100, elapsedMs: 310 }
      ],
      toolsUsed: ['hook_database_evaluator', 'speech_tempo_estimator'],
      mcpServers: ['gemini-flash'],
      tokensUsed: 19800,
      costEstimate: '$0.029',
      recentLogs: [
        { timestamp: '12:00:05', level: 'action', text: 'Drafted: "I built an office for my AI agents. 8 teams. 31 agents. Watch what happens when I just talk to them."', toolCall: 'generate_hooks(n=5)' }
      ],
      roomId: 'room-creative',
      roomName: 'Creative & Video Studio',
      x: 18,
      y: 25
    },
    {
      id: 'agent-story',
      name: 'Story Architect',
      codename: 'STY-02',
      teamId: 'team-scripts',
      teamName: 'Scripts & Hooks',
      role: 'Video Narrative Arc & Pacing Structurer',
      avatar: '📜',
      status: 'idle',
      statusMessage: '60-second vertical video screenplay locked',
      currentTask: 'Ready for video editor team ingest',
      progress: 100,
      subAgents: [],
      toolsUsed: ['storyboard_generator', 'beat_sheet_builder'],
      mcpServers: ['claude-haiku'],
      tokensUsed: 16500,
      costEstimate: '$0.024',
      recentLogs: [
        { timestamp: '11:55:00', level: 'success', text: 'Script structure approved: Hook (3s) -> Tour (20s) -> Real Task (25s) -> CTA (12s)' }
      ],
      roomId: 'room-creative',
      roomName: 'Creative & Video Studio',
      x: 30,
      y: 30
    },
    {
      id: 'agent-splittester',
      name: 'A/B Headline Tester',
      codename: 'ABT-03',
      teamId: 'team-scripts',
      teamName: 'Scripts & Hooks',
      role: 'Click-Through & Thumbnail Match Scorer',
      avatar: '⚖️',
      status: 'idle',
      statusMessage: 'Generated 10 variations with CTR variance ratings',
      currentTask: 'Waiting for thumbnail render to finalize pairing',
      progress: 0,
      subAgents: [],
      toolsUsed: ['ctr_simulation_model'],
      mcpServers: ['retention-analyzer'],
      tokensUsed: 9200,
      costEstimate: '$0.013',
      recentLogs: [
        { timestamp: '11:52:12', level: 'info', text: 'Top headline candidate: "My AI Agents Have a Better Office Than Me 🏢"' }
      ],
      roomId: 'room-creative',
      roomName: 'Creative & Video Studio',
      x: 22,
      y: 50
    },
    {
      id: 'agent-retention',
      name: 'Retention Engineer',
      codename: 'RET-04',
      teamId: 'team-scripts',
      teamName: 'Scripts & Hooks',
      role: 'Audience Dropoff & Pattern Interrupt Modeler',
      avatar: '🎯',
      status: 'idle',
      statusMessage: 'Script pacing audit complete: 0 predicted flatlines',
      currentTask: 'Inserted 4 pattern interrupts at seconds 7, 18, 31, 48',
      progress: 100,
      subAgents: [],
      toolsUsed: ['retention_curve_predictor'],
      mcpServers: ['retention-analyzer'],
      tokensUsed: 7100,
      costEstimate: '$0.010',
      recentLogs: [
        { timestamp: '11:50:30', level: 'info', text: 'Optimal pattern interrupt: Cut to out-of-order bathroom sign at 0:31' }
      ],
      roomId: 'room-creative',
      roomName: 'Creative & Video Studio',
      x: 38,
      y: 45
    },

    // TEAM 3: CREATIVE & VIDEO STUDIO (5 agents) - HIGHLIGHT FROM REEL 1 & 2!
    {
      id: 'agent-autocutter',
      name: 'AutoCutter Pro',
      codename: 'CUT-01',
      teamId: 'team-creative',
      teamName: 'Creative & Video Studio',
      role: 'Multi-Stream Timeline Slicer & Jumpcutter',
      avatar: '✂️',
      status: 'parallel',
      statusMessage: 'Parallel sub-agents running: Audio Transcribe, Cut Silence, Overlay Sync',
      currentTask: 'Trimming 12-minute screen recording into high-velocity 58s vertical cut',
      progress: 65,
      subAgents: [
        { id: 'sub-c1', name: 'Whisper Transcribe', role: 'Word-level timestamp extraction', status: 'completed', progress: 100, elapsedMs: 1450, outputSnippet: 'Extracted 182 words with millisecond timings' },
        { id: 'sub-c2', name: 'Silence Decimator', role: 'Removing breaths & pauses > 220ms', status: 'running', progress: 85, elapsedMs: 2300, outputSnippet: 'Removed 44 gaps (-38.2s footage saved)' },
        { id: 'sub-c3', name: 'Kinetic Motion Layer', role: 'Rendering zoom ramps on code screens', status: 'running', progress: 52, elapsedMs: 3100, outputSnippet: 'Applying 1.15x scale-ins on IDE actions' }
      ],
      toolsUsed: ['ffmpeg_trim', 'silence_detector', 'motion_zoom_engine'],
      mcpServers: ['ffmpeg-core', 'whisper-local'],
      tokensUsed: 31200,
      costEstimate: '$0.046',
      recentLogs: [
        { timestamp: '12:00:15', level: 'info', text: 'Ingested raw footage: screen_walkthrough_4k.mp4 (12m 40s)' },
        { timestamp: '12:00:20', level: 'action', text: 'Dispatched 3 parallel sub-agents for transcription and cutting', toolCall: 'spawn_parallel_workers(["whisper", "silence_cut", "kinetic_zoom"])' },
        { timestamp: '12:00:50', level: 'info', text: 'Sub-agent 1 finished word-level transcription in 1.45s' }
      ],
      roomId: 'room-creative',
      roomName: 'Creative & Video Studio',
      x: 55,
      y: 25
    },
    {
      id: 'agent-subcaptions',
      name: 'Kinetic Sub-Agent Captions',
      codename: 'CAP-02',
      teamId: 'team-creative',
      teamName: 'Creative & Video Studio',
      role: 'TikTok/Reel Styled Animated Text Layer',
      avatar: '💬',
      status: 'working',
      statusMessage: 'Rendering dynamic glowing highlighted subtitles (MrBeast style)',
      currentTask: 'Highlighting keywords: "AI AGENTS", "31 AGENTS", "SHARED BRAIN"',
      progress: 72,
      subAgents: [],
      toolsUsed: ['ass_subtitle_renderer', 'color_pop_styler'],
      mcpServers: ['remotion-worker'],
      tokensUsed: 14900,
      costEstimate: '$0.022',
      recentLogs: [
        { timestamp: '12:00:35', level: 'action', text: 'Burned animated bouncing font into layer track #2' }
      ],
      roomId: 'room-creative',
      roomName: 'Creative & Video Studio',
      x: 68,
      y: 35
    },
    {
      id: 'agent-audiomixer',
      name: 'Audio Mastering Bot',
      codename: 'AUD-03',
      teamId: 'team-creative',
      teamName: 'Creative & Video Studio',
      role: 'Voice Clarifier & Background Ducking AI',
      avatar: '🎚️',
      status: 'idle',
      statusMessage: 'Voice loudness normalized to -14 LUFS, music ducked at -18dB',
      currentTask: 'Audio mastering track ready for final mux',
      progress: 100,
      subAgents: [],
      toolsUsed: ['loudnorm_filter', 'sidechain_compressor'],
      mcpServers: ['ffmpeg-core'],
      tokensUsed: 6200,
      costEstimate: '$0.009',
      recentLogs: [
        { timestamp: '11:54:10', level: 'success', text: 'Cleaned background fan noise and added warm bass presence' }
      ],
      roomId: 'room-creative',
      roomName: 'Creative & Video Studio',
      x: 75,
      y: 22
    },
    {
      id: 'agent-motionfx',
      name: 'Motion Graphics Synthesizer',
      codename: 'GFX-04',
      teamId: 'team-creative',
      teamName: 'Creative & Video Studio',
      role: '3D Overlays, Arrow Callouts & Emoji Pops',
      avatar: '✨',
      status: 'idle',
      statusMessage: 'Prepared 6 sound-effect synched visual elements',
      currentTask: 'Ready for timeline compositor',
      progress: 0,
      subAgents: [],
      toolsUsed: ['canvas_renderer', 'lottie_animation_exporter'],
      mcpServers: ['remotion-worker'],
      tokensUsed: 11400,
      costEstimate: '$0.017',
      recentLogs: [
        { timestamp: '11:48:00', level: 'info', text: 'Generated glowing red arrow pointing at "Out of Order" restroom door' }
      ],
      roomId: 'room-creative',
      roomName: 'Creative & Video Studio',
      x: 62,
      y: 55
    },
    {
      id: 'agent-thumbnail',
      name: 'Thumbnail Synthesizer',
      codename: 'THM-05',
      teamId: 'team-creative',
      teamName: 'Creative & Video Studio',
      role: 'High-Impact YouTube/Reel Cover Designer',
      avatar: '🖼️',
      status: 'idle',
      statusMessage: 'Rendered 3 cover candidates with 82% predicted face contrast',
      currentTask: 'Candidate #1: Isometric office overview with 3D agents and glowing core',
      progress: 100,
      subAgents: [],
      toolsUsed: ['flux_image_generator', 'composition_evaluator'],
      mcpServers: ['remotion-worker'],
      tokensUsed: 24500,
      costEstimate: '$0.036',
      recentLogs: [
        { timestamp: '11:56:45', level: 'success', text: 'Rendered high-res PNG thumbnail: 1080x1920 & 1280x720' }
      ],
      roomId: 'room-creative',
      roomName: 'Creative & Video Studio',
      x: 82,
      y: 48
    },

    // TEAM 4: SOCIAL & DISTRIBUTION (4 agents)
    {
      id: 'agent-x-commander',
      name: 'X/Twitter Commander',
      codename: 'TWT-01',
      teamId: 'team-social',
      teamName: 'Social & Distribution',
      role: 'Viral Thread & Quote-Tweet Strategist',
      avatar: '🐦',
      status: 'working',
      statusMessage: 'Formulating 7-tweet breakdown with GitHub repo links',
      currentTask: 'Drafting: "I put 31 agents in a virtual office. Here is the exact tech stack 🧵👇"',
      progress: 55,
      subAgents: [],
      toolsUsed: ['twitter_v2_post_builder', 'hashtag_density_scanner'],
      mcpServers: ['x-api-v2'],
      tokensUsed: 13200,
      costEstimate: '$0.019',
      recentLogs: [
        { timestamp: '11:59:00', level: 'info', text: 'Thread queued for peak dev traffic (14:30 GMT)' }
      ],
      roomId: 'room-social',
      roomName: 'Social Media War Desk',
      x: 25,
      y: 30
    },
    {
      id: 'agent-reels-dispatch',
      name: 'Instagram Reels Dispatcher',
      codename: 'IGD-02',
      teamId: 'team-social',
      teamName: 'Social & Distribution',
      role: 'Vertical Video Scheduler & Audio Matcher',
      avatar: '📸',
      status: 'awaiting_approval',
      statusMessage: 'REEL READY FOR PUBLISH: Requires Operator Sign-off',
      currentTask: 'Waiting for Human-in-the-Loop OK on Reel: "My AI Agents Office 🏢"',
      progress: 99,
      subAgents: [],
      toolsUsed: ['instagram_graph_api', 'trending_audio_lookup'],
      mcpServers: ['meta-graph', 'human-approval-gate'],
      tokensUsed: 17800,
      costEstimate: '$0.026',
      recentLogs: [
        { timestamp: '12:00:40', level: 'warn', text: 'SAFETY GATE ENGAGED: Reels upload paused awaiting human authorization' },
        { timestamp: '12:00:41', level: 'action', text: 'Dispatched ApprovalRequest #APP-9021 to Operator Console', toolCall: 'request_human_approval(action="publish_instagram_reel")' }
      ],
      roomId: 'room-social',
      roomName: 'Social Media War Desk',
      x: 45,
      y: 35
    },
    {
      id: 'agent-youtube-ops',
      name: 'YouTube Strategist',
      codename: 'YTO-03',
      teamId: 'team-social',
      teamName: 'Social & Distribution',
      role: 'Shorts & Longform SEO Metadata Architect',
      avatar: '▶️',
      status: 'idle',
      statusMessage: 'Tags, description and chapter markers compiled',
      currentTask: 'Waiting for Reels dispatcher approval',
      progress: 0,
      subAgents: [],
      toolsUsed: ['youtube_seo_tagger'],
      mcpServers: ['youtube-data-v3'],
      tokensUsed: 10100,
      costEstimate: '$0.015',
      recentLogs: [
        { timestamp: '11:42:00', level: 'info', text: 'Tags indexed: #aiagents #claudecode #antigravity #threejs' }
      ],
      roomId: 'room-social',
      roomName: 'Social Media War Desk',
      x: 35,
      y: 60
    },
    {
      id: 'agent-linkedin',
      name: 'LinkedIn Thought-Leader',
      codename: 'LNK-04',
      teamId: 'team-social',
      teamName: 'Social & Distribution',
      role: 'B2B Case Study & Architecture Post Creator',
      avatar: '💼',
      status: 'idle',
      statusMessage: 'Drafted 300-word enterprise deployment breakdown',
      currentTask: 'Scheduled for tomorrow 09:00 EST',
      progress: 0,
      subAgents: [],
      toolsUsed: ['linkedin_post_optimizer'],
      mcpServers: ['meta-graph'],
      tokensUsed: 8900,
      costEstimate: '$0.013',
      recentLogs: [
        { timestamp: '11:35:10', level: 'info', text: 'Saved draft in Shared Brain' }
      ],
      roomId: 'room-social',
      roomName: 'Social Media War Desk',
      x: 58,
      y: 50
    },

    // TEAM 5: AUTONOMOUS CODING & ARCHITECTURE (4 agents)
    {
      id: 'agent-claude-core',
      name: 'Claude Code Terminal Engine',
      codename: 'CLD-01',
      teamId: 'team-code',
      teamName: 'Autonomous Engineering',
      role: 'Interactive CLI Agent with Worktree Isolation',
      avatar: '🤖',
      status: 'working',
      statusMessage: 'Writing Angular component for 3D Walkable Office Floor',
      currentTask: 'Generating sample-page layout with three-way segmented workspace toggle',
      progress: 81,
      subAgents: [
        { id: 'sub-cc1', name: 'AST Validator', role: 'Checking Angular template bindings', status: 'completed', progress: 100, elapsedMs: 380 },
        { id: 'sub-cc2', name: 'CSS Engine', role: 'Compiling glassmorphic styles and keyframes', status: 'running', progress: 80, elapsedMs: 740 }
      ],
      toolsUsed: ['write_file', 'edit_file', 'run_command', 'read_file'],
      mcpServers: ['claude-code-cli', 'git-daemon'],
      tokensUsed: 42100,
      costEstimate: '$0.063',
      recentLogs: [
        { timestamp: '12:00:00', level: 'info', text: 'Initialized task: Build sample page with reels references' },
        { timestamp: '12:00:20', level: 'action', text: 'Analyzed reels metadata: 8 teams, 31 agents, 10 rooms, 40 entities', toolCall: 'parse_reels_manifest()' },
        { timestamp: '12:00:55', level: 'action', text: 'Writing service and models for real-world agent orchestration', toolCall: 'write_file(path="sample-agent.service.ts")' }
      ],
      roomId: 'room-dev',
      roomName: 'Autonomous Coding & Engineering Bay',
      x: 20,
      y: 28
    },
    {
      id: 'agent-antigravity',
      name: 'Antigravity Swarm Runner',
      codename: 'AGY-02',
      teamId: 'team-code',
      teamName: 'Autonomous Engineering',
      role: 'Multi-Agent Subagent Coordinator & Sandbox Master',
      avatar: '🌌',
      status: 'working',
      statusMessage: 'Orchestrating subagents across shared and branched workspaces',
      currentTask: 'Synchronizing agent memory bus with OperatorStateService',
      progress: 60,
      subAgents: [],
      toolsUsed: ['invoke_subagent', 'send_message', 'manage_subagents'],
      mcpServers: ['antigravity-hub'],
      tokensUsed: 28400,
      costEstimate: '$0.042',
      recentLogs: [
        { timestamp: '11:58:20', level: 'info', text: 'Antigravity runtime ready. 0 memory leaks detected.' }
      ],
      roomId: 'room-dev',
      roomName: 'Autonomous Coding & Engineering Bay',
      x: 35,
      y: 35
    },
    {
      id: 'agent-pr-sentinel',
      name: 'PR Reviewer Bot',
      codename: 'PRR-03',
      teamId: 'team-code',
      teamName: 'Autonomous Engineering',
      role: 'Automated Git Diff & Security Linter',
      avatar: '🔍',
      status: 'idle',
      statusMessage: 'All pull requests green. Zero regression detected.',
      currentTask: 'Monitoring git branch commits',
      progress: 0,
      subAgents: [],
      toolsUsed: ['git_diff_analyzer', 'type_checker'],
      mcpServers: ['git-daemon'],
      tokensUsed: 11200,
      costEstimate: '$0.016',
      recentLogs: [
        { timestamp: '11:46:12', level: 'success', text: 'Passed test suite on feature/sample-workspace' }
      ],
      roomId: 'room-dev',
      roomName: 'Autonomous Coding & Engineering Bay',
      x: 48,
      y: 45
    },
    {
      id: 'agent-autofix',
      name: 'Auto-Fixer Daemon',
      codename: 'FIX-04',
      teamId: 'team-code',
      teamName: 'Autonomous Engineering',
      role: 'Self-Healing Test Runner & Error Resolver',
      avatar: '🔧',
      status: 'idle',
      statusMessage: 'Watchdog active on localhost:4200 & localhost:8000',
      currentTask: 'Zero runtime exceptions caught in last 2 hours',
      progress: 0,
      subAgents: [],
      toolsUsed: ['stack_trace_parser', 'patch_applier'],
      mcpServers: ['claude-code-cli'],
      tokensUsed: 13900,
      costEstimate: '$0.020',
      recentLogs: [
        { timestamp: '11:40:05', level: 'info', text: 'Clean compilation verified across 24 feature modules' }
      ],
      roomId: 'room-dev',
      roomName: 'Autonomous Coding & Engineering Bay',
      x: 32,
      y: 62
    },

    // TEAM 6: QA & HUMAN-IN-THE-LOOP SAFETY (3 agents) - KEY RULE FROM REEL 1!
    {
      id: 'agent-gatekeeper',
      name: 'Human-in-the-Loop Sentinel',
      codename: 'GAT-01',
      teamId: 'team-safety',
      teamName: 'QA & Human Gatekeeper',
      role: 'Policy Gatekeeper: "Nothing big goes out without my OK"',
      avatar: '🛑',
      status: 'working',
      statusMessage: 'Holding 1 pending action for operator signature',
      currentTask: 'Guarding high-privilege actions: File Writes, Social Posts, Git Merges',
      progress: 95,
      subAgents: [],
      toolsUsed: ['human_consent_prompt', 'permission_matrix_validator'],
      mcpServers: ['human-approval-gate'],
      tokensUsed: 16200,
      costEstimate: '$0.024',
      recentLogs: [
        { timestamp: '12:00:40', level: 'warn', text: 'INTERCEPT: Reel publishing flagged. Operator authorization dialog spawned.' },
        { timestamp: '12:00:42', level: 'info', text: 'Awaiting affirmative review in Human Approval Hub' }
      ],
      roomId: 'room-executive',
      roomName: 'Executive C-Suite & Command Desk',
      x: 40,
      y: 20
    },
    {
      id: 'agent-risk-auditor',
      name: 'Risk & Policy Auditor',
      codename: 'RSK-02',
      teamId: 'team-safety',
      teamName: 'QA & Human Gatekeeper',
      role: 'API Key & Credential Leak Interceptor',
      avatar: '🛡️',
      status: 'idle',
      statusMessage: 'Zero secrets or sensitive keys leaked in outbound prompts',
      currentTask: 'Real-time string sanitization active',
      progress: 100,
      subAgents: [],
      toolsUsed: ['secret_regex_scanner', 'entropy_detector'],
      mcpServers: ['pii-scanner'],
      tokensUsed: 9800,
      costEstimate: '$0.014',
      recentLogs: [
        { timestamp: '11:51:00', level: 'success', text: 'Scanned 42 outgoing API payloads: 100% compliant' }
      ],
      roomId: 'room-executive',
      roomName: 'Executive C-Suite & Command Desk',
      x: 55,
      y: 35
    },
    {
      id: 'agent-copyright',
      name: 'Copyright & Audio Checker',
      codename: 'CPY-03',
      teamId: 'team-safety',
      teamName: 'QA & Human Gatekeeper',
      role: 'Audio Licensing & Brand Safety Validator',
      avatar: '⚖️',
      status: 'idle',
      statusMessage: 'All video music tracks flagged as 100% royalty free',
      currentTask: 'License clearance verified for YouTube & Meta commercial use',
      progress: 0,
      subAgents: [],
      toolsUsed: ['audio_fingerprint_matcher'],
      mcpServers: ['human-approval-gate'],
      tokensUsed: 8100,
      costEstimate: '$0.012',
      recentLogs: [
        { timestamp: '11:44:20', level: 'info', text: 'Audio hash matches CC-BY licensed background beat' }
      ],
      roomId: 'room-executive',
      roomName: 'Executive C-Suite & Command Desk',
      x: 25,
      y: 40
    },

    // TEAM 7: ANALYTICS & TELEMETRY (4 agents)
    {
      id: 'agent-cost-guard',
      name: 'Token & Cost Monitor',
      codename: 'CST-01',
      teamId: 'team-analytics',
      teamName: 'Analytics & Cost Telemetry',
      role: 'Real-Time LLM Token & Cost Governor',
      avatar: '💰',
      status: 'working',
      statusMessage: 'Today total spend: $0.48 / $10.00 daily budget cap',
      currentTask: 'Tracking input/output tokens across 31 agents',
      progress: 50,
      subAgents: [],
      toolsUsed: ['token_usage_aggregator', 'cost_projection_engine'],
      mcpServers: ['token-meter'],
      tokensUsed: 12500,
      costEstimate: '$0.018',
      recentLogs: [
        { timestamp: '12:00:00', level: 'info', text: 'Aggregated token consumption: 342,800 tokens ($0.48 total cost today)' }
      ],
      roomId: 'room-server',
      roomName: 'Neural Core & Server Farm',
      x: 20,
      y: 40
    },
    {
      id: 'agent-funnel',
      name: 'Conversion Tracker',
      codename: 'CON-02',
      teamId: 'team-analytics',
      teamName: 'Analytics & Cost Telemetry',
      role: 'Social Views to GitHub Clones Funnel Analyst',
      avatar: '📈',
      status: 'idle',
      statusMessage: 'Past Reel Conversion Rate: 4.8% (3.2x industry average)',
      currentTask: 'Standing by for new post metric ingest',
      progress: 0,
      subAgents: [],
      toolsUsed: ['utm_tag_correlator'],
      mcpServers: ['langfuse'],
      tokensUsed: 6900,
      costEstimate: '$0.010',
      recentLogs: [
        { timestamp: '11:32:00', level: 'info', text: 'Reel #1 generated 6,090 likes, 672 comments and 420 GitHub stars' }
      ],
      roomId: 'room-server',
      roomName: 'Neural Core & Server Farm',
      x: 35,
      y: 50
    },
    {
      id: 'agent-latency',
      name: 'Latency Sentinel',
      codename: 'LAT-03',
      teamId: 'team-analytics',
      teamName: 'Analytics & Cost Telemetry',
      role: 'TTFT & Stream Response Profiler',
      avatar: '⏱️',
      status: 'idle',
      statusMessage: 'Mean TTFT: 142ms across all local & cloud agents',
      currentTask: 'Inference pipeline healthy',
      progress: 100,
      subAgents: [],
      toolsUsed: ['ttft_probe', 'ping_profiler'],
      mcpServers: ['prometheus'],
      tokensUsed: 5200,
      costEstimate: '$0.007',
      recentLogs: [
        { timestamp: '11:50:00', level: 'info', text: 'WebSocket latency: 8ms localhost' }
      ],
      roomId: 'room-server',
      roomName: 'Neural Core & Server Farm',
      x: 50,
      y: 35
    },
    {
      id: 'agent-sentiment',
      name: 'Sentiment Pulse Miner',
      codename: 'SNT-04',
      teamId: 'team-analytics',
      teamName: 'Analytics & Cost Telemetry',
      role: 'Live Comment & Community Sentiment Analyzer',
      avatar: '❤️',
      status: 'idle',
      statusMessage: 'Community sentiment: 94% positive / excited',
      currentTask: 'Top questions: "Can I self-host this office?" "Where is the repo?"',
      progress: 0,
      subAgents: [],
      toolsUsed: ['sentiment_classifier'],
      mcpServers: ['langfuse'],
      tokensUsed: 7800,
      costEstimate: '$0.011',
      recentLogs: [
        { timestamp: '11:38:00', level: 'info', text: 'Classified 672 comments: 412 requested YouTube tutorial link' }
      ],
      roomId: 'room-server',
      roomName: 'Neural Core & Server Farm',
      x: 65,
      y: 45
    },

    // TEAM 8: OPERATIONS & ORCHESTRATION (3 agents)
    {
      id: 'agent-chief-pm',
      name: 'Chief Agent Officer (PM)',
      codename: 'CAO-01',
      teamId: 'team-operations',
      teamName: 'Operations & Orchestration',
      role: 'Master Project Manager & Agent Task Dispatcher',
      avatar: '👑',
      status: 'working',
      statusMessage: 'Coordinating cross-team pipeline: Research -> Script -> Video -> Social',
      currentTask: 'Supervising 8 teams and managing Shared Brain synchronization',
      progress: 75,
      subAgents: [],
      toolsUsed: ['dag_orchestrator', 'resource_allocator'],
      mcpServers: ['dag-engine', 'shared-brain-mcp'],
      tokensUsed: 36400,
      costEstimate: '$0.054',
      recentLogs: [
        { timestamp: '12:00:00', level: 'info', text: 'Started 12:00 synchronization cycle across all 31 agents' },
        { timestamp: '12:00:25', level: 'action', text: 'Verified DAG flow dependencies for Reel build pipeline', toolCall: 'validate_dag_pipeline()' }
      ],
      roomId: 'room-boardroom',
      roomName: 'Sovereign Boardroom / Multi-LLM Council',
      x: 45,
      y: 30
    },
    {
      id: 'agent-standup',
      name: 'Daily Standup Bot',
      codename: 'STN-02',
      teamId: 'team-operations',
      teamName: 'Operations & Orchestration',
      role: 'Autonomous Morning Blocker & Status Aggregator',
      avatar: '📋',
      status: 'idle',
      statusMessage: 'Standup concluded. 0 blockers reported.',
      currentTask: 'Summary posted to Shared Brain for all agents',
      progress: 100,
      subAgents: [],
      toolsUsed: ['standup_collector'],
      mcpServers: ['event-bus'],
      tokensUsed: 9400,
      costEstimate: '$0.014',
      recentLogs: [
        { timestamp: '09:00:00', level: 'success', text: 'All 31 agents reported on duty and synced with the Shared Brain' }
      ],
      roomId: 'room-boardroom',
      roomName: 'Sovereign Boardroom / Multi-LLM Council',
      x: 30,
      y: 45
    },
    {
      id: 'agent-nexus',
      name: 'Shared Brain Synaptic Nexus',
      codename: 'SYN-03',
      teamId: 'team-operations',
      teamName: 'Operations & Orchestration',
      role: 'Vector Cache & Context Replicator Daemon',
      avatar: '🧠',
      status: 'working',
      statusMessage: 'Broadcasting new research insights to Creative and Social teams',
      currentTask: 'Replicating 1,024 vector dimensions at 120 embeddings/sec',
      progress: 92,
      subAgents: [],
      toolsUsed: ['vector_broadcaster', 'redis_state_sync'],
      mcpServers: ['shared-brain-mcp'],
      tokensUsed: 22800,
      costEstimate: '$0.034',
      recentLogs: [
        { timestamp: '12:00:45', level: 'info', text: 'Synced 1,024 embeddings into shared context memory' }
      ],
      roomId: 'room-boardroom',
      roomName: 'Sovereign Boardroom / Multi-LLM Council',
      x: 60,
      y: 45
    }
  ]);

  // 10 Distinct Rooms from Reel 2 (including Game Room and Out of Order Restroom!)
  readonly rooms = signal<OfficeRoom[]>([
    {
      id: 'room-executive',
      name: 'Executive C-Suite & Command Desk',
      code: 'EXC-01',
      icon: '👑',
      themeColor: '#eab308',
      description: 'Master strategy corner, holographic financial status, operator desk and policy governance.',
      capacity: 4,
      occupantIds: ['agent-gatekeeper', 'agent-risk-auditor', 'agent-copyright', 'entity-csuite-guest'],
      gridArea: { rowStart: 1, colStart: 1, rowSpan: 2, colSpan: 2 },
      features: ['Holographic Financial Ledger', 'Operator Master Terminal', 'Physical Emergency Stop Beacon']
    },
    {
      id: 'room-research',
      name: 'Research & GitHub Intelligence Lab',
      code: 'RES-02',
      icon: '🔬',
      themeColor: '#38bdf8',
      description: 'Morning GitHub scrapers, arXiv digest bots, and competitor intelligence feeds.',
      capacity: 5,
      occupantIds: ['agent-hunter', 'agent-radar', 'agent-arxiv', 'agent-intel'],
      gridArea: { rowStart: 1, colStart: 3, rowSpan: 2, colSpan: 2 },
      features: ['GitHub Trending Live Stream', 'ArXiv PDF Ingestion Racks', 'Deep-Search Web Scrapers']
    },
    {
      id: 'room-dev',
      name: 'Autonomous Coding & Engineering Bay',
      code: 'DEV-03',
      icon: '💻',
      themeColor: '#10b981',
      description: 'Claude Code terminal pods, Antigravity swarm engines, PR review bots and local git worktrees.',
      capacity: 6,
      occupantIds: ['agent-claude-core', 'agent-antigravity', 'agent-pr-sentinel', 'agent-autofix'],
      gridArea: { rowStart: 1, colStart: 5, rowSpan: 2, colSpan: 2 },
      features: ['Dual-Monitor Claude Terminal Pods', 'Self-Healing Test Racks', 'Isolated Git Worktrees']
    },
    {
      id: 'room-creative',
      name: 'Creative & Video Editing Studio',
      code: 'CRT-04',
      icon: '🎬',
      themeColor: '#ec4899',
      description: 'Parallel video cutting rigs, kinetic sub-agent captions, audio mastering and thumbnail AI.',
      capacity: 6,
      occupantIds: ['agent-autocutter', 'agent-subcaptions', 'agent-audiomixer', 'agent-motionfx', 'agent-thumbnail'],
      gridArea: { rowStart: 3, colStart: 1, rowSpan: 2, colSpan: 3 },
      features: ['Multi-GPU Video Rendering Pod', 'Whisper Word-Level Transcriber', '4K Preview Canvas']
    },
    {
      id: 'room-social',
      name: 'Social Media & Broadcast Deck',
      code: 'SOC-05',
      icon: '📢',
      themeColor: '#f97316',
      description: 'Multi-screen social scheduler, live analytics feed, viral thread compiler and community manager.',
      capacity: 5,
      occupantIds: ['agent-x-commander', 'agent-reels-dispatch', 'agent-youtube-ops', 'agent-linkedin'],
      gridArea: { rowStart: 3, colStart: 4, rowSpan: 2, colSpan: 3 },
      features: ['Live View & Likes Heatmap', 'Post Scheduling Clock', 'Human Approval Red-Light Safe-Box']
    },
    {
      id: 'room-boardroom',
      name: 'Sovereign Boardroom / Multi-LLM Council',
      code: 'WAR-06',
      icon: '🏛️',
      themeColor: '#8b5cf6',
      description: 'Roundtable deliberation table with digital projector for multi-agent voting and daily standups.',
      capacity: 8,
      occupantIds: ['agent-chief-pm', 'agent-standup', 'agent-nexus'],
      gridArea: { rowStart: 5, colStart: 1, rowSpan: 2, colSpan: 2 },
      features: ['Circular Council Deliberation Table', 'Holographic Voting Screen', 'Shared Brain Sync Transmitter']
    },
    {
      id: 'room-server',
      name: 'Neural Core & Server Farm',
      code: 'SRV-07',
      icon: '🧠',
      themeColor: '#06b6d4',
      description: 'Blinking server racks, liquid cooling pipes, GPU compute nodes and vector database clusters.',
      capacity: 4,
      occupantIds: ['agent-cost-guard', 'agent-funnel', 'agent-latency', 'agent-sentiment'],
      gridArea: { rowStart: 5, colStart: 3, rowSpan: 2, colSpan: 2 },
      features: ['Liquid-Cooled GPU Cluster', 'Shared Brain Vector Rack', 'Real-time TTFT Latency Analyzer']
    },
    {
      id: 'room-gameroom',
      name: 'The Game & Relaxation Room',
      code: 'GAM-08',
      icon: '🕹️',
      themeColor: '#a855f7',
      description: 'Arcade machines, ping pong table, VR pods and beanbags where agents recharge their synthetic energy.',
      capacity: 6,
      occupantIds: [],
      gridArea: { rowStart: 5, colStart: 5, rowSpan: 2, colSpan: 2 },
      features: ['Retro Pixel Arcade Machines', 'Active Ping-Pong Table', 'Zero-G Synthetic Relaxation Beanbags']
    },
    {
      id: 'room-coffee',
      name: 'Coffee Bar & Kitchenette',
      code: 'CAF-09',
      icon: '☕',
      themeColor: '#d97706',
      description: 'Espresso machine, snack counter, watercooler chatter corner for spontaneous agent brainstorming.',
      capacity: 5,
      occupantIds: [],
      gridArea: { rowStart: 7, colStart: 1, rowSpan: 2, colSpan: 4 },
      features: ['High-Pressure Espresso Machine', 'Cold Brew Nitro Tap', 'Watercooler Cross-Team Chat Bench']
    },
    {
      id: 'room-restroom',
      name: 'The Restroom (Out of Order Stall)',
      code: 'REST-10',
      icon: '🚫',
      themeColor: '#ef4444',
      description: 'The infamous restroom from the reel — equipped with yellow caution tape, flickering bulb & humorous repair notice!',
      capacity: 2,
      occupantIds: [],
      isOutOfOrder: true,
      specialNote: '⚠️ OUT OF ORDER — DO NOT ENTER! Plumbing technician was dispatched 3 days ago. Agents please hold your synthetic state!',
      gridArea: { rowStart: 7, colStart: 5, rowSpan: 2, colSpan: 2 },
      features: ['Flickering Fluorescent Bulb', 'Diagonal Warning Caution Tape', 'Leaking Water Bucket Emoji']
    }
  ]);

  // 40 Entities / People / Avatars roaming or working in the office
  readonly entities = signal<OfficeEntity[]>([
    // Room 1: Executive (3 entities)
    { id: 'ent-1', name: 'Chief PM Operator', role: 'Executive Orchestrator', type: 'human', roomId: 'room-executive', x: 25, y: 35, avatar: '👨‍💼', activity: 'typing', speechBubble: 'Approving roadmap priorities for Sprint 14', facing: 'right' },
    { id: 'ent-2', name: 'Sentinel AI', role: 'Gatekeeper Bot', type: 'agent', roomId: 'room-executive', x: 65, y: 45, avatar: '🛑', activity: 'meeting', speechBubble: 'Holding Reels release for user confirmation', facing: 'left' },
    { id: 'ent-3', name: 'Security Auditor', role: 'PII Gatekeeper', type: 'agent', roomId: 'room-executive', x: 45, y: 70, avatar: '🛡️', activity: 'thinking', facing: 'right' },

    // Room 2: Research Lab (4 entities)
    { id: 'ent-4', name: 'Hunter Agent', role: 'GitHub Scraper', type: 'agent', roomId: 'room-research', x: 20, y: 25, avatar: '🕵️‍♂️', activity: 'typing', speechBubble: 'Cloning trending repos...', facing: 'right' },
    { id: 'ent-5', name: 'Radar Bot', role: 'Tech Tracker', type: 'agent', roomId: 'room-research', x: 55, y: 30, avatar: '📡', activity: 'thinking', facing: 'left' },
    { id: 'ent-6', name: 'ArXiv Scholar', role: 'Paper Reader', type: 'agent', roomId: 'room-research', x: 30, y: 65, avatar: '📄', activity: 'typing', speechBubble: 'Summarizing test-time scaling papers', facing: 'right' },
    { id: 'ent-7', name: 'Market Intel', role: 'Benchmark Analyst', type: 'agent', roomId: 'room-research', x: 75, y: 60, avatar: '📊', activity: 'walking', facing: 'left' },

    // Room 3: Dev Bay (5 entities)
    { id: 'ent-8', name: 'Claude Code', role: 'Lead CLI Coder', type: 'agent', roomId: 'room-dev', x: 18, y: 25, avatar: '🤖', activity: 'typing', speechBubble: 'npm run build: 0 errors!', facing: 'right' },
    { id: 'ent-9', name: 'Antigravity Core', role: 'Swarm Master', type: 'agent', roomId: 'room-dev', x: 42, y: 28, avatar: '🌌', activity: 'typing', speechBubble: 'Syncing subagents...', facing: 'left' },
    { id: 'ent-10', name: 'Dev Junior 1', role: 'Frontend Engineer', type: 'human', roomId: 'room-dev', x: 68, y: 35, avatar: '👩‍💻', activity: 'typing', facing: 'right' },
    { id: 'ent-11', name: 'PR Sentinel', role: 'Review Bot', type: 'agent', roomId: 'room-dev', x: 30, y: 70, avatar: '🔍', activity: 'walking', facing: 'right' },
    { id: 'ent-12', name: 'Auto-Fix Daemon', role: 'Self-Healer', type: 'bot', roomId: 'room-dev', x: 70, y: 72, avatar: '🔧', activity: 'repairing', speechBubble: 'Patched 2 syntax warnings', facing: 'left' },

    // Room 4: Creative Studio (6 entities)
    { id: 'ent-13', name: 'AutoCutter Pro', role: 'Video Editor AI', type: 'agent', roomId: 'room-creative', x: 20, y: 30, avatar: '✂️', activity: 'typing', speechBubble: 'Cut 38s of silence footage', facing: 'right' },
    { id: 'ent-14', name: 'Sub-Agent Captions', role: 'Subtitle Worker', type: 'agent', roomId: 'room-creative', x: 40, y: 25, avatar: '💬', activity: 'typing', speechBubble: 'Burning animated text...', facing: 'left' },
    { id: 'ent-15', name: 'Audio Master', role: 'Sound Engineer', type: 'agent', roomId: 'room-creative', x: 60, y: 30, avatar: '🎚️', activity: 'thinking', facing: 'right' },
    { id: 'ent-16', name: 'Motion Artist', role: 'Visual Effects', type: 'human', roomId: 'room-creative', x: 78, y: 35, avatar: '🎨', activity: 'typing', facing: 'left' },
    { id: 'ent-17', name: 'Thumbnail Bot', role: 'Cover Designer', type: 'agent', roomId: 'room-creative', x: 30, y: 70, avatar: '🖼️', activity: 'walking', facing: 'right' },
    { id: 'ent-18', name: 'Viral Hooksmith', role: 'Script Specialist', type: 'agent', roomId: 'room-creative', x: 70, y: 70, avatar: '🪝', activity: 'typing', speechBubble: 'Tested 5 opening hooks', facing: 'left' },

    // Room 5: Social Desk (4 entities)
    { id: 'ent-19', name: 'X Commander', role: 'Twitter Publisher', type: 'agent', roomId: 'room-social', x: 22, y: 32, avatar: '🐦', activity: 'typing', speechBubble: 'Thread drafted: 7 tweets', facing: 'right' },
    { id: 'ent-20', name: 'Reels Dispatcher', role: 'Vertical Video Bot', type: 'agent', roomId: 'room-social', x: 48, y: 28, avatar: '📸', activity: 'meeting', speechBubble: 'Awaiting operator approval!', facing: 'left' },
    { id: 'ent-21', name: 'YouTube Strategist', role: 'SEO Manager', type: 'agent', roomId: 'room-social', x: 72, y: 35, avatar: '▶️', activity: 'thinking', facing: 'left' },
    { id: 'ent-22', name: 'Community Intern', role: 'Replies & Engagement', type: 'human', roomId: 'room-social', x: 38, y: 68, avatar: '🧑‍💼', activity: 'typing', facing: 'right' },

    // Room 6: Sovereign Boardroom (5 entities)
    { id: 'ent-23', name: 'Council Lead', role: 'Consensus Arbiter', type: 'agent', roomId: 'room-boardroom', x: 30, y: 30, avatar: '👑', activity: 'meeting', speechBubble: 'Standup item: 8 teams synchronized', facing: 'right' },
    { id: 'ent-24', name: 'Standup Recorder', role: 'Minutes Bot', type: 'agent', roomId: 'room-boardroom', x: 65, y: 32, avatar: '📋', activity: 'typing', facing: 'left' },
    { id: 'ent-25', name: 'Shared Brain Sync', role: 'Nexus Replicator', type: 'agent', roomId: 'room-boardroom', x: 50, y: 55, avatar: '🧠', activity: 'thinking', speechBubble: 'Broadcasting 1024 embeddings', facing: 'right' },
    { id: 'ent-26', name: 'VP Strategy', role: 'Executive Liaison', type: 'human', roomId: 'room-boardroom', x: 20, y: 65, avatar: '👨‍💼', activity: 'meeting', facing: 'right' },
    { id: 'ent-27', name: 'Legal Counsel Bot', role: 'Compliance', type: 'agent', roomId: 'room-boardroom', x: 75, y: 65, avatar: '⚖️', activity: 'meeting', facing: 'left' },

    // Room 7: Neural Core & Servers (4 entities)
    { id: 'ent-28', name: 'Cost Guard', role: 'Token Auditor', type: 'agent', roomId: 'room-server', x: 25, y: 35, avatar: '💰', activity: 'typing', speechBubble: '$0.48 spent / $10 cap', facing: 'right' },
    { id: 'ent-29', name: 'Latency Probe', role: 'TTFT Watchdog', type: 'bot', roomId: 'room-server', x: 60, y: 30, avatar: '⏱️', activity: 'thinking', facing: 'left' },
    { id: 'ent-30', name: 'Sysadmin Bot', role: 'Cluster Engineer', type: 'agent', roomId: 'room-server', x: 35, y: 70, avatar: '⚙️', activity: 'repairing', speechBubble: 'Liquid coolant at 38°C', facing: 'right' },
    { id: 'ent-31', name: 'Vector Sharder', role: 'Memory DB Tech', type: 'agent', roomId: 'room-server', x: 70, y: 68, avatar: '💾', activity: 'walking', facing: 'left' },

    // Room 8: Game Room (4 entities having fun!)
    { id: 'ent-32', name: 'Arcade Player 1', role: 'Video Synthesizer Subagent', type: 'agent', roomId: 'room-gameroom', x: 25, y: 30, avatar: '👾', activity: 'gaming', speechBubble: 'High score on Space Invaders!', facing: 'right' },
    { id: 'ent-33', name: 'Arcade Player 2', role: 'Headline Tester Bot', type: 'agent', roomId: 'room-gameroom', x: 45, y: 30, avatar: '🕹️', activity: 'gaming', speechBubble: 'Combo x32!', facing: 'left' },
    { id: 'ent-34', name: 'Ping-Pong Pro', role: 'Research Intern', type: 'human', roomId: 'room-gameroom', x: 30, y: 70, avatar: '🏓', activity: 'gaming', speechBubble: 'Smash hit!', facing: 'right' },
    { id: 'ent-35', name: 'Beanbag Sleeper', role: 'Overworked Code Agent', type: 'agent', roomId: 'room-gameroom', x: 75, y: 65, avatar: '😴', activity: 'sleeping', speechBubble: 'zzz... dreaming in Rust...', facing: 'left' },

    // Room 9: Coffee Bar (4 entities)
    { id: 'ent-36', name: 'Barista Bot', role: 'Automated Espresso Maker', type: 'bot', roomId: 'room-coffee', x: 20, y: 35, avatar: '☕', activity: 'typing', speechBubble: 'Double espresso poured!', facing: 'right' },
    { id: 'ent-37', name: 'Lead Storyteller', role: 'Scriptwriter', type: 'agent', roomId: 'room-coffee', x: 42, y: 40, avatar: '📜', activity: 'coffee', speechBubble: 'That hook in reel #2 is fire', facing: 'right' },
    { id: 'ent-38', name: 'Senior Dev', role: 'Rust / C++ Specialist', type: 'human', roomId: 'room-coffee', x: 65, y: 45, avatar: '🧑‍💻', activity: 'coffee', speechBubble: 'Zero garbage collection needed', facing: 'left' },
    { id: 'ent-39', name: 'Visitor AI', role: 'Market Auditor Guest', type: 'visitor', roomId: 'room-coffee', x: 82, y: 40, avatar: '🤖', activity: 'walking', facing: 'left' },

    // Room 10: Out of Order Restroom (1 bewildered plumber/visitor entity!)
    { id: 'ent-40', name: 'Plumbing Repair Bot', role: 'Maintenance Drone', type: 'bot', roomId: 'room-restroom', x: 48, y: 55, avatar: '🪠', activity: 'repairing', speechBubble: 'Waiting for parts since Tuesday...', facing: 'right' }
  ]);

  // Shared Brain Vector Memory Hub
  readonly sharedBrain = signal<SharedBrainMemory[]>([
    {
      id: 'mem-1',
      key: 'research.daily_github_trends',
      team: 'Research',
      vectorEmbeddingDim: 1536,
      content: 'Top 3 breakout repositories: [agent-virtual-office, claude-code-tools, mcp-realtime-bus]. Developer momentum +340%.',
      lastSync: '12:00:15',
      accessCount: 42,
      relevanceScore: 0.98
    },
    {
      id: 'mem-2',
      key: 'creative.vertical_video_rules',
      team: 'Creative Studio',
      vectorEmbeddingDim: 1536,
      content: 'Rule #1: Visual transition every 2.4s. Rule #2: Word-highlight dynamic captions. Rule #3: Sound drop on key punchline.',
      lastSync: '11:58:30',
      accessCount: 88,
      relevanceScore: 0.95
    },
    {
      id: 'mem-3',
      key: 'scripts.viral_hook_frameworks',
      team: 'Scripts & Hooks',
      vectorEmbeddingDim: 1536,
      content: 'Formula: "I built an office for my AI agents. 8 teams. 31 agents. Watch what happens when I just talk to them."',
      lastSync: '11:52:10',
      accessCount: 65,
      relevanceScore: 0.99
    },
    {
      id: 'mem-4',
      key: 'safety.operator_approval_matrix',
      team: 'QA & Safety',
      vectorEmbeddingDim: 1536,
      content: 'Mandatory human approval required for: (1) Outbound social publishes, (2) Git remote pushes, (3) Transactions > $5.00.',
      lastSync: '12:00:41',
      accessCount: 110,
      relevanceScore: 1.0
    },
    {
      id: 'mem-5',
      key: 'code.worktree_pipeline',
      team: 'Engineering',
      vectorEmbeddingDim: 1536,
      content: 'Active worktrees: feature/sample-workspace, branch/live-simulation. Safe isolation active.',
      lastSync: '11:45:00',
      accessCount: 31,
      relevanceScore: 0.91
    }
  ]);

  // Human-In-The-Loop Pending Approvals Queue ("Nothing big goes out without my OK")
  readonly pendingApprovals = signal<ApprovalRequest[]>([
    {
      id: 'APP-9021',
      agentId: 'agent-reels-dispatch',
      agentName: 'Instagram Reels Dispatcher',
      teamName: 'Social & Distribution',
      action: 'PUBLISH_VERTICAL_REEL',
      target: 'Instagram Reels (@bexruz.khamidullaev)',
      summary: 'Publishing edited 58s video: "I built an office for my AI agents 🏢 (8 teams, 31 agents)"',
      riskLevel: 'high',
      payloadDiff: `+ Video File: output_master_4k_58s.mp4 (48.2 MB)
+ Audio: CC-BY Royalty Free Beat + Voiceover (-14 LUFS)
+ Captions: Kinetic highlighted subtitles (MrBeast format)
+ Caption text: "I built an office for my AI agents 🏢 8 teams. 31 agents. One shared brain..."
+ Target Account: Instagram Reels & YouTube Shorts
! OPERATOR CONFIRMATION REQUIRED BEFORE BROADCAST`,
      createdAt: '12:00:40',
      status: 'pending'
    },
    {
      id: 'APP-9022',
      agentId: 'agent-claude-core',
      agentName: 'Claude Code Terminal Engine',
      teamName: 'Autonomous Engineering',
      action: 'DEPLOY_ANGULAR_PAGE',
      target: 'Production Frontend Router (/sample)',
      summary: 'Registering new Sample Office Workspaces (Workspace 1, Workspace 2, Workspace 3) into app.routes.ts',
      riskLevel: 'medium',
      payloadDiff: `+ Add route { path: 'sample', component: SamplePageComponent }
+ Add Contextual Topbar quick-launch nav pill
+ 0 broken imports, 100% build pass rate`,
      createdAt: '12:01:10',
      status: 'pending'
    }
  ]);

  // Derived metrics
  readonly totalAgentCount = computed(() => this.agents().length);
  readonly workingAgentCount = computed(() => this.agents().filter(a => a.status === 'working' || a.status === 'parallel').length);
  readonly pendingApprovalCount = computed(() => this.pendingApprovals().filter(p => p.status === 'pending').length);
  readonly totalRoomCount = computed(() => this.rooms().length);
  readonly totalEntityCount = computed(() => this.entities().length);
  readonly totalTokenSpend = computed(() => {
    const total = this.agents().reduce((sum, a) => sum + parseFloat(a.costEstimate.replace('$', '')), 0);
    return `$${total.toFixed(3)}`;
  });

  // Filtered agents
  readonly filteredAgents = computed(() => {
    let list = this.agents();
    const query = this.searchQuery().toLowerCase().trim();
    const team = this.selectedTeamId();
    const room = this.selectedRoomId();
    const status = this.selectedStatus();

    if (team !== 'all') {
      list = list.filter(a => a.teamId === team);
    }
    if (room !== 'all') {
      list = list.filter(a => a.roomId === room);
    }
    if (status !== 'all') {
      list = list.filter(a => a.status === status);
    }
    if (query) {
      list = list.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.codename.toLowerCase().includes(query) ||
        a.role.toLowerCase().includes(query) ||
        a.currentTask.toLowerCase().includes(query) ||
        a.teamName.toLowerCase().includes(query)
      );
    }
    return list;
  });

  constructor() {
    this.startEntityWanderSimulation();
  }

  setLayoutMode(mode: SampleLayoutMode): void {
    this.layoutMode.set(mode);
    if (this.speechVoice) {
      const modeName = mode === 'workspace-1'
        ? 'Workspace 1: 31 Agents Enterprise Office'
        : mode === 'workspace-2'
        ? 'Workspace 2: 10 Rooms Walkable Spatial Office'
        : 'Workspace 3: 3D Holo-Matrix Spatial Center';
      // Optional subtle voice feedback
      console.log(`[SampleAgentService] Switched to ${modeName}`);
    }
  }

  selectAgent(agent: SampleAgent | null): void {
    this.selectedAgent.set(agent);
  }

  selectRoom(room: OfficeRoom | null): void {
    this.selectedRoom.set(room);
  }

  selectEntity(entity: OfficeEntity | null): void {
    this.selectedEntity.set(entity);
  }

  openApprovalModal(approval: ApprovalRequest): void {
    this.activeApprovalModal.set(approval);
  }

  closeApprovalModal(): void {
    this.activeApprovalModal.set(null);
  }

  approveRequest(id: string): void {
    this.pendingApprovals.update(list =>
      list.map(req => req.id === id ? { ...req, status: 'approved' } : req)
    );
    this.addTicker(`Human-In-The-Loop APPROVED: ${id} — Payload executing immediately!`, 'APPROVED');

    // Update the corresponding agent status
    const req = this.pendingApprovals().find(r => r.id === id);
    if (req) {
      this.agents.update(agents =>
        agents.map(a => a.id === req.agentId ? {
          ...a,
          status: 'working',
          statusMessage: 'Approval confirmed! Executing payload broadcast...',
          progress: 100,
          recentLogs: [
            ...a.recentLogs,
            { timestamp: new Date().toTimeString().split(' ')[0], level: 'success', text: `Operator granted human approval for: ${req.action}` }
          ]
        } : a)
      );
    }

    if (this.activeApprovalModal()?.id === id) {
      this.activeApprovalModal.set(null);
    }
  }

  rejectRequest(id: string): void {
    this.pendingApprovals.update(list =>
      list.map(req => req.id === id ? { ...req, status: 'rejected' } : req)
    );
    this.addTicker(`Human-In-The-Loop REJECTED: ${id} — Action blocked and rolled back.`, 'BLOCKED');

    const req = this.pendingApprovals().find(r => r.id === id);
    if (req) {
      this.agents.update(agents =>
        agents.map(a => a.id === req.agentId ? {
          ...a,
          status: 'idle',
          statusMessage: 'Action cancelled by operator.',
          progress: 0,
          recentLogs: [
            ...a.recentLogs,
            { timestamp: new Date().toTimeString().split(' ')[0], level: 'warn', text: `Operator REJECTED authorization for: ${req.action}` }
          ]
        } : a)
      );
    }

    if (this.activeApprovalModal()?.id === id) {
      this.activeApprovalModal.set(null);
    }
  }

  dispatchMission(prompt: string, teamId: string): void {
    this.showMissionModal.set(false);
    const time = new Date().toTimeString().split(' ')[0];
    this.addTicker(`Dispatched Mission to ${teamId || 'All Teams'}: "${prompt.slice(0, 40)}..."`, 'DISPATCH');

    // Activate relevant agents
    this.agents.update(agents =>
      agents.map(a => {
        if (teamId === 'all' || a.teamId === teamId) {
          const isParallel = a.id === 'agent-autocutter' || a.id === 'agent-hunter';
          return {
            ...a,
            status: isParallel ? 'parallel' : 'working',
            statusMessage: `Executing: ${prompt.slice(0, 50)}`,
            progress: 15,
            recentLogs: [
              { timestamp: time, level: 'action', text: `Operator dispatched mission: ${prompt}` },
              ...a.recentLogs
            ]
          };
        }
        return a;
      })
    );

    // If speech voice available, announce
    if (this.speechVoice) {
      this.speechVoice.speak(`Mission dispatched to ${teamId}. 31 agents executing in parallel.`);
    }
  }

  triggerAgentTask(agentId: string): void {
    const time = new Date().toTimeString().split(' ')[0];
    this.agents.update(agents =>
      agents.map(a => {
        if (a.id === agentId) {
          const isParallel = a.id === 'agent-autocutter';
          return {
            ...a,
            status: isParallel ? 'parallel' : 'working',
            statusMessage: 'Executing dedicated operator task cycle',
            progress: 35,
            recentLogs: [
              { timestamp: time, level: 'action', text: 'Operator triggered immediate task execution' },
              ...a.recentLogs
            ]
          };
        }
        return a;
      })
    );
    this.addTicker(`Manual run triggered on agent: ${agentId}`, 'MANUAL_RUN');
  }

  addTicker(text: string, tag: string): void {
    const time = new Date().toTimeString().split(' ')[0];
    this.tickerFeed.update(feed => [
      { id: Math.random().toString(36).substring(7), time, text, tag },
      ...feed.slice(0, 9)
    ]);
  }

  toggleSimulationPause(): void {
    this.isSimulationPaused.update(p => !p);
  }

  setSpeed(multiplier: number): void {
    this.simulationSpeed.set(multiplier);
  }

  // Periodic subtle avatar movement & speech bubble updates across 40 entities
  private startEntityWanderSimulation(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      if (this.isSimulationPaused()) return;

      this.entities.update(entities => {
        // Pick 2-3 random entities to shift position or talk
        return entities.map(entity => {
          if (Math.random() < 0.25) {
            // Subtle wander
            const dx = (Math.random() - 0.5) * 8;
            const dy = (Math.random() - 0.5) * 8;
            const newX = Math.max(10, Math.min(90, entity.x + dx));
            const newY = Math.max(15, Math.min(85, entity.y + dy));
            const facing = dx > 0 ? 'right' : 'left';

            return {
              ...entity,
              x: Math.round(newX),
              y: Math.round(newY),
              facing
            };
          }
          return entity;
        });
      });
    }, 4000);
  }
}
