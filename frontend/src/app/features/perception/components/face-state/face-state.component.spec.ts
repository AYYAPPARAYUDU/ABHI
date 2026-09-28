import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaceStateComponent } from './face-state.component';
import { PerceptionService } from '../../services/perception.service';

describe('FaceStateComponent', () => {
  let component: FaceStateComponent;
  let fixture: ComponentFixture<FaceStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaceStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FaceStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render face telemetry HUD', () => {
    expect(component).toBeTruthy();
  });
});
