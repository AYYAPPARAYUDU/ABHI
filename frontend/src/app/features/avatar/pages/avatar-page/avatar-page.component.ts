import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarViewportComponent } from '../../components/avatar-viewport/avatar-viewport.component';
import { ExecutionTimelineComponent } from '../../../operator-console/components/execution-timeline/execution-timeline.component';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';

@Component({
  selector: 'app-avatar-page',
  standalone: true,
  imports: [
    CommonModule,
    AvatarViewportComponent,
    ExecutionTimelineComponent,
    PanelComponent
  ],
  templateUrl: './avatar-page.component.html',
  styleUrl: './avatar-page.component.css'
})
export class AvatarPageComponent {
  private readonly stateService = inject(OperatorStateService);
  readonly avatarState = this.stateService.avatarState;
}
