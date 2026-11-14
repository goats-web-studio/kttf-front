import { useMatchRoute } from '@tanstack/react-router';

import { SECTIONS, type Section } from './sections';

/** Раздел, в котором человек сейчас, — или `undefined` на главной и в кабинете. */
export function useActiveSection(): Section | undefined {
  const matchRoute = useMatchRoute();

  return SECTIONS.find((section) =>
    section.match.some((to) => matchRoute({ to, fuzzy: true }) !== false),
  );
}
