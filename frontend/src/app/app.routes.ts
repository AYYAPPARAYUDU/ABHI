import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home'
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/pages/home-page/home-page.component').then(
        (m) => m.HomePageComponent
      )
  },
  {
    path: 'core',
    loadComponent: () =>
      import('./features/core/pages/core-page/core-page.component').then(
        (m) => m.CorePageComponent
      )
  },
  {
    path: 'workspace',
    loadComponent: () =>
      import('./features/workspace/pages/workspace-page/workspace-page.component').then(
        (m) => m.WorkspacePageComponent
      )
  },
  {
    path: 'agent-office',
    loadComponent: () =>
      import('./features/agent-office/pages/agent-office-page/agent-office-page.component').then(
        (m) => m.AgentOfficePageComponent
      )
  },
  {
    path: 'hub-spoke',
    loadComponent: () =>
      import('./features/hub-spoke/pages/hub-spoke-page/hub-spoke-page.component').then(
        (m) => m.HubSpokePageComponent
      )
  },
  {
    path: 'agent-hq',
    redirectTo: 'hub-spoke',
    pathMatch: 'full'
  },
  {
    path: 'office',
    redirectTo: 'agent-office',
    pathMatch: 'full'
  },
  {
    path: 'architecture',
    loadComponent: () =>
      import('./features/architecture/pages/architecture-page/architecture-page.component').then(
        (m) => m.ArchitecturePageComponent
      )
  },
  {
    path: 'messages',
    loadComponent: () =>
      import('./features/brain/pages/brain-page/brain-page.component').then(
        (m) => m.BrainPageComponent
      )
  },
  {
    path: 'brain',
    redirectTo: 'messages',
    pathMatch: 'full'
  },
  {
    path: 'assistant',
    redirectTo: 'messages',
    pathMatch: 'full'
  },
  {
    path: 'workflows',
    redirectTo: 'architecture',
    pathMatch: 'full'
  },
  {
    path: 'diagrams',
    redirectTo: 'architecture',
    pathMatch: 'full'
  },
  {
    path: 'live-status',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'live-console',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'meeting',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'council',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'automation',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'network',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'intelligence',
    redirectTo: 'core',
    pathMatch: 'full'
  },
  {
    path: 'business',
    loadComponent: () =>
      import('./features/business/pages/business-page/business-page.component').then(
        (m) => m.BusinessPageComponent
      )
  },
  {
    path: 'sectors',
    redirectTo: 'business',
    pathMatch: 'full'
  },
  {
    path: 'ask',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'console',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'tasks',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'applications',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'browser',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'memory',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'knowledge',
    loadComponent: () =>
      import('./features/knowledge/pages/knowledge-page/knowledge-page.component').then(
        (m) => m.KnowledgePageComponent
      )
  },
  {
    path: 'interaction',
    loadComponent: () =>
      import('./features/interaction/pages/interaction-page/interaction-page.component').then(
        (m) => m.InteractionPageComponent
      )
  },
  {
    path: 'perception',
    loadComponent: () =>
      import('./features/perception/pages/perception-page/perception-page.component').then(
        (m) => m.PerceptionPageComponent
      )
  },
  {
    path: 'avatar',
    loadComponent: () =>
      import('./features/avatar/pages/avatar-page/avatar-page.component').then(
        (m) => m.AvatarPageComponent
      )
  },
  {
    path: 'runtime',
    redirectTo: 'core',
    pathMatch: 'full'
  },
  {
    path: 'system',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'decision-pipeline',
    redirectTo: 'core',
    pathMatch: 'full'
  },
  {
    path: 'workflows',
    redirectTo: 'architecture',
    pathMatch: 'full'
  },
  {
    path: 'llm-evaluation',
    redirectTo: 'core',
    pathMatch: 'full'
  },
  {
    path: 'resources',
    loadComponent: () =>
      import('./features/resources/pages/resources-page/resources-page.component').then(
        (m) => m.ResourcesPageComponent
      )
  },
  {
    path: 'media',
    loadComponent: () =>
      import('./features/media/pages/media-page/media-page.component').then(
        (m) => m.MediaPageComponent
      )
  },
  {
    path: 'media-library',
    loadComponent: () =>
      import('./features/media/pages/media-library-page/media-library-page.component').then(
        (m) => m.MediaLibraryPageComponent
      )
  },
  {
    path: 'sample',
    redirectTo: 'workspace',
    pathMatch: 'full'
  },
  {
    path: 'dev-ui',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
