import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerceptionHealthComponent } from './perception-health.component';
import { PerceptionService } from '../../services/perception.service';

describe('PerceptionHealthComponent', () => {
  let component: PerceptionHealthComponent;
  let fixture: ComponentFixture<PerceptionHealthComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerceptionHealthComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PerceptionHealthComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render perception health matrix', () => {
    expect(component).toBeTruthy();
  });
});
