from pathlib import Path

target_file = Path("frontend/src/app/layout/components/contextual-topbar/contextual-topbar.component.ts")
content = target_file.read_text(encoding="utf-8")

old_code = '''import { WorkingEnvironmentComponent, WORKING_ENVIRONMENTS } from '../working-environment/working-environment.component';

@Component({
  selector: 'app-contextual-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, AnimeInteractiveDirective, WorkingEnvironmentComponent],
  templateUrl: './contextual-topbar.component.html',
  styleUrl: './contextual-topbar.component.css'
})
export class ContextualTopbarComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly stateService = inject(OperatorStateService);'''

new_code = '''import { BiometricFaceScannerComponent } from '../../../features/perception/components/biometric-face-scanner/biometric-face-scanner.component';
import { WorkingEnvironmentComponent, WORKING_ENVIRONMENTS } from '../working-environment/working-environment.component';

@Component({
  selector: 'app-contextual-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule, AnimeInteractiveDirective, WorkingEnvironmentComponent, BiometricFaceScannerComponent],
  templateUrl: './contextual-topbar.component.html',
  styleUrl: './contextual-topbar.component.css'
})
export class ContextualTopbarComponent implements OnInit, OnDestroy, AfterViewInit {
  readonly showScannerModal = signal<boolean>(false);
  readonly stateService = inject(OperatorStateService);'''

old_norm = old_code.replace("\r\n", "\n")
content_norm = content.replace("\r\n", "\n")

if old_norm in content_norm:
    content_norm = content_norm.replace(old_norm, new_code.replace("\r\n", "\n"), 1)
    target_file.write_text(content_norm, encoding="utf-8")
    print("SUCCESS: contextual-topbar.component.ts updated!")
else:
    print("ERROR: old_code not found in contextual-topbar.component.ts!")
