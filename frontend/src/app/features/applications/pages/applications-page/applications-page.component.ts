import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApplicationService } from '../../services/application.service';
import { ApplicationCardComponent } from '../../components/application-card/application-card.component';
import { CapabilityTableComponent } from '../../components/capability-table/capability-table.component';

@Component({
  selector: 'app-applications-page',
  standalone: true,
  imports: [CommonModule, ApplicationCardComponent, CapabilityTableComponent],
  templateUrl: './applications-page.component.html',
  styleUrl: './applications-page.component.css'
})
export class ApplicationsPageComponent implements OnInit {
  readonly appService = inject(ApplicationService);

  ngOnInit(): void {
    this.appService.loadApplications();
  }

  onSelectApp(appId: string): void {
    this.appService.selectApplication(appId);
  }

  onToggleApp(event: { id: string; enabled: boolean }): void {
    this.appService.toggleApplication(event.id, event.enabled);
  }

  onLaunchApp(appId: string): void {
    this.appService.launchApplication(appId);
  }

  onFocusApp(appId: string): void {
    this.appService.focusApplication(appId);
  }

  onSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.appService.setSearchQuery(input.value);
  }
}
