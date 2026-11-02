import { Component, inject, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { ContextualTopbarComponent } from '../contextual-topbar/contextual-topbar.component';
import { ConsentModalComponent } from '../../../features/operator-console/components/consent-modal/consent-modal.component';
import { SpatialBackgroundComponent } from '../../../shared/3d/spatial-background/spatial-background.component';
import { CommandPaletteComponent } from '../../../shared/ui/command-palette/command-palette.component';
import { AssistantModalComponent } from '../assistant-modal/assistant-modal.component';
import { OperatorStateService } from '../../../core/services/operator-state.service';
import { SpatialEnvironmentMode } from '../../../core/models/agent-experience.model';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ContextualTopbarComponent,
    ConsentModalComponent,
    SpatialBackgroundComponent,
    CommandPaletteComponent,
    AssistantModalComponent
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css'
})
export class AppShellComponent {
  readonly stateService = inject(OperatorStateService);
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  constructor() {
    // Automatically synchronize Spatial 3D Mode based on active route
    effect(() => {
      const url = this.currentUrl() || '';
      let targetMode: SpatialEnvironmentMode = 'MAIN_AGENT';

      if (url.startsWith('/workspace')) {
        targetMode = 'WORKSPACE';
      } else if (url.startsWith('/automation')) {
        targetMode = 'AUTOMATION';
      } else if (url.startsWith('/media')) {
        targetMode = 'MEDIA';
      } else if (url.startsWith('/intelligence')) {
        targetMode = 'INTELLIGENCE';
      } else if (url.startsWith('/business')) {
        targetMode = 'BUSINESS';
      } else {
        targetMode = 'MAIN_AGENT';
      }

      this.stateService.setSpatialMode(targetMode);
    });
  }

  readonly isMainAgent = computed(() => {
    const url = this.currentUrl() || '';
    return (
      url === '' ||
      url === '/' ||
      url.startsWith('/home') ||
      url.startsWith('/workspace')
    );
  });
}
