import {
  Component,
  ChangeDetectionStrategy,
  inject,
  computed,
  signal,
  OnInit,
  OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { AnimeInteractiveDirective } from '../../../shared/directives/anime-interactive.directive';

export interface WorkingEnvironmentItem {
  id: string;
  route: string;
  label: string;
  icon: string;
  category: 'CORE' | 'AUTOMATION' | 'INTELLIGENCE' | 'SYSTEM';
  description: string;
  badge?: string;
  shortcut?: string;
}

export const WORKING_ENVIRONMENTS: WorkingEnvironmentItem[] = [
  {
    id: 'core',
    route: '/home',
    label: '3D Core',
    icon: '🌐',
    category: 'CORE',
    description: 'Central holographic intelligence & 8-agent swarm architecture',
    badge: '3D',
    shortcut: '1'
  },
  {
    id: 'decision-pipeline',
    route: '/decision-pipeline',
    label: 'Decisions',
    icon: '⚡',
    category: 'AUTOMATION',
    description: 'AST execution traces, DAG pipeline steps & physical dual-state verification',
    badge: 'DAG',
    shortcut: '2'
  },
  {
    id: 'business',
    route: '/business',
    label: 'Sectors',
    icon: '⛃',
    category: 'CORE',
    description: 'Enterprise operational workflows, SQLite WAL state & operator credentials',
    badge: 'WAL',
    shortcut: '3'
  },
  {
    id: 'intelligence',
    route: '/intelligence',
    label: 'Neural Lab',
    icon: '🧠',
    category: 'INTELLIGENCE',
    description: 'LLM evaluation, neural weights inspection & fine-tuning telemetry',
    badge: 'LLM',
    shortcut: '4'
  },
  {
    id: 'applications',
    route: '/applications',
    label: 'Apps',
    icon: '💻',
    category: 'AUTOMATION',
    description: 'Windows 11 UI Automation, Win32 desktop hooks & process tree',
    badge: 'WIN',
    shortcut: '5'
  },
  {
    id: 'browser',
    route: '/browser',
    label: 'Browser',
    icon: '🌍',
    category: 'AUTOMATION',
    description: 'Playwright CDP web automation, screenshot OCR & active browser sessions',
    badge: 'CDP',
    shortcut: '6'
  },
  {
    id: 'media',
    route: '/media',
    label: 'Media',
    icon: '✦',
    category: 'INTELLIGENCE',
    description: 'Generative media studio, audio synthesis & C2PA provenance attestation',
    badge: 'C2PA',
    shortcut: '7'
  },
  {
    id: 'memory',
    route: '/memory',
    label: 'Memory',
    icon: '◌',
    category: 'CORE',
    description: 'Episodic memory matrix, semantic vector store & conversation state',
    badge: 'RAG',
    shortcut: '8'
  },
  {
    id: 'tasks',
    route: '/tasks',
    label: 'Tasks',
    icon: '◈',
    category: 'AUTOMATION',
    description: 'Autonomous multi-step goal scheduler & topological DAG coordinator',
    badge: 'SCHED',
    shortcut: '9'
  },
  {
    id: 'network',
    route: '/network',
    label: 'Network',
    icon: '☊',
    category: 'SYSTEM',
    description: 'Distributed P2P agent mesh, latency matrix & swarm communication logs',
    badge: 'P2P',
    shortcut: '0'
  },
  {
    id: 'system',
    route: '/system',
    label: 'Diagnostics',
    icon: '⚙',
    category: 'SYSTEM',
    description: 'Hardware sensors, ADB mobile bridge, GPU/CPU thermals & system health',
    badge: 'HW',
    shortcut: 'D'
  }
];

@Component({
  selector: 'app-working-environment',
  standalone: true,
  imports: [CommonModule, RouterModule, AnimeInteractiveDirective],
  templateUrl: './working-environment.component.html',
  styleUrl: './working-environment.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkingEnvironmentComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);

  readonly environments = WORKING_ENVIRONMENTS;
  readonly selectedCategory = signal<string>('ALL');

  // Reactive URL signal
  readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects || e.url)
    ),
    { initialValue: this.router.url }
  );

  readonly activeEnvironment = computed(() => {
    const url = this.currentUrl() || this.router.url;
    return this.environments.find((env) =>
      env.route === '/home' ? url === '/home' || url === '/' : url.startsWith(env.route)
    ) || this.environments[0];
  });

  readonly filteredEnvironments = computed(() => {
    const cat = this.selectedCategory();
    if (cat === 'ALL') return this.environments;
    return this.environments.filter((e) => e.category === cat);
  });

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  isActive(route: string): boolean {
    const current = this.router.url || this.currentUrl() || '';
    if (route === '/home') {
      return current === '/' || current === '/home' || current.startsWith('/home?');
    }
    return current.startsWith(route);
  }

  navigateTo(route: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.router.navigateByUrl(route);
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }
}
