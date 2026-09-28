import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-indicator.component.html',
  styleUrl: './status-indicator.component.css'
})
export class StatusIndicatorComponent {
  @Input() status: string = 'UNKNOWN';
  @Input() label?: string;
  @Input() showLabel: boolean = true;
  @Input() pulse: boolean = false;
}
