import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScreenVisionStateComponent } from './screen-vision-state.component';
import { PerceptionService } from '../../services/perception.service';

describe('ScreenVisionStateComponent', () => {
  let component: ScreenVisionStateComponent;
  let fixture: ComponentFixture<ScreenVisionStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScreenVisionStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ScreenVisionStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render screen vision OCR panel', () => {
    expect(component).toBeTruthy();
  });
});
