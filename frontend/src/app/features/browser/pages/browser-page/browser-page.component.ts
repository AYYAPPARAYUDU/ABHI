import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserService } from '../../services/browser.service';
import { BrowserStatusCardComponent } from '../../components/browser-status-card/browser-status-card.component';
import { BrowserSecurityPanelComponent } from '../../components/browser-security-panel/browser-security-panel.component';
import { BrowserCapabilitiesTableComponent } from '../../components/browser-capabilities-table/browser-capabilities-table.component';

@Component({
  selector: 'app-browser-page',
  standalone: true,
  imports: [
    CommonModule,
    BrowserStatusCardComponent,
    BrowserSecurityPanelComponent,
    BrowserCapabilitiesTableComponent
  ],
  templateUrl: './browser-page.component.html',
  styleUrls: ['./browser-page.component.css']
})
export class BrowserPageComponent implements OnInit {
  readonly browserService = inject(BrowserService);

  ngOnInit(): void {
    this.browserService.loadStatus();
    this.browserService.loadCapabilities();
    this.browserService.loadSessions();
    this.browserService.loadSecurityEvents();
    this.browserService.loadDownloads();
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.browserService.setSearchQuery(input.value);
  }

  onStartSession(taskId: string) {
    this.browserService.startSession(taskId);
  }

  onStopSession(sessionId: string) {
    this.browserService.stopSession(sessionId);
  }

  onClearSecurityEvents() {
    this.browserService.clearSecurityEvents();
  }
}
