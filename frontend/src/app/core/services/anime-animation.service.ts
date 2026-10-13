import { Injectable, NgZone } from '@angular/core';
import { animate, createTimeline, stagger, svg } from 'animejs';

export interface StaggerOptions {
  targets: any;
  delay?: any;
  duration?: number;
  ease?: string;
  translateY?: number | [number, number];
  opacity?: number | [number, number];
  scale?: number | [number, number];
  onComplete?: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class AnimeAnimationService {
  constructor(private ngZone: NgZone) {}

  /**
   * Staggered entrance for lists of cards, HUD items, or telemetry tiles
   */
  staggerEnter(options: StaggerOptions): any {
    return this.ngZone.runOutsideAngular(() => {
      const delayValue = options.delay !== undefined ? options.delay : stagger(60, { start: 50 });
      const params: Record<string, any> = {
        opacity: options.opacity ?? [0, 1],
        translateY: options.translateY ?? [20, 0],
        scale: options.scale ?? [0.96, 1],
        delay: delayValue,
        duration: options.duration ?? 650,
        ease: options.ease ?? 'outCubic'
      };
      if (options.onComplete) {
        params['onComplete'] = options.onComplete;
      }
      return animate(options.targets, params as any);
    });
  }

  /**
   * Tactile button click compression with elastic spring recovery
   */
  tactileClick(target: HTMLElement | SVGElement): any {
    return this.ngZone.runOutsideAngular(() => {
      return animate(target, {
        scale: [
          { to: 0.93, duration: 100, ease: 'outQuad' },
          { to: 1.03, duration: 200, ease: 'outElastic' },
          { to: 1.0, duration: 150, ease: 'outQuad' }
        ]
      } as any);
    });
  }

  /**
   * Tactile hover lift with smooth spring
   */
  hoverLift(target: HTMLElement | SVGElement, isHovered: boolean, liftY: number = -4): any {
    return this.ngZone.runOutsideAngular(() => {
      return animate(target, {
        translateY: isHovered ? liftY : 0,
        scale: isHovered ? 1.02 : 1.0,
        duration: isHovered ? 280 : 320,
        ease: isHovered ? 'outCubic' : 'outQuad'
      } as any);
    });
  }

  /**
   * Animated numeric counter (integers or decimals)
   */
  countUp(
    obj: { value: number },
    targetValue: number,
    options?: {
      duration?: number;
      decimals?: number;
      prefix?: string;
      suffix?: string;
      onUpdate?: (formatted: string) => void;
      onComplete?: () => void;
    }
  ): any {
    const duration = options?.duration ?? 950;
    const decimals = options?.decimals ?? 0;
    const prefix = options?.prefix ?? '';
    const suffix = options?.suffix ?? '';

    return this.ngZone.runOutsideAngular(() => {
      const params: Record<string, any> = {
        value: targetValue,
        duration,
        ease: 'outCubic',
        onUpdate: () => {
          if (options?.onUpdate) {
            const numStr = decimals > 0 ? obj.value.toFixed(decimals) : Math.round(obj.value).toLocaleString();
            options.onUpdate(`${prefix}${numStr}${suffix}`);
          }
        }
      };
      if (options?.onComplete) {
        params['onComplete'] = options.onComplete;
      }
      return animate(obj, params as any);
    });
  }

  /**
   * Organic cybernetic pulse wave (used for active status indicators, voice listening)
   */
  pulseWave(target: HTMLElement | SVGElement): any {
    return this.ngZone.runOutsideAngular(() => {
      return animate(target, {
        scale: [1, 1.15, 1],
        opacity: [0.8, 1, 0.8],
        duration: 1600,
        ease: 'inOutSine',
        loop: true
      } as any);
    });
  }

  /**
   * Cybernetic error shake on invalid input or failed automation
   */
  shakeError(target: HTMLElement | SVGElement): any {
    return this.ngZone.runOutsideAngular(() => {
      return animate(target, {
        translateX: [-10, 10, -8, 8, -4, 4, 0],
        duration: 450,
        ease: 'inOutSine'
      } as any);
    });
  }

  /**
   * Success celebration bounce and micro-flash
   */
  celebrateSuccess(target: HTMLElement | SVGElement): any {
    return this.ngZone.runOutsideAngular(() => {
      return animate(target, {
        scale: [
          { to: 1.08, duration: 180, ease: 'outQuad' },
          { to: 0.98, duration: 160, ease: 'inOutQuad' },
          { to: 1.0, duration: 250, ease: 'outElastic' }
        ]
      } as any);
    });
  }

  /**
   * SVG Path drawing / stroke-dashoffset animation
   */
  drawSvg(target: SVGGeometryElement | any, duration: number = 800): any {
    return this.ngZone.runOutsideAngular(() => {
      try {
        const drawables = svg.createDrawable(target);
        if (drawables && drawables.length > 0) {
          return animate(drawables, {
            draw: ['0 0', '0 100%'],
            duration,
            ease: 'inOutCubic'
          } as any);
        }
      } catch {
        // Fallback to strokeDashoffset
      }
      return animate(target, {
        strokeDashoffset: [1000, 0],
        duration,
        ease: 'inOutCubic'
      } as any);
    });
  }

  /**
   * Holographic pop-in modal / sheet entrance
   */
  popInModal(target: HTMLElement, backdrop?: HTMLElement): any {
    return this.ngZone.runOutsideAngular(() => {
      const tl = createTimeline({
        defaults: { ease: 'outCubic' }
      } as any);

      if (backdrop) {
        tl.add(backdrop, {
          opacity: [0, 1],
          duration: 250,
          ease: 'linear'
        } as any);
      }

      tl.add(target, {
        opacity: [0, 1],
        scale: [0.92, 1],
        translateY: [25, 0],
        duration: 400
      } as any, backdrop ? '-=150' : 0);

      return tl;
    });
  }

  /**
   * Modal exit animation with callback
   */
  popOutModal(target: HTMLElement, backdrop?: HTMLElement, onComplete?: () => void): any {
    return this.ngZone.runOutsideAngular(() => {
      const params: Record<string, any> = {
        defaults: { ease: 'inQuad' }
      };
      if (onComplete) {
        params['onComplete'] = onComplete;
      }
      const tl = createTimeline(params as any);

      tl.add(target, {
        opacity: [1, 0],
        scale: [1, 0.94],
        translateY: [0, 15],
        duration: 220
      } as any);

      if (backdrop) {
        tl.add(backdrop, {
          opacity: [1, 0],
          duration: 200
        } as any, '-=100');
      }

      return tl;
    });
  }
}
