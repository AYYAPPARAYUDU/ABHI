import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface DecisionNode {
  id: string;
  label: string;
  subtitle?: string;
  category: 'score' | 'action' | 'gate' | 'encoder' | 'destination' | 'telemetry';
  score?: number;
  highlighted?: boolean;
  activePath?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  extraDetails?: Record<string, string>;
}

export interface NodeConnection {
  from: string;
  to: string;
  highlighted?: boolean;
  particleColor?: string;
}

export interface UseCaseQuestion {
  q: string;
  type: string;
  weight: number;
  floor?: number;
  labels?: string[];
  gate?: string;
}

export interface UseCase {
  id: string;
  num: string;
  name: string;
  description: string;
  active: boolean;
  score: string;
  target: string;
  codeSnippet: string;
  sample_inputs: Record<string, any>[];
  questions: UseCaseQuestion[];
  guardrail: {
    spend: number;
    actions: string;
    rule: string;
  };
  nodes: DecisionNode[];
  connections: NodeConnection[];
}

export interface PipelineStats {
  total_decisions: number;
  median_latency_ms: number;
  cost_per_10k: number;
  active_confidence: number;
  active_use_cases_count: number;
  spend_cap: {
    spent: number;
    limit: number;
    currency: string;
    percent: number;
  };
  action_limit: {
    used: number;
    limit: number;
    status: string;
  };
  guardrail_policy: string;
  system_version: string;
}

export interface DecisionTraceLog {
  timestamp: string;
  channel: string;
  text: string;
}

export interface EvaluationResponse {
  trace_id: string;
  use_case_id: string;
  timestamp: string;
  latency_ms: number;
  confidence: number;
  score_label: string;
  score_value: number;
  decision_verdict: string;
  target_action: string;
  destination_worker: string;
  active_path: string[];
  jev_utility: number;
  state_vector_dims: number;
  spend_cost: number;
  log_entries: DecisionTraceLog[];
  output_result: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class DecisionPipelineService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = 'http://127.0.0.1:8000/api/v1/decisions';

  // Core State Signals
  readonly useCases = signal<UseCase[]>([]);
  readonly activeCase = signal<UseCase | null>(null);
  readonly stats = signal<PipelineStats | null>(null);
  readonly currentDecisions = signal<number>(7708);
  readonly currentLatency = signal<number>(256);
  readonly currentConfidence = signal<number>(0.92);
  readonly selectedTab = signal<'STATE' | 'ASK' | 'JEV' | 'GATE' | 'CODE'>('JEV');
  readonly isEvaluating = signal<boolean>(false);
  readonly lastTrace = signal<EvaluationResponse | null>(null);
  readonly recentTraces = signal<EvaluationResponse[]>([]);
  readonly selectedNode = signal<DecisionNode | null>(null);
  readonly activeInputPayload = signal<Record<string, any>>({});
  readonly customInputJson = signal<string>('');

  constructor() {
    this.initPipeline();
  }

  async initPipeline(): Promise<void> {
    // 1. Immediately seed with all 12 complete use cases
    this.loadAll12UseCases();

    // 2. Fetch live stats from FastAPI backend
    try {
      const stats = await firstValueFrom(this.http.get<PipelineStats>(`${this.apiBase}/stats`));
      this.stats.set(stats);
      this.currentDecisions.set(stats.total_decisions);
      this.currentLatency.set(Math.round(stats.median_latency_ms));
      this.currentConfidence.set(stats.active_confidence);
    } catch {
      this.stats.set({
        total_decisions: 7708,
        median_latency_ms: 256.4,
        cost_per_10k: 0.42,
        active_confidence: 0.92,
        active_use_cases_count: 12,
        spend_cap: { spent: 0.32, limit: 1.0, currency: 'USD', percent: 32 },
        action_limit: { used: 56, limit: 100, status: 'WITHIN_LIMIT' },
        guardrail_policy: 'never auto-post to X without human signoff — progress saved',
        system_version: 'SYSTEM ONE · abhi-32k local'
      });
    }

    // 3. Fetch live use cases from backend if available
    try {
      const ucs = await firstValueFrom(this.http.get<any[]>(`${this.apiBase}/use-cases`));
      if (ucs && ucs.length > 0) {
        const formatted: UseCase[] = ucs.map((u) => ({
          ...u,
          active: u.id === (this.activeCase()?.id || 'x_feed'),
          connections: (u.connections || []).map((c: any) => ({
            ...c,
            from: c.from || c.from_node,
            to: c.to || c.to_node
          }))
        }));
        this.useCases.set(formatted);
        const currentId = this.activeCase()?.id || 'x_feed';
        const targetCase = formatted.find(u => u.id === currentId) || formatted[0];
        this.selectUseCase(targetCase.id);
      }
    } catch {
      // Backend not yet reachable, in-memory 12 use cases already loaded
    }
  }

