import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessSector } from '../../models/business.model';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';
import { AnimeAnimationService } from '../../../../core/services/anime-animation.service';

@Component({
  selector: 'app-sectors-dashboard',
  standalone: true,
  imports: [CommonModule, AnimeInteractiveDirective],
  templateUrl: './sectors-dashboard.component.html',
  styleUrl: './sectors-dashboard.component.css',
})
export class SectorsDashboardComponent {
  private readonly animService = inject(AnimeAnimationService);

  readonly sectors = input<BusinessSector[]>([]);
  readonly selectedSectorId = input<string | null>(null);
  readonly sectorSelect = output<string>();

  onSelectSector(id: string, event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.sectorSelect.emit(id);
  }

  get totalProjects(): number {
    return this.sectors().reduce((acc, s) => acc + (s.active_projects_count || 0), 0);
  }
}
