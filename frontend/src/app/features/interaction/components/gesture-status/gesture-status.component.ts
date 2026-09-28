import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractionService } from '../../services/interaction.service';

@Component({
  selector: 'app-gesture-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gesture-status.component.html',
  styleUrls: ['./gesture-status.component.css']
})
export class GestureStatusComponent {
  readonly interactionService = inject(InteractionService);

  readonly gesture = this.interactionService.gesture;
  readonly face = this.interactionService.face;

  getGestureEmoji(gestureName: string): string {
    switch (gestureName) {
      case 'THUMBS_UP':
        return '👍';
      case 'OPEN_PALM':
        return '✋';
      case 'PEACE':
        return '✌️';
      case 'POINTING':
        return '👉';
      case 'PINCH':
        return '🤏';
      default:
        return '🖐️';
    }
  }
}
