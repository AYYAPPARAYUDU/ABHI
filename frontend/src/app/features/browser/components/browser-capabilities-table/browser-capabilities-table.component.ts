import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserCapabilityModel } from '../../models/browser.model';

@Component({
  selector: 'app-browser-capabilities-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './browser-capabilities-table.component.html',
  styleUrls: ['./browser-capabilities-table.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrowserCapabilitiesTableComponent {
  @Input() capabilities: BrowserCapabilityModel[] = [];

  getRiskBadgeClass(risk: string): string {
    switch (risk) {
      case 'CRITICAL':
      case 'HIGH':
        return 'risk-high';
      case 'MEDIUM':
        return 'risk-medium';
      case 'LOW':
        return 'risk-low';
      default:
        return 'risk-readonly';
    }
  }
}
