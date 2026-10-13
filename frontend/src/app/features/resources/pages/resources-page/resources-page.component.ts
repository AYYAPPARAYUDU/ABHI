import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResourceService } from '../../services/resource.service';
import { OperatingMode } from '../../models/resource.model';
import { HardwareGaugePanelComponent } from '../../components/hardware-gauge-panel/hardware-gauge-panel.component';
import { OperatingModeSelectorComponent } from '../../components/operating-mode-selector/operating-mode-selector.component';
import { ModelLifecycleCardComponent } from '../../components/model-lifecycle-card/model-lifecycle-card.component';
import { WorkloadQueueTableComponent } from '../../components/workload-queue-table/workload-queue-table.component';

@Component({
  selector: 'app-resources-page',
  standalone: true,
  imports: [
    CommonModule,
    HardwareGaugePanelComponent,
    OperatingModeSelectorComponent,
    ModelLifecycleCardComponent,
    WorkloadQueueTableComponent
  ],
  templateUrl: './resources-page.component.html',
  styleUrl: './resources-page.component.css'
})
export class ResourcesPageComponent implements OnInit {
  resourceService = inject(ResourceService);

  ngOnInit(): void {
    this.resourceService.fetchSummary().subscribe();
  }

  onRefresh(): void {
    this.resourceService.fetchSummary().subscribe();
  }

  onModeChange(mode: OperatingMode): void {
    this.resourceService.setOperatingMode(mode).subscribe();
  }

  onLoadModel(modelId: string): void {
    this.resourceService.loadModel(modelId).subscribe();
  }

  onUnloadModel(event: { modelId: string; force: boolean }): void {
    this.resourceService.unloadModel(event.modelId, event.force).subscribe();
  }

  onReconcile(): void {
    this.resourceService.reconcileOrphans().subscribe();
  }
}
