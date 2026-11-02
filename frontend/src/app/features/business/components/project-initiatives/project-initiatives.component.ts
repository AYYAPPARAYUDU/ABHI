import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BusinessProject } from '../../models/business.model';
import { AnimeAnimationService } from '../../../../core/services/anime-animation.service';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';

@Component({
  selector: 'app-project-initiatives',
  standalone: true,
  imports: [CommonModule, AnimeInteractiveDirective],
  templateUrl: './project-initiatives.component.html',
  styleUrl: './project-initiatives.component.css',
})
export class ProjectInitiativesComponent {
  private readonly animService = inject(AnimeAnimationService);

  readonly projects = input<BusinessProject[]>([]);
  readonly selectedProject = input<BusinessProject | null>(null);
  readonly isExecuting = input<boolean>(false);

  readonly projectSelect = output<BusinessProject>();
  readonly executeStep = output<string>();
  readonly resolveApproval = output<{ projectId: string; approvalId: string; approve: boolean }>();
  readonly openNewProject = output<void>();

  onSelectProject(proj: BusinessProject, event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.projectSelect.emit(proj);
  }

  onExecuteStep(projectId: string, event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.executeStep.emit(projectId);
  }

  onResolveApproval(projectId: string, approvalId: string, approve: boolean): void {
    this.resolveApproval.emit({ projectId, approvalId, approve });
  }

  onOpenNewProject(event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.openNewProject.emit();
  }

  getAutonomyDescription(level: number): string {
    switch (level) {
      case 0:
        return 'Level 0 — Observe Only (No automated action)';
      case 1:
        return 'Level 1 — Research & synthesis';
      case 2:
        return 'Level 2 — Planning & design specification';
      case 3:
        return 'Level 3 — Local build & verification';
      case 4:
        return 'Level 4 — Execute approved internal work';
      case 5:
        return 'Level 5 — External action requiring explicit approval';
      default:
        return `Level ${level}`;
    }
  }
}
