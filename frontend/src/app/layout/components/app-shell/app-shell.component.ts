import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
    FloatingSidebarComponent,
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
}
