import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StatusBarComponent } from './status-bar.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('StatusBarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBarComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();
  });

  it('should create the status bar component', () => {
    const fixture = TestBed.createComponent(StatusBarComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
