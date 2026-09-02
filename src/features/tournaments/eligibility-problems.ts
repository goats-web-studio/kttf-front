import { isAppError } from '@kttf/shared/errors';

import type { MessageKey } from '@/common/i18n';

/**
 * Причины недопуска, названные сервером, — в тексты интерфейса.
 *
 * Сервер отказывает кодом `VALIDATION_FAILED` и кладёт разбор в `details`:
 * общий текст этого кода («проверьте заполненные поля») человеку у турнира
 * ничего не объясняет — полей он не заполнял, он не проходит по планке.
 *
 * Правило допуска живёт в `@kttf/shared/eligibility` и повторяться здесь не
 * должно (запрет №2 брифа). Здесь только перевод его исходов в слова.
 */
const PROBLEM_KEYS: Readonly<Record<string, MessageKey>> = {
  RATING_TOO_HIGH: 'registration.problem.RATING_TOO_HIGH',
  RATING_TOO_LOW: 'registration.problem.RATING_TOO_LOW',
  BIRTH_YEAR_OUT_OF_RANGE: 'registration.problem.BIRTH_YEAR_OUT_OF_RANGE',
  GENDER_NOT_ALLOWED: 'registration.problem.GENDER_NOT_ALLOWED',
};

/**
 * Ключи текстов по отказу сервера. Пусто — отказ не про допуск.
 *
 * Незнакомая причина пропускается, а не показывается кодом из базы: сервер
 * старше клиента по версии, и новое значение не должно выходить к человеку
 * английской строкой.
 */
export function eligibilityProblems(error: unknown): readonly MessageKey[] {
  if (!isAppError(error)) {
    return [];
  }

  const problems = error.details?.problems;

  if (!Array.isArray(problems)) {
    return [];
  }

  return problems
    .map((problem) => (typeof problem === 'string' ? PROBLEM_KEYS[problem] : undefined))
    .filter((key): key is MessageKey => key !== undefined);
}
