import { Injectable, signal, computed, inject } from '@angular/core';
import {
  SampleAgent,
  AgentTeam,
  OfficeRoom,
  OfficeEntity,
  ApprovalRequest,
  SharedBrainMemory,
  SampleLayoutMode,
  ClaudeEventLog,
  PipelineItem
} from '../models/sample-agent.model';
import { SpeechVoiceService } from '../../../core/services/speech-voice.service';

@Injectable({
  providedIn: 'root'
})
export class SampleAgentService {
  private speechVoice = inject(SpeechVoiceService, { optional: true });

  // Active Layout Mode
  readonly layoutMode = signal<SampleLayoutMode>('workspace-1');

  // Search, Filters & Simulation
  readonly searchQuery = signal<string>('');
  readonly selectedTeamId = signal<string>('all');
  readonly selectedRoomId = signal<string>('all');
  readonly selectedStatus = signal<string>('all');
  readonly activeBrainCategory = signal<'Brand rules' | 'Lessons' | 'Ideas' | 'Logs'>('Brand rules');
  readonly isSimulationPaused = signal<boolean>(false);
  readonly simulationSpeed = signal<number>(1);

  // Inspected Elements & Modals
  readonly selectedAgent = signal<SampleAgent | null>(null);
  readonly selectedRoom = signal<OfficeRoom | null>(null);
  readonly selectedEntity = signal<OfficeEntity | null>(null);
  readonly activeApprovalModal = signal<ApprovalRequest | null>(null);
  readonly showMissionModal = signal<boolean>(false);

  // Player state in the 2D walkable office (Workspace 2)
  readonly playerPos = signal<{ x: number; y: number; dir: 'up' | 'down' | 'left' | 'right'; isMoving: boolean; currentRoom: string }>({
    x: 480,
    y: 480,
    dir: 'down',
    isMoving: false,
    currentRoom: 'Central Atrium'
  });

  // Replay timeline step for Workspace 3
  readonly replayCurrentStep = signal<number>(3);
  readonly isReplayPlaying = signal<boolean>(true);

  // Ticker Feed
  readonly tickerFeed = signal<{ id: string; time: string; text: string; tag: string }[]>([
    { id: '1', time: '12:00:14', text: 'Claude Code: Ingested inbox/raw_clip_08.mp4 with reel skill', tag: 'CREATIVE' },
    { id: '2', time: '12:00:28', text: 'Creative Team: Spawned 3 parallel sub-agents (Whisper, Cut, Captions)', tag: 'PARALLEL' },
    { id: '3', time: '12:00:45', text: 'Shared Brain: Synced rule "Cover text must be high-contrast red"', tag: 'BRAIN_MCP' },
    { id: '4', time: '12:01:02', text: 'Human Gatekeeper: Approval pending on vertical Reel #42 publish', tag: 'HUMAN_OK' }
  ]);

  // The 4-Stage Kanban Pipeline from Bekhruz AI Workflow
  readonly pipelineItems = signal<PipelineItem[]>([
    {
      id: 'pipe-1',
      title: 'inbox/clip_ai_office_tour.mp4',
      category: 'video',
      stage: 'in_progress',
      assignee: 'AutoCutter Pro (reel skill)',
      progress: 68,
      subtasks: ['Whisper Transcribe (100%)', 'Silence Cut -38s (85%)', 'Kinetic Text Overlays (52%)'],
      summary: 'Turning 12m screen recording into a 58s vertical reel with dynamic captions',
      createdAt: '12:00:10'
    },
    {
      id: 'pipe-2',
      title: 'out/reel_31_agents_ready.mp4',
      category: 'video',
      stage: 'awaiting_approval',
      assignee: 'Reels Dispatcher (relay skill)',
      progress: 99,
      subtasks: ['Edited MP4 rendered', 'Thumbnail paired (pixel skill)', 'Human OK Required'],
      summary: 'Waiting for operator confirmation before publishing to Instagram Reels',
      createdAt: '12:00:40'
    },
    {
      id: 'pipe-3',
      title: 'inbox/radar/trending_comments.txt',
      category: 'research',
      stage: 'inbox',
      assignee: 'GitHub Hunter & Radar',
      progress: 10,
      subtasks: ['Fetch 50 top comments', 'Rank topics by enthusiasm score'],
      summary: 'Extracting video ideas from 672 comments on past reel',
      createdAt: '11:58:00'
    },
    {
      id: 'pipe-4',
      title: 'out/scripts/office_2_screenplay.md',
      category: 'script',
      stage: 'done',
      assignee: 'Viral Hooksmith (quill skill)',
      progress: 100,
      subtasks: ['Hook: Curiosity gap (3s)', 'Tour: 10 rooms (20s)', 'Out of order bathroom gag'],
      summary: 'Screenplay approved and transferred to creative production queue',
      createdAt: '11:50:00'
    }
  ]);

  // The Shared Brain MCP Memory Entities (from brain/memory.jsonl)
  readonly sharedBrain = signal<SharedBrainMemory[]>([
    // Brand Rules
    {
      id: 'b-1',
      category: 'Brand rules',
      entity: 'Cover rules',
      content: 'Cover text must be high-contrast RED, maximum 5 words, centered over the face or core subject.',
      timestamp: 'Today 11:20',
      author: 'Operator (Bekhruz)',
      accessCount: 142
    },
    {
      id: 'b-2',
      category: 'Brand rules',
      entity: 'Editing tempo',
      content: 'Cut every breath or pause > 220ms. Minimum 1 visual pattern interrupt every 2.4 seconds.',
      timestamp: 'Today 10:45',
      author: 'AutoCutter Pro',
      accessCount: 98
    },
    {
      id: 'b-3',
      category: 'Brand rules',
      entity: 'Safety boundary',
      content: 'NEVER publish, upload or push code automatically. All finished assets must wait in out/ for human OK.',
      timestamp: 'Today 09:15',
      author: 'Gatekeeper Sentinel',
      accessCount: 210
    },
    // Lessons
    {
      id: 'l-1',
      category: 'Lessons',
      entity: 'Viral retention',
      content: 'The "Out of Order Restroom" cutaway at second 31 boosted audience retention by 2.4x. Humor converts.',
      timestamp: 'Yesterday 18:30',
      author: 'Pulse Analytics',
      accessCount: 84
    },
    {
      id: 'l-2',
      category: 'Lessons',
      entity: 'Sub-agent concurrency',
      content: 'Running Whisper transcription and silence trimming in parallel saves 74% wall-clock render time.',
      timestamp: 'Yesterday 14:10',
      author: 'Claude Code Core',
      accessCount: 125
    },
    // Ideas
    {
      id: 'i-1',
      category: 'Ideas',
      entity: 'Office 2.0 Concept',
      content: 'Build a walkable retro office where you can control the avatar with WASD keys and inspect agents at their desks.',
      timestamp: 'Yesterday 09:00',
      author: 'Quill Scriptwriter',
      accessCount: 62
    },
    {
      id: 'i-2',
      category: 'Ideas',
      entity: 'Holo-Matrix 3D',
      content: 'Render WebGL Three.js spatial view showing orbital satellite agents tethered to a rotating glowing brain core.',
      timestamp: 'Today 08:30',
      author: 'Antigravity Swarm',
      accessCount: 77
    }
  ]);

