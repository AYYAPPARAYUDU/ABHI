import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppShellComponent } from './layout/components/app-shell/app-shell.component';
import { OperatorStateService } from './core/services/operator-state.service';
import { bootstrapSession } from './core/config/api-config';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    AppShellComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly stateService = inject(OperatorStateService);

  ngOnInit(): void {
    bootstrapSession().catch(() => {});
    // Initial authoritative snapshot & WebSocket connect
    this.stateService.refreshAuthoritativeState();
  }
}
