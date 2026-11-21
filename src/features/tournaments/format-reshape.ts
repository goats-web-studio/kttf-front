import { isAppError } from '@kttf/shared/errors';
import type { RegistrationStatus, RegistrationView, StageView } from '@kttf/shared/types';

/** Кто занимает место в турнире — как `OCCUPYING_STATUSES` на сервере. */
const OCCUPYING: readonly RegistrationStatus[] = ['REGISTERED', 'CONFIRMED', 'PLAYING'];

/** Сколько человек играет — по этому числу советуется схема (ADR-101). */
export function playingCount(registrations: readonly RegistrationView[]): number {
  return registrations.filter((registration) => OCCUPYING.includes(registration.status)).length;
}

/**
 * Ни одна встреча не вызвана к столу и не сыграна — схему идущего турнира
 * ещё можно сменить с новой жеребьёвкой (ADR-101). То же условие сервер
 * проверяет сам: здесь оно решает только, предлагать ли смену.
 */
export function nothingStarted(stages: readonly StageView[]): boolean {
  return stages.every((stage) =>
    stage.matches.every(
      (match) => match.status !== 'PLAYING' && match.status !== 'FINISHED' && match.setsA === null,
    ),
  );
}

/** Отказ сервера: пока выбирали схему, судья вызвал пару или ввёл счёт. */
export function isMatchStarted(error: unknown): boolean {
  return isAppError(error) && error.details?.reason === 'MATCH_STARTED';
}