  // Claude Code Event Logs for Workspace 3 Live Replay
  readonly claudeEvents = signal<ClaudeEventLog[]>([
    {
      id: 'ev-1',
      timestamp: '00:02',
      step: 1,
      type: 'USER_COMMAND',
      agent: 'Operator',
      title: 'Voice Command: "There is a new clip in inbox. Make it a reel."',
      codeSnippet: '$ claude "There\'s a new clip in inbox. Make it a reel."',
      durationMs: 400
    },
    {
      id: 'ev-2',
      timestamp: '00:05',
      step: 2,
      type: 'THINKING',
      agent: 'Claude Code',
      title: 'Reading skill definitions from .claude/skills/reel/SKILL.md & pixel/SKILL.md',
      codeSnippet: '> Matched skills: [reel, pixel]\n> Target clip: inbox/screen_demo_1080p.mp4',
      durationMs: 820
    },
    {
      id: 'ev-3',
      timestamp: '00:12',
      step: 3,
      type: 'PARALLEL_SPAWN',
      agent: 'AutoCutter Pro',
      title: 'Spawning 3 Sub-Agents in Parallel (Whisper, Silence Cut, Kinetic Captions)',
      codeSnippet: `[Sub-Agent 1] python .claude/skills/reel/scripts/transcribe.py -> PID 4012\n[Sub-Agent 2] python .claude/skills/reel/scripts/cut.py -> PID 4013\n[Sub-Agent 3] python .claude/skills/reel/scripts/captions.py -> PID 4014`,
      durationMs: 2400
    },
    {
      id: 'ev-4',
      timestamp: '00:26',
      step: 4,
      type: 'TOOL_CALL',
      agent: 'Sub-Agent #1 & #2',
      title: 'Sub-agents finished: 182 words transcribed; 44 pauses cut (-38.2s footage saved)',
      codeSnippet: `{"words": 182, "cut_seconds": 38.2, "output": "inbox/cut_temp.mp4", "status": "ok"}`,
      durationMs: 1450
    },
    {
      id: 'ev-5',
      timestamp: '00:38',
      step: 5,
      type: 'FILE_WRITE',
      agent: 'Thumbnail Synthesizer',
      title: 'Generated cover thumbnail via pixel skill with high-contrast red font',
      codeSnippet: `python .claude/skills/pixel/scripts/thumbnail.py --title "AI AGENTS OFFICE" --color "#ef4444" -> out/cover_4k.png`,
      durationMs: 1100
    },
    {
      id: 'ev-6',
      timestamp: '00:46',
      step: 6,
      type: 'HUMAN_GATE',
      agent: 'Gatekeeper Sentinel',
      title: 'HUMAN-IN-THE-LOOP INTERCEPT: Waiting for operator OK before publish',
      codeSnippet: `⚠️ RULE: "Nothing gets published without your OK."\n> Action: Publish Instagram Reel\n> Status: PAUSED — Awaiting Human Signature`,
      durationMs: 0,
      isApprovalRequired: true
    }
  ]);

  // 8 Teams
  readonly teams = signal<AgentTeam[]>([
    {
      id: 'team-research',
      name: 'Research & Intelligence',
      icon: '🔍',
      color: '#38bdf8',
      leadAgentId: 'agent-hunter',
      description: 'Morning GitHub scrapers, trending tech radars & arXiv paper summarizers.',
      agentCount: 4,
      activeTasks: 2,
      mcpIntegrations: ['github-mcp', 'arxiv-fetcher', 'tavily-search']
    },
    {
      id: 'team-scripts',
      name: 'Scripts & Hooks (quill)',
      icon: '✍️',
      color: '#a855f7',
      leadAgentId: 'agent-hooksmith',
      description: 'Viral 3-second hook engineers, storytelling frameworks & voiceovers in Bekhruz style.',
      agentCount: 4,
      activeTasks: 1,
      mcpIntegrations: ['gemini-flash', 'claude-haiku', 'retention-analyzer']
    },
    {
      id: 'team-creative',
      name: 'Creative Studio (reel & pixel)',
      icon: '🎬',
      color: '#ec4899',
      leadAgentId: 'agent-autocutter',
      description: 'Auto video cut, Whisper transcription, parallel kinetic subtitles & thumbnail synthesis.',
      agentCount: 5,
      activeTasks: 3,
      mcpIntegrations: ['ffmpeg-core', 'whisper-local', 'remotion-worker']
    },
    {
      id: 'team-social',
      name: 'Social & Distribution (relay)',
      icon: '📢',
      color: '#f59e0b',
      leadAgentId: 'agent-reels-dispatch',
      description: 'Multi-platform post scheduling for Instagram Reels, YouTube Shorts, X threads & LinkedIn.',
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
      description: 'Claude Code CLI sessions, Antigravity swarm coordination & git worktree execution.',
      agentCount: 4,
      activeTasks: 2,
      mcpIntegrations: ['claude-code-cli', 'antigravity-hub', 'git-daemon']
    },
    {
      id: 'team-safety',
      name: 'Human Gatekeeper & Safety',
      icon: '🛡️',
      color: '#ef4444',
      leadAgentId: 'agent-gatekeeper',
      description: 'Ensuring nothing big goes out without operator approval. Zero leak guarantee.',
      agentCount: 3,
      activeTasks: 1,
      mcpIntegrations: ['pii-scanner', 'human-approval-gate', 'diff-auditor']
    },
    {
      id: 'team-analytics',
      name: 'Analytics & Lessons (pulse)',
      icon: '📊',
      color: '#06b6d4',
      leadAgentId: 'agent-cost-guard',
      description: 'Ingesting post analytics, extracting retention lessons & monitoring token costs.',
      agentCount: 4,
      activeTasks: 1,
      mcpIntegrations: ['langfuse', 'prometheus', 'token-meter']
    },
    {
      id: 'team-operations',
      name: 'Operations & Brain Sync',
      icon: '⚡',
      color: '#8b5cf6',
      leadAgentId: 'agent-chief-pm',
      description: 'Coordinating cross-team DAGs and maintaining 100% synchronization with the Shared Brain.',
      agentCount: 3,
      activeTasks: 2,
      mcpIntegrations: ['dag-engine', 'shared-brain-mcp', 'event-bus']
    }
  ]);

