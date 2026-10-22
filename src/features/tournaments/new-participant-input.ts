import type { CreatePlayerInput } from '@kttf/shared/types';

export interface NewParticipantForm {
  readonly lastName: string;
  readonly firstName: string;
  readonly gender: 'MALE' | 'FEMALE';
  readonly birthYear: number | null;
  readonly cityId: string;
  readonly startRating: number | null;
}

/**
 * Профиль для заведения или `null`, пока чего-то не хватает. Клуб — клуб
 * турнира: игрок заводится там, где его записывают (ADR-062).
 */
export function newParticipantInput(
  form: NewParticipantForm,
  clubId: string,
): CreatePlayerInput | null {
  const lastName = form.lastName.trim();
  const firstName = form.firstName.trim();

  if (
    lastName === '' ||
    firstName === '' ||
    form.birthYear === null ||
    form.cityId === '' ||
    form.startRating === null
  ) {
    return null;
  }

  return {
    lastName,
    firstName,
    gender: form.gender,
    birthYear: form.birthYear,
    cityId: form.cityId,
    clubId,
    startRating: form.startRating,
  };
}
