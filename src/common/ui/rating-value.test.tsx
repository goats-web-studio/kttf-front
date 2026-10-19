import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import RatingValue from './rating-value';

/** Рейтинг со звездой — ADR-050, целым — ADR-053. */
describe('RatingValue', () => {
  it('число — целым, звезда — знак для глаза, не для чтеца', () => {
    const { container } = render(<RatingValue value="421.50" />);
    const value = container.querySelector('[data-rating-value]');

    // Сотые остаются в журнале, на экране — ближайшее целое (ADR-053).
    expect(value?.textContent).toBe('422');
    expect(value?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
