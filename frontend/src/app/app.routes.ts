import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'console'
  },
  {
    path: 'console',
    loadComponent: () =>
      import('./features/operator-console/pages/operator-console-page/operator-console-page.component').then(
        (m) => m.OperatorConsolePageComponent
      )
  },
  {
    path: 'tasks',
    loadComponent: () =>
      import('./features/tasks/pages/tasks-page/tasks-page.component').then(
        (m) => m.TasksPageComponent
      )
  },
  {
    path: 'applications',
    loadComponent: () =>
      import('./features/applications/pages/applications-page/applications-page.component').then(
        (m) => m.ApplicationsPageComponent
      )
  },
  {
    path: 'browser',
    loadComponent: () =>
      import('./features/browser/pages/browser-page/browser-page.component').then(
        (m) => m.BrowserPageComponent
      )
  },
  {
    path: 'memory',
    loadComponent: () =>
      import('./features/memory/pages/memory-page/memory-page.component').then(
        (m) => m.MemoryPageComponent
      )
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
    path: 'workflows',
    loadComponent: () =>
      import('./features/workflows/pages/workflow-page/workflow-page.component').then(
        (m) => m.WorkflowPageComponent
      )
  },
  {
    path: 'llm-evaluation',
    loadComponent: () =>
      import('./features/llm-evaluation/pages/llm-evaluation-page/llm-evaluation-page.component').then(
        (m) => m.LlmEvaluationPageComponent
      )
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
    path: '**',
    redirectTo: 'console'
  }
];
