import { describe, expect, it } from 'vitest';

import { toIdentifier } from './identifier';

describe('логин или телефон для добавления в состав', () => {
  it('номер в любом привычном написании приводится к +7XXXXXXXXXX', () => {
    expect(toIdentifier('8 701 123 45 67')).toBe('+77011234567');
    expect(toIdentifier('+7 (701) 123-45-67')).toBe('+77011234567');
    expect(toIdentifier('7011234567')).toBe('+77011234567');
    expect(toIdentifier('+77011234567')).toBe('+77011234567');
  });

  it('логин остаётся логином, даже если в нём есть цифры', () => {
    expect(toIdentifier(' organizer ')).toBe('organizer');
    expect(toIdentifier('coach2026')).toBe('coach2026');
  });

  it('недописанный номер не выдумывается: сервер ответит, что такого нет', () => {
    expect(toIdentifier('8 701 123')).toBe('8 701 123');
  });
});