  // 31 Specialized Real-World Agents
  readonly agents = signal<SampleAgent[]>([
    // Research
    {
      id: 'agent-hunter',
      name: 'GitHub Hunter',
      codename: 'HNT-01',
      teamId: 'team-research',
      teamName: 'Research & Intelligence',
      role: 'Daily GitHub Trending Scraper',
      avatar: '🕵️‍♂️',
      status: 'working',
      statusMessage: 'Scanning 140 GitHub repositories with >500 stars',
      currentTask: 'Ingesting README architectures for AI agent frameworks',
      progress: 74,
      subAgents: [
        { id: 'sub-h1', name: 'Repo Cloner', role: 'Cloning README & license metadata', status: 'completed', progress: 100, elapsedMs: 410 },
        { id: 'sub-h2', name: 'AST Parser', role: 'Analyzing exported modules & hooks', status: 'running', progress: 68, elapsedMs: 1200 }
      ],
      toolsUsed: ['github_trending_api', 'git_shallow_clone'],
      mcpServers: ['github-mcp', 'tavily-search'],
      tokensUsed: 14250,
      costEstimate: '$0.021',
      recentLogs: [
        { timestamp: '12:00:10', level: 'info', text: 'Started daily GitHub scan' },
        { timestamp: '12:00:25', level: 'action', text: 'Fetched 30 trending repos', toolCall: 'github_search()' }
      ],
      roomId: 'room-research',
      roomName: 'Research Lab',
      x: 320,
      y: 180
    },
    {
      id: 'agent-radar',
      name: 'Tech Radar Sentinel',
      codename: 'RDR-02',
      teamId: 'team-research',
      teamName: 'Research & Intelligence',
      role: 'Emerging Framework & Package Tracker',
      avatar: '📡',
      status: 'idle',
      statusMessage: 'Monitoring npm & PyPI releases',
      currentTask: 'Standby for hourly pulse',
      progress: 0,
      subAgents: [],
      toolsUsed: ['pypi_changes_feed'],
      mcpServers: ['tavily-search'],
      tokensUsed: 8400,
      costEstimate: '$0.012',
      recentLogs: [{ timestamp: '11:45:00', level: 'info', text: 'Checked 50 dependencies' }],
      roomId: 'room-research',
      roomName: 'Research Lab',
      x: 380,
      y: 190
    },
    {
      id: 'agent-arxiv',
      name: 'Paper Digest Bot',
      codename: 'ARX-03',
      teamId: 'team-research',
      teamName: 'Research & Intelligence',
      role: 'ArXiv Science Paper Summarizer',
      avatar: '📄',
      status: 'working',
      statusMessage: 'Extracting test-time compute scaling findings',
      currentTask: 'Synthesizing 4 new reasoning papers',
      progress: 42,
      subAgents: [],
      toolsUsed: ['arxiv_api', 'pdf_text_extractor'],
      mcpServers: ['arxiv-fetcher'],
      tokensUsed: 22100,
      costEstimate: '$0.033',
      recentLogs: [{ timestamp: '11:58:10', level: 'action', text: 'Downloaded paper', toolCall: 'arxiv_fetch()' }],
      roomId: 'room-research',
      roomName: 'Research Lab',
      x: 340,
      y: 240
    },
    {
      id: 'agent-intel',
      name: 'Market Intelligence',
      codename: 'INT-04',
      teamId: 'team-research',
      teamName: 'Research & Intelligence',
      role: 'Competitor Architecture Auditor',
      avatar: '📊',
      status: 'idle',
      statusMessage: 'Competitive benchmark matrix synced',
      currentTask: 'Idle awaiting next schedule',
      progress: 0,
      subAgents: [],
      toolsUsed: ['web_scraper'],
      mcpServers: ['tavily-search'],
      tokensUsed: 5400,
      costEstimate: '$0.008',
      recentLogs: [{ timestamp: '11:30:15', level: 'info', text: 'Audited 12 AI platforms' }],
      roomId: 'room-research',
      roomName: 'Research Lab',
      x: 420,
      y: 220
    },

    // Scripts & Hooks (quill)
    {
      id: 'agent-hooksmith',
      name: 'Viral Hooksmith (quill)',
      codename: 'HOK-01',
      teamId: 'team-scripts',
      teamName: 'Scripts & Hooks (quill)',
      role: 'First-3-Second Hook Engineer',
      avatar: '🪝',
      status: 'working',
      statusMessage: 'Generating 5 visual & verbal opening hooks',
      currentTask: 'Curiosity Gap + Physical Proof + High Stake Outcome',
      progress: 88,
      subAgents: [{ id: 'sub-hk1', name: 'Curiosity Scorer', role: 'Predicting retention drop at 0:02', status: 'completed', progress: 100, elapsedMs: 310 }],
      toolsUsed: ['hook_evaluator'],
      mcpServers: ['gemini-flash'],
      tokensUsed: 19800,
      costEstimate: '$0.029',
      recentLogs: [{ timestamp: '12:00:05', level: 'action', text: 'Drafted: "I built an office for my AI agents"', toolCall: 'generate_hooks()' }],
      roomId: 'room-creative',
      roomName: 'Creative Video Studio',
      x: 180,
      y: 450
    },
    {
      id: 'agent-story',
      name: 'Story Architect',
      codename: 'STY-02',
      teamId: 'team-scripts',
      teamName: 'Scripts & Hooks (quill)',
      role: 'Vertical Video Pacing Structurer',
      avatar: '📜',
      status: 'idle',
      statusMessage: '60s screenplay structure locked',
      currentTask: 'Transferred to video editor',
      progress: 100,
      subAgents: [],
      toolsUsed: ['storyboard_gen'],
      mcpServers: ['claude-haiku'],
      tokensUsed: 16500,
      costEstimate: '$0.024',
      recentLogs: [{ timestamp: '11:55:00', level: 'success', text: 'Beat sheet approved' }],
      roomId: 'room-creative',
      roomName: 'Creative Video Studio',
      x: 230,
      y: 470
    },
    {
      id: 'agent-splittester',
      name: 'A/B Headline Tester',
      codename: 'ABT-03',
      teamId: 'team-scripts',
      teamName: 'Scripts & Hooks (quill)',
      role: 'CTR & Thumbnail Match Scorer',
      avatar: '⚖️',
      status: 'idle',
      statusMessage: 'Generated 10 variations with predicted CTR',
      currentTask: 'Top title: "My AI Agents Have a Better Office Than Me"',
      progress: 0,
      subAgents: [],
      toolsUsed: ['ctr_model'],
      mcpServers: ['retention-analyzer'],
      tokensUsed: 9200,
      costEstimate: '$0.013',
      recentLogs: [{ timestamp: '11:52:12', level: 'info', text: 'Calculated 42% higher CTR on office theme' }],
      roomId: 'room-creative',
      roomName: 'Creative Video Studio',
      x: 190,
      y: 520
    },
    {
      id: 'agent-retention',
      name: 'Retention Engineer',
      codename: 'RET-04',
      teamId: 'team-scripts',
      teamName: 'Scripts & Hooks (quill)',
      role: 'Pattern Interrupt Modeler',
      avatar: '🎯',
      status: 'idle',
      statusMessage: 'Pacing audit complete: 0 predicted flatlines',
      currentTask: 'Inserted 4 pattern interrupts at seconds 7, 18, 31, 48',
      progress: 100,
      subAgents: [],
      toolsUsed: ['retention_curve_predictor'],
      mcpServers: ['retention-analyzer'],
      tokensUsed: 7100,
      costEstimate: '$0.010',
      recentLogs: [{ timestamp: '11:50:30', level: 'info', text: 'Inserted out-of-order bathroom cutaway' }],
      roomId: 'room-creative',
      roomName: 'Creative Video Studio',
      x: 250,
      y: 530
    },

    // Creative Studio (reel & pixel)
    {
      id: 'agent-autocutter',
      name: 'AutoCutter Pro (reel)',
      codename: 'CUT-01',
      teamId: 'team-creative',
      teamName: 'Creative Studio (reel & pixel)',
      role: 'Parallel Sub-Agent Timeline Slicer',
      avatar: '✂️',
      status: 'parallel',
      statusMessage: '3 sub-agents running in parallel: Whisper, Silence Trim, Kinetic Zoom',
      currentTask: 'Trimming 12-minute screen recording into 58s vertical cut',
      progress: 68,
      subAgents: [
        { id: 'sub-c1', name: 'Whisper Transcribe', role: 'Word-level timestamp extraction', status: 'completed', progress: 100, elapsedMs: 1450, outputSnippet: 'Extracted 182 words with millisecond timings' },
        { id: 'sub-c2', name: 'Silence Decimator', role: 'Removing breaths & pauses > 220ms', status: 'running', progress: 85, elapsedMs: 2300, outputSnippet: 'Removed 44 gaps (-38.2s footage saved)' },
        { id: 'sub-c3', name: 'Kinetic Motion Layer', role: 'Rendering zoom ramps on code screens', status: 'running', progress: 52, elapsedMs: 3100, outputSnippet: 'Applying 1.15x scale-ins on IDE actions' }
      ],
      toolsUsed: ['ffmpeg_trim', 'silence_detector', 'whisper_local'],
      mcpServers: ['ffmpeg-core', 'whisper-local'],
      tokensUsed: 31200,
      costEstimate: '$0.046',
      recentLogs: [
        { timestamp: '12:00:15', level: 'info', text: 'Ingested raw footage: inbox/raw_clip.mp4' },
        { timestamp: '12:00:20', level: 'action', text: 'Dispatched 3 parallel sub-agents', toolCall: 'spawn_parallel_workers()' }
      ],
      roomId: 'room-creative',
      roomName: 'Creative Video Studio',
      x: 170,
      y: 420
    },
    {
      id: 'agent-subcaptions',
      name: 'Sub-Agent Captions',
      codename: 'CAP-02',
      teamId: 'team-creative',
      teamName: 'Creative Studio (reel & pixel)',
      role: 'Kinetic Animated Text Layer',
      avatar: '💬',
      status: 'working',
      statusMessage: 'Burning highlighted animated subtitles',
      currentTask: 'Highlighting keywords: "AI AGENTS", "31 AGENTS", "SHARED BRAIN"',
      progress: 72,
      subAgents: [],
      toolsUsed: ['ass_subtitle_renderer'],
      mcpServers: ['remotion-worker'],
      tokensUsed: 14900,
      costEstimate: '$0.022',
      recentLogs: [{ timestamp: '12:00:35', level: 'action', text: 'Burned animated text into track #2' }],
      roomId: 'room-creative',
      roomName: 'Creative Video Studio',
      x: 210,
      y: 430
    },
    {
      id: 'agent-audiomixer',
      name: 'Audio Mastering Bot',
      codename: 'AUD-03',
      teamId: 'team-creative',
      teamName: 'Creative Studio (reel & pixel)',
      role: 'Voice Clarifier & Music Ducker',
      avatar: '🎚️',
      status: 'idle',
      statusMessage: 'Loudness normalized to -14 LUFS, music ducked at -18dB',
      currentTask: 'Audio master ready',
      progress: 100,
      subAgents: [],
      toolsUsed: ['loudnorm_filter'],
      mcpServers: ['ffmpeg-core'],
      tokensUsed: 6200,
      costEstimate: '$0.009',
      recentLogs: [{ timestamp: '11:54:10', level: 'success', text: 'Voice normalized' }],
      roomId: 'room-creative',
      roomName: 'Creative Video Studio',
      x: 270,
      y: 430
    },
    {
      id: 'agent-motionfx',
      name: 'Motion Graphics Synthesizer',
      codename: 'GFX-04',
      teamId: 'team-creative',
      teamName: 'Creative Studio (reel & pixel)',
      role: '3D Overlays & Arrow Callouts',
      avatar: '✨',
      status: 'idle',
      statusMessage: 'Prepared 6 sound-effect synched visual elements',
      currentTask: 'Ready for timeline compositor',
      progress: 0,
      subAgents: [],
      toolsUsed: ['canvas_renderer'],
      mcpServers: ['remotion-worker'],
      tokensUsed: 11400,
      costEstimate: '$0.017',
      recentLogs: [{ timestamp: '11:48:00', level: 'info', text: 'Rendered glowing callout' }],
      roomId: 'room-creative',
      roomName: 'Creative Video Studio',
      x: 220,
      y: 500
    },
    {
      id: 'agent-thumbnail',
      name: 'Thumbnail Synthesizer (pixel)',
      codename: 'THM-05',
      teamId: 'team-creative',
      teamName: 'Creative Studio (reel & pixel)',
      role: 'High-Impact Cover Designer',
      avatar: '🖼️',
      status: 'idle',
      statusMessage: 'Rendered 3 cover candidates with red high-contrast text',
      currentTask: 'Cover ready in out/cover_4k.png',
      progress: 100,
      subAgents: [],
      toolsUsed: ['flux_generator'],
      mcpServers: ['remotion-worker'],
      tokensUsed: 24500,
      costEstimate: '$0.036',
      recentLogs: [{ timestamp: '11:56:45', level: 'success', text: 'Saved thumbnail to out/' }],
      roomId: 'room-creative',
      roomName: 'Creative Video Studio',
      x: 260,
      y: 490
    },

    // Social & Distribution (relay)
    {
      id: 'agent-x-commander',
      name: 'X Commander',
      codename: 'TWT-01',
      teamId: 'team-social',
      teamName: 'Social & Distribution (relay)',
      role: 'Viral Thread Synthesizer',
      avatar: '🐦',
      status: 'working',
      statusMessage: 'Formulating 7-tweet breakdown with GitHub links',
      currentTask: 'Drafting: "I put 31 agents in a virtual office. Here is the tech stack 🧵"',
      progress: 55,
      subAgents: [],
      toolsUsed: ['twitter_builder'],
      mcpServers: ['x-api-v2'],
      tokensUsed: 13200,
      costEstimate: '$0.019',
      recentLogs: [{ timestamp: '11:59:00', level: 'info', text: 'Thread queued' }],
      roomId: 'room-social',
      roomName: 'Social Media Desk',
      x: 620,
      y: 430
    },
    {
      id: 'agent-reels-dispatch',
      name: 'Instagram Reels Dispatcher',
      codename: 'IGD-02',
      teamId: 'team-social',
      teamName: 'Social & Distribution (relay)',
      role: 'Vertical Video Scheduler',
      avatar: '📸',
      status: 'awaiting_approval',
      statusMessage: 'PAUSED: Awaiting Operator OK before upload',
      currentTask: 'Waiting for Human-in-the-Loop approval on Reel #42',
      progress: 99,
      subAgents: [],
      toolsUsed: ['instagram_api'],
      mcpServers: ['meta-graph', 'human-approval-gate'],
      tokensUsed: 17800,
      costEstimate: '$0.026',
      recentLogs: [{ timestamp: '12:00:40', level: 'warn', text: 'SAFETY GATE ENGAGED: Upload paused' }],
      roomId: 'room-social',
      roomName: 'Social Media Desk',
      x: 670,
      y: 440
    },
    {
      id: 'agent-youtube-ops',
      name: 'YouTube Strategist',
      codename: 'YTO-03',
      teamId: 'team-social',
      teamName: 'Social & Distribution (relay)',
      role: 'Shorts & Longform Metadata Architect',
      avatar: '▶️',
      status: 'idle',
      statusMessage: 'SEO tags, description and chapters compiled',
      currentTask: 'Waiting for Reels approval',
      progress: 0,
      subAgents: [],
      toolsUsed: ['youtube_tagger'],
      mcpServers: ['youtube-data-v3'],
      tokensUsed: 10100,
      costEstimate: '$0.015',
      recentLogs: [{ timestamp: '11:42:00', level: 'info', text: 'Tags indexed' }],
      roomId: 'room-social',
      roomName: 'Social Media Desk',
      x: 630,
      y: 500
    },
    {
      id: 'agent-linkedin',
      name: 'LinkedIn Storyteller',
      codename: 'LNK-04',
      teamId: 'team-social',
      teamName: 'Social & Distribution (relay)',
      role: 'B2B Architecture Breakdown Creator',
      avatar: '💼',
      status: 'idle',
      statusMessage: 'Drafted 300-word deployment breakdown',
      currentTask: 'Scheduled for tomorrow',
      progress: 0,
      subAgents: [],
      toolsUsed: ['linkedin_optimizer'],
      mcpServers: ['meta-graph'],
      tokensUsed: 8900,
      costEstimate: '$0.013',
      recentLogs: [{ timestamp: '11:35:10', level: 'info', text: 'Saved draft in Shared Brain' }],
      roomId: 'room-social',
      roomName: 'Social Media Desk',
      x: 690,
      y: 490
    },

    // Autonomous Engineering
    {
      id: 'agent-claude-core',
      name: 'Claude Code CLI Engine',
      codename: 'CLD-01',
      teamId: 'team-code',
      teamName: 'Autonomous Engineering',
      role: 'Interactive CLI Agent with Worktrees',
      avatar: '🤖',
      status: 'working',
      statusMessage: 'Running Angular components in isolated worktree',
      currentTask: 'Rebuilding Sample Office Workspaces matching Reels reference',
      progress: 85,
      subAgents: [
        { id: 'sub-cc1', name: 'AST Validator', role: 'Checking bindings', status: 'completed', progress: 100, elapsedMs: 380 },
        { id: 'sub-cc2', name: '2D Canvas Engine', role: 'Compiling retro walkable office floor', status: 'running', progress: 85, elapsedMs: 740 }
      ],
      toolsUsed: ['write_file', 'edit_file', 'run_command'],
      mcpServers: ['claude-code-cli', 'git-daemon'],
      tokensUsed: 42100,
      costEstimate: '$0.063',
      recentLogs: [{ timestamp: '12:00:20', level: 'action', text: 'Executed build with 0 errors' }],
      roomId: 'room-dev',
      roomName: 'Engineering Bay',
      x: 520,
      y: 180
    },
    {
      id: 'agent-antigravity',
      name: 'Antigravity Swarm Runner',
      codename: 'AGY-02',
      teamId: 'team-code',
      teamName: 'Autonomous Engineering',
      role: 'Multi-Agent Subagent Coordinator',
      avatar: '🌌',
      status: 'working',
      statusMessage: 'Orchestrating subagents across shared workspaces',
      currentTask: 'Syncing agent memory bus with OperatorStateService',
      progress: 60,
      subAgents: [],
      toolsUsed: ['invoke_subagent'],
      mcpServers: ['antigravity-hub'],
      tokensUsed: 28400,
      costEstimate: '$0.042',
      recentLogs: [{ timestamp: '11:58:20', level: 'info', text: 'Swarm active' }],
      roomId: 'room-dev',
      roomName: 'Engineering Bay',
      x: 570,
      y: 190
    },
    {
      id: 'agent-pr-sentinel',
      name: 'PR Sentinel Bot',
      codename: 'PRR-03',
      teamId: 'team-code',
      teamName: 'Autonomous Engineering',
      role: 'Automated Git Diff & Linter',
      avatar: '🔍',
      status: 'idle',
      statusMessage: 'All PR checks green',
      currentTask: 'Monitoring git branches',
      progress: 0,
      subAgents: [],
      toolsUsed: ['git_diff'],
      mcpServers: ['git-daemon'],
      tokensUsed: 11200,
      costEstimate: '$0.016',
      recentLogs: [{ timestamp: '11:46:12', level: 'success', text: 'Passed test suite' }],
      roomId: 'room-dev',
      roomName: 'Engineering Bay',
      x: 530,
      y: 240
    },
    {
      id: 'agent-autofix',
      name: 'Auto-Fixer Daemon',
      codename: 'FIX-04',
      teamId: 'team-code',
      teamName: 'Autonomous Engineering',
      role: 'Self-Healing Test Runner',
      avatar: '🔧',
      status: 'idle',
      statusMessage: 'Watchdog active on port 4200 & 8000',
      currentTask: '0 runtime exceptions',
      progress: 0,
      subAgents: [],
      toolsUsed: ['stack_trace_parser'],
      mcpServers: ['claude-code-cli'],
      tokensUsed: 13900,
      costEstimate: '$0.020',
      recentLogs: [{ timestamp: '11:40:05', level: 'info', text: 'Clean compilation verified' }],
      roomId: 'room-dev',
      roomName: 'Engineering Bay',
      x: 580,
      y: 250
    },

    // Human Gatekeeper & Safety
    {
      id: 'agent-gatekeeper',
      name: 'Gatekeeper Sentinel',
      codename: 'GAT-01',
      teamId: 'team-safety',
      teamName: 'Human Gatekeeper & Safety',
      role: 'Approval Interceptor: "Nothing big goes out without OK"',
      avatar: '🛑',
      status: 'working',
      statusMessage: 'Holding 1 pending action for human sign-off',
      currentTask: 'Guarding high-privilege actions: File Writes, Social Posts, Git Merges',
      progress: 95,
      subAgents: [],
      toolsUsed: ['human_consent_prompt'],
      mcpServers: ['human-approval-gate'],
      tokensUsed: 16200,
      costEstimate: '$0.024',
      recentLogs: [{ timestamp: '12:00:40', level: 'warn', text: 'Reels upload held for human approval' }],
      roomId: 'room-executive',
      roomName: 'Executive Suite',
      x: 150,
      y: 180
    },
    {
      id: 'agent-risk-auditor',
      name: 'Risk & Policy Auditor',
      codename: 'RSK-02',
      teamId: 'team-safety',
      teamName: 'Human Gatekeeper & Safety',
      role: 'Secret Leak Interceptor',
      avatar: '🛡️',
      status: 'idle',
      statusMessage: 'Zero secrets or API keys leaked in outbound prompts',
      currentTask: 'Real-time string sanitization active',
      progress: 100,
      subAgents: [],
      toolsUsed: ['secret_scanner'],
      mcpServers: ['pii-scanner'],
      tokensUsed: 9800,
      costEstimate: '$0.014',
      recentLogs: [{ timestamp: '11:51:00', level: 'success', text: 'Scanned 42 payloads' }],
      roomId: 'room-executive',
      roomName: 'Executive Suite',
      x: 200,
      y: 190
    },
    {
      id: 'agent-copyright',
      name: 'Copyright & Audio Checker',
      codename: 'CPY-03',
      teamId: 'team-safety',
      teamName: 'Human Gatekeeper & Safety',
      role: 'Audio Licensing Validator',
      avatar: '⚖️',
      status: 'idle',
      statusMessage: 'All video music tracks confirmed royalty free',
      currentTask: 'Commercial license clearance verified',
      progress: 0,
      subAgents: [],
      toolsUsed: ['audio_fingerprint_matcher'],
      mcpServers: ['human-approval-gate'],
      tokensUsed: 8100,
      costEstimate: '$0.012',
      recentLogs: [{ timestamp: '11:44:20', level: 'info', text: 'Audio matches CC-BY track' }],
      roomId: 'room-executive',
      roomName: 'Executive Suite',
      x: 160,
      y: 240
    },

    // Analytics (pulse)
    {
      id: 'agent-cost-guard',
      name: 'Token & Cost Monitor (pulse)',
      codename: 'CST-01',
      teamId: 'team-analytics',
      teamName: 'Analytics & Lessons (pulse)',
      role: 'Token Spend & Budget Governor',
      avatar: '💰',
      status: 'working',
      statusMessage: 'Today total spend: $0.48 / $10.00 daily cap',
      currentTask: 'Tracking input/output tokens across 31 agents',
      progress: 50,
      subAgents: [],
      toolsUsed: ['token_aggregator'],
      mcpServers: ['token-meter'],
      tokensUsed: 12500,
      costEstimate: '$0.018',
      recentLogs: [{ timestamp: '12:00:00', level: 'info', text: 'Aggregated token consumption: $0.48' }],
      roomId: 'room-server',
      roomName: 'Neural Server Room',
      x: 350,
      y: 650
    },
    {
      id: 'agent-funnel',
      name: 'Conversion Tracker',
      codename: 'CON-02',
      teamId: 'team-analytics',
      teamName: 'Analytics & Lessons (pulse)',
      role: 'Social Views to Clones Funnel',
      avatar: '📈',
      status: 'idle',
      statusMessage: 'Past Reel Conversion Rate: 4.8%',
      currentTask: 'Standing by for new post metric ingest',
      progress: 0,
      subAgents: [],
      toolsUsed: ['utm_correlator'],
      mcpServers: ['langfuse'],
      tokensUsed: 6900,
      costEstimate: '$0.010',
      recentLogs: [{ timestamp: '11:32:00', level: 'info', text: 'Reel generated 6,090 likes and 672 comments' }],
      roomId: 'room-server',
      roomName: 'Neural Server Room',
      x: 400,
      y: 660
    },
    {
      id: 'agent-latency',
      name: 'Latency Sentinel',
      codename: 'LAT-03',
      teamId: 'team-analytics',
      teamName: 'Analytics & Lessons (pulse)',
      role: 'TTFT Stream Profiler',
      avatar: '⏱️',
      status: 'idle',
      statusMessage: 'Mean TTFT: 142ms',
      currentTask: 'Inference pipeline healthy',
      progress: 100,
      subAgents: [],
      toolsUsed: ['ttft_probe'],
      mcpServers: ['prometheus'],
      tokensUsed: 5200,
      costEstimate: '$0.007',
      recentLogs: [{ timestamp: '11:50:00', level: 'info', text: 'WebSocket latency: 8ms' }],
      roomId: 'room-server',
      roomName: 'Neural Server Room',
      x: 370,
      y: 710
    },
    {
      id: 'agent-sentiment',
      name: 'Sentiment Pulse Miner',
      codename: 'SNT-04',
      teamId: 'team-analytics',
      teamName: 'Analytics & Lessons (pulse)',
      role: 'Community Sentiment Analyzer',
      avatar: '❤️',
      status: 'idle',
      statusMessage: 'Community sentiment: 94% positive',
      currentTask: 'Classified 672 comments',
      progress: 0,
      subAgents: [],
      toolsUsed: ['sentiment_classifier'],
      mcpServers: ['langfuse'],
      tokensUsed: 7800,
      costEstimate: '$0.011',
      recentLogs: [{ timestamp: '11:38:00', level: 'info', text: '412 requested tutorial link' }],
      roomId: 'room-server',
      roomName: 'Neural Server Room',
      x: 420,
      y: 720
    },

    // Operations
    {
      id: 'agent-chief-pm',
      name: 'Chief Agent Officer (PM)',
      codename: 'CAO-01',
      teamId: 'team-operations',
      teamName: 'Operations & Brain Sync',
      role: 'Master Project Manager',
      avatar: '👑',
      status: 'working',
      statusMessage: 'Coordinating pipeline: Research -> Script -> Video -> Social',
      currentTask: 'Supervising 8 teams and Shared Brain replication',
      progress: 75,
      subAgents: [],
      toolsUsed: ['dag_orchestrator'],
      mcpServers: ['dag-engine', 'shared-brain-mcp'],
      tokensUsed: 36400,
      costEstimate: '$0.054',
      recentLogs: [{ timestamp: '12:00:25', level: 'action', text: 'Verified DAG flow dependencies' }],
      roomId: 'room-boardroom',
      roomName: 'Sovereign Boardroom',
      x: 180,
      y: 680
    },
    {
      id: 'agent-standup',
      name: 'Daily Standup Bot',
      codename: 'STN-02',
      teamId: 'team-operations',
      teamName: 'Operations & Brain Sync',
      role: 'Autonomous Status Aggregator',
      avatar: '📋',
      status: 'idle',
      statusMessage: 'Standup concluded: 0 blockers',
      currentTask: 'Summary posted to Shared Brain',
      progress: 100,
      subAgents: [],
      toolsUsed: ['standup_collector'],
      mcpServers: ['event-bus'],
      tokensUsed: 9400,
      costEstimate: '$0.014',
      recentLogs: [{ timestamp: '09:00:00', level: 'success', text: 'All 31 agents on duty' }],
      roomId: 'room-boardroom',
      roomName: 'Sovereign Boardroom',
      x: 230,
      y: 690
    },
    {
      id: 'agent-nexus',
      name: 'Shared Brain Nexus',
      codename: 'SYN-03',
      teamId: 'team-operations',
      teamName: 'Operations & Brain Sync',
      role: 'Vector Cache Replicator Daemon',
      avatar: '🧠',
      status: 'working',
      statusMessage: 'Broadcasting research insights to Creative team',
      currentTask: 'Replicating 1,024 vector dimensions at 120 emb/sec',
      progress: 92,
      subAgents: [],
      toolsUsed: ['vector_broadcaster'],
      mcpServers: ['shared-brain-mcp'],
      tokensUsed: 22800,
      costEstimate: '$0.034',
      recentLogs: [{ timestamp: '12:00:45', level: 'info', text: 'Synced 1,024 embeddings' }],
      roomId: 'room-boardroom',
      roomName: 'Sovereign Boardroom',
      x: 200,
      y: 740
    }
  ]);

