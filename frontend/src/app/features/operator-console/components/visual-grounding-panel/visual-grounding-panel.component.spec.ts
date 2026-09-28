import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { VisualGroundingPanelComponent } from './visual-grounding-panel.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('VisualGroundingPanelComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VisualGroundingPanelComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();
  });

  it('should create the visual grounding panel component', () => {
    const fixture = TestBed.createComponent(VisualGroundingPanelComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
