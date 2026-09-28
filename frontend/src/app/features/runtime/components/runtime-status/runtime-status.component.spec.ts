import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RuntimeStatusComponent } from './runtime-status.component';
import { RuntimeService } from '../../services/runtime.service';

describe('RuntimeStatusComponent', () => {
  let component: RuntimeStatusComponent;
  let fixture: ComponentFixture<RuntimeStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RuntimeStatusComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(RuntimeStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render runtime lifecycle panel', () => {
    expect(component).toBeTruthy();
  });
});
