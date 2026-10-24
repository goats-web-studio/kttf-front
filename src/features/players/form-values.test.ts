import type { CreatePlayerInput, PlayerProfileView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { CITIES } from '@/test/fixtures';

import { equipmentProducts, toFormValues, toPlayerPatch } from './form-values';

/**
 * Переход профиль ↔ форма — ADR-035.
 *
 * Здесь решается, что означает пустое поле, и цена ошибки видна не сразу:
 * профиль сохранится, а стёртое поле останется прежним.
 */

const profile: PlayerProfileView = {
  id: '00000000-0000-4000-8000-000000000001',
  userId: null,
  lastName: 'Ахметов',
  firstName: 'Данияр',
  middleName: 'Ерланович',
  birthYear: 2001,
  gender: 'MALE',
  city: CITIES.almaty,
  photoUrl: null,
  clubId: null,
  rating: '250.00',
  ratedMatches: 0,
  isProvisional: true,
  confirmed: true,
  createdAt: '2026-08-30T00:00:00.000Z',
  birthDate: '2001-04-12',
  playingHand: 'RIGHT',
  grip: 'SHAKEHAND',
  blade: 'Butterfly Lin Gaoyuan ALC',
  rubberForehand: 'Nittaku Hurricane PRO 3',
  rubberBackhand: 'DHS Hurricane 8 Soft',
  bladeProduct: null,
  rubberForehandProduct: null,
  rubberBackhandProduct: null,
  bio: 'hate tensor, love sticky',
  coachPlayerId: null,
  coachName: 'Сериков Тимур',
  coachSlug: null,
  coachSince: null,
  coachHistory: [],
  coachVisibility: 'ALL',
  ownCoachSlug: null,
  lastSeenAt: null,
  online: false,
  birthYearOnly: true,
};

const filled: CreatePlayerInput = {
  lastName: 'Ахметов',
  firstName: 'Данияр',
  birthYear: 2001,
  gender: 'MALE',
  cityId: CITIES.almaty.id,
};

describe('профиль в форму', () => {
  it('анкета переносится целиком', () => {
    const values = toFormValues(profile);

    expect(values).toMatchObject({
      // Город в форме — идентификатор записи справочника (ADR-046).
      cityId: CITIES.almaty.id,
      birthDate: '2001-04-12',
      playingHand: 'RIGHT',
      grip: 'SHAKEHAND',
      blade: 'Butterfly Lin Gaoyuan ALC',
      bio: 'hate tensor, love sticky',
    });
  });

  it('незнакомые рука и хват не подставляются молча', () => {
    // В ответе это строка, а не перечень (ТС 7.2): подставленное наугад
    // значение человек сохранит, не заметив подмены.
    const values = toFormValues({ ...profile, playingHand: 'НЕПОНЯТНО', grip: 'ЧТО-ТО' });

    expect(values).not.toHaveProperty('playingHand');
    expect(values).not.toHaveProperty('grip');
  });

  it('тренер попадает в форму одним способом из двух', () => {
    // Заполненные разом выбор и имя схема отвергает.
    const chosen = toFormValues({ ...profile, coachPlayerId: profile.id, coachName: 'Сериков' });

    expect(chosen.coachPlayerId).toBe(profile.id);
    expect(chosen).not.toHaveProperty('coachName');

    const typed = toFormValues(profile);

    expect(typed.coachName).toBe('Сериков Тимур');
    expect(typed).not.toHaveProperty('coachPlayerId');
  });
});

describe('форма в правку', () => {
  it('пустое поле очищает, а не оставляет прежнее', () => {
    // PATCH, умеющий только заполнять, оставил бы человека с чужим
    // инвентарём в анкете навсегда.
    const patch = toPlayerPatch(filled);

    expect(patch.blade).toBeNull();
    expect(patch.middleName).toBeNull();
    expect(patch.birthDate).toBeNull();
    expect(patch.coachPlayerId).toBeNull();
  });

  it('заполненное доходит как есть', () => {
    const patch = toPlayerPatch({ ...filled, blade: 'Butterfly', bio: 'о себе' });

    expect(patch).toMatchObject({ blade: 'Butterfly', bio: 'о себе', cityId: CITIES.almaty.id });
  });

  it('обязательные поля не обращаются в null', () => {
    const patch = toPlayerPatch(filled);

    expect(patch.lastName).toBe('Ахметов');
    expect(patch.birthYear).toBe(2001);
    expect(patch.gender).toBe('MALE');
    expect(patch.cityId).toBe(CITIES.almaty.id);
  });

  it('кому виден тренер (ADR-066) — туда и обратно, пустое — умолчание, а не null', () => {
    expect(toFormValues({ ...profile, coachVisibility: 'NONE' }).coachVisibility).toBe('NONE');
    expect(toPlayerPatch({ ...filled, coachVisibility: 'CURRENT' }).coachVisibility).toBe(
      'CURRENT',
    );
    expect(toPlayerPatch(filled).coachVisibility).toBe('ALL');
  });
});

describe('инвентарь из каталога — ADR-058', () => {
  const blade = {
    id: '00000000-0000-4000-8000-0000000000e1',
    slug: 'butterfly-viscaria',
    category: 'BLADE' as const,
    name: 'Viscaria',
    brand: { id: '00000000-0000-4000-8000-0000000000d1', name: 'Butterfly', slug: 'butterfly' },
    image: null,
    playerCount: 3,
  };

  it('выбранный товар стирает строку того же места', () => {
    const patch = toPlayerPatch({ ...filled, bladeProductId: blade.id, blade: 'старая строка' });

    expect(patch).toMatchObject({
      bladeProductId: blade.id,
      blade: null,
      rubberForehandProductId: null,
      rubberBackhandProductId: null,
    });
  });

  it('без товара строка остаётся, а снятый товар уходит null', () => {
    const patch = toPlayerPatch({ ...filled, rubberForehand: 'Тенерджи 05' });

    expect(patch).toMatchObject({ rubberForehand: 'Тенерджи 05', rubberForehandProductId: null });
  });

  it('в форму попадает одно из двух: товар — без строки', () => {
    const values = toFormValues({ ...profile, bladeProduct: blade });

    expect(values.bladeProductId).toBe(blade.id);
    expect(values).not.toHaveProperty('blade');
    expect(values.rubberForehand).toBe('Nittaku Hurricane PRO 3');
    expect(equipmentProducts({ ...profile, bladeProduct: blade }).blade).toMatchObject({
      id: blade.id,
      label: 'Butterfly Viscaria',
    });
  });
});
