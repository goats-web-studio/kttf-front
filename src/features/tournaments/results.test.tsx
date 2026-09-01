import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ru } from '@/common/i18n/ru';
import { playerName } from '@/features/players/player-name';
import { PLAYERS, RESULTS } from '@/test/fixtures';

import ResultsBracket from './results-bracket';
import ResultsMatches from './results-matches';
import ResultsPlacements from './results-placements';
import ResultsRatings from './results-ratings';
import ResultsStandings from './results-standings';

/**
 * Проверяется не вёрстка, а то, что ответ сервера доходит до человека без
 * искажений: место, повод его отсутствия, счёт, дельта рейтинга. Тексты
 * берутся из словаря — иначе тест переживёт переименование ключа и перестанет
 * что-либо стеречь.
 */

const NAMES = new Map(
  RESULTS.participants.map((participant) => [
    participant.player.id,
    playerName(participant.player),
  ]),
);

function row(text: string): HTMLElement {
  const cell = screen.getByText(text);
  const found = cell.closest('tr');

  if (found === null) {
    throw new Error(`Строка таблицы для «${text}» не найдена`);
  }

  return found;
}

describe('итоговые места', () => {
  function renderPlacements(): void {
    render(
      <ResultsPlacements
        participants={RESULTS.participants}
        shared={RESULTS.shared}
        unresolved={RESULTS.unresolved}
        names={NAMES}
      />,
    );
  }

  it('показывает место рядом с игроком', () => {
    renderPlacements();

    expect(row(playerName(PLAYERS.first)).textContent).toContain('1');
  });

  it('различает выбывшего из группы и неопределённое место', () => {
    renderPlacements();

    // Оба дают пустое место и означают разное. Одна пустая клетка на два
    // случая ничего человеку не объясняет — ради этого в контракте `reason`.
    expect(row(playerName(PLAYERS.third)).textContent).toContain(ru['results.reason.GROUP_EXIT']);
    expect(row(playerName(PLAYERS.fourth)).textContent).toContain(ru['results.reason.UNDECIDED']);
  });

  it('отмечает снявшегося и игравшего вне зачёта', () => {
    renderPlacements();

    const fourth = row(playerName(PLAYERS.fourth)).textContent;

    expect(fourth).toContain(ru['registration.status.WITHDRAWN']);
    expect(fourth).toContain(ru['results.notRated']);
  });

  it('показывает делёжку мест диапазоном', () => {
    renderPlacements();

    const shared = screen.getByText('3–4').closest('li');

    expect(shared?.textContent).toContain(PLAYERS.third.lastName);
    expect(shared?.textContent).toContain(PLAYERS.fourth.lastName);
  });
});

describe('групповые таблицы', () => {
  function renderStandings(): void {
    render(<ResultsStandings standings={RESULTS.standings} names={NAMES} />);
  }

  it('называет игрока по идентификатору из строки таблицы', () => {
    renderStandings();

    expect(screen.getByText(playerName(PLAYERS.first))).toBeDefined();
  });

  it('показывает разницу сетов со знаком', () => {
    renderStandings();

    expect(screen.getByText('+3')).toBeDefined();
    expect(screen.getByText('-3')).toBeDefined();
  });

  it('перечисляет равенства, которые не развёл судья', () => {
    renderStandings();

    // Пока список не пуст, места определены не полностью — ADR-008.
    expect(screen.getByText(ru['results.unresolved.title'])).toBeDefined();
    expect(screen.getByText('2–3')).toBeDefined();
  });
});

describe('встречи', () => {
  function renderMatches(): void {
    render(<ResultsMatches stages={RESULTS.stages} names={NAMES} />);
  }

  it('показывает счёт сыгранной встречи', () => {
    renderMatches();

    expect(screen.getByText('3 : 1')).toBeDefined();
  });

  it('называет техническую победу', () => {
    renderMatches();

    expect(screen.getByText(ru['match.resultType.WALKOVER'])).toBeDefined();
  });

  it('не выдумывает участников встречи, которая их ещё ждёт', () => {
    renderMatches();

    expect(screen.getAllByText(ru['results.match.pending']).length).toBe(2);
  });
});

describe('сетка', () => {
  it('показывает, кого ждёт встреча без участников', () => {
    render(<ResultsBracket stages={RESULTS.stages} names={NAMES} />);

    // Сетка разворачивается целиком при жеребьёвке, поэтому финал существует
    // раньше своих участников (ADR-019). Слоты человеку считают с единицы.
    expect(screen.getByText(`${ru['results.match.winnerOf']} №1`)).toBeDefined();
  });

  it('не рисует сетку для этапа с группами', () => {
    render(<ResultsBracket stages={RESULTS.stages} names={NAMES} />);

    expect(screen.queryByText(ru['stage.type.GROUPS'])).toBeNull();
  });
});

describe('изменения рейтинга', () => {
  function renderRatings(): void {
    render(<ResultsRatings ratings={RESULTS.ratings} names={NAMES} />);
  }

  it('показывает прибавку со знаком, а убыль как есть', () => {
    renderRatings();

    expect(screen.getByText('+20.00')).toBeDefined();
    expect(screen.getByText('-10.00')).toBeDefined();
  });

  it('не выдаёт неначисленный рейтинг за ноль', () => {
    renderRatings();

    expect(screen.getByText(ru['results.ratings.pending'])).toBeDefined();
  });

  it('раскрывает журнал по встречам, когда он есть', () => {
    renderRatings();

    // У участника без событий журнала раскрывать нечего — ТЗ 7.3.
    expect(screen.getAllByText(ru['results.ratings.events']).length).toBe(1);
  });
});
