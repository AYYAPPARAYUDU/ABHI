import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ExecutionTimelineComponent } from './execution-timeline.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('ExecutionTimelineComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExecutionTimelineComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();
  });

  it('should create the execution timeline component', () => {
    const fixture = TestBed.createComponent(ExecutionTimelineComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
