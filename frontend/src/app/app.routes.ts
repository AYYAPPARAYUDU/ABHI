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
    path: 'workspace',
    loadComponent: () =>
      import('./features/workspace/pages/workspace-page/workspace-page.component').then(
        (m) => m.WorkspacePageComponent
      )
  },
  {
    path: 'automation',
    loadComponent: () =>
      import('./features/automation/pages/automation-page/automation-page.component').then(
        (m) => m.AutomationPageComponent
      )
  },
  {
    path: 'network',
    redirectTo: 'automation',
    pathMatch: 'full'
  },
  {
    path: 'intelligence',
    loadComponent: () =>
      import('./features/intelligence/pages/intelligence-page/intelligence-page.component').then(
        (m) => m.IntelligencePageComponent
      )
  },
  {
    path: 'business',
    loadComponent: () =>
      import('./features/business/pages/business-page/business-page.component').then(
        (m) => m.BusinessPageComponent
      )
  },
  {
    path: 'ask',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: 'console',
    redirectTo: 'automation',
    pathMatch: 'full'
  },
  {
    path: 'tasks',
    redirectTo: 'automation',
    pathMatch: 'full'
  },
  {
    path: 'applications',
    redirectTo: 'automation',
    pathMatch: 'full'
  },
  {
    path: 'browser',
    redirectTo: 'automation',
    pathMatch: 'full'
  },
  {
    path: 'memory',
    redirectTo: 'automation',
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
    loadComponent: () =>
      import('./features/runtime/pages/runtime-page/runtime-page.component').then(
        (m) => m.RuntimePageComponent
      )
  },
  {
    path: 'system',
    loadComponent: () =>
      import('./features/system/pages/system-page/system-page.component').then(
        (m) => m.SystemPageComponent
      )
  },
  {
    path: 'decision-pipeline',
    redirectTo: 'intelligence',
    pathMatch: 'full'
  },
  {
    path: 'workflows',
    redirectTo: 'intelligence',
    pathMatch: 'full'
  },
  {
    path: 'llm-evaluation',
    redirectTo: 'intelligence',
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
    path: 'dev-ui',
    redirectTo: 'system',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];
