import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UniversalResultSheetComponent } from './result-sheet.component';
import { AgentCommandResult } from '../../../core/models/agent-experience.model';

describe('UniversalResultSheetComponent', () => {
  let component: UniversalResultSheetComponent;
  let fixture: ComponentFixture<UniversalResultSheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UniversalResultSheetComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(UniversalResultSheetComponent);
    component = fixture.componentInstance;
  });

  it('should create result sheet component', () => {
    expect(component).toBeTruthy();
  });

  it('should render mathematical calculation outcome', () => {
    const calcResult: AgentCommandResult = {
      resultId: 'r1',
      commandId: 'c1',
      type: 'NUMBER_RESULT',
      title: 'Calculation Completed',
      summary: '125 * 48 = 6000',
      calculationExpression: '125 * 48',
      numberValue: 6000,
      timestamp: Date.now()
    };

    fixture.componentRef.setInput('result', calcResult);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Calculation Completed');
    expect(el.textContent).toContain('125 * 48');
    expect(el.textContent).toContain('6000');
  });

  it('should render search results list', () => {
    const searchResult: AgentCommandResult = {
      resultId: 'r2',
      commandId: 'c2',
      type: 'SEARCH_RESULTS',
      title: 'Media Search',
      summary: 'Found 1 item',
      searchResults: [
        {
          id: 's1',
          title: 'Cyberpunk Skyline',
          subtitle: 'Generative image artifact',
          type: 'media'
        }
      ],
      timestamp: Date.now()
    };

    fixture.componentRef.setInput('result', searchResult);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Cyberpunk Skyline');
    expect(el.textContent).toContain('Generative image artifact');
  });

  it('should emit onDismiss when close button is clicked', () => {
    let dismissed = false;
    component.onDismiss.subscribe(() => (dismissed = true));

    fixture.componentRef.setInput('result', {
      resultId: 'r3',
      commandId: 'c3',
      type: 'TEXT_RESULT',
      title: 'Action Completed',
      summary: 'Done',
      timestamp: Date.now()
    });
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.close-btn') as HTMLButtonElement;
    closeBtn.click();
    expect(dismissed).toBe(true);
  });
});
