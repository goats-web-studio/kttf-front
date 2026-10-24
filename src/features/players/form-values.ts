import type {
  CreatePlayerInput,
  PlayerProfileView,
  ProductListItemView,
  UpdatePlayerInput,
} from '@kttf/shared/types';

import { pickedOf, type PickedProduct } from '@/features/market/picked-product';

import type { EquipmentProducts } from './player-form';

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
    birthYearOnly: player.birthYearOnly,
    // Пол в ответе — строка, а не перечень (ТС 7.2). Незнакомое значение не
    // подставляется молча: человек выберет сам.
    ...(player.gender === 'MALE' || player.gender === 'FEMALE' ? { gender: player.gender } : {}),
    cityId: player.city.id,
    ...(player.clubId === null ? {} : { clubId: player.clubId }),
    ...(player.photoUrl === null ? {} : { photoUrl: player.photoUrl }),
    ...(player.playingHand === 'RIGHT' || player.playingHand === 'LEFT'
      ? { playingHand: player.playingHand }
      : {}),
    ...(player.grip === 'SHAKEHAND' || player.grip === 'PENHOLD' ? { grip: player.grip } : {}),
    // Инвентарь — товар каталога или строка, одно из двух (ADR-058): при
    // выбранном товаре строка в форму не попадает.
    ...(player.bladeProduct === null
      ? player.blade === null
        ? {}
        : { blade: player.blade }
      : { bladeProductId: player.bladeProduct.id }),
    ...(player.rubberForehandProduct === null
      ? player.rubberForehand === null
        ? {}
        : { rubberForehand: player.rubberForehand }
      : { rubberForehandProductId: player.rubberForehandProduct.id }),
    ...(player.rubberBackhandProduct === null
      ? player.rubberBackhand === null
        ? {}
        : { rubberBackhand: player.rubberBackhand }
      : { rubberBackhandProductId: player.rubberBackhandProduct.id }),
    ...(player.bio === null ? {} : { bio: player.bio }),
    // Выбранный из списка тренер и вписанный руками спорят друг с другом,
    // поэтому в форму попадает ровно один: имя — только когда выбора нет.
    ...(player.coachPlayerId === null
      ? player.coachName === null
        ? {}
        : { coachName: player.coachName }
      : { coachPlayerId: player.coachPlayerId }),
    coachVisibility: player.coachVisibility,
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
    // Галочка приватности — не «поле анкеты»: снятая означает false,
    // а не «стереть», поэтому null здесь неуместен.
    birthYearOnly: values.birthYearOnly ?? true,
    gender: values.gender,
    // Город стереть нельзя: правка всегда несёт выбранный (ADR-046).
    cityId: values.cityId,
    clubId: values.clubId ?? null,
    photoUrl: values.photoUrl ?? null,
    playingHand: values.playingHand ?? null,
    grip: values.grip ?? null,
    // Выбранный товар стирает строку: профиль не говорит двумя голосами.
    bladeProductId: values.bladeProductId ?? null,
    blade: values.bladeProductId === undefined ? (values.blade ?? null) : null,
    rubberForehandProductId: values.rubberForehandProductId ?? null,
    rubberForehand:
      values.rubberForehandProductId === undefined ? (values.rubberForehand ?? null) : null,
    rubberBackhandProductId: values.rubberBackhandProductId ?? null,
    rubberBackhand:
      values.rubberBackhandProductId === undefined ? (values.rubberBackhand ?? null) : null,
    bio: values.bio ?? null,
    coachPlayerId: values.coachPlayerId ?? null,
    coachName: values.coachName ?? null,
    // Настройка, а не поле анкеты: «стереть» её нечем, пустая — умолчание.
    coachVisibility: values.coachVisibility ?? 'ALL',
  };
}

/** Выбранные товары профиля — подписи и фото для полей инвентаря. */
export function equipmentProducts(player: PlayerProfileView): EquipmentProducts {
  const pick = (product: ProductListItemView | null): PickedProduct | null =>
    product === null ? null : pickedOf(product);

  return {
    blade: pick(player.bladeProduct),
    rubberForehand: pick(player.rubberForehandProduct),
    rubberBackhand: pick(player.rubberBackhandProduct),
  };
}
