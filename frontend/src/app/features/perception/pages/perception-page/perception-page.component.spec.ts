import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PerceptionPageComponent } from './perception-page.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('PerceptionPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerceptionPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();
  });

  it('should create perception page component', () => {
    const fixture = TestBed.createComponent(PerceptionPageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
