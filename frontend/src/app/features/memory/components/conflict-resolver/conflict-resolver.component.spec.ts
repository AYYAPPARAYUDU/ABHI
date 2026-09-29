import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConflictResolverComponent } from './conflict-resolver.component';
import { MemoryConflict } from '../../models/memory.model';

describe('ConflictResolverComponent', () => {
  let component: ConflictResolverComponent;
  let fixture: ComponentFixture<ConflictResolverComponent>;

  const mockConflict: MemoryConflict = {
    conflict_id: 'conf_123',
    memory_id_a: 'mem_a',
    memory_id_b: 'mem_b',
    key: 'editor',
    candidate_a: {
      memory_id: 'mem_a',
      value: 'VS Code',
      source: 'USER_EXPLICIT',
      confidence: 1.0
    },
    candidate_b: {
      memory_id: 'mem_b',
      value: 'Neovim',
      source: 'SYSTEM_OBSERVED',
      confidence: 0.8
    },
    status: 'UNRESOLVED'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConflictResolverComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConflictResolverComponent);
    component = fixture.componentInstance;
    component.conflicts = [mockConflict];
    fixture.detectChanges();
  });

  it('should create conflict resolver component', () => {
    expect(component).toBeTruthy();
  });

  it('should render candidate comparison side by side', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('VS Code');
    expect(compiled.textContent).toContain('Neovim');
    expect(compiled.textContent).toContain("Key: 'editor'");
  });

  it('should emit resolveConflict when candidate A is chosen', () => {
    let resolution: any = null;
    component.resolveConflict.subscribe((r) => (resolution = r));

    vi.spyOn(window, 'prompt').mockReturnValue('Keep VS Code preference');
    component.onSelectCandidate('conf_123', 'A');

    expect(resolution).toEqual({
      conflictId: 'conf_123',
      candidate: 'A',
      notes: 'Keep VS Code preference'
    });
  });

  it('should emit resolveConflict when candidate B is chosen', () => {
    let resolution: any = null;
    component.resolveConflict.subscribe((r) => (resolution = r));

    vi.spyOn(window, 'prompt').mockReturnValue('Adopt Neovim preference');
    component.onSelectCandidate('conf_123', 'B');

    expect(resolution).toEqual({
      conflictId: 'conf_123',
      candidate: 'B',
      notes: 'Adopt Neovim preference'
    });
  });

  it('should not emit resolveConflict when prompt is cancelled', () => {
    let called = false;
    component.resolveConflict.subscribe(() => (called = true));

    vi.spyOn(window, 'prompt').mockReturnValue(null);
    component.onSelectCandidate('conf_123', 'A');

    expect(called).toBe(false);
  });

  it('should show empty placeholder when conflicts list is empty', () => {
    fixture.componentRef.setInput('conflicts', []);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('No Memory Conflicts Detected');
  });
});
