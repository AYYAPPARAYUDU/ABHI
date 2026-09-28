import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ConsentModalComponent } from './consent-modal.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('ConsentModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConsentModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();
  });

  it('should create the consent modal component', () => {
    const fixture = TestBed.createComponent(ConsentModalComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
