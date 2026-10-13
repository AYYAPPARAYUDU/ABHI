import { Component, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface DecisionNode {
  id: string;
  label: string;
  subtitle?: string;
  category: 'score' | 'encoder' | 'destination' | 'action' | 'gate' | 'telemetry';
  score?: number;
  confidence?: number;
  status?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  highlighted?: boolean;
  activePath?: boolean;
  extraDetails?: Record<string, string>;
}

export interface NodeConnection {
  id?: string;
  from: string;
  to: string;
  highlighted?: boolean;
  particleColor?: string;
}

export interface UseCase {
  id: string;
  num: string;
  name: string;
  active: boolean;
  score: string;
  target: string;
  codeSnippet: string;
}

@Component({
  selector: 'app-decision-pipeline-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './decision-pipeline-page.component.html',
  styleUrl: './decision-pipeline-page.component.css'
})
export class DecisionPipelinePageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('oscilloscopeCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  // Dynamic Sim Signals
  readonly currentDecisions = signal<number>(7708);
  readonly currentLatency = signal<number>(256);
  readonly currentConfidence = signal<number>(0.92);
  readonly selectedTab = signal<string>('JEV');

  // Active Use Case
  readonly useCases = signal<UseCase[]>([
    { id: 'email', num: '01', name: 'email', active: false, score: 'inbox_fit', target: 'draft_reply', codeSnippet: '# Email Auto-Responder Decision Node' },
    { id: 'youtube', num: '02', name: 'youtube', active: false, score: 'hook_strength', target: 'render_reel', codeSnippet: '# YouTube Reel Automated Composer' },
    { id: 'skool', num: '03', name: 'skool', active: false, score: 'post_quality', target: 'notify_member', codeSnippet: '# Skool Community Workflow Head' },
    { id: 'x_feed', num: '04', name: 'x feed', active: true, score: 'viral_fit', target: 'draft_short*', codeSnippet: '# X Post Evaluation & Scheduled Review' },
    { id: 'meetings', num: '05', name: 'meetings', active: false, score: 'action_extract', target: 'calendar_sync', codeSnippet: '# Meeting Summary & Extraction' },
    { id: 'clips', num: '06', name: 'clips', active: false, score: 'cut_quality', target: 'ffmpeg_slice', codeSnippet: '# Video Slicing Engine' },
    { id: 'contracts', num: '07', name: 'contracts', active: false, score: 'clause_risk', target: 'redline_doc', codeSnippet: '# Contract Review Guardrail' },
    { id: 'leads', num: '08', name: 'leads', active: false, score: 'lead_quality', target: 'book_call', codeSnippet: '# Lead Qualification Matrix' },
    { id: 'brain_dump', num: '09', name: 'brain-dump', active: false, score: 'struct_density', target: 'obsidian_sync', codeSnippet: '# Thought Synthesis Node' },
    { id: 'support', num: '10', name: 'support', active: false, score: 'ticket_urgency', target: 'eng_oncall', codeSnippet: '# Customer Escalation Head' },
    { id: 'trading', num: '11', name: 'trading', active: false, score: 'risk_boundary', target: 'paper_execute', codeSnippet: '# Quantitative Guardrail Node' },
    { id: 'agents', num: '12', name: 'agents', active: false, score: 'swarm_eval', target: 'orchestrate', codeSnippet: '# Multi-Agent Supervisor Decision' }
  ]);

  readonly activeCase = computed(() => {
    return this.useCases().find((u) => u.active) || this.useCases()[3];
  });

  // Nodes matching the screenshot architecture
  readonly nodes = signal<DecisionNode[]>([
    { id: 'lead_quality', label: 'Score · lead_quality', category: 'score', x: 40, y: 30, width: 170, height: 75, extraDetails: { 'labels': 'low / high', 'ordered': 'true', 'floor': '0.85' } },
    { id: 'choice_action', label: 'Choice · action', category: 'action', x: 40, y: 130, width: 170, height: 60, extraDetails: { 'actions': '3 total', 'retry': 'every 150ms' } },
    { id: 'viral_fit', label: 'Score · viral_fit', category: 'score', score: 0.92, highlighted: true, activePath: true, x: 40, y: 220, width: 180, height: 85, extraDetails: { 'labels': 'high', 'floor': '0.92', 'feed': 'x_feed' } },
    { id: 'urgency', label: 'Score · urgency', category: 'score', x: 40, y: 335, width: 170, height: 60, extraDetails: { 'route': 'routed', 'level': 'P1' } },
    { id: 'safe_to_run', label: 'Noul · safe_to_run', category: 'gate', x: 40, y: 425, width: 170, height: 60, extraDetails: { 'post': 'true', 'gate': 'passed' } },

    { id: 'no_generation', label: 'no generation', subtitle: 'off / structured / free', category: 'encoder', x: 270, y: 30, width: 160, height: 65 },
    { id: 'state_encoder', label: 'state encoder', subtitle: '2048-lat packed', category: 'encoder', x: 270, y: 125, width: 160, height: 65, extraDetails: { 'latency': '4.2ms', 'cache': 'hit' } },
    { id: 'score_head', label: 'score head', category: 'score', highlighted: true, activePath: true, x: 270, y: 220, width: 190, height: 85, extraDetails: { 'ordered': '1', 'confidence': 'prime', 'pass': 'high' } },
    { id: 'median_latency', label: 'median latency', subtitle: '~256 ms public', category: 'telemetry', x: 270, y: 335, width: 160, height: 60 },
    { id: 'nout_head', label: 'nout head', subtitle: 'yes / no · 0.90 none', category: 'gate', x: 270, y: 425, width: 160, height: 60 },

    { id: 'draft_reply', label: 'draft reply', subtitle: 'earth it LLM the gate', category: 'action', x: 520, y: 30, width: 160, height: 65 },
    { id: 'book_call', label: 'book_call', subtitle: 'high nurture calendar', category: 'action', x: 520, y: 125, width: 160, height: 65 },
    { id: 'type_destination', label: 'type_destination', subtitle: 'small model submit', category: 'destination', x: 520, y: 220, width: 170, height: 65 },
    { id: 'draft_short', label: 'draft_short*', subtitle: 'strong review: yes', category: 'action', highlighted: true, activePath: true, x: 520, y: 315, width: 180, height: 85, extraDetails: { 'post': 'x_thread', 'folder': 'review' } },
    { id: 'eng_oncall', label: 'eng_oncall', subtitle: 'critical Slack alert', category: 'action', x: 520, y: 425, width: 160, height: 60 },

    { id: 'calendar', label: 'calendar', subtitle: 'time lead template', category: 'action', x: 760, y: 30, width: 160, height: 65 },
    { id: 'code_clicks', label: 'code clicks', subtitle: 'DOM outrank resume', category: 'action', x: 760, y: 125, width: 160, height: 65 },
    { id: 'review_folder', label: 'review folder', subtitle: 'draft auto-post you', category: 'destination', highlighted: true, activePath: true, x: 760, y: 220, width: 180, height: 85, extraDetails: { 'trigger': 'post_scheduled', 'status': 'READY' } },
    { id: 'slack_ping', label: 'Slack ping', subtitle: 'ticket via bot', category: 'action', x: 760, y: 335, width: 160, height: 60 },
    { id: 'progress_saved', label: 'progress saved', subtitle: 'after resume drops', category: 'gate', x: 760, y: 425, width: 160, height: 60 },

    { id: 'human_gate', label: 'human gate', subtitle: 'users outpush tissue', category: 'gate', x: 990, y: 220, width: 160, height: 75, extraDetails: { 'operator': 'Ayyappa', 'consent': 'granted' } }
  ]);

  // Connections matching the screenshot flows
  readonly connections = signal<NodeConnection[]>([
    { from: 'viral_fit', to: 'score_head', highlighted: true, particleColor: '#ff007f' },
    { from: 'score_head', to: 'type_destination', highlighted: true, particleColor: '#ff007f' },
    { from: 'type_destination', to: 'draft_short', highlighted: true, particleColor: '#ff007f' },
    { from: 'draft_short', to: 'review_folder', highlighted: true, particleColor: '#ff007f' },
    { from: 'review_folder', to: 'human_gate', highlighted: true, particleColor: '#ff007f' },
    { from: 'state_encoder', to: 'score_head', highlighted: false },
    { id: 'conn_lead', from: 'lead_quality', to: 'no_generation', highlighted: false },
    { from: 'choice_action', to: 'book_call', highlighted: false },
    { from: 'urgency', to: 'eng_oncall', highlighted: false },
    { from: 'draft_reply', to: 'calendar', highlighted: false },
    { from: 'book_call', to: 'calendar', highlighted: false },
    { from: 'type_destination', to: 'review_folder', highlighted: false },
    { from: 'draft_short', to: 'slack_ping', highlighted: false },
    { from: 'safe_to_run', to: 'nout_head', highlighted: false },
    { from: 'nout_head', to: 'progress_saved', highlighted: false }
  ]);

  private simTimer: any;
  private animFrame: any;

  ngOnInit(): void {
    // Background simulation ticker for decisions and latency
    this.simTimer = setInterval(() => {
      this.currentDecisions.update((d) => d + Math.floor(Math.random() * 3) + 1);
      this.currentLatency.set(250 + Math.floor(Math.random() * 12));
    }, 2000);
  }

  ngAfterViewInit(): void {
    this.startOscilloscope();
  }

  ngOnDestroy(): void {
    if (this.simTimer) clearInterval(this.simTimer);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
  }

  selectUseCase(uc: UseCase): void {
    this.useCases.update((list) =>
      list.map((item) => ({ ...item, active: item.id === uc.id }))
    );
  }

  onNodeClick(node: DecisionNode): void {
    this.nodes.update((list) =>
      list.map((n) => ({
        ...n,
        highlighted: n.id === node.id || (node.id === 'viral_fit' && n.activePath)
      }))
    );
  }

  onImgErr(e: Event): void {
    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="100%" height="100%" fill="%23ff007f"/><text x="50%" y="55%" fill="white" font-size="16" font-family="sans-serif" font-weight="bold" dominant-baseline="middle" text-anchor="middle">AR</text></svg>';
  }

  getConnectionPath(conn: NodeConnection): string {
    const fromNode = this.nodes().find((n) => n.id === conn.from);
    const toNode = this.nodes().find((n) => n.id === conn.to);
    if (!fromNode || !toNode) return '';

    const startX = fromNode.x + fromNode.width;
    const startY = fromNode.y + fromNode.height / 2;
    const endX = toNode.x;
    const endY = toNode.y + toNode.height / 2;
    const deltaX = (endX - startX) * 0.5;

    return `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
  }

  private startOscilloscope(): void {
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let offset = 0;
    const render = () => {
      offset += 0.04;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Wave 1 (Pink - Score)
      ctx.beginPath();
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 1.8;
      for (let x = 0; x < canvas.width; x++) {
        const y = 38 + Math.sin(x * 0.08 + offset) * 16 + Math.cos(x * 0.04 + offset * 1.5) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Wave 2 (Cyan - Choice)
      ctx.beginPath();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.2;
      for (let x = 0; x < canvas.width; x++) {
        const y = 38 + Math.sin(x * 0.05 - offset * 0.8) * 12 + Math.cos(x * 0.1) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw Wave 3 (White - Target Confidence)
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.0;
      for (let x = 0; x < canvas.width; x++) {
        const y = 38 + Math.cos(x * 0.06 + offset * 0.5) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      this.animFrame = requestAnimationFrame(render);
    };

    render();
  }
}
