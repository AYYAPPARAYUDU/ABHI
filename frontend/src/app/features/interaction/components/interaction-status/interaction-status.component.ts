import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractionService } from '../../services/interaction.service';

@Component({
  selector: 'app-interaction-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './interaction-status.component.html',
  styleUrls: ['./interaction-status.component.css']
})
export class InteractionStatusComponent {
  readonly interactionService = inject(InteractionService);

  readonly history = this.interactionService.history;
  readonly state = this.interactionService.state;
}