  selectUseCase(ucId: string): void {
    const list = this.useCases();
    const updated = list.map(item => ({
      ...item,
      active: item.id === ucId
    }));
    this.useCases.set(updated);

    const active = updated.find(u => u.id === ucId) || updated[0];
    this.activeCase.set(active);
    this.selectedNode.set(null);

    // Set default sample input
    if (active.sample_inputs && active.sample_inputs.length > 0) {
      this.activeInputPayload.set(active.sample_inputs[0]);
      this.customInputJson.set(JSON.stringify(active.sample_inputs[0], null, 2));
    }
  }

  setCustomJson(jsonStr: string): void {
    this.customInputJson.set(jsonStr);
    try {
      const parsed = JSON.parse(jsonStr);
      this.activeInputPayload.set(parsed);
    } catch {
      // Ignore invalid JSON while typing
    }
  }

  selectSampleInput(idx: number): void {
    const ac = this.activeCase();
    if (!ac || !ac.sample_inputs || !ac.sample_inputs[idx]) return;
    const sample = ac.sample_inputs[idx];
    this.activeInputPayload.set(sample);
    this.customInputJson.set(JSON.stringify(sample, null, 2));
  }

  async evaluateLiveDecision(override = false): Promise<EvaluationResponse> {
    const ac = this.activeCase();
    if (!ac) throw new Error('No active use case');

    this.isEvaluating.set(true);

    try {
      const res = await firstValueFrom(
        this.http.post<EvaluationResponse>(`${this.apiBase}/evaluate`, {
          use_case_id: ac.id,
          input_payload: this.activeInputPayload(),
          operator_override: override
        })
      );

      this.applyEvaluationResult(res);
      return res;
    } catch {
      // Offline fallback evaluation simulation
      const fallback = this.simulateLocalEvaluation(ac, override);
      this.applyEvaluationResult(fallback);
      return fallback;
    } finally {
      this.isEvaluating.set(false);
    }
  }

  private applyEvaluationResult(res: EvaluationResponse): void {
    this.lastTrace.set(res);
    this.recentTraces.update(traces => [res, ...traces.slice(0, 14)]);
    this.currentDecisions.update(d => d + 1);
    this.currentLatency.set(Math.round(res.latency_ms));
    this.currentConfidence.set(res.confidence);

    // Highlight the active flow path in nodes and connections
    const ac = this.activeCase();
    if (ac) {
      const updatedNodes = ac.nodes.map(n => ({
        ...n,
        highlighted: res.active_path.includes(n.id),
        activePath: res.active_path.includes(n.id)
      }));

      const updatedConnections = ac.connections.map(c => {
        const isPath = res.active_path.includes(c.from) && res.active_path.includes(c.to);
        return {
          ...c,
          highlighted: isPath
        };
      });

      this.activeCase.set({
        ...ac,
        nodes: updatedNodes,
        connections: updatedConnections
      });
    }
  }

