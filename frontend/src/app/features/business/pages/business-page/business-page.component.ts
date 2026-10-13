import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BusinessService } from '../../services/business.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import {
  BusinessApproval,
  BusinessOpportunity,
  BusinessProject,
  BusinessSector,
} from '../../models/business.model';

@Component({
  selector: 'app-business-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './business-page.component.html',
  styleUrl: './business-page.component.css'
})
export class BusinessPageComponent implements OnInit {
  readonly businessService = inject(BusinessService);
  private readonly threeScene = inject(ThreeSceneManagerService);

  readonly selectedSectorId = signal<string | null>(null);
  readonly isExecuting = signal<boolean>(false);
  readonly showNewProjModal = signal<boolean>(false);
  readonly showNewOppModal = signal<boolean>(false);

  // New Project Form
  newProjSector = 'software_tools';
  newProjName = '';
  newProjObjective = '';
  newProjAutonomy = 3;
  newProjBudget = 50.0;

  // New Opportunity Form
  newOppSector = 'media_studio';
  newOppTitle = '';
  newOppDesc = '';
  newOppPrice = 29.0;

  ngOnInit(): void {
    this.threeScene.setMode('BUSINESS');
    this.businessService.fetchSectors().subscribe();
    this.businessService.fetchProjects().subscribe();
    this.businessService.fetchOpportunities().subscribe();
    this.businessService.fetchFinancials().subscribe();
  }

  selectSector(sectorId: string): void {
    if (this.selectedSectorId() === sectorId) {
      this.selectedSectorId.set(null);
      this.businessService.fetchProjects().subscribe();
    } else {
      this.selectedSectorId.set(sectorId);
      this.businessService.fetchProjects(sectorId).subscribe();
    }
  }

  filteredProjects(): BusinessProject[] {
    const all = this.businessService.projects();
    const sec = this.selectedSectorId();
    if (!sec) return all;
    return all.filter((p) => p.sector_id === sec);
  }

  executeNextStep(projectId: string): void {
    this.isExecuting.set(true);
    this.businessService.executeNextStep(projectId).subscribe({
      next: () => this.isExecuting.set(false),
      error: () => this.isExecuting.set(false),
    });
  }

  resolveApproval(projectId: string, approvalId: string, approve: boolean): void {
    this.businessService.resolveApproval(projectId, approvalId, approve).subscribe();
  }

  createProject(): void {
    if (!this.newProjName || !this.newProjObjective) return;
    this.businessService
      .createProject({
        sector_id: this.newProjSector,
        name: this.newProjName,
        objective: this.newProjObjective,
        autonomy_level: Number(this.newProjAutonomy),
        budget_limit_usd: Number(this.newProjBudget),
      })
      .subscribe(() => {
        this.showNewProjModal.set(false);
        this.newProjName = '';
        this.newProjObjective = '';
      });
  }

  scoreOpportunity(): void {
    if (!this.newOppTitle || !this.newOppDesc) return;
    this.businessService
      .evaluateOpportunity({
        sector_id: this.newOppSector,
        title: this.newOppTitle,
        concept_description: this.newOppDesc,
        target_pricing_usd: Number(this.newOppPrice),
      })
      .subscribe(() => {
        this.showNewOppModal.set(false);
        this.newOppTitle = '';
        this.newOppDesc = '';
      });
  }

  getAutonomyDescription(level: number): string {
    switch (level) {
      case 0: return 'Level 0 — Observe Only (No automated action)';
      case 1: return 'Level 1 — Research & synthesis';
      case 2: return 'Level 2 — Planning & design specification';
      case 3: return 'Level 3 — Local build & verification';
      case 4: return 'Level 4 — Execute approved internal work';
      case 5: return 'Level 5 — External action requiring explicit approval';
      default: return `Level ${level}`;
    }
  }

  onAvatarErr(e: Event): void {
    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="100%" height="100%" fill="%2306b6d4"/><text x="50%" y="55%" fill="%23000" font-size="24" font-family="sans-serif" font-weight="bold" dominant-baseline="middle" text-anchor="middle">AR</text></svg>';
  }
}
