import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StartupStatusComponent } from './startup-status.component';
import { RuntimeService } from '../../services/runtime.service';

describe('StartupStatusComponent', () => {
  let component: StartupStatusComponent;
  let fixture: ComponentFixture<StartupStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StartupStatusComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StartupStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render startup status component', () => {
    expect(component).toBeTruthy();
  });
});
