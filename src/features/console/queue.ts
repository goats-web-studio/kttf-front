import type { MatchView, StageView } from '@kttf/shared/types';

/**
 * Очередь и столы — ТЗ 6.1.
 *
 * Чистые функции: экран судьи ничего не решает сам, он показывает то, что
 * посчитано здесь. Это не вкусовщина — офлайн-режим (спринт 4) будет считать
 * то же самое без сети, и логика, размазанная по компонентам, туда не
 * переезжает.
 *
 * Серверу эти правила не нужны и на нём их нет: столы назначает судья, а не
 * система. Дублирования логики между клиентом и сервером здесь не возникает.
 */

/** Встреча вместе с этапом, из которого она пришла: в зале это разные очереди. */
export interface QueuedMatch {
  readonly match: MatchView;
  readonly stageName: string;
  /** Метка группы, если встреча из группового этапа. */
  readonly groupLabel: string | null;
  /**
   * Момент, с которого пара свободна: позднейшее из времён закрытия двух
   * последних встреч. `null` — хотя бы один из двоих ещё не играл вовсе.
   */
  readonly waitingSince: string | null;
  /** После этой встречи обоим играть больше нечего — ТЗ 6.3. */
  readonly lastForBoth: boolean;
}

/** Встреча готова к назначению: оба участника известны и она не сыграна. */
function isReady(match: MatchView): boolean {
  return (
    match.playerAId !== null &&
    match.playerBId !== null &&
    (match.status === 'PENDING' || match.status === 'QUEUED')
  );
}

function isPlaying(match: MatchView): boolean {
  return match.status === 'PLAYING';
}

function allMatches(stages: readonly StageView[]): readonly MatchView[] {
  return stages.flatMap((stage) => stage.matches);
}

/** Время, когда игрок закончил последнюю сыгранную встречу. */
function lastPlayed(matches: readonly MatchView[]): ReadonlyMap<string, string> {
  const last = new Map<string, string>();

  for (const match of matches) {
    if (match.finishedAt === null) {
      continue;
    }

    for (const playerId of [match.playerAId, match.playerBId]) {
      if (playerId === null) {
        continue;
      }

      const known = last.get(playerId);

      if (known === undefined || known < match.finishedAt) {
        last.set(playerId, match.finishedAt);
      }
    }
  }

  return last;
}

/** Сколько несыгранных встреч осталось у игрока. */
function remaining(matches: readonly MatchView[]): ReadonlyMap<string, number> {
  const left = new Map<string, number>();

  for (const match of matches) {
    if (match.status === 'FINISHED' || match.status === 'CANCELLED') {
      continue;
    }

    for (const playerId of [match.playerAId, match.playerBId]) {
      if (playerId !== null) {
        left.set(playerId, (left.get(playerId) ?? 0) + 1);
      }
    }
  }

  return left;
}

/**
 * Очередь встреч, готовых к назначению.
 *
 * Порядок — по ТЗ 6.1: сначала те, кто дольше не играл. Мерой служит момент,
 * с которого свободны **оба**: пара доступна не раньше, чем закончил
 * позднейший из двоих. Кто ещё не играл, ждёт с начала турнира и идёт первым.
 *
 * Внутри равенства порядок задаёт расписание — этап, круг, слот. Иначе
 * встречи одного круга перемешивались бы между обновлениями экрана.
 */
export function buildQueue(stages: readonly StageView[]): readonly QueuedMatch[] {
  const matches = allMatches(stages);
  const last = lastPlayed(matches);
  const left = remaining(matches);

  const queued = stages.flatMap((stage) =>
    stage.matches.filter(isReady).map((match): QueuedMatch => {
      const a = match.playerAId;
      const b = match.playerBId;
      const times = [a, b]
        .map((playerId) => (playerId === null ? undefined : last.get(playerId)))
        .filter((time) => time !== undefined);

      return {
        match,
        stageName: stage.name,
        groupLabel: stage.groups.find((group) => group.id === match.groupId)?.label ?? null,
        // Пара свободна не раньше, чем закончил позднейший из двоих.
        waitingSince: times.length === 2 ? maxOf(times) : null,
        lastForBoth: [a, b].every((playerId) => playerId !== null && left.get(playerId) === 1),
      };
    }),
  );

  return [...queued].sort(compareQueued);
}

