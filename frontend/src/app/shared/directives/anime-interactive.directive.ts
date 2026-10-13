import { Directive, ElementRef, HostListener, Input, OnInit, inject } from '@angular/core';
import { AnimeAnimationService } from '../../core/services/anime-animation.service';

@Directive({
  selector: '[appAnimeInteractive]',
  standalone: true
})
export class AnimeInteractiveDirective implements OnInit {
  private el = inject(ElementRef);
  private animService = inject(AnimeAnimationService);

  @Input() appAnimeType: 'button' | 'card' | 'badge' | 'subtle' = 'button';
  @Input() appAnimeLift: number = -3;
  @Input() appAnimeEntrance: boolean = false;
  @Input() appAnimeDelay: number = 0;

  ngOnInit(): void {
    if (this.appAnimeEntrance) {
      this.animService.staggerEnter({
        targets: this.el.nativeElement,
        delay: this.appAnimeDelay,
        duration: 500
      });
    }
  }

  @HostListener('mouseenter')
  onMouseEnter(): void {
    const lift = this.appAnimeType === 'card' ? -5 : this.appAnimeType === 'subtle' ? -1 : this.appAnimeLift;
    this.animService.hoverLift(this.el.nativeElement, true, lift);
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.animService.hoverLift(this.el.nativeElement, false, 0);
  }

  @HostListener('mousedown')
  onMouseDown(): void {
    this.animService.tactileClick(this.el.nativeElement);
  }
}
