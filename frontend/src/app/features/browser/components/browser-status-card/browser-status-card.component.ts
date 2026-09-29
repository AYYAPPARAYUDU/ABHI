import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserStatusModel, BrowserSessionModel } from '../../models/browser.model';

@Component({
  selector: 'app-browser-status-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './browser-status-card.component.html',
  styleUrls: ['./browser-status-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrowserStatusCardComponent {
  @Input() status: BrowserStatusModel | null = null;
  @Input() activeSessions: BrowserSessionModel[] = [];
  @Input() promptInjectionAlertsCount: number = 0;

  @Output() startSession = new EventEmitter<string>();
  @Output() stopSession = new EventEmitter<string>();

  onStart() {
    this.startSession.emit(`task_user_${Date.now()}`);
  }

  onStop(sessionId: string) {
    this.stopSession.emit(sessionId);
  }
}
