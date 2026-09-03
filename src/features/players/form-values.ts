import type { CreatePlayerInput, PlayerProfileView, UpdatePlayerInput } from '@kttf/shared/types';

/**
 * Профиль и форма — переход в обе стороны.
 *
 * Вынесено из экрана: здесь единственное место, где решается, что значит
 * пустое поле. В форме пустое поле — это `undefined`, а для PATCH `undefined`
 * означает «не трогать», и очистить однажды заполненную анкету было бы
 * нечем. Правка поэтому явно превращает пустое в `null` — «стереть».
 */

/** Профиль — в значения формы. Пустые поля контракта форма показывает пустыми. */
export function toFormValues(player: PlayerProfileView): Partial<CreatePlayerInput> {
  return {
    lastName: player.lastName,
    firstName: player.firstName,
    ...(player.middleName === null ? {} : { middleName: player.middleName }),
    birthYear: player.birthYear,
    ...(player.birthDate === null ? {} : { birthDate: player.birthDate }),
    // Пол в ответе — строка, а не перечень (ТС 7.2). Незнакомое значение не
    // подставляется молча: человек выберет сам.
    ...(player.gender === 'MALE' || player.gender === 'FEMALE' ? { gender: player.gender } : {}),
    city: player.city,
    ...(player.clubId === null ? {} : { clubId: player.clubId }),
    ...(player.photoUrl === null ? {} : { photoUrl: player.photoUrl }),
    ...(player.playingHand === 'RIGHT' || player.playingHand === 'LEFT'
      ? { playingHand: player.playingHand }
      : {}),
    ...(player.grip === 'SHAKEHAND' || player.grip === 'PENHOLD' ? { grip: player.grip } : {}),
    ...(player.blade === null ? {} : { blade: player.blade }),
    ...(player.rubberForehand === null ? {} : { rubberForehand: player.rubberForehand }),
    ...(player.rubberBackhand === null ? {} : { rubberBackhand: player.rubberBackhand }),
    ...(player.bio === null ? {} : { bio: player.bio }),
    // Выбранный из списка тренер и вписанный руками спорят друг с другом,
    // поэтому в форму попадает ровно один: имя — только когда выбора нет.
    ...(player.coachPlayerId === null
      ? player.coachName === null
        ? {}
        : { coachName: player.coachName }
      : { coachPlayerId: player.coachPlayerId }),
  };
}

/**
 * Значения формы — в правку.
 *
 * Форма всегда отдаёт профиль целиком, поэтому пустое поле означает именно
 * «стереть», а не «оставить как было».
 */
export function toPlayerPatch(values: CreatePlayerInput): UpdatePlayerInput {
  return {
    lastName: values.lastName,
    firstName: values.firstName,
    middleName: values.middleName ?? null,
    birthYear: values.birthYear,
    birthDate: values.birthDate ?? null,
    gender: values.gender,
    city: values.city,
    clubId: values.clubId ?? null,
    photoUrl: values.photoUrl ?? null,
    playingHand: values.playingHand ?? null,
    grip: values.grip ?? null,
    blade: values.blade ?? null,
    rubberForehand: values.rubberForehand ?? null,
    rubberBackhand: values.rubberBackhand ?? null,
    bio: values.bio ?? null,
    coachPlayerId: values.coachPlayerId ?? null,
    coachName: values.coachName ?? null,
  };
}