  // 10 Distinct Rooms with 2D bounds for the Walkable Canvas (Coordinates in 0-1000 grid)
  readonly rooms = signal<OfficeRoom[]>([
    {
      id: 'room-executive',
      name: 'Executive C-Suite',
      code: 'EXC-01',
      icon: '👑',
      themeColor: '#eab308',
      description: 'Master strategy corner, holographic financial status, operator desk and policy governance.',
      capacity: 4,
      occupantIds: ['agent-gatekeeper', 'agent-risk-auditor', 'agent-copyright'],
      bounds: { x: 50, y: 50, w: 220, h: 260 },
      features: ['Holographic Financial Ledger', 'Operator Master Terminal', 'Physical Emergency Stop Beacon']
    },
    {
      id: 'room-research',
      name: 'Research & GitHub Lab',
      code: 'RES-02',
      icon: '🔬',
      themeColor: '#38bdf8',
      description: 'Morning GitHub scrapers, arXiv digest bots, and competitor intelligence feeds.',
      capacity: 5,
      occupantIds: ['agent-hunter', 'agent-radar', 'agent-arxiv', 'agent-intel'],
      bounds: { x: 280, y: 50, w: 200, h: 260 },
      features: ['GitHub Trending Live Stream', 'ArXiv PDF Ingestion Racks', 'Deep-Search Web Scrapers']
    },
    {
      id: 'room-dev',
      name: 'Autonomous Engineering Bay',
      code: 'DEV-03',
      icon: '💻',
      themeColor: '#10b981',
      description: 'Claude Code terminal pods, Antigravity swarm engines, PR review bots and local git worktrees.',
      capacity: 6,
      occupantIds: ['agent-claude-core', 'agent-antigravity', 'agent-pr-sentinel', 'agent-autofix'],
      bounds: { x: 490, y: 50, w: 240, h: 260 },
      features: ['Dual-Monitor Claude Terminal Pods', 'Self-Healing Test Racks', 'Isolated Git Worktrees']
    },
    {
      id: 'room-creative',
      name: 'Creative Video Studio',
      code: 'CRT-04',
      icon: '🎬',
      themeColor: '#ec4899',
      description: 'Parallel video cutting rigs, kinetic sub-agent captions, audio mastering and thumbnail AI.',
      capacity: 6,
      occupantIds: ['agent-autocutter', 'agent-subcaptions', 'agent-audiomixer', 'agent-motionfx', 'agent-thumbnail', 'agent-hooksmith'],
      bounds: { x: 50, y: 320, w: 250, h: 260 },
      features: ['Multi-GPU Video Rendering Pod', 'Whisper Word-Level Transcriber', '4K Preview Canvas']
    },
    {
      id: 'room-social',
      name: 'Social Media Desk',
      code: 'SOC-05',
      icon: '📢',
      themeColor: '#f97316',
      description: 'Multi-screen social scheduler, live analytics feed, viral thread compiler and community manager.',
      capacity: 5,
      occupantIds: ['agent-x-commander', 'agent-reels-dispatch', 'agent-youtube-ops', 'agent-linkedin'],
      bounds: { x: 580, y: 320, w: 220, h: 260 },
      features: ['Live View & Likes Heatmap', 'Post Scheduling Clock', 'Human Approval Red-Light Safe-Box']
    },
    {
      id: 'room-boardroom',
      name: 'Sovereign Boardroom',
      code: 'WAR-06',
      icon: '🏛️',
      themeColor: '#8b5cf6',
      description: 'Roundtable deliberation table with digital projector for multi-agent voting and daily standups.',
      capacity: 8,
      occupantIds: ['agent-chief-pm', 'agent-standup', 'agent-nexus'],
      bounds: { x: 50, y: 590, w: 240, h: 280 },
      features: ['Circular Council Deliberation Table', 'Holographic Voting Screen', 'Shared Brain Sync Transmitter']
    },
    {
      id: 'room-server',
      name: 'Neural Server Room',
      code: 'SRV-07',
      icon: '🧠',
      themeColor: '#06b6d4',
      description: 'Blinking server racks, liquid cooling pipes, GPU compute nodes and vector database clusters.',
      capacity: 4,
      occupantIds: ['agent-cost-guard', 'agent-funnel', 'agent-latency', 'agent-sentiment'],
      bounds: { x: 300, y: 590, w: 200, h: 280 },
      features: ['Liquid-Cooled GPU Cluster', 'Shared Brain Vector Rack', 'Real-time TTFT Latency Analyzer']
    },
    {
      id: 'room-gameroom',
      name: 'The Game Room',
      code: 'GAM-08',
      icon: '🕹️',
      themeColor: '#a855f7',
      description: 'Arcade machines, ping pong table, VR pods and beanbags where agents recharge their energy.',
      capacity: 6,
      occupantIds: [],
      bounds: { x: 510, y: 590, w: 200, h: 280 },
      features: ['Retro Pixel Arcade Machines', 'Active Ping-Pong Table', 'Zero-G Synthetic Relaxation Beanbags']
    },
    {
      id: 'room-coffee',
      name: 'Coffee Bar & Lounge',
      code: 'CAF-09',
      icon: '☕',
      themeColor: '#d97706',
      description: 'Espresso machine, snack counter, watercooler chatter corner for spontaneous brainstorming.',
      capacity: 5,
      occupantIds: [],
      bounds: { x: 740, y: 50, w: 210, h: 400 },
      features: ['High-Pressure Espresso Machine', 'Cold Brew Nitro Tap', 'Watercooler Cross-Team Chat Bench']
    },
    {
      id: 'room-restroom',
      name: 'Restroom (Out of Order Stall)',
      code: 'REST-10',
      icon: '🚫',
      themeColor: '#ef4444',
      description: 'The infamous restroom from the reel — equipped with yellow caution tape, flickering bulb & humorous repair notice!',
      capacity: 2,
      occupantIds: [],
      isOutOfOrder: true,
      specialNote: '⚠️ OUT OF ORDER — DO NOT ENTER! Plumbing technician dispatched 3 days ago. Agents please hold your synthetic state!',
      bounds: { x: 720, y: 590, w: 230, h: 280 },
      features: ['Flickering Fluorescent Bulb', 'Diagonal Warning Caution Tape', 'Leaking Water Puddle & Bucket']
    }
  ]);

