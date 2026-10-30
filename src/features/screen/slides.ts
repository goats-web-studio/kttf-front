import type {
  GroupStandingsView,
  ResultParticipantView,
  StageView,
  TournamentResultsView,
} from '@kttf/shared/types';

import { BRACKET_STAGES } from '@/common/ui/bracket-model';

/**
 * Слайды стены — ADR-082.
 *
 * Стена — три экрана по очереди: столы, все группы, вся сетка; после турнира
 * — итоги, сетка и группы. Каждый экран целиком отдан одному вопросу зала.
 * Здесь только расчёт: какие слайды есть, сколько групп помещается на один
 * и какой слайд показывать в данную секунду.
 */

export type SlideKind = 'tables' | 'groups' | 'bracket' | 'results';

export type Slide =
  | { readonly kind: 'tables' }
  | {
      readonly kind: 'groups';
      readonly groups: readonly GroupStandingsView[];
      readonly columns: number;
      readonly page: number;
      readonly pages: number;
    }
  | { readonly kind: 'bracket'; readonly stage: StageView }
  | {
      readonly kind: 'results';
      readonly participants: readonly ResultParticipantView[];
      readonly page: number;
      readonly pages: number;
    };

/** Сколько секунд висит слайд. Столы — дольше: по ним ищут свой стол. */
export const SLIDE_SECONDS: Readonly<Record<SlideKind, number>> = {
  tables: 20,
  groups: 15,
  bracket: 20,
  results: 20,
};

/** Геометрия карточки группы на сцене — та же, что рисует `GroupBoard`. */
export const GROUP_CARD = {
  head: 44,
  columns: 28,
  row: 36,
  padding: 12,
  gap: 16,
  place: 48,
  name: 190,
  cell: 56,
  points: 48,
  sets: 72,
} as const;

/** Шире карточка группы не бывает. */
const GROUP_MAX_WIDTH = 940;

export function groupCardHeight(players: number): number {
  return GROUP_CARD.head + GROUP_CARD.columns + players * GROUP_CARD.row + GROUP_CARD.padding;
}

export function groupCardWidth(players: number): number {
  return (
    GROUP_CARD.place +
    GROUP_CARD.name +
    players * GROUP_CARD.cell +
    GROUP_CARD.points +
    GROUP_CARD.sets +
    GROUP_CARD.padding * 2
  );
}

export interface Area {
  readonly width: number;
  readonly height: number;
}

/**
 * Группы по страницам: как можно больше на одной, и при равенстве — шире.
 *
 * Сцена постоянного размера, поэтому место считается, а не измеряется: восемь
 * групп по четыре идут одним экраном в три колонки, по шесть — двумя.
 */
export function groupPages(
  groups: readonly GroupStandingsView[],
  area: Area,
): readonly { readonly groups: readonly GroupStandingsView[]; readonly columns: number }[] {
  if (groups.length === 0) {
    return [];
  }

  const players = Math.max(...groups.map((group) => group.rows.length));
  const height = groupCardHeight(players);
  const width = groupCardWidth(players);
  const rowsFit = Math.max(
    1,
    Math.floor((area.height + GROUP_CARD.gap) / (height + GROUP_CARD.gap)),
  );
  const columnsFit = Math.max(
    1,
    Math.min(4, Math.floor((area.width + GROUP_CARD.gap) / (width + GROUP_CARD.gap))),
  );

  // Меньше колонок, если все и так помещаются: широкая карточка читается
  // легче. Но не шире `GROUP_MAX_WIDTH`: в карточке во весь экран фамилия и
  // счёт расходятся так далеко, что строку не прочитать.
  const widest = Math.min(
    columnsFit,
    groups.length,
    Math.ceil((area.width + GROUP_CARD.gap) / (GROUP_MAX_WIDTH + GROUP_CARD.gap)),
  );
  let columns = columnsFit;

  while (columns > widest && Math.ceil(groups.length / (columns - 1)) <= rowsFit) {
    columns--;
  }

  const perPage = columns * rowsFit;
  const pages = [];

  for (let index = 0; index < groups.length; index += perPage) {
    pages.push({ groups: groups.slice(index, index + perPage), columns });
  }

  return pages;
}

