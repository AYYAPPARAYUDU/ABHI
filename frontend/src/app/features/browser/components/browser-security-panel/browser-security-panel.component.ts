import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserSecurityEventModel } from '../../models/browser.model';

@Component({
  selector: 'app-browser-security-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './browser-security-panel.component.html',
  styleUrls: ['./browser-security-panel.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrowserSecurityPanelComponent {
  @Input() securityEvents: BrowserSecurityEventModel[] = [];
  @Output() clearEvents = new EventEmitter<void>();

  onClear() {
    this.clearEvents.emit();
  }

  getSeverityBadge(sev: string): string {
    switch (sev) {
      case 'CRITICAL':
      case 'HIGH':
        return 'badge-danger';
      case 'MEDIUM':
        return 'badge-warning';
      default:
        return 'badge-info';
    }
  }
}
