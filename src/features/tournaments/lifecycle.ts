import type { TournamentStatus } from '@kttf/shared/types';

/**
 * Что организатор может сделать с турниром в его нынешнем состоянии — ТЗ 4.1.
 *
 * Это не копия таблицы переходов сервера, а ответ на другой вопрос: какие
 * кнопки показать. Условия сверх статуса — «жеребьёвка проведена», «у всех
 * встреч есть результат» — здесь не проверяются вовсе, их знает только
 * сервер, и он же отвергает запрос. Экран лишь не предлагает того, что
 * заведомо не пройдёт.
 *
 * Завершение турнира отсюда не выходит: его делает консоль, когда сыграна
 * последняя встреча (ТЗ 6.3). Здесь остаётся только повтор обсчёта, если
 * расчёт рейтинга не удался и турнир застрял в «Завершён».
 */

export const LIFECYCLE_ACTIONS = [
  'publish',
  'openRegistration',
  'closeRegistration',
  'draw',
  'start',
  'rate',
  'cancel',
] as const;

export type LifecycleAction = (typeof LIFECYCLE_ACTIONS)[number];

/**
 * Действия по состоянию, в порядке показа: главное первым.
 *
 * `draw` не меняет статус — жеребьёвку можно провести повторно, и она стирает
 * предыдущую. Поэтому она стоит рядом со стартом, а не вместо него.
 */
const BY_STATUS: Readonly<Record<TournamentStatus, readonly LifecycleAction[]>> = {
  DRAFT: ['publish', 'cancel'],
  PUBLISHED: ['openRegistration', 'cancel'],
  REG_OPEN: ['closeRegistration', 'cancel'],
  REG_CLOSED: ['draw', 'start', 'cancel'],
  // Идущий турнир ведёт консоль. Отмена остаётся: турнир срывается и в зале
  RUNNING: ['cancel'],
  // «Завершён», но не «Обсчитан», означает, что расчёт рейтинга не удался.
  FINISHED: ['rate', 'cancel'],
  // Рейтинг разошёлся по журналу и профилям: отмена его не вернёт (ТЗ 4.1).
  RATED: [],
  CANCELLED: [],
};

export function availableActions(status: TournamentStatus): readonly LifecycleAction[] {
  return BY_STATUS[status];
}

/**
 * Действие, которое ведёт турнир вперёд. `null` — вести некуда.
 *
 * Отмена главной не бывает никогда: это выход из сценария, а не его шаг.
 */
export function primaryAction(status: TournamentStatus): LifecycleAction | null {
  return availableActions(status).find((action) => action !== 'cancel') ?? null;
}