  // 40 Entities / People / Avatars
  readonly entities = signal<OfficeEntity[]>([
    // Executive Suite (3)
    { id: 'ent-1', name: 'Chief PM Operator', role: 'Executive Lead', type: 'human', roomId: 'room-executive', x: 120, y: 150, avatar: '👨‍💼', color: '#eab308', activity: 'typing', speechBubble: 'Approving roadmap sprint priorities', facing: 'right', deskPosition: { x: 120, y: 150 } },
    { id: 'ent-2', name: 'Sentinel AI', role: 'Gatekeeper Bot', type: 'agent', roomId: 'room-executive', x: 190, y: 160, avatar: '🛑', color: '#ef4444', activity: 'meeting', speechBubble: 'Holding Reel for human sign-off', facing: 'left', deskPosition: { x: 190, y: 160 } },
    { id: 'ent-3', name: 'Security Auditor', role: 'PII Guard', type: 'agent', roomId: 'room-executive', x: 150, y: 240, avatar: '🛡️', color: '#38bdf8', activity: 'thinking', facing: 'right' },

    // Research Lab (4)
    { id: 'ent-4', name: 'Hunter Agent', role: 'GitHub Scraper', type: 'agent', roomId: 'room-research', x: 330, y: 140, avatar: '🕵️‍♂️', color: '#38bdf8', activity: 'typing', speechBubble: 'Scanned 140 repos on GitHub', facing: 'right', deskPosition: { x: 330, y: 140 } },
    { id: 'ent-5', name: 'Radar Bot', role: 'Tech Tracker', type: 'agent', roomId: 'room-research', x: 420, y: 140, avatar: '📡', color: '#06b6d4', activity: 'thinking', facing: 'left', deskPosition: { x: 420, y: 140 } },
    { id: 'ent-6', name: 'ArXiv Scholar', role: 'Paper Reader', type: 'agent', roomId: 'room-research', x: 340, y: 220, avatar: '📄', color: '#a855f7', activity: 'typing', speechBubble: 'Test-time compute scaling is key', facing: 'right' },
    { id: 'ent-7', name: 'Market Intel', role: 'Pricing Analyst', type: 'agent', roomId: 'room-research', x: 430, y: 220, avatar: '📊', color: '#10b981', activity: 'walking', facing: 'left' },

    // Dev Bay (5)
    { id: 'ent-8', name: 'Claude Code', role: 'Lead CLI Coder', type: 'agent', roomId: 'room-dev', x: 530, y: 140, avatar: '🤖', color: '#10b981', activity: 'typing', speechBubble: '0 compilation errors on build!', facing: 'right', deskPosition: { x: 530, y: 140 } },
    { id: 'ent-9', name: 'Antigravity Core', role: 'Swarm Master', type: 'agent', roomId: 'room-dev', x: 630, y: 140, avatar: '🌌', color: '#8b5cf6', activity: 'typing', speechBubble: 'Syncing subagents in parallel', facing: 'left', deskPosition: { x: 630, y: 140 } },
    { id: 'ent-10', name: 'Dev Junior 1', role: 'Frontend Engineer', type: 'human', roomId: 'room-dev', x: 540, y: 220, avatar: '👩‍💻', color: '#ec4899', activity: 'typing', facing: 'right' },
    { id: 'ent-11', name: 'PR Sentinel', role: 'Review Bot', type: 'agent', roomId: 'room-dev', x: 620, y: 220, avatar: '🔍', color: '#38bdf8', activity: 'walking', facing: 'right' },
    { id: 'ent-12', name: 'Auto-Fix Daemon', role: 'Self-Healer', type: 'bot', roomId: 'room-dev', x: 680, y: 220, avatar: '🔧', color: '#f59e0b', activity: 'repairing', speechBubble: 'Patched 2 syntax warnings', facing: 'left' },

    // Creative Studio (6)
    { id: 'ent-13', name: 'AutoCutter Pro', role: 'Video Editor AI', type: 'agent', roomId: 'room-creative', x: 100, y: 400, avatar: '✂️', color: '#ec4899', activity: 'typing', speechBubble: 'Cut 38s of silence footage', facing: 'right', deskPosition: { x: 100, y: 400 } },
    { id: 'ent-14', name: 'Sub-Agent Captions', role: 'Subtitle Worker', type: 'agent', roomId: 'room-creative', x: 170, y: 400, avatar: '💬', color: '#38bdf8', activity: 'typing', speechBubble: 'Burning animated subtitles...', facing: 'left', deskPosition: { x: 170, y: 400 } },
    { id: 'ent-15', name: 'Audio Master', role: 'Sound Engineer', type: 'agent', roomId: 'room-creative', x: 240, y: 400, avatar: '🎚️', color: '#a855f7', activity: 'thinking', facing: 'right' },
    { id: 'ent-16', name: 'Motion Artist', role: 'Visual Effects', type: 'human', roomId: 'room-creative', x: 120, y: 500, avatar: '🎨', color: '#f59e0b', activity: 'typing', facing: 'left' },
    { id: 'ent-17', name: 'Thumbnail Bot', role: 'Cover Designer', type: 'agent', roomId: 'room-creative', x: 200, y: 500, avatar: '🖼️', color: '#ef4444', activity: 'walking', facing: 'right' },
    { id: 'ent-18', name: 'Viral Hooksmith', role: 'Scriptwriter', type: 'agent', roomId: 'room-creative', x: 250, y: 480, avatar: '🪝', color: '#ec4899', activity: 'typing', speechBubble: '5 viral opening hooks generated', facing: 'left' },

    // Social Desk (4)
    { id: 'ent-19', name: 'X Commander', role: 'Twitter Publisher', type: 'agent', roomId: 'room-social', x: 620, y: 410, avatar: '🐦', color: '#38bdf8', activity: 'typing', speechBubble: 'Thread drafted: 7 tweets', facing: 'right', deskPosition: { x: 620, y: 410 } },
    { id: 'ent-20', name: 'Reels Dispatcher', role: 'Vertical Video Bot', type: 'agent', roomId: 'room-social', x: 720, y: 410, avatar: '📸', color: '#f59e0b', activity: 'meeting', speechBubble: 'Awaiting operator approval!', facing: 'left', deskPosition: { x: 720, y: 410 } },
    { id: 'ent-21', name: 'YouTube Strategist', role: 'SEO Manager', type: 'agent', roomId: 'room-social', x: 640, y: 500, avatar: '▶️', color: '#ef4444', activity: 'thinking', facing: 'left' },
    { id: 'ent-22', name: 'Community Intern', role: 'Replies & Engagement', type: 'human', roomId: 'room-social', x: 720, y: 500, avatar: '🧑‍💼', color: '#10b981', activity: 'typing', facing: 'right' },

    // Boardroom (5)
    { id: 'ent-23', name: 'Council Lead', role: 'Consensus Arbiter', type: 'agent', roomId: 'room-boardroom', x: 120, y: 680, avatar: '👑', color: '#8b5cf6', activity: 'meeting', speechBubble: 'Standup: 8 teams synchronized', facing: 'right' },
    { id: 'ent-24', name: 'Standup Bot', role: 'Minutes Bot', type: 'agent', roomId: 'room-boardroom', x: 200, y: 680, avatar: '📋', color: '#38bdf8', activity: 'typing', facing: 'left' },
    { id: 'ent-25', name: 'Shared Brain Sync', role: 'Nexus Replicator', type: 'agent', roomId: 'room-boardroom', x: 150, y: 760, avatar: '🧠', color: '#a855f7', activity: 'thinking', speechBubble: 'Broadcasting 1024 embeddings', facing: 'right' },
    { id: 'ent-26', name: 'VP Strategy', role: 'Executive Liaison', type: 'human', roomId: 'room-boardroom', x: 80, y: 740, avatar: '👨‍💼', color: '#eab308', activity: 'meeting', facing: 'right' },
    { id: 'ent-27', name: 'Legal Counsel', role: 'Compliance', type: 'agent', roomId: 'room-boardroom', x: 230, y: 740, avatar: '⚖️', color: '#10b981', activity: 'meeting', facing: 'left' },

    // Server Room (4)
    { id: 'ent-28', name: 'Cost Guard', role: 'Token Auditor', type: 'agent', roomId: 'room-server', x: 340, y: 680, avatar: '💰', color: '#06b6d4', activity: 'typing', speechBubble: '$0.48 spent / $10 cap', facing: 'right', deskPosition: { x: 340, y: 680 } },
    { id: 'ent-29', name: 'Latency Probe', role: 'TTFT Watchdog', type: 'bot', roomId: 'room-server', x: 440, y: 680, avatar: '⏱️', color: '#10b981', activity: 'thinking', facing: 'left' },
    { id: 'ent-30', name: 'Sysadmin Bot', role: 'Cluster Engineer', type: 'agent', roomId: 'room-server', x: 350, y: 760, avatar: '⚙️', color: '#f59e0b', activity: 'repairing', speechBubble: 'Liquid coolant at 38°C', facing: 'right' },
    { id: 'ent-31', name: 'Vector Sharder', role: 'Memory DB Tech', type: 'agent', roomId: 'room-server', x: 430, y: 760, avatar: '💾', color: '#8b5cf6', activity: 'walking', facing: 'left' },

    // Game Room (4)
    { id: 'ent-32', name: 'Arcade Player 1', role: 'Video Synthesizer Subagent', type: 'agent', roomId: 'room-gameroom', x: 550, y: 670, avatar: '👾', color: '#a855f7', activity: 'gaming', speechBubble: 'High score on Space Invaders!', facing: 'right' },
    { id: 'ent-33', name: 'Arcade Player 2', role: 'Headline Tester Bot', type: 'agent', roomId: 'room-gameroom', x: 600, y: 670, avatar: '🕹️', color: '#ec4899', activity: 'gaming', speechBubble: 'Combo x32!', facing: 'left' },
    { id: 'ent-34', name: 'Ping-Pong Pro', role: 'Research Intern', type: 'human', roomId: 'room-gameroom', x: 560, y: 760, avatar: '🏓', color: '#38bdf8', activity: 'gaming', speechBubble: 'Smash hit!', facing: 'right' },
    { id: 'ent-35', name: 'Beanbag Sleeper', role: 'Overworked Code Agent', type: 'agent', roomId: 'room-gameroom', x: 650, y: 750, avatar: '😴', color: '#64748b', activity: 'sleeping', speechBubble: 'zzz... dreaming in Rust...', facing: 'left' },

    // Coffee Lounge (4)
    { id: 'ent-36', name: 'Barista Bot', role: 'Espresso Maker', type: 'bot', roomId: 'room-coffee', x: 790, y: 140, avatar: '☕', color: '#d97706', activity: 'typing', speechBubble: 'Double espresso poured!', facing: 'right' },
    { id: 'ent-37', name: 'Lead Storyteller', role: 'Scriptwriter', type: 'agent', roomId: 'room-coffee', x: 860, y: 200, avatar: '📜', color: '#a855f7', activity: 'coffee', speechBubble: 'That hook in reel #2 is fire', facing: 'left' },
    { id: 'ent-38', name: 'Senior Dev', role: 'Rust / C++ Specialist', type: 'human', roomId: 'room-coffee', x: 800, y: 270, avatar: '🧑‍💻', color: '#10b981', activity: 'coffee', speechBubble: 'Zero garbage collection needed', facing: 'right' },
    { id: 'ent-39', name: 'Visitor AI', role: 'Market Auditor', type: 'visitor', roomId: 'room-coffee', x: 870, y: 320, avatar: '🤖', color: '#38bdf8', activity: 'walking', facing: 'left' },

    // Out of Order Restroom (1 bewildered plumber)
    { id: 'ent-40', name: 'Plumber Drone', role: 'Maintenance Drone', type: 'bot', roomId: 'room-restroom', x: 820, y: 720, avatar: '🪠', color: '#ef4444', activity: 'repairing', speechBubble: 'Still waiting for replacement parts...', facing: 'right' }
  ]);

