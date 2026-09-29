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

  onConfirm(): void {
    const mem = this.selectedMemory;
    if (mem) {
      this.memoryService.confirmMemory(mem.memory_id);
    }
  }

  onReject(): void {
    const mem = this.selectedMemory;
    if (mem) {
      const reason = prompt('Enter reason for rejection:', 'Inaccurate candidate fact');
      if (reason !== null) {
        this.memoryService.rejectMemory(mem.memory_id, reason);
      }
    }
  }

  onForget(deletionType: string = 'SOFT_DELETE'): void {
    const mem = this.selectedMemory;
    if (mem && confirm(`Are you sure you want ABHI to delete memory '${mem.memory_id}' with mode ${deletionType}?`)) {
      this.memoryService.forgetMemory(mem.memory_id, deletionType);
    }
  }
}
