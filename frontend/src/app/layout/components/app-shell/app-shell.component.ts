import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { FloatingSidebarComponent } from '../floating-sidebar/floating-sidebar.component';
import { ContextualTopbarComponent } from '../contextual-topbar/contextual-topbar.component';
import { GlobalSafetyBarComponent } from '../global-safety-bar/global-safety-bar.component';
import { ConsentModalComponent } from '../../../features/operator-console/components/consent-modal/consent-modal.component';
import { SpatialBackgroundComponent } from '../../../shared/3d/spatial-background/spatial-background.component';
import { CommandPaletteComponent } from '../../../shared/ui/command-palette/command-palette.component';
import { OperatorStateService } from '../../../core/services/operator-state.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ContextualTopbarComponent,
    GlobalSafetyBarComponent,
    ConsentModalComponent,
    SpatialBackgroundComponent,
    CommandPaletteComponent
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

  readonly isMainAgent = computed(() => {
    const url = this.currentUrl() || '';
    return url === '' || url === '/' || url.startsWith('/home');
  });
}
