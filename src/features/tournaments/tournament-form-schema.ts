import { createTournamentSchema } from '@kttf/shared/types';

import type { FormCheckText } from './tournament-form-texts';

/** Ключи текстов проверки — сообщения ошибок полей, переводятся при показе. */
const CHECK_KEYS = [
  'startsRequired',
  'startsPast',
  'regAfterStart',
  'regPast',
  'ratingBounds',
  'birthBounds',
  'maxParticipants',
] as const satisfies readonly (keyof FormCheckText)[];

export type CheckKey = (typeof CHECK_KEYS)[number];

export function isCheckKey(value: string | undefined): value is CheckKey {
  return (CHECK_KEYS as readonly (string | undefined)[]).includes(value);
}

/**
 * Схема формы турнира — общая схема контракта и проверки, которые нужны
 * человеку у поля.
 *
 * Общая схема отвергает вывернутые границы одной ошибкой на весь объект: так
 * её читает сервер. Форме этого мало — ошибка без поля не показывается
 * нигде, и кнопка «Создать» молча ничего не делала (так было с «Запись до»
 * позже «Начала»). Здесь каждая ошибка привязана к своему полю.
 *
 * Прошедшее время отвергается только у нового турнира: заведённый вчера
 * и не начавшийся турнир правится дальше, и его дата в прошлом — повод её
 * поменять, а не запрет сохранить остальное.
 */
export function tournamentFormSchema(isNew: boolean, now: () => Date = () => new Date()) {
  return createTournamentSchema.superRefine((value, ctx) => {
    const issue = (path: string, message: CheckKey): void => {
      ctx.addIssue({ code: 'custom', path: [path], message });
    };
    const nowMs = now().getTime();
    const start = Date.parse(value.startsAt);

    if (isNew && start < nowMs) issue('startsAt', 'startsPast');

    if (value.registrationEndsAt !== undefined) {
      const closes = Date.parse(value.registrationEndsAt);
      if (closes > start) issue('registrationEndsAt', 'regAfterStart');
      else if (isNew && closes < nowMs) issue('registrationEndsAt', 'regPast');
    }

    if (
      value.ratingCapMin !== undefined &&
      value.ratingCapMax !== undefined &&
      value.ratingCapMin > value.ratingCapMax
    ) {
      issue('ratingCapMax', 'ratingBounds');
    }

    if (
      value.birthYearFrom !== undefined &&
      value.birthYearTo !== undefined &&
      value.birthYearFrom > value.birthYearTo
    ) {
      issue('birthYearTo', 'birthBounds');
    }

    if (value.maxParticipants !== undefined && value.maxParticipants < 2) {
      issue('maxParticipants', 'maxParticipants');
    }
  });
}