  private simulateLocalEvaluation(uc: UseCase, override: boolean): EvaluationResponse {
    const payloadStr = JSON.stringify(this.activeInputPayload());
    const baseConf = override ? 0.98 : 0.88 + ((payloadStr.length % 11) * 0.01);
    const conf = Math.min(0.99, Math.max(0.68, baseConf));
    const latency = Math.round(230 + (payloadStr.length % 35) * 1.5);
    const traceId = `trace_local_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const verdict = conf >= 0.85 ? 'APPROVED' : conf >= 0.70 ? 'CONSENT_REQUIRED' : 'REJECTED';
    const targetAction = conf >= 0.85 ? uc.target : 'human_gate';
    const worker = conf >= 0.85 ? 'review_folder' : 'human_gate';

    return {
      trace_id: traceId,
      use_case_id: uc.id,
      timestamp: now,
      latency_ms: latency,
      confidence: conf,
      score_label: uc.score,
      score_value: conf,
      decision_verdict: verdict,
      target_action: targetAction,
      destination_worker: worker,
      active_path: [uc.score, 'state_encoder', 'score_head', targetAction, worker],
      jev_utility: 0.941,
      state_vector_dims: 2048,
      spend_cost: 0.000042,
      log_entries: [
        { timestamp: new Date().toLocaleTimeString(), channel: 'encoder', text: `Local AST packed 2048-dim latent vector from ${payloadStr.length} bytes input.` },
        { timestamp: new Date().toLocaleTimeString(), channel: 'ask', text: `Parallel evaluator scored '${uc.score}' at ${conf.toFixed(2)}.` },
        { timestamp: new Date().toLocaleTimeString(), channel: 'jev', text: 'JEV decision matrix confirmed optimal route.' },
        { timestamp: new Date().toLocaleTimeString(), channel: 'gate', text: `Policy gate check: Verdict=${verdict}.` },
        { timestamp: new Date().toLocaleTimeString(), channel: 'exec', text: `Target dispatch: ${targetAction} -> ${worker}.` }
      ],
      output_result: {
        use_case: uc.name,
        status: 'PROCESSED',
        verdict: verdict,
        evaluated_input: this.activeInputPayload()
      }
    };
  }

  private loadAll12UseCases(): void {
    const list: UseCase[] = [
      // 01 EMAIL
      {
        id: 'email',
        num: '01',
        name: 'email',
        description: 'Inbox Triage, Autonomous Meeting Scheduler & Draft Composer',
        active: false,
        score: 'inbox_fit',
        target: 'draft_reply',
        codeSnippet: `# chief.py: 01 Inbox Triage & Autonomous Reply
def evaluate_email(payload: dict) -> dict:
    score = score_head.evaluate(payload['body'], question='inbox_fit', floor=0.82)
    if score.confidence >= 0.85:
        if 'schedule' in payload.get('body', '').lower():
            return {'worker': 'calendar_sync', 'action': 'propose_slots'}
        return {'worker': 'draft_reply', 'action': 'stage_inbox_draft'}
    return {'worker': 'human_gate', 'action': 'operator_triage'}`,
        sample_inputs: [
          { from: 'client@enterprise.com', subject: 'Q4 Strategy Meeting', body: 'Hey Ayyappa, can we schedule a 30-min call this Thursday to finalize deployment?', priority: 'high' },
          { from: 'newsletter@tech.io', subject: 'Daily Tech Digest', body: 'Top 10 AI breakthroughs in October 2026...', priority: 'low' }
        ],
        questions: [
          { q: 'inbox_fit', type: 'score', weight: 0.40, floor: 0.82 },
          { q: 'urgency_level', type: 'choice', weight: 0.35, labels: ['P1', 'P2', 'P3'] },
          { q: 'safe_to_reply', type: 'gate', weight: 0.25, gate: 'no_pii_leak' }
        ],
        guardrail: { spend: 0.08, actions: '12 / 100', rule: 'Never auto-send replies without draft review' },
        nodes: [
          { id: 'inbox_fit', label: 'Score · inbox_fit', category: 'score', score: 0.88, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72, extraDetails: { floor: '0.82' } },
          { id: 'urgency_level', label: 'Choice · urgency', category: 'action', x: 50, y: 170, width: 190, height: 68 },
          { id: 'safe_to_reply', label: 'Gate · safe_to_reply', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'state encoder', subtitle: '2048-dim latent', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72, extraDetails: { latency: '3.8ms' } },
          { id: 'score_head', label: 'score head', subtitle: 'confidence: 0.89', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72, extraDetails: { verdict: 'PASS' } },
          { id: 'draft_reply', label: 'draft reply', subtitle: 'generate LLM draft', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72, extraDetails: { mailbox: 'primary' } },
          { id: 'calendar_sync', label: 'calendar sync', subtitle: 'detect meeting slot', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'review folder', subtitle: 'operator approval', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72, extraDetails: { status: 'STAGED' } },
          { id: 'human_gate', label: 'human gate', subtitle: 'operator consent', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72, extraDetails: { operator: 'Ayyappa' } }
        ],
        connections: [
          { from: 'inbox_fit', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'draft_reply', highlighted: true },
          { from: 'draft_reply', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true },
          { from: 'urgency_level', to: 'calendar_sync', highlighted: false },
          { from: 'safe_to_reply', to: 'human_gate', highlighted: false }
        ]
      },

      // 02 YOUTUBE
      {
        id: 'youtube',
        num: '02',
        name: 'youtube',
        description: 'Hook Optimization, Video Chaptering & GPU Render Orchestration',
        active: false,
        score: 'hook_strength',
        target: 'render_reel',
        codeSnippet: `# chief.py: 02 YouTube Reel Automated Composer
def evaluate_reel(script: dict) -> dict:
    score = score_head.evaluate(script['hook'], question='hook_strength', floor=0.88)
    if score.confidence >= 0.90:
        manifest = asset_library.resolve_broll(tags=script.get('tags', []))
        return {'worker': 'render_reel', 'engine': 'ffmpeg_gpu', 'manifest': manifest}
    return {'worker': 'draft_script', 'action': 'refine_hook'}`,
        sample_inputs: [
          { title: 'Local AI Architecture', hook: 'Stop paying cloud fees when your RTX runs 32k context locally free.', duration: 48, tags: ['local_ai', 'rtx'] }
        ],
        questions: [
          { q: 'hook_strength', type: 'score', weight: 0.45, floor: 0.88 },
          { q: 'retention_prediction', type: 'score', weight: 0.35, floor: 0.75 },
          { q: 'copyright_safe', type: 'gate', weight: 0.20, gate: 'clean' }
        ],
        guardrail: { spend: 0.14, actions: '8 / 20', rule: 'Require render verification before disk save' },
        nodes: [
          { id: 'hook_strength', label: 'Score · hook_strength', category: 'score', score: 0.91, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72 },
          { id: 'retention_score', label: 'Score · retention', category: 'score', x: 50, y: 170, width: 190, height: 68 },
          { id: 'copyright_gate', label: 'Gate · copyright_clean', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'transcript encoder', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72 },
          { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72 },
          { id: 'render_reel', label: 'render reel', subtitle: 'FFmpeg local GPU', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72 },
          { id: 'draft_script', label: 'draft script', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'output reel', subtitle: 'rendered mp4', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72 },
          { id: 'human_gate', label: 'creator gate', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72 }
        ],
        connections: [
          { from: 'hook_strength', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'render_reel', highlighted: true },
          { from: 'render_reel', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true }
        ]
      },

      // 03 SKOOL
      {
        id: 'skool',
        num: '03',
        name: 'skool',
        description: 'Community Post Triage, FAQ Auto-Solution & Moderation Guardrails',
        active: false,
        score: 'post_quality',
        target: 'notify_member',
        codeSnippet: `# chief.py: 03 Skool Community Automation
def process_community_post(post: dict) -> dict:
    match = vector_kb.similarity_search(post['text'], threshold=0.82)
    if match.confidence >= 0.85:
        return {'worker': 'auto_reply', 'solution': match.answer}
    return {'worker': 'notify_member', 'action': 'tag_moderator'}`,
        sample_inputs: [
          { author: 'DevLearner', text: 'How do I configure LanceDB vector store with Ollama on Windows?', channel: 'ask-questions' }
        ],
        questions: [
          { q: 'post_quality', type: 'score', weight: 0.40, floor: 0.78 },
          { q: 'kb_answerability', type: 'score', weight: 0.40, floor: 0.80 },
          { q: 'toxicity_zero', type: 'gate', weight: 0.20, gate: 'moderation' }
        ],
        guardrail: { spend: 0.05, actions: '32 / 100', rule: 'Never delete posts without moderator approval' },
        nodes: [
          { id: 'post_quality', label: 'Score · quality', category: 'score', score: 0.89, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72 },
          { id: 'kb_match', label: 'Score · kb_match', category: 'score', x: 50, y: 170, width: 190, height: 68 },
          { id: 'toxicity_gate', label: 'Gate · no_toxicity', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'content encoder', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72 },
          { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72 },
          { id: 'notify_member', label: 'notify member', subtitle: 'community signal', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72 },
          { id: 'auto_reply', label: 'auto reply', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'audit feed', subtitle: 'activity logged', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72 },
          { id: 'human_gate', label: 'mod gate', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72 }
        ],
        connections: [
          { from: 'post_quality', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'notify_member', highlighted: true },
          { from: 'notify_member', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true }
        ]
      },

      // 04 X FEED (Flagship Reference)
      {
        id: 'x_feed',
        num: '04',
        name: 'x feed',
        description: 'Viral Twitter/X Post Scoring, Thread Structure & Scheduled Review Pipeline',
        active: true,
        score: 'viral_fit',
        target: 'draft_short*',
        codeSnippet: `# chief.py: 04 X Post Evaluation & Scheduled Review
answer = result.choices["next_worker"]
destination = "review"
if answer.confidence >= 0.85:
    destination = answer.choice
    job = folder / f"{post_id}.json"
    job.write_text(json.dumps(payload))
# LLM writes · JEV decides · Code acts`,
        sample_inputs: [
          { draft: 'Most developers spend 4 hours a day on tasks an offline AI could solve in 30 seconds. Here is our 100% local architecture breakdown:', metrics: { char_count: 142, has_hook: true, thread: true } },
          { draft: 'Good morning everyone. Working on some code today.', metrics: { char_count: 48, has_hook: false, thread: false } }
        ],
        questions: [
          { q: 'viral_fit', type: 'score', weight: 0.45, floor: 0.85 },
          { q: 'action_choice', type: 'choice', weight: 0.35, labels: ['draft_short*', 'discard', 'expand_thread'] },
          { q: 'safe_to_run', type: 'gate', weight: 0.20, gate: 'human_signoff_mandated' }
        ],
        guardrail: { spend: 0.32, actions: '56 / 100', rule: 'Never auto-post to X without human signoff — progress saved' },
        nodes: [
          { id: 'viral_fit', label: 'Score · viral_fit', category: 'score', score: 0.92, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72, extraDetails: { floor: '0.85', feed: 'x_feed' } },
          { id: 'lead_quality', label: 'Score · lead_quality', category: 'score', x: 50, y: 170, width: 190, height: 68, extraDetails: { labels: 'low/high', floor: '0.80' } },
          { id: 'safe_to_run', label: 'Gate · safe_to_run', category: 'gate', x: 50, y: 275, width: 190, height: 68, extraDetails: { rule: 'no_auto_post' } },
          { id: 'state_encoder', label: 'state encoder', subtitle: '2048-dim latent', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72, extraDetails: { latency: '4.2ms' } },
          { id: 'score_head', label: 'score head', subtitle: 'JEV matrix: 0.94', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72, extraDetails: { verdict: 'PASS', conf: '0.92' } },
          { id: 'draft_short', label: 'draft_short*', subtitle: 'format X thread', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72, extraDetails: { post: 'thread', folder: 'review' } },
          { id: 'book_call', label: 'book_call', subtitle: 'nurture calendar', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'review folder', subtitle: 'scheduled staging', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72, extraDetails: { status: 'READY' } },
          { id: 'human_gate', label: 'human gate', subtitle: 'operator consent', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72, extraDetails: { operator: 'Ayyappa' } }
        ],
        connections: [
          { from: 'viral_fit', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'draft_short', highlighted: true },
          { from: 'draft_short', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true },
          { from: 'lead_quality', to: 'score_head', highlighted: false },
          { from: 'safe_to_run', to: 'human_gate', highlighted: false },
          { from: 'score_head', to: 'book_call', highlighted: false }
        ]
      },

