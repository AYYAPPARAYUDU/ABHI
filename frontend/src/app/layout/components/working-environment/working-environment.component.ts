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
    id: 'workspace',
    route: '/workspace',
    label: 'Workspace',
    icon: '🏢',
    category: 'CORE',
    description: '3D Cybernetic living bot colony base with 8 working specialist bots',
    badge: 'BOTS',
    shortcut: '2'
  },
  {
    id: 'automation',
    route: '/automation',
    label: 'Automate Everything',
    icon: '⚡',
    category: 'AUTOMATION',
    description: 'Universal physical automation across Windows apps, browser, ADB phone, WhatsApp & Gmail',
    badge: 'ALL',
    shortcut: '3'
  },
  {
    id: 'intelligence',
    route: '/intelligence',
    label: 'Neural & Decisions',
    icon: '🧠',
    category: 'INTELLIGENCE',
    description: 'Merged DAG decision pipeline, AST traces & local LLM neural observatory',
    badge: 'DAG+LLM',
    shortcut: '4'
  },
  {
    id: 'business',
    route: '/business',
    label: 'Sectors',
    icon: '⛃',
    category: 'CORE',
    description: 'Enterprise operational workflows, SQLite WAL state & operator credentials',
    badge: 'WAL',
    shortcut: '5'
  },
  {
    id: 'media',
    route: '/media',
    label: 'Media Studio',
    icon: '✦',
    category: 'INTELLIGENCE',
    description: '3D Spatial generative media studio, creative pipeline & C2PA provenance',
    badge: '3D',
    shortcut: '6'
  },
  {
    id: 'system',
    route: '/system',
    label: 'Diagnostics',
    icon: '⚙',
    category: 'SYSTEM',
    description: 'Hardware sensors, ADB mobile bridge, GPU/CPU thermals & self-healing health',
    badge: 'HW',
    shortcut: '7'
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
  readonly isDrawerOpen = signal<boolean>(false);

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

  toggleWorkspaceDrawer(): void {
    this.isDrawerOpen.update((v) => !v);
  }

  closeWorkspaceDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  navigateTo(route: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.closeWorkspaceDrawer();
    this.router.navigateByUrl(route);
  }

  setCategory(category: string): void {
    this.selectedCategory.set(category);
  }
}