/** Строк в колонке итоговых мест; на странице — три колонки. */
export const PLACES_PER_COLUMN = 14;
export const PLACES_COLUMNS = 3;

export interface SlidesInput {
  readonly stages: readonly StageView[];
  readonly groups: readonly GroupStandingsView[];
  /** Турнир закрыт. */
  readonly closed: boolean;
  /** Итоги закрытого турнира, если уже пришли. */
  readonly results: TournamentResultsView | undefined;
  /** Место под группы на сцене. */
  readonly groupArea: Area;
  /** Закреплённый вид из адреса экрана (`?show=bracket`). */
  readonly show: SlideKind | null;
}

/**
 * Слайды в порядке показа.
 *
 * Идёт турнир — столы, группы, сетка: столы первыми, ради них к стене и
 * подходят. После турнира — итоги, сетка, группы: зал ищет места, а
 * таблицы и сетка остаются, чтобы разобрать, как к местам пришли. Столы у
 * закрытого турнира не показываются: играть на них уже нечего.
 */
export function slidesOf(input: SlidesInput): readonly Slide[] {
  const groups = groupPages(input.groups, input.groupArea);
  const groupSlides: Slide[] = groups.map((page, index) => ({
    kind: 'groups',
    groups: page.groups,
    columns: page.columns,
    page: index + 1,
    pages: groups.length,
  }));
  const brackets: Slide[] = input.stages
    .filter((stage) => BRACKET_STAGES.has(stage.type) && stage.matches.length > 0)
    .map((stage) => ({ kind: 'bracket', stage }));

  let slides: Slide[];

  if (input.closed) {
    const participants = placeOrder(input.results);
    const perPage = PLACES_PER_COLUMN * PLACES_COLUMNS;
    const pages = Math.ceil(participants.length / perPage);
    const results: Slide[] = Array.from({ length: pages }, (_unused, index) => ({
      kind: 'results',
      participants: participants.slice(index * perPage, (index + 1) * perPage),
      page: index + 1,
      pages,
    }));

    slides = [...results, ...brackets, ...groupSlides];
  } else {
    slides = [{ kind: 'tables' }, ...groupSlides, ...brackets];
  }

  const pinned = input.show === null ? [] : slides.filter((slide) => slide.kind === input.show);

  return pinned.length > 0 ? pinned : slides;
}

/**
 * Места по порядку: занявшие место — по нему, делившие — по началу диапазона.
 * Сервер отдаёт деливших вперемешку («5–8» после «9–10»), а на стене строки
 * должны идти сверху вниз. Внутри одного места порядок сервера сохраняется.
 */
export function placeOrder(
  results: TournamentResultsView | undefined,
): readonly ResultParticipantView[] {
  if (results === undefined) {
    return [];
  }

  const shared = new Map<string, number>();

  for (const group of results.shared) {
    for (const id of group.participants) {
      shared.set(id, group.places[0] ?? Number.MAX_SAFE_INTEGER);
    }
  }

  const rank = (participant: ResultParticipantView): number =>
    participant.place ?? shared.get(participant.player.id) ?? Number.MAX_SAFE_INTEGER;

  return [...results.participants].sort((left, right) => rank(left) - rank(right));
}

/**
 * Слайд в данный момент — по часам, а не по таймеру экрана.
 *
 * Два ТВ в зале и предпросмотр в консоли показывают одно и то же: номер
 * слайда — это остаток от времени суток по длине круга. Офлайн это не
 * ломает: экран листает последнее состояние сам.
 */
export function slideAt(
  slides: readonly Slide[],
  now: number,
): { readonly index: number; readonly left: number } {
  const total = slides.reduce((sum, slide) => sum + SLIDE_SECONDS[slide.kind], 0);

  if (total === 0) {
    return { index: 0, left: 0 };
  }

  let second = Math.floor(now / 1000) % total;

  for (const [index, slide] of slides.entries()) {
    const length = SLIDE_SECONDS[slide.kind];

    if (second < length) {
      return { index, left: length - second };
    }

    second -= length;
  }

  return { index: 0, left: 0 };
}
