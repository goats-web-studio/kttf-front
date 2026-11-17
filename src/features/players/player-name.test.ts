import { describe, expect, it } from 'vitest';

import { ru } from '@/common/i18n/ru';

import { personName, playerName } from './player-name';

const t = (key: keyof typeof ru): string => ru[key];

describe('подпись игрока', () => {
  it('фамилия и имя', () => {
    expect(playerName({ lastName: 'Ахметов', firstName: 'Данияр' }, t)).toBe('Ахметов Данияр');
  });

  it('удалённый аккаунт — «Удалённый игрок» (ADR-092)', () => {
    expect(playerName({ lastName: '', firstName: '', deleted: true }, t)).toBe('Удалённый игрок');
    expect(personName(' ', false, t)).toBe('Удалённый игрок');
    expect(personName('Ахметов Данияр', false, t)).toBe('Ахметов Данияр');
  });
});
