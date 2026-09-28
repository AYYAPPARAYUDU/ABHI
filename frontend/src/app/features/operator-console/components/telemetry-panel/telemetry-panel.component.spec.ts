import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TelemetryPanelComponent } from './telemetry-panel.component';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../../core/api/task-api.service';
import { OperatorStateService } from '../../../../core/services/operator-state.service';

describe('TelemetryPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TelemetryPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();
  });

  it('should create the telemetry panel component', () => {
    const fixture = TestBed.createComponent(TelemetryPanelComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
