import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VoiceStateComponent } from '../../components/voice-state/voice-state.component';
import { TranscriptionViewComponent } from '../../components/transcription-view/transcription-view.component';
import { FaceStateComponent } from '../../components/face-state/face-state.component';
import { GestureStateComponent } from '../../components/gesture-state/gesture-state.component';
import { ScreenVisionStateComponent } from '../../components/screen-vision-state/screen-vision-state.component';
import { PerceptionHealthComponent } from '../../components/perception-health/perception-health.component';
import { AvatarViewportComponent } from '../../../avatar/components/avatar-viewport/avatar-viewport.component';
import { TelemetryPanelComponent } from '../../../operator-console/components/telemetry-panel/telemetry-panel.component';

@Component({
  selector: 'app-perception-page',
  standalone: true,
  imports: [
    CommonModule,
    VoiceStateComponent,
    TranscriptionViewComponent,
    FaceStateComponent,
    GestureStateComponent,
    ScreenVisionStateComponent,
    PerceptionHealthComponent,
    AvatarViewportComponent,
    TelemetryPanelComponent
  ],
  templateUrl: './perception-page.component.html',
  styleUrl: './perception-page.component.css'
})
export class PerceptionPageComponent {}
