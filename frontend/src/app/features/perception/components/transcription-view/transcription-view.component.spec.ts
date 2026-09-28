import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranscriptionViewComponent } from './transcription-view.component';
import { PerceptionService } from '../../services/perception.service';

describe('TranscriptionViewComponent', () => {
  let component: TranscriptionViewComponent;
  let fixture: ComponentFixture<TranscriptionViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscriptionViewComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TranscriptionViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and render transcription view', () => {
    expect(component).toBeTruthy();
  });
});