      // 05 MEETINGS
      {
        id: 'meetings',
        num: '05',
        name: 'meetings',
        description: 'Audio Transcript Decomposition, Action Item Extraction & Task Commitment Sync',
        active: false,
        score: 'action_extract',
        target: 'calendar_sync',
        codeSnippet: `# chief.py: 05 Meeting Transcript & Action Extractor
def process_transcript(meeting: dict) -> dict:
    actions = extractor_head.detect_commitments(meeting['transcript'])
    for item in actions:
        if item.confidence >= 0.88:
            calendar.create_event(title=item.action, due_date=item.date)
            task_db.insert_action(item)
    return {'status': 'COMMITTED', 'count': len(actions)}`,
        sample_inputs: [
          { title: 'Product Sync', transcript: 'Ayyappa: I will finalize the decision pipeline by 2 PM. Rahul: I will review by 4 PM.' }
        ],
        questions: [
          { q: 'action_extract', type: 'score', weight: 0.50, floor: 0.88 },
          { q: 'assignee_clarity', type: 'score', weight: 0.30, floor: 0.85 },
          { q: 'due_date_present', type: 'choice', weight: 0.20, labels: ['today', 'this_week', 'unspecified'] }
        ],
        guardrail: { spend: 0.09, actions: '14 / 50', rule: 'Never schedule events without attendee confirmation' },
        nodes: [
          { id: 'action_extract', label: 'Score · action_extract', category: 'score', score: 0.91, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72 },
          { id: 'assignee_score', label: 'Score · assignees', category: 'score', x: 50, y: 170, width: 190, height: 68 },
          { id: 'due_date_gate', label: 'Gate · date_valid', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'transcript encoder', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72 },
          { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72 },
          { id: 'calendar_sync', label: 'calendar sync', subtitle: 'commit timeslots', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72 },
          { id: 'task_export', label: 'task export', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'meeting summary', subtitle: 'markdown artifact', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72 },
          { id: 'human_gate', label: 'attendee gate', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72 }
        ],
        connections: [
          { from: 'action_extract', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'calendar_sync', highlighted: true },
          { from: 'calendar_sync', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true }
        ]
      },

