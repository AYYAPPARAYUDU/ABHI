import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SafetyPanelComponent } from './safety-panel.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('SafetyPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SafetyPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();
  });

  it('should create the safety panel component', () => {
    const fixture = TestBed.createComponent(SafetyPanelComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
