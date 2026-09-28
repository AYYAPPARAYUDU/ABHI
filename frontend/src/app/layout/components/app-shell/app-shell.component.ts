import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { AppNavigationComponent } from '../app-navigation/app-navigation.component';
import { GlobalSafetyBarComponent } from '../global-safety-bar/global-safety-bar.component';
import { ConsentModalComponent } from '../../../features/operator-console/components/consent-modal/consent-modal.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    AppHeaderComponent,
    AppNavigationComponent,
    GlobalSafetyBarComponent,
    ConsentModalComponent
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.css'
})
export class AppShellComponent {}