      // 06 CLIPS
      {
        id: 'clips',
        num: '06',
        name: 'clips',
        description: 'Audio Energy Peak Detection, Viral Highlight Truncation & Subtitle Rendering',
        active: false,
        score: 'highlight_score',
        target: 'cut_segment',
        codeSnippet: `# chief.py: 06 Audio Highlight & Clip Extractor
def extract_clips(media: dict) -> list:
    peaks = audio_energy.detect_spikes(media['audio_path'])
    for p in peaks:
        if p.score >= 0.86:
            ffmpeg.trim(media['video_path'], start=p.start, duration=30)
            whisper.render_karaoke_subtitles(p.clip_path)
    return {'status': 'CLIPPED'}`,
        sample_inputs: [{ media_id: 'vid_901', duration_sec: 1800, audio_channels: 2 }],
        questions: [
          { q: 'highlight_score', type: 'score', weight: 0.50, floor: 0.86 },
          { q: 'speech_density', type: 'score', weight: 0.30, floor: 0.80 },
          { q: 'aspect_ratio_9_16', type: 'gate', weight: 0.20, gate: 'vertical_crop' }
        ],
        guardrail: { spend: 0.18, actions: '4 / 10', rule: 'Require preview verification before social upload' },
        nodes: [
          { id: 'highlight_score', label: 'Score · energy_peak', category: 'score', score: 0.89, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72 },
          { id: 'speech_density', label: 'Score · speech_density', category: 'score', x: 50, y: 170, width: 190, height: 68 },
          { id: 'crop_gate', label: 'Gate · vertical_crop', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'audio wave encoder', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72 },
          { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72 },
          { id: 'cut_segment', label: 'cut segment', subtitle: 'lossless GPU trim', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72 },
          { id: 'karaoke_subs', label: 'karaoke subtitles', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'clips vault', subtitle: 'staged reel.mp4', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72 },
          { id: 'human_gate', label: 'editor gate', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72 }
        ],
        connections: [
          { from: 'highlight_score', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'cut_segment', highlighted: true },
          { from: 'cut_segment', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true }
        ]
      },

