import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './error-state.component.html',
  styleUrl: './error-state.component.css'
})
export class ErrorStateComponent {
  @Input() title: string = 'Operation Failed';
  @Input({ required: true }) message!: string;
  @Input() showRetry: boolean = false;
  @Output() retry = new EventEmitter<void>();
}