function maxOf(times: readonly string[]): string {
  return times.reduce((left, right) => (left > right ? left : right));
}

function compareQueued(left: QueuedMatch, right: QueuedMatch): number {
  // Ещё не игравший ждёт с начала турнира: он впереди любого, кто уже сыграл.
  if (left.waitingSince === null && right.waitingSince !== null) return -1;
  if (left.waitingSince !== null && right.waitingSince === null) return 1;

  if (left.waitingSince !== null && right.waitingSince !== null) {
    if (left.waitingSince < right.waitingSince) return -1;
    if (left.waitingSince > right.waitingSince) return 1;
  }

  return (
    (left.match.bracketRound ?? 0) - (right.match.bracketRound ?? 0) ||
    (left.match.bracketSlot ?? 0) - (right.match.bracketSlot ?? 0)
  );
}

export interface TableState {
  readonly number: number;
  /**
   * Три состояния по ТЗ 6.1.
   *
   * `AWAITING` — на столе лежит закрытая встреча: счёт введён, а следующую
   * пару ещё не позвали. Сервер не снимает номер стола при вводе результата,
   * и это правильно: в зале стол занят, пока за него не сели новые игроки.
   */
  readonly status: 'FREE' | 'PLAYING' | 'AWAITING';
  /** Встреча на столе: идущая либо только что закрытая. */
  readonly match: MatchView | null;
}

/**
 * Столы зала с тем, что на них происходит.
 *
 * Столы перечисляются все до одного, включая свободные: судья смотрит на зону
 * столов, чтобы увидеть, куда поставить следующую встречу, а не чтобы
 * пересчитать занятые.
 */
export function buildTables(
  tableCount: number,
  stages: readonly StageView[],
): readonly TableState[] {
  const matches = allMatches(stages);
  const playing = matches.filter(isPlaying);
  const finished = matches.filter(
    (match) => match.status === 'FINISHED' && match.tableNumber !== null,
  );

  return Array.from({ length: tableCount }, (_unused, index): TableState => {
    const number = index + 1;
    const active = playing.find((match) => match.tableNumber === number);

    if (active !== undefined) {
      return { number, status: 'PLAYING', match: active };
    }

    // Последняя закрытая на этом столе: она и висит перед судьёй, пока
    // он не позвал следующую пару.
    const last = finished
      .filter((match) => match.tableNumber === number)
      .reduce<MatchView | null>(
        (latest, match) =>
          latest === null || (latest.finishedAt ?? '') < (match.finishedAt ?? '') ? match : latest,
        null,
      );

    return last === null
      ? { number, status: 'FREE', match: null }
      : { number, status: 'AWAITING', match: last };
  });
}

/** Встречи, идущие прямо сейчас. Порядок — по номеру стола, как в зале. */
export function playingMatches(stages: readonly StageView[]): readonly MatchView[] {
  return [...allMatches(stages).filter(isPlaying)].sort(
    (left, right) => (left.tableNumber ?? 0) - (right.tableNumber ?? 0),
  );
}

/**
 * Стол, который предлагается следующей встрече, — ТЗ 6.2.
 *
 * Наименьший свободный номер, а не любой: судья запоминает зал по номерам,
 * и «следующий свободный» должен быть предсказуем.
 *
 * Стол с закрытой встречей идёт следом за пустыми, но идёт: иначе к концу
 * турнира, когда на каждом столе лежит чей-то результат, предлагать станет
 * нечего, и назначение встанет.
 */
export function suggestedTable(tables: readonly TableState[]): number | null {
  const free = tables.find((table) => table.status === 'FREE');

  return (free ?? tables.find((table) => table.status === 'AWAITING'))?.number ?? null;
}

/** Все ли встречи турнира сыграны: только тогда его можно завершать. */
export function allPlayed(stages: readonly StageView[]): boolean {
  return allMatches(stages).every(
    (match) => match.status === 'FINISHED' || match.status === 'CANCELLED',
  );
}
