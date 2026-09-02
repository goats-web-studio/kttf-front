import { isAppError } from '@kttf/shared/errors';

import type { MessageKey } from '@/common/i18n';

/**
 * Причины недопуска — в тексты интерфейса.
 *
 * Правило допуска живёт в `@kttf/shared/eligibility` и повторяться здесь не
 * должно (запрет №2 брифа). Здесь только перевод его исходов в слова, и место
 * это одно на оба случая: причины, посчитанные до нажатия, и причины, которые
 * назвал сервер, обязаны читаться одинаково.
 */
const PROBLEM_KEYS: Readonly<Record<string, MessageKey>> = {
  RATING_TOO_HIGH: 'registration.problem.RATING_TOO_HIGH',
  RATING_TOO_LOW: 'registration.problem.RATING_TOO_LOW',
  BIRTH_YEAR_OUT_OF_RANGE: 'registration.problem.BIRTH_YEAR_OUT_OF_RANGE',
  GENDER_NOT_ALLOWED: 'registration.problem.GENDER_NOT_ALLOWED',
};

/**
 * Ключи текстов по кодам причин.
 *
 * Незнакомая причина пропускается, а не показывается кодом из базы: сервер
 * старше клиента по версии, и новое значение не должно выходить к человеку
 * английской строкой.
 */
export function problemKeys(problems: readonly unknown[]): readonly MessageKey[] {
  return problems
    .map((problem) => (typeof problem === 'string' ? PROBLEM_KEYS[problem] : undefined))
    .filter((key): key is MessageKey => key !== undefined);
}

/**
 * Ключи текстов по отказу сервера. Пусто — отказ не про допуск.
 *
 * Сервер отказывает кодом `VALIDATION_FAILED` и кладёт разбор в `details`:
 * общий текст этого кода («проверьте заполненные поля») человеку у турнира
 * ничего не объясняет — полей он не заполнял, он не проходит по планке.
 */
export function eligibilityProblems(error: unknown): readonly MessageKey[] {
  if (!isAppError(error)) {
    return [];
  }

  const problems = error.details?.problems;

  if (!Array.isArray(problems)) {
    return [];
  }

  return problemKeys(problems);
}
