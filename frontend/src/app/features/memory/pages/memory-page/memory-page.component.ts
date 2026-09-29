import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoryListComponent } from '../../components/memory-list/memory-list.component';
import { MemoryDetailComponent } from '../../components/memory-detail/memory-detail.component';
import { ProcedureLibraryComponent } from '../../components/procedure-library/procedure-library.component';
import { ConflictResolverComponent } from '../../components/conflict-resolver/conflict-resolver.component';
import { MemoryService } from '../../services/memory.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-memory-page',
  standalone: true,
  imports: [
    CommonModule,
    MemoryListComponent,
    MemoryDetailComponent,
    ProcedureLibraryComponent,
    ConflictResolverComponent,
    PanelComponent
  ],
  templateUrl: './memory-page.component.html',
  styleUrl: './memory-page.component.css'
})
export class MemoryPageComponent {
  readonly memoryService = inject(MemoryService);

  onTabChange(tab: 'memories' | 'procedures' | 'conflicts'): void {
    this.memoryService.setTab(tab);
  }

  onPromoteProcedure(procId: string): void {
    this.memoryService.promoteProcedure(procId);
  }

  onDeprecateProcedure(event: { id: string; reason: string }): void {
    this.memoryService.deprecateProcedure(event.id, event.reason);
  }

  onResolveConflict(event: { conflictId: string; candidate: 'A' | 'B'; notes?: string }): void {
    this.memoryService.resolveConflict(event.conflictId, event.candidate, event.notes || '');
  }
}
