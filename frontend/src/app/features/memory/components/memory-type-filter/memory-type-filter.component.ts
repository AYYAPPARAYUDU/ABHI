import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoryService } from '../../services/memory.service';

@Component({
  selector: 'app-memory-type-filter',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memory-type-filter.component.html',
  styleUrl: './memory-type-filter.component.css'
})
export class MemoryTypeFilterComponent {
  readonly memoryService = inject(MemoryService);

  get currentCategory(): string {
    return this.memoryService.filters().category;
  }

  get currentType(): string {
    return this.memoryService.filters().memoryType;
  }

  get currentPrivacy(): string {
    return this.memoryService.filters().privacy;
  }

  setCategory(cat: string): void {
    this.memoryService.setCategoryFilter(cat);
  }

  setType(type: string): void {
    this.memoryService.setTypeFilter(type);
  }

  setPrivacy(privacy: string): void {
    this.memoryService.setPrivacyFilter(privacy);
  }
}