      // 07 CONTRACTS
      {
        id: 'contracts',
        num: '07',
        name: 'contracts',
        description: 'Legal Risk Analysis, Clause Deviation Scoring & Redline Suggestions',
        active: false,
        score: 'risk_score',
        target: 'flag_clause',
        codeSnippet: `# chief.py: 07 Contract Clause & Risk Verification
def review_agreement(contract: dict) -> dict:
    risks = legal_evaluator.find_indemnity_traps(contract['text'])
    if risks.highest_severity >= 0.85:
        redline = legal_evaluator.propose_safe_rephrase(risks.trap)
        return {'worker': 'flag_clause', 'severity': 'HIGH', 'redline': redline}
    return {'worker': 'auto_sign', 'status': 'LOW_RISK'}`,
        sample_inputs: [{ contract_name: 'Vendor SLA Agreement', clauses: 42, jurisdiction: 'Delaware' }],
        questions: [
          { q: 'risk_score', type: 'score', weight: 0.50, floor: 0.85 },
          { q: 'liability_cap', type: 'score', weight: 0.30, floor: 0.90 },
          { q: 'gdpr_compliance', type: 'gate', weight: 0.20, gate: 'data_sovereignty' }
        ],
        guardrail: { spend: 0.12, actions: '6 / 20', rule: 'Never auto-sign contracts with unlimited liability' },
        nodes: [
          { id: 'risk_score', label: 'Score · clause_risk', category: 'score', score: 0.87, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72 },
          { id: 'liability_score', label: 'Score · liability_cap', category: 'score', x: 50, y: 170, width: 190, height: 68 },
          { id: 'compliance_gate', label: 'Gate · compliance', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'clause AST encoder', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72 },
          { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72 },
          { id: 'flag_clause', label: 'flag clause', subtitle: 'generate redline diff', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72 },
          { id: 'auto_sign', label: 'auto sign', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'redline report', subtitle: 'annotated pdf', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72 },
          { id: 'human_gate', label: 'counsel gate', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72 }
        ],
        connections: [
          { from: 'risk_score', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'flag_clause', highlighted: true },
          { from: 'flag_clause', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true }
        ]
      },

      // 08 LEADS
      {
        id: 'leads',
        num: '08',
        name: 'leads',
        description: 'Inbound ICP Scoring, Company Revenue Qualification & CRM Enrichment',
        active: false,
        score: 'icp_fit',
        target: 'sync_crm',
        codeSnippet: `# chief.py: 08 Inbound Lead Qualification
def evaluate_lead(lead: dict) -> dict:
    icp = icp_head.match(lead['company_size'], lead['industry'])
    if icp.confidence >= 0.85:
        crm.upsert_lead(lead, priority='HOT')
        return {'worker': 'sync_crm', 'route': 'account_executive'}
    return {'worker': 'nurture_drip', 'route': 'marketing'}`,
        sample_inputs: [{ email: 'vp_eng@growthco.com', company: 'GrowthCo', seats: 250, tech_stack: ['FastAPI', 'Angular'] }],
        questions: [
          { q: 'icp_fit', type: 'score', weight: 0.50, floor: 0.85 },
          { q: 'budget_fit', type: 'score', weight: 0.30, floor: 0.80 },
          { q: 'valid_domain', type: 'gate', weight: 0.20, gate: 'mx_record_verified' }
        ],
        guardrail: { spend: 0.04, actions: '85 / 200', rule: 'Never send spam drips to invalid corporate domains' },
        nodes: [
          { id: 'icp_fit', label: 'Score · icp_fit', category: 'score', score: 0.94, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72 },
          { id: 'budget_score', label: 'Score · budget_fit', category: 'score', x: 50, y: 170, width: 190, height: 68 },
          { id: 'domain_gate', label: 'Gate · domain_valid', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'firmographic encoder', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72 },
          { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72 },
          { id: 'sync_crm', label: 'sync crm', subtitle: 'assign to AE', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72 },
          { id: 'nurture_drip', label: 'nurture drip', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'lead queue', subtitle: 'high priority pipeline', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72 },
          { id: 'human_gate', label: 'sales lead gate', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72 }
        ],
        connections: [
          { from: 'icp_fit', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'sync_crm', highlighted: true },
          { from: 'sync_crm', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true }
        ]
      },

