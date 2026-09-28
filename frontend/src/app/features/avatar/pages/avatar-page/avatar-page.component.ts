import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarViewportComponent } from '../../components/avatar-viewport/avatar-viewport.component';
import { ExecutionTimelineComponent } from '../../../operator-console/components/execution-timeline/execution-timeline.component';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { PerceptionService } from '../../../perception/services/perception.service';

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
  private readonly perceptionService = inject(PerceptionService);

  readonly avatarState = this.stateService.avatarState;
  readonly voice = this.perceptionService.voice;
  readonly gesture = this.perceptionService.gesture;
  readonly faceHead = this.perceptionService.faceHead;
}
