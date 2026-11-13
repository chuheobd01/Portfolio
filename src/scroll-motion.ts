import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

// Scroll motion, modelled on the Eggoria landing page:
//  1. Eased wheel/trackpad scrolling (Lenis). Touch stays native; "reduce motion" keeps the browser default.
//  2. Reveal on scroll: content fades in and rises 24px, items in a group staggered by 70ms. Plays once.
//     Content is only hidden after this script runs, so failed JS and "reduce motion" always show everything.
//  3. A light parallax on the hero portrait while the hero scrolls away (from 768px up).

declare global {
  interface Window {
    __lenis?: Lenis | null;
  }
}

const root = document.documentElement;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

/* 1. Smooth scrolling ------------------------------------------------------------------------ */
let lenis: Lenis | null = null;
const syncSmoothScroll = () => {
  if (reduced.matches) {
    lenis?.destroy();
    lenis = null;
  } else if (!lenis) {
    lenis = new Lenis({ lerp: 0.1, anchors: true, autoRaf: true });
  }
  window.__lenis = lenis;
};
syncSmoothScroll();
reduced.addEventListener('change', syncSmoothScroll);

/* 2. Reveal on scroll ------------------------------------------------------------------------ */
// `group`: the element that is watched; every match of `items` inside it reveals together.
// Without `group`, each match is watched on its own.
type Rule = { items: string; group?: string };

const rules: Rule[] = [
  { items: '.edu-exp-left > *', group: '.edu-exp-left' },
  { items: '.timeline-group' },
  { items: '.works-inner .edu-exp-pill' },
  { items: '.works-header-row' },
  { items: '.work-card', group: '#works-grid' },
  { items: '.approach-inner .edu-exp-pill' },
  { items: '.approach-heading-row' },
  { items: '.approach-subtitle' },
  { items: '.approach-card' },
  { items: '.tools-inner .edu-exp-pill' },
  { items: '.tools-title' },
  { items: '.tools-marquee-viewport' },
  { items: '.contact-inner > *', group: '.contact-inner' },
  { items: '.footer-inner > *', group: '.footer-inner' },
];

const DURATION = 800; // keep in step with the CSS transition
const STEP = 70;

const reveal = (items: HTMLElement[]) => {
  for (const el of items) {
    el.setAttribute('data-revealed', '');
    const delay = Number(el.style.getPropertyValue('--i') || 0) * STEP;
    // Hand the element back to its own styles (hover transitions and the like) once it has played.
    window.setTimeout(() => {
      el.removeAttribute('data-reveal');
      el.removeAttribute('data-revealed');
      el.style.removeProperty('--i');
    }, DURATION + delay + 150);
  }
};

const setupReveal = () => {
  if (reduced.matches) return;

  const onScreen = (el: Element) => el.getBoundingClientRect().top < window.innerHeight;
  const groups = new Map<Element, HTMLElement[]>();
  const pending = new Set<Element>();

  for (const rule of rules) {
    const items = [...document.querySelectorAll<HTMLElement>(rule.items)];
    items.forEach((el, i) => {
      el.setAttribute('data-reveal', '');
      el.style.setProperty('--i', rule.group ? String(i) : '0');
      const watched = rule.group ? el.closest(rule.group) : el;
      if (!watched) return;
      const list = groups.get(watched) ?? [];
      list.push(el);
      groups.set(watched, list);
    });
  }

  const onIntersect = (entries: IntersectionObserverEntry[], source: IntersectionObserver) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal(groups.get(entry.target) ?? []);
      pending.delete(entry.target);
      source.unobserve(entry.target);
    }
  };
  const observer = new IntersectionObserver(onIntersect, { rootMargin: '0px 0px -10% 0px' });
  // The footer is the end of the page: its last rows sit inside the bottom 10% and would never show.
  const edge = new IntersectionObserver(onIntersect, { rootMargin: '0px' });

  for (const [watched, items] of groups) {
    // Already on screen or scrolled past (reload, anchor, restored position): never hide what the reader can see.
    if (onScreen(watched)) reveal(items);
    else {
      pending.add(watched);
      (watched.closest('.site-footer') ? edge : observer).observe(watched);
    }
  }

  // A jump (anchor link, scroll-to-end) can carry the reader past content without it ever intersecting,
  // so the observer never fires for it. Anything now fully above the viewport shows at once.
  let sweep = 0;
  window.addEventListener(
    'scroll',
    () => {
      if (sweep || !pending.size) return;
      sweep = requestAnimationFrame(() => {
        sweep = 0;
        for (const watched of pending) {
          if (watched.getBoundingClientRect().bottom >= 0) continue;
          reveal(groups.get(watched) ?? []);
          pending.delete(watched);
          observer.unobserve(watched);
          edge.unobserve(watched);
        }
      });
    },
    { passive: true },
  );

  // A focused control must be visible.
  document.addEventListener('focusin', (event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-reveal]');
    if (target) reveal([target]);
  });

  root.dataset.motion = 'ready';
};
setupReveal();

/* 3. Hero portrait parallax ----------------------------------------------------------------- */
const portrait = document.getElementById('hero-photo');
if (portrait) {
  const desktop = window.matchMedia('(min-width: 768px)');
  let frame = 0;
  const update = () => {
    frame = 0;
    const apply = desktop.matches && !reduced.matches;
    portrait.style.translate = apply ? `0 ${Math.min(window.scrollY * 0.1, 48)}px` : '';
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!frame) frame = requestAnimationFrame(update);
    },
    { passive: true },
  );
}