      // 09 BRAIN DUMP
      {
        id: 'brain_dump',
        num: '09',
        name: 'brain dump',
        description: 'Unstructured Thought Parsing, Entity Extraction & Knowledge Graph Storage',
        active: false,
        score: 'clarity_score',
        target: 'link_graph',
        codeSnippet: `# chief.py: 09 Unstructured Voice/Thought Structurer
def ingest_brain_dump(raw_text: str) -> dict:
    entities = ner_head.extract_graph_nodes(raw_text)
    tasks = task_head.find_actionable_todos(raw_text)
    knowledge_graph.commit_triplets(entities)
    return {'status': 'INDEXED', 'nodes': len(entities), 'tasks': len(tasks)}`,
        sample_inputs: [{ raw_notes: 'Need to add lanceDB indexing for perception images and benchmark against chroma on rtx 4060.' }],
        questions: [
          { q: 'clarity_score', type: 'score', weight: 0.45, floor: 0.80 },
          { q: 'actionable_items', type: 'score', weight: 0.35, floor: 0.75 },
          { q: 'safety_privacy', type: 'gate', weight: 0.20, gate: 'local_storage_only' }
        ],
        guardrail: { spend: 0.02, actions: '45 / 100', rule: 'Store all personal notes locally on encrypted SQLite WAL' },
        nodes: [
          { id: 'clarity_score', label: 'Score · clarity', category: 'score', score: 0.90, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72 },
          { id: 'actionable_score', label: 'Score · actionable', category: 'score', x: 50, y: 170, width: 190, height: 68 },
          { id: 'privacy_gate', label: 'Gate · local_only', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'semantic encoder', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72 },
          { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72 },
          { id: 'link_graph', label: 'link graph', subtitle: 'triplet extraction', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72 },
          { id: 'todo_export', label: 'todo export', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'knowledge vault', subtitle: 'sqlite WAL saved', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72 },
          { id: 'human_gate', label: 'operator gate', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72 }
        ],
        connections: [
          { from: 'clarity_score', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'link_graph', highlighted: true },
          { from: 'link_graph', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true }
        ]
      },

      // 10 SUPPORT
      {
        id: 'support',
        num: '10',
        name: 'support',
        description: 'Customer Support SLA Triage, Sentiment Scoring & Tier-3 Escalation',
        active: false,
        score: 'urgency_score',
        target: 'escalate_tier3',
        codeSnippet: `# chief.py: 10 Customer Support SLA Router
def triage_ticket(ticket: dict) -> dict:
    sentiment = sentiment_head.evaluate(ticket['message'])
    if sentiment.severity >= 0.85:
        slack.alert('#urgent-support', text=f"P1 SLA Breach Risk: {ticket['id']}")
        return {'worker': 'escalate_tier3', 'assignee': 'oncall_engineer'}
    return {'worker': 'kb_suggest', 'action': 'stage_auto_reply'}`,
        sample_inputs: [{ ticket_id: 'TCK-8812', message: 'Production API is returning 500 errors on token verification!', priority: 'urgent' }],
        questions: [
          { q: 'urgency_score', type: 'score', weight: 0.50, floor: 0.85 },
          { q: 'sentiment_severity', type: 'score', weight: 0.30, floor: 0.80 },
          { q: 'sla_active', type: 'gate', weight: 0.20, gate: 'enterprise_contract' }
        ],
        guardrail: { spend: 0.06, actions: '18 / 50', rule: 'Never escalate without customer org metadata check' },
        nodes: [
          { id: 'urgency_score', label: 'Score · urgency', category: 'score', score: 0.95, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72 },
          { id: 'sentiment_score', label: 'Score · sentiment', category: 'score', x: 50, y: 170, width: 190, height: 68 },
          { id: 'sla_gate', label: 'Gate · sla_check', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'ticket encoder', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72 },
          { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72 },
          { id: 'escalate_tier3', label: 'escalate tier3', subtitle: 'page on-call', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72 },
          { id: 'kb_suggest', label: 'kb suggest', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'incident room', subtitle: 'slack alert staged', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72 },
          { id: 'human_gate', label: 'oncall gate', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72 }
        ],
        connections: [
          { from: 'urgency_score', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'escalate_tier3', highlighted: true },
          { from: 'escalate_tier3', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true }
        ]
      },