  // Human-in-the-Loop Approvals
  readonly pendingApprovals = signal<ApprovalRequest[]>([
    {
      id: 'APP-9021',
      agentId: 'agent-reels-dispatch',
      agentName: 'Instagram Reels Dispatcher (relay)',
      teamName: 'Social & Distribution',
      action: 'PUBLISH_VERTICAL_REEL',
      target: 'Instagram Reels (@bexruz.khamidullaev)',
      summary: 'Publishing edited 58s video: "I built an office for my AI agents 🏢 (8 teams, 31 agents)"',
      riskLevel: 'high',
      payloadDiff: `+ Video: out/master_4k_58s.mp4 (48.2 MB)
+ Audio: CC-BY Royalty Free Beat + Voiceover (-14 LUFS)
+ Captions: Kinetic animated text (MrBeast style)
+ Caption text: "I built an office for my AI agents 🏢 8 teams. 31 agents. One shared brain..."
+ Target: Instagram Reels & YouTube Shorts
! OPERATOR CONFIRMATION REQUIRED BEFORE BROADCAST`,
      createdAt: '12:00:40',
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

    if (team !== 'all') list = list.filter(a => a.teamId === team);
    if (room !== 'all') list = list.filter(a => a.roomId === room);
    if (status !== 'all') list = list.filter(a => a.status === status);
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
    this.startWanderSimulation();
  }

  setLayoutMode(mode: SampleLayoutMode): void {
    this.layoutMode.set(mode);
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
    this.pipelineItems.update(items =>
      items.map(item => item.stage === 'awaiting_approval' ? { ...item, stage: 'done', progress: 100 } : item)
    );
    this.addTicker(`Human Approval Granted for: ${id}! Assets broadcasted to out/`, 'APPROVED');

    const req = this.pendingApprovals().find(r => r.id === id);
    if (req) {
      this.agents.update(agents =>
        agents.map(a => a.id === req.agentId ? {
          ...a,
          status: 'working',
          statusMessage: 'Approval confirmed! Publishing video to reels...',
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
    this.addTicker(`Action ${id} REJECTED by operator. Publication aborted.`, 'BLOCKED');

    const req = this.pendingApprovals().find(r => r.id === id);
    if (req) {
      this.agents.update(agents =>
        agents.map(a => a.id === req.agentId ? {
          ...a,
          status: 'idle',
          statusMessage: 'Publication cancelled by operator.',
          progress: 0,
          recentLogs: [
            ...a.recentLogs,
            { timestamp: new Date().toTimeString().split(' ')[0], level: 'warn', text: `Operator rejected action: ${req.action}` }
          ]
        } : a)
      );
    }

    if (this.activeApprovalModal()?.id === id) {
      this.activeApprovalModal.set(null);
    }
  }

  dispatchVoiceMission(command: string): void {
    this.showMissionModal.set(false);
    const time = new Date().toTimeString().split(' ')[0];
    this.addTicker(`Voice Command Received: "${command}"`, 'VOICE_COMMAND');

    // Trigger pipeline items
    this.pipelineItems.update(items => [
      {
        id: 'pipe-' + Math.random().toString(36).substring(7),
        title: command.slice(0, 35) + '...',
        category: 'video',
        stage: 'in_progress',
        assignee: 'Creative Team (AutoCutter + Captions)',
        progress: 25,
        subtasks: ['Whisper Transcribe (running)', 'Silence Cut (running)', 'Thumbnail Render (queued)'],
        summary: command,
        createdAt: time
      },
      ...items
    ]);

    // Activate agents
    this.agents.update(agents =>
      agents.map(a => {
        if (a.teamId === 'team-creative' || a.teamId === 'team-scripts') {
          return {
            ...a,
            status: a.id === 'agent-autocutter' ? 'parallel' : 'working',
            statusMessage: `Executing voice command: ${command.slice(0, 45)}`,
            progress: 30,
            recentLogs: [
              { timestamp: time, level: 'action', text: `Voice instruction: ${command}` },
              ...a.recentLogs
            ]
          };
        }
        return a;
      })
    );

    if (this.speechVoice) {
      this.speechVoice.speak(`Right on it Mamu! Creative team is cutting the video and rendering captions in parallel.`);
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
            statusMessage: 'Executing dedicated task run',
            progress: 40,
            recentLogs: [
              { timestamp: time, level: 'action', text: 'Task triggered by operator' },
              ...a.recentLogs
            ]
          };
        }
        return a;
      })
    );
    this.addTicker(`Task triggered on agent ${agentId}`, 'MANUAL_RUN');
  }

  addTicker(text: string, tag: string): void {
    const time = new Date().toTimeString().split(' ')[0];
    this.tickerFeed.update(feed => [
      { id: Math.random().toString(36).substring(7), time, text, tag },
      ...feed.slice(0, 9)
    ]);
  }

  // Update Player movement in Workspace 2
  updatePlayerMovement(dx: number, dy: number, dir: 'up' | 'down' | 'left' | 'right'): void {
    const current = this.playerPos();
    const newX = Math.max(30, Math.min(960, current.x + dx));
    const newY = Math.max(30, Math.min(940, current.y + dy));

    // Determine current room
    let roomName = 'Central Corridor';
    for (const r of this.rooms()) {
      if (
        newX >= r.bounds.x &&
        newX <= r.bounds.x + r.bounds.w &&
        newY >= r.bounds.y &&
        newY <= r.bounds.y + r.bounds.h
      ) {
        roomName = r.name;
        break;
      }
    }

    this.playerPos.set({
      x: newX,
      y: newY,
      dir,
      isMoving: dx !== 0 || dy !== 0,
      currentRoom: roomName
    });
  }

  // Periodic wander simulation for 40 entities
  private startWanderSimulation(): void {
    if (typeof window === 'undefined') return;

    setInterval(() => {
      if (this.isSimulationPaused()) return;

      this.entities.update(entities => {
        return entities.map(entity => {
          if (Math.random() < 0.3) {
            // Random tiny wander inside room bounds
            const room = this.rooms().find(r => r.id === entity.roomId);
            if (room) {
              const dx = (Math.random() - 0.5) * 16;
              const dy = (Math.random() - 0.5) * 16;
              const newX = Math.max(room.bounds.x + 20, Math.min(room.bounds.x + room.bounds.w - 20, entity.x + dx));
              const newY = Math.max(room.bounds.y + 20, Math.min(room.bounds.y + room.bounds.h - 20, entity.y + dy));
              const facing: 'left' | 'right' | 'up' | 'down' = dx > 0 ? 'right' : 'left';

              return {
                ...entity,
                x: Math.round(newX),
                y: Math.round(newY),
                facing
              };
            }
          }
          return entity;
        });
      });
    }, 2500);
  }
}
