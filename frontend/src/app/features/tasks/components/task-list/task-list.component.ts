import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskHistoryService } from '../../services/task-history.service';
import { TaskCardComponent } from '../task-card/task-card.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskCardComponent],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css'
})
export class TaskListComponent {
  readonly taskHistory = inject(TaskHistoryService);
  searchQuery: string = '';

  onSearchChange(): void {
    this.taskHistory.setSearchQuery(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.taskHistory.setSearchQuery('');
  }
}
