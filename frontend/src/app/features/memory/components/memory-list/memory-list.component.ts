import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoryService } from '../../services/memory.service';
import { MemoryCardComponent } from '../memory-card/memory-card.component';
import { MemoryTypeFilterComponent } from '../memory-type-filter/memory-type-filter.component';
import { MemorySearchComponent } from '../memory-search/memory-search.component';

@Component({
  selector: 'app-memory-list',
  standalone: true,
  imports: [CommonModule, MemoryCardComponent, MemoryTypeFilterComponent, MemorySearchComponent],
  templateUrl: './memory-list.component.html',
  styleUrl: './memory-list.component.css'
})
export class MemoryListComponent {
  readonly memoryService = inject(MemoryService);
}
