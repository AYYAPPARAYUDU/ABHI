import { Component, inject, OnInit, AfterViewInit, signal, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BusinessService } from '../../services/business.service';
import { ThreeSceneManagerService } from '../../../../shared/3d/three-scene-manager.service';
import { AnimeAnimationService } from '../../../../core/services/anime-animation.service';
import { SectorsDashboardComponent } from '../../components/sectors-dashboard/sectors-dashboard.component';
import { FinancialLedgerComponent } from '../../components/financial-ledger/financial-ledger.component';
import { ProjectInitiativesComponent } from '../../components/project-initiatives/project-initiatives.component';
import { MarketDynamicsComponent } from '../../components/market-dynamics/market-dynamics.component';
import { BusinessProject } from '../../models/business.model';

export type BusinessWorkspaceTab = 'all' | 'sectors' | 'initiatives' | 'financials' | 'market';

@Component({
  selector: 'app-business-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SectorsDashboardComponent,
    FinancialLedgerComponent,
    ProjectInitiativesComponent,
    MarketDynamicsComponent,
  ],
  templateUrl: './business-page.component.html',
  styleUrl: './business-page.component.css',
})
export class BusinessPageComponent implements OnInit, AfterViewInit {
  readonly businessService = inject(BusinessService);
  readonly animService = inject(AnimeAnimationService);
  private readonly threeScene = inject(ThreeSceneManagerService);
  private readonly hostEl = inject(ElementRef);

  readonly activeTab = signal<BusinessWorkspaceTab>('all');
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
    this.businessService.fetchSectors().subscribe(() => this.animateCards());
    this.businessService.fetchProjects().subscribe(() => this.animateCards());
    this.businessService.fetchOpportunities().subscribe();
    this.businessService.fetchFinancials().subscribe();
  }

  ngAfterViewInit(): void {
    this.animateCards();
  }

  setWorkspaceTab(tab: BusinessWorkspaceTab, event?: MouseEvent): void {
    if (event?.currentTarget) {
      this.animService.tactileClick(event.currentTarget as HTMLElement);
    }
    this.activeTab.set(tab);
    setTimeout(() => this.animateCards(), 50);
  }

  private animateCards(): void {
    const root = this.hostEl.nativeElement;
    if (!root) return;

    const sections = root.querySelectorAll('app-sectors-dashboard, app-financial-ledger, app-project-initiatives, app-market-dynamics');
    if (sections.length > 0) {
      this.animService.staggerEnter({
        targets: sections,
        translateY: [16, 0],
        opacity: [0, 1],
        duration: 500,
        delay: 50,
      });
    }
  }

  onSectorSelected(sectorId: string): void {
    if (this.selectedSectorId() === sectorId) {
      this.selectedSectorId.set(null);
      this.businessService.fetchProjects().subscribe(() => this.animateCards());
    } else {
      this.selectedSectorId.set(sectorId);
      this.businessService.fetchProjects(sectorId).subscribe(() => this.animateCards());
    }
  }

  filteredProjects(): BusinessProject[] {
    const all = this.businessService.projects();
    const sec = this.selectedSectorId();
    if (!sec) return all;
    return all.filter((p) => p.sector_id === sec);
  }

  onProjectSelected(proj: BusinessProject): void {
    this.businessService.selectedProject.set(proj);
  }

  executeNextStep(projectId: string): void {
    this.isExecuting.set(true);
    this.businessService.executeNextStep(projectId).subscribe({
      next: () => this.isExecuting.set(false),
      error: () => this.isExecuting.set(false),
    });
  }

  resolveApproval(event: { projectId: string; approvalId: string; approve: boolean }): void {
    this.businessService.resolveApproval(event.projectId, event.approvalId, event.approve).subscribe();
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

  onAvatarErr(e: Event): void {
    (e.target as HTMLImageElement).src =
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72"><rect width="100%" height="100%" fill="%2306b6d4"/><text x="50%" y="55%" fill="%23000" font-size="24" font-family="sans-serif" font-weight="bold" dominant-baseline="middle" text-anchor="middle">AR</text></svg>';
  }
}
