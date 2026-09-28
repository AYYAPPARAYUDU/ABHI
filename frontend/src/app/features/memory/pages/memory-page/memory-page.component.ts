import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoryListComponent } from '../../components/memory-list/memory-list.component';
import { MemoryDetailComponent } from '../../components/memory-detail/memory-detail.component';
import { MemoryService } from '../../services/memory.service';
import { PanelComponent } from '../../../../shared/components/panel/panel.component';

@Component({
  selector: 'app-memory-page',
  standalone: true,
  imports: [CommonModule, MemoryListComponent, MemoryDetailComponent, PanelComponent],
  templateUrl: './memory-page.component.html',
  styleUrl: './memory-page.component.css'
})
export class MemoryPageComponent {
  readonly memoryService = inject(MemoryService);
}
