import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RuntimeModeComponent } from './runtime-mode.component';
import { RuntimeService } from '../../services/runtime.service';

describe('RuntimeModeComponent', () => {
  let component: RuntimeModeComponent;
  let fixture: ComponentFixture<RuntimeModeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RuntimeModeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RuntimeModeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render runtime modes component', () => {
    expect(component).toBeTruthy();
  });
});
