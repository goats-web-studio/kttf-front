import { createPlayerSchema } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { newParticipantInput, type NewParticipantForm } from './new-participant-input';

/**
 * Новый игрок из состава турнира — ADR-062. Проверяется тело запроса: со
 * стартовым рейтингом и в клубе турнира, и что его принимает схема сервера.
 */
const CLUB_ID = '11111111-1111-4111-8111-111111111111';
const CITY_ID = '22222222-2222-4222-8222-222222222222';

const filled: NewParticipantForm = {
  lastName: ' Ахметов ',
  firstName: 'Арман',
  gender: 'MALE',
  birthYear: 1990,
  cityId: CITY_ID,
  startRating: 400,
};

describe('новый игрок из состава турнира', () => {
  it('заводится в клубе турнира со стартовым рейтингом', () => {
    const input = newParticipantInput(filled, CLUB_ID);

    expect(input).toMatchObject({ lastName: 'Ахметов', clubId: CLUB_ID, startRating: 400 });
    expect(createPlayerSchema.safeParse(input).success).toBe(true);
  });

  it('без рейтинга, города, года или имени не отправляется', () => {
    for (const missing of [
      { startRating: null },
      { cityId: '' },
      { birthYear: null },
      { firstName: '  ' },
      { lastName: '' },
    ]) {
      expect(newParticipantInput({ ...filled, ...missing }, CLUB_ID)).toBeNull();
    }
  });
});