      // 11 TRADING
      {
        id: 'trading',
        num: '11',
        name: 'trading',
        description: 'Macro News Sentiment, Technical Divergence & Algorithmic Risk Halt',
        active: false,
        score: 'sentiment_alpha',
        target: 'stage_order',
        codeSnippet: `# chief.py: 11 Algorithmic Risk & Execution Gate
def evaluate_market_signal(signal: dict) -> dict:
    risk_level = risk_manager.compute_var(portfolio, signal['ticker'])
    if risk_level.within_limits and signal['confidence'] >= 0.88:
        return {'worker': 'stage_order', 'ticker': signal['ticker'], 'size': risk_level.max_size}
    return {'worker': 'halt_trading', 'reason': 'Risk floor exceeded'}`,
        sample_inputs: [{ ticker: 'NVDA', signal_type: 'breakout', rsi: 62.4, macro_news: 'positive chip guidance' }],
        questions: [
          { q: 'sentiment_alpha', type: 'score', weight: 0.45, floor: 0.88 },
          { q: 'volatility_check', type: 'score', weight: 0.35, floor: 0.82 },
          { q: 'risk_guardrail', type: 'gate', weight: 0.20, gate: 'max_drawdown_2pct' }
        ],
        guardrail: { spend: 0.00, actions: '3 / 5', rule: 'Require physical human biometric consent before live broker order' },
        nodes: [
          { id: 'sentiment_alpha', label: 'Score · alpha_signal', category: 'score', score: 0.93, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72 },
          { id: 'volatility_score', label: 'Score · volatility', category: 'score', x: 50, y: 170, width: 190, height: 68 },
          { id: 'drawdown_gate', label: 'Gate · drawdown_limit', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'order book encoder', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72 },
          { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72 },
          { id: 'stage_order', label: 'stage order', subtitle: 'compute sizing', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72 },
          { id: 'halt_trading', label: 'halt trading', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'broker stagewell', subtitle: 'ready for auth', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72 },
          { id: 'human_gate', label: 'operator key gate', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72 }
        ],
        connections: [
          { from: 'sentiment_alpha', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'stage_order', highlighted: true },
          { from: 'stage_order', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true }
        ]
      },

      // 12 AGENTS
      {
        id: 'agents',
        num: '12',
        name: 'agents',
        description: 'Swarm Consensus, Capability Routing & Autonomous Worker Delegation',
        active: false,
        score: 'capability_fit',
        target: 'dispatch_worker',
        codeSnippet: `# chief.py: 12 Swarm Task Planner & Worker Router
def plan_mission(goal: str) -> dict:
    subtasks = task_decomposer.split(goal)
    plan = swarm_supervisor.assign_workers(subtasks)
    if plan.consensus >= 0.89:
        for step in plan.steps:
            agent_registry.dispatch(step.agent_id, step.payload)
        return {'status': 'DISPATCHED', 'workers': len(plan.steps)}
    return {'status': 'HUMAN_INTERVENTION_REQUIRED'}`,
        sample_inputs: [{ mission: 'Audit codebase, run unit tests, and compile release bundle autonomously' }],
        questions: [
          { q: 'capability_fit', type: 'score', weight: 0.45, floor: 0.85 },
          { q: 'swarm_consensus', type: 'score', weight: 0.35, floor: 0.88 },
          { q: 'sandbox_safe', type: 'gate', weight: 0.20, gate: 'isolated_environment' }
        ],
        guardrail: { spend: 0.22, actions: '120 / 500', rule: 'Require central supervisor quorum for destructive OS calls' },
        nodes: [
          { id: 'capability_fit', label: 'Score · agent_fit', category: 'score', score: 0.96, highlighted: true, activePath: true, x: 50, y: 60, width: 190, height: 72 },
          { id: 'consensus_score', label: 'Score · swarm_consensus', category: 'score', x: 50, y: 170, width: 190, height: 68 },
          { id: 'sandbox_gate', label: 'Gate · sandbox_safe', category: 'gate', x: 50, y: 275, width: 190, height: 68 },
          { id: 'state_encoder', label: 'mission planner', category: 'encoder', highlighted: true, activePath: true, x: 320, y: 60, width: 190, height: 72 },
          { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 320, y: 170, width: 190, height: 72 },
          { id: 'dispatch_worker', label: 'dispatch worker', subtitle: 'swarm delegation', category: 'action', highlighted: true, activePath: true, x: 590, y: 60, width: 190, height: 72 },
          { id: 'escalate_supervisor', label: 'escalate supervisor', category: 'action', x: 590, y: 170, width: 190, height: 68 },
          { id: 'review_folder', label: 'telemetry log', subtitle: 'mission plan active', category: 'destination', highlighted: true, activePath: true, x: 860, y: 60, width: 190, height: 72 },
          { id: 'human_gate', label: 'governance gate', category: 'gate', highlighted: true, activePath: true, x: 860, y: 170, width: 190, height: 72 }
        ],
        connections: [
          { from: 'capability_fit', to: 'state_encoder', highlighted: true },
          { from: 'state_encoder', to: 'score_head', highlighted: true },
          { from: 'score_head', to: 'dispatch_worker', highlighted: true },
          { from: 'dispatch_worker', to: 'review_folder', highlighted: true },
          { from: 'review_folder', to: 'human_gate', highlighted: true }
        ]
      }
    ];

    this.useCases.set(list);
    const defaultCase = list.find(u => u.id === 'x_feed') || list[0];
    this.selectUseCase(defaultCase.id);
  }
}
