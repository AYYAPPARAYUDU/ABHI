import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerceptionPageComponent } from './perception-page.component';

describe('PerceptionPageComponent', () => {
  let component: PerceptionPageComponent;
  let fixture: ComponentFixture<PerceptionPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PerceptionPageComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(PerceptionPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render all perception feature modules', () => {
    expect(component).toBeTruthy();
  });
});
