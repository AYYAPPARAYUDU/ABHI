import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InteractionService } from '../../services/interaction.service';

@Component({
  selector: 'app-command-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './command-preview.component.html',
  styleUrls: ['./command-preview.component.css']
})
export class CommandPreviewComponent {
  readonly interactionService = inject(InteractionService);

  readonly preview = this.interactionService.preview;
  readonly isBusy = this.interactionService.isBusy;

  execute(): void {
    this.interactionService.executeCurrentPreview();
  }

  cancel(): void {
    this.interactionService.cancelInteraction();
  }
}
