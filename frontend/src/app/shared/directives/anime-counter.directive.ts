import { Directive, ElementRef, Input, OnChanges, SimpleChanges, inject } from '@angular/core';
import { AnimeAnimationService } from '../../core/services/anime-animation.service';

@Directive({
  selector: '[appAnimeCounter]',
  standalone: true
})
export class AnimeCounterDirective implements OnChanges {
  private el = inject(ElementRef);
  private animService = inject(AnimeAnimationService);

  @Input('appAnimeCounter') targetValue: number = 0;
  @Input() counterDuration: number = 900;
  @Input() counterDecimals: number = 0;
  @Input() counterPrefix: string = '';
  @Input() counterSuffix: string = '';

  private currentObj = { value: 0 };
  private initialized = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['targetValue']) {
      const start = this.initialized ? this.currentObj.value : 0;
      this.currentObj.value = start;
      this.initialized = true;

      this.animService.countUp(this.currentObj, this.targetValue, {
        duration: this.counterDuration,
        decimals: this.counterDecimals,
        prefix: this.counterPrefix,
        suffix: this.counterSuffix,
        onUpdate: (formatted) => {
          this.el.nativeElement.textContent = formatted;
        }
      });
    }
  }
}
