import type { GroupStandingsView, StageView, TournamentResultsView } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { shortNamesOf } from './names';
import { SLIDE_SECONDS, groupPages, slideAt, slidesOf, type Slide } from './slides';
import {
  BODY_HEIGHT,
  GAP,
  INNER_WIDTH,
  STRIP_HEIGHT,
  bracketGeometry,
  placeLabels,
} from './wall-model';

/**
 * Стена — ADR-082: три экрана по очереди, всё помещается без прокрутки.
 */

function group(index: number, players: number): GroupStandingsView {
  return {
    stageId: 'groups',
    groupId: `g${String(index)}`,
    label: `гр. ${String(index)}`,
    rows: Array.from({ length: players }, (_unused, row) => ({
      participant: `p${String(index)}-${String(row)}`,
      played: 0,
      wins: 0,
      losses: 0,
      points: 0,
      setsWon: 0,
      setsLost: 0,
      setDiff: 0,
      ballsWon: 0,
      ballsLost: 0,
      ballDiff: 0,
      place: row + 1,
    })),
    unresolved: [],
  };
}

/** Место под группы и сетку, когда внизу полоса вызова. */
const AREA = { width: INNER_WIDTH, height: BODY_HEIGHT - STRIP_HEIGHT - GAP };

describe('группы на экране', () => {
  it('восемь групп по четыре — один экран', () => {
    const pages = groupPages(
      Array.from({ length: 8 }, (_unused, index) => group(index, 4)),
      AREA,
    );

    expect(pages).toHaveLength(1);
    expect(pages[0]?.groups).toHaveLength(8);
  });

  it('две группы — рядом, а не карточками во всю ширину экрана', () => {
    expect(groupPages([group(1, 4), group(2, 4)], AREA)[0]?.columns).toBe(2);
    expect(groupPages([group(1, 4), group(2, 4), group(3, 4)], AREA)[0]?.columns).toBe(2);
  });

  it('восемь групп по шесть — несколько страниц, но ни одна группа не потеряна', () => {
    const pages = groupPages(
      Array.from({ length: 8 }, (_unused, index) => group(index, 6)),
      AREA,
    );

    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flatMap((page) => page.groups)).toHaveLength(8);
  });
});

describe('слайды', () => {
  const knockout = {
    id: 'ko',
    type: 'KNOCKOUT',
    name: 'Плей-офф',
    order: 2,
    groups: [],
    matches: [{ id: 'm' }],
  } as unknown as StageView;

  it('идёт турнир — столы, группы, сетка', () => {
    const slides = slidesOf({
      stages: [knockout],
      groups: [group(1, 4)],
      closed: false,
      results: undefined,
      groupArea: AREA,
      show: null,
    });

    expect(slides.map((slide) => slide.kind)).toEqual(['tables', 'groups', 'bracket']);
  });

  it('после турнира — итоги первыми, столов нет', () => {
    const results = {
      participants: [{ player: { id: 'x' } }],
    } as unknown as TournamentResultsView;
    const slides = slidesOf({
      stages: [knockout],
      groups: [group(1, 4)],
      closed: true,
      results,
      groupArea: AREA,
      show: null,
    });

    expect(slides.map((slide) => slide.kind)).toEqual(['results', 'bracket', 'groups']);
  });

  it('?show= закрепляет вид на экране', () => {
    const slides = slidesOf({
      stages: [knockout],
      groups: [group(1, 4)],
      closed: false,
      results: undefined,
      groupArea: AREA,
      show: 'bracket',
    });

    expect(slides.map((slide) => slide.kind)).toEqual(['bracket']);
  });

  it('слайд считается по часам: два экрана в одну секунду показывают одно', () => {
    const slides: Slide[] = [{ kind: 'tables' }, { kind: 'bracket', stage: knockout }];
    const cycle = (SLIDE_SECONDS.tables + SLIDE_SECONDS.bracket) * 1000;

    expect(slideAt(slides, cycle * 100).index).toBe(0);
    expect(slideAt(slides, cycle * 100 + SLIDE_SECONDS.tables * 1000).index).toBe(1);
    expect(slideAt(slides, cycle * 100 + 5000).left).toBe(SLIDE_SECONDS.tables - 5);
  });
});

describe('сетка на экране', () => {
  it('на 32 — зеркальная: прямая вышла бы вдвое мельче', () => {
    const geometry = bracketGeometry(5, 1, AREA);

    expect(geometry.mirror).toBe(true);
    expect(geometry.width * geometry.scale).toBeLessThanOrEqual(AREA.width + 0.5);
    expect(geometry.height * geometry.scale).toBeLessThanOrEqual(AREA.height + 0.5);
  });

  it('на 8 и 16 — прямая и целиком в области, финал и матч за 3-е не срезаны', () => {
    for (const rounds of [3, 4]) {
      const geometry = bracketGeometry(rounds, 1, AREA);

      expect(geometry.mirror).toBe(false);
      expect(geometry.width * geometry.scale).toBeLessThanOrEqual(AREA.width + 0.5);
      expect(geometry.height * geometry.scale).toBeLessThanOrEqual(AREA.height + 0.5);
    }
  });
});

describe('имена и места', () => {
  it('«Фамилия И.», а однофамильцам с одним инициалом — полное имя', () => {
    const names = shortNamesOf([
      { id: '1', lastName: 'Ким', firstName: 'Виктор' },
      { id: '2', lastName: 'Ким', firstName: 'Вадим' },
      { id: '3', lastName: 'Организаторова', firstName: 'Ольга' },
    ] as never);

    expect(names.get('1')).toBe('Ким Виктор');
    expect(names.get('2')).toBe('Ким Вадим');
    expect(names.get('3')).toBe('Организаторова О.');
  });

  it('делившие места — диапазоном, а не прочерком', () => {
    const labels = placeLabels({
      participants: [{ player: { id: 'w' }, place: 1 }],
      shared: [{ participants: ['a', 'b'], places: [5, 6, 7, 8] }],
    } as unknown as TournamentResultsView);

    expect(labels.get('w')).toBe('1');
    expect(labels.get('a')).toBe('5–8');
  });
});
