import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SystemPageComponent } from './system-page.component';
import { OperatorStateService } from '../../../../core/services/operator-state.service';
import { TelemetryService } from '../../../../core/websocket/telemetry.service';
import { TaskApiService } from '../../../../core/api/task-api.service';

describe('SystemPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        TaskApiService,
        TelemetryService,
        OperatorStateService
      ]
    }).compileComponents();
  });

  it('should create system page component', () => {
    const fixture = TestBed.createComponent(SystemPageComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
