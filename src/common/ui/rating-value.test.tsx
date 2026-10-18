import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import RatingValue from './rating-value';

/** Рейтинг со звездой — ADR-050. */
describe('RatingValue', () => {
  it('число — строкой как пришло, звезда — знак для глаза, не для чтеца', () => {
    const { container } = render(<RatingValue value="421.20" />);
    const value = container.querySelector('[data-rating-value]');

    // «421.20», а не «421.2»: сотая доля обязана дожить до экрана (ADR-014).
    expect(value?.textContent).toBe('421.20');
    expect(value?.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });
});
