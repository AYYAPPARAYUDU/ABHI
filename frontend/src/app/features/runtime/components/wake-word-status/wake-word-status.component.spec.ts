import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WakeWordStatusComponent } from './wake-word-status.component';
import { RuntimeService } from '../../services/runtime.service';

describe('WakeWordStatusComponent', () => {
  let component: WakeWordStatusComponent;
  let fixture: ComponentFixture<WakeWordStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WakeWordStatusComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(WakeWordStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render wake word panel', () => {
    expect(component).toBeTruthy();
  });
});
