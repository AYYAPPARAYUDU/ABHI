import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MemoryService } from '../../services/memory.service';

@Component({
  selector: 'app-memory-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './memory-search.component.html',
  styleUrl: './memory-search.component.css'
})
export class MemorySearchComponent {
  readonly memoryService = inject(MemoryService);
  searchQuery: string = '';

  onSearchChange(): void {
    this.memoryService.setSearchQuery(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.memoryService.setSearchQuery('');
  }
}
