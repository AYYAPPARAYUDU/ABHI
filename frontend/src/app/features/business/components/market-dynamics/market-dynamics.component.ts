import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessOpportunity } from '../../models/business.model';
import { AnimeAnimationService } from '../../../../core/services/anime-animation.service';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';

@Component({
  selector: 'app-market-dynamics',
  standalone: true,
  imports: [CommonModule, AnimeInteractiveDirective],
  templateUrl: './market-dynamics.component.html',
  styleUrl: './market-dynamics.component.css',
})
export class MarketDynamicsComponent {
  private readonly animService = inject(AnimeAnimationService);

  readonly opportunities = input<BusinessOpportunity[]>([]);
  readonly openNewOpportunity = output<void>();

  onOpenNewOpportunity(event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.openNewOpportunity.emit();
  }
}
