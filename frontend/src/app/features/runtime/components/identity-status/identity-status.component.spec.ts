import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IdentityStatusComponent } from './identity-status.component';
import { RuntimeService } from '../../services/runtime.service';

describe('IdentityStatusComponent', () => {
  let component: IdentityStatusComponent;
  let fixture: ComponentFixture<IdentityStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IdentityStatusComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(IdentityStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render identity levels component', () => {
    expect(component).toBeTruthy();
  });
});
