import type { ScreenView, TournamentResultsView, TournamentStatus } from '@kttf/shared/types';

import type { MessageKey } from '@/common/i18n';
import type { TableState } from '@/features/console/queue';

import { STAGE_HEIGHT, STAGE_WIDTH } from './scale';
import { slidesOf, type Slide, type SlideKind } from './slides';

/**
 * Расчёты стены, которым не место в компонентах — ADR-082.
 */

/** Сколько секунд после назначения стол подсвечен как «Вызов». */
export const CALL_SECONDS = 120;

/**
 * Дольше — минуты не пишутся. Встреча, «идущая» шесть дней, — забытая в
 * консоли, а не долгая: «9545 мин» на стене только пугали зал.
 */
export const LONG_MINUTES = 90;

export function isClosed(status: TournamentStatus | undefined): boolean {
  return status === 'FINISHED' || status === 'RATED';
}

export function isCalling(table: TableState, now: number): boolean {
  return (
    table.status === 'PLAYING' &&
    table.match?.startedAt != null &&
    now - Date.parse(table.match.startedAt) < CALL_SECONDS * 1000
  );
}

/** Размеры встречи в натуральную величину; на сцене они масштабируются целиком. */
export const ROW = 32;
export const BOX = ROW * 2 + 1;
export const GAP_Y = 16;
export const CAPTION = 36;
export const FONT = 18;
export const PLACEMENT_GAP = 48;
export const PLACEMENT_CAPTION = 30;
export const MAX_SCALE = 1.4;

export interface Geometry {
  readonly mirror: boolean;
  readonly column: number;
  readonly gapX: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

/**
 * Раскладка сетки, вписанной в область целиком — ADR-082.
 *
 * Прямая — круги слева направо. Зеркальная — половины сходятся к финалу в
 * центре: ей нужно вдвое меньше высоты, и сетка на 32 на ТВ читается, а не
 * сливается в серую полосу. Зеркальная берётся, только если она заметно
 * крупнее: прямая привычнее.
 */
export function bracketGeometry(
  rounds: number,
  placements: number,
  area: { width: number; height: number },
): Geometry {
  const option = (mirror: boolean): Geometry => {
    const column = mirror ? 214 : 250;
    const gapX = mirror ? 32 : 44;
    const columns = mirror ? rounds * 2 - 1 : rounds;
    const slots = 2 ** Math.max(0, rounds - (mirror ? 2 : 1));
    const body = slots * (BOX + GAP_Y);
    const below = placements * (PLACEMENT_CAPTION + BOX + GAP_Y);
    const height = Math.max(CAPTION + body, CAPTION + body / 2 + BOX / 2 + PLACEMENT_GAP + below);
    const width = columns * column + (columns - 1) * gapX;

    return {
      mirror,
      column,
      gapX,
      width,
      height,
      scale: Math.min(MAX_SCALE, area.width / width, area.height / height),
    };
  };

  const straight = option(false);

  if (rounds < 3) {
    return straight;
  }

  const mirrored = option(true);

  return mirrored.scale > straight.scale * 1.12 ? mirrored : straight;
}

/**
 * Место строкой: число или диапазон деливших — «5–8» (ADR-023). Раньше
 * делившие стояли с прочерком, и половина мест на стене была «—».
 */
export function placeLabels(results: TournamentResultsView): ReadonlyMap<string, string> {
  const labels = new Map<string, string>();

  for (const group of results.shared) {
    const first = group.places[0];
    const last = group.places.at(-1);

    for (const id of group.participants) {
      if (first !== undefined && last !== undefined) {
        labels.set(id, first === last ? String(first) : `${String(first)}–${String(last)}`);
      }
    }
  }

  for (const participant of results.participants) {
    if (participant.place !== null) {
      labels.set(participant.player.id, String(participant.place));
    }
  }

  return labels;
}

/** Поля сцены и высоты полос — от них считается место под слайд. */
export const PAD_X = 32;
export const PAD_Y = 24;
export const HEADER = 96;
export const TABS = 40;
export const GAP = 16;
/** Высота полосы вызова. */
export const STRIP_HEIGHT = 64;
export const INNER_WIDTH = STAGE_WIDTH - PAD_X * 2;
export const BODY_HEIGHT = STAGE_HEIGHT - PAD_Y * 2 - HEADER - GAP - TABS - GAP;

/** Слайды стены для этого состояния — общие для ТВ и предпросмотра в консоли. */
export function wallSlides(
  view: ScreenView,
  results: TournamentResultsView | undefined,
  show: SlideKind | null,
): readonly Slide[] {
  const closed = isClosed(view.tournament.status);

  return slidesOf({
    stages: view.stages,
    groups: view.standings.groups,
    closed,
    results,
    // Под полосой вызова места меньше; у закрытого турнира полосы нет.
    groupArea: { width: INNER_WIDTH, height: BODY_HEIGHT - (closed ? 0 : STRIP_HEIGHT + GAP) },
    show,
  });
}

/** Подпись слайда — на вкладках стены и в консоли «Сейчас: …». */
export function slideTitle(slide: Slide, t: (key: MessageKey) => string): string {
  switch (slide.kind) {
    case 'tables':
      return t('screen.tables.title');
    case 'groups':
      return slide.pages > 1
        ? `${t('screen.slide.groups')} ${String(slide.page)}/${String(slide.pages)}`
        : t('screen.slide.groups');
    case 'bracket':
      return slide.stage.name;
    case 'results':
      return t('screen.slide.results');
  }
}
