'use client';

import { useSyncExternalStore } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/**
 * Live `prefers-reduced-motion` value. Reads the media query through
 * useSyncExternalStore instead of setState inside an effect, so there is no
 * extra render pass. The server snapshot is `false` (motion allowed).
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  );
}

const subscribeNothing = () => () => {};

/** `false` during SSR and hydration, `true` once rendering on the client. */
export function useIsClient(): boolean {
  return useSyncExternalStore(subscribeNothing, () => true, () => false);
}
