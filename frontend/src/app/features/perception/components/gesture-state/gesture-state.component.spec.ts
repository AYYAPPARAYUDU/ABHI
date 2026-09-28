import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestureStateComponent } from './gesture-state.component';
import { PerceptionService } from '../../services/perception.service';

describe('GestureStateComponent', () => {
  let component: GestureStateComponent;
  let fixture: ComponentFixture<GestureStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestureStateComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GestureStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render gesture perception panel', () => {
    expect(component).toBeTruthy();
  });
});
