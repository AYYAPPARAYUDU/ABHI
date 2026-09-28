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
    path: '**',
    redirectTo: 'console'
  }
];
