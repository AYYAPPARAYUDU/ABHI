import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskHistoryService } from '../../services/task-history.service';
import { TaskCardComponent } from '../task-card/task-card.component';
import { AnimeInteractiveDirective } from '../../../../shared/directives/anime-interactive.directive';
import { AnimeCounterDirective } from '../../../../shared/directives/anime-counter.directive';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskCardComponent, AnimeInteractiveDirective, AnimeCounterDirective],
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
