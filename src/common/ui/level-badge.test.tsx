import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ru } from '@/common/i18n/ru';

import LevelBadge from './level-badge';

/** Уровень 1–10 по рейтингу — ADR-070. */
describe('LevelBadge', () => {
  it('номер уровня виден, название — в подписи для чтеца', () => {
    const { container } = render(<LevelBadge rating="340.00" />);
    const badge = container.querySelector('[data-level]');

    expect(badge?.getAttribute('data-level')).toBe('4');
    expect(badge?.textContent).toBe('4');
    expect(badge?.getAttribute('aria-label')).toContain(ru['level.name.4']);
  });

  it('граница уровня принадлежит верхнему: 1000 — десятый, кольцо полное', () => {
    const { container } = render(<LevelBadge rating={1000} tone="night" />);

    expect(container.querySelector('[data-level]')?.getAttribute('data-level')).toBe('10');
    expect(container.querySelectorAll('circle')[1]?.getAttribute('stroke-linecap')).toBe('butt');
  });
});
