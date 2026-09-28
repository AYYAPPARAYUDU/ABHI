import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemoryService } from '../../services/memory.service';

@Component({
  selector: 'app-memory-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './memory-detail.component.html',
  styleUrl: './memory-detail.component.css'
})
export class MemoryDetailComponent {
  readonly memoryService = inject(MemoryService);

  get selectedMemory() {
    return this.memoryService.selectedMemory();
  }

  onForget(): void {
    const mem = this.selectedMemory;
    if (mem && confirm(`Are you sure you want ABHI to forget memory '${mem.memory_id}'?`)) {
      this.memoryService.forgetMemory(mem.memory_id);
    }
  }
}
