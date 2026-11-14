/**
 * ABHI Motion Engine — High-Fidelity Micro-Interactions & Fluid Animations.
 *
 * Implements authoritative GSAP animations inspired by high-end motion design:
 * - `slidePill`: Elastic sliding clipPath pill indicator (horizontal & vertical)
 * - `landCards`: Staggered card entry physics with exponential easing
 * - `pulseAura`: Ambient breathing aura for living agent cores
 */

import { gsap } from 'gsap';

export interface Edges {
  l: number;
  t: number;
  r: number;
  b: number;
}

export interface SlidePillOptions {
  vertical?: boolean;
  leadDuration?: number;
  trailDuration?: number;
  crossDuration?: number;
  borderRadius?: number;
}

const hostStateMap = new WeakMap<HTMLElement, Edges>();

/**
 * Builds CSS inset() clip-path string from bounding box edges.
 */
export function clip(st: Edges, radius = 8): string {
  const top = Math.max(0, Math.round(st.t));
  const right = Math.max(0, Math.round(st.r));
  const bottom = Math.max(0, Math.round(st.b));
  const left = Math.max(0, Math.round(st.l));
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`;
}

/**
 * Elastic sliding pill indicator with leading-edge stretch and trailing-edge snap.
 * Ported directly from the authoritative motion physics spec.
 */
export function slidePill(
  pill: HTMLElement,
  target: HTMLElement,
  options: SlidePillOptions = {}
): gsap.core.Tween[] {
  const box = pill.parentElement;
  if (!box || !target) return [];

  const W = box.offsetWidth;
  const H = box.offsetHeight;
  const radius = options.borderRadius ?? 8;

  const to: Edges = {
    l: target.offsetLeft,
    t: target.offsetTop,
    r: Math.max(0, W - (target.offsetLeft + target.offsetWidth)),
    b: Math.max(0, H - (target.offsetTop + target.offsetHeight)),
  };

  const prev: Edges = hostStateMap.get(pill) ?? {
    l: to.l,
    t: to.t,
    r: to.r,
    b: to.b,
  };

  // Determine direction
  const isVertical =
    options.vertical !== undefined
      ? options.vertical
      : Math.abs(to.t - prev.t) > Math.abs(to.l - prev.l);

  const fwd = isVertical ? to.t >= prev.t : to.l >= prev.l;
  const [lead, trail] = isVertical
    ? fwd
      ? (['b', 't'] as const)
      : (['t', 'b'] as const)
    : fwd
      ? (['r', 'l'] as const)
      : (['l', 'r'] as const);

  const cross = isVertical
    ? (['l', 'r'] as const)
    : (['t', 'b'] as const);

  const st: Edges = { ...prev };
  hostStateMap.set(pill, st);

  gsap.killTweensOf(st);

  const paint = () => {
    gsap.set(pill, { clipPath: clip(st, radius) });
  };

  // Immediate initial paint if fresh
  paint();

  const leadTween = gsap.to(st, {
    [lead]: to[lead],
    duration: options.leadDuration ?? 0.36,
    ease: 'power3.out',
    onUpdate: paint,
  });

  const trailTween = gsap.to(st, {
    [trail]: to[trail],
    duration: options.trailDuration ?? 0.55,
    ease: 'power3.inOut',
    onUpdate: paint,
  });

  const crossTween = gsap.to(st, {
    [cross[0]]: to[cross[0]],
    [cross[1]]: to[cross[1]],
    duration: options.crossDuration ?? 0.45,
    ease: 'power3.inOut',
    onUpdate: paint,
  });

  return [leadTween, trailTween, crossTween];
}

/**
 * Staggered card entrance animation with exponential easing.
 * Every page's cards land in reading order with precision physical inertia.
 */
export function landCards(
  cards: Element[] | NodeListOf<Element>,
  options: {
    y?: number;
    stagger?: number;
    delay?: number;
    duration?: number;
    scale?: number;
  } = {}
): gsap.core.Timeline {
  const elements = Array.from(cards).filter((el) => !!el);
  const tl = gsap.timeline({ delay: options.delay ?? 0 });
  if (!elements.length) return tl;

  const yOffset = options.y ?? 26;
  const staggerTime = options.stagger ?? 0.06;
  const durTime = options.duration ?? 0.8;
  const startScale = options.scale ?? 0.985;

  tl.fromTo(
    elements,
    {
      opacity: 0,
      y: yOffset,
      scale: startScale,
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: durTime,
      ease: 'expo.out',
      stagger: staggerTime,
      clearProps: 'transform,opacity',
    }
  );

  return tl;
}

/**
 * Continuous holographic pulse breathing aura for living agent cores.
 */
export function pulseAura(
  element: HTMLElement,
  glowColor = 'rgba(0, 240, 255, 0.4)'
): gsap.core.Tween {
  return gsap.to(element, {
    boxShadow: `0 0 28px ${glowColor}, inset 0 0 16px ${glowColor}`,
    repeat: -1,
    yoyo: true,
    duration: 1.8,
    ease: 'sine.inOut',
  });
}
