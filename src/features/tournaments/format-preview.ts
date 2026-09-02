import {
  buildKnockout,
  countRoundRobinMatches,
  countRounds,
  splitIntoGroups,
} from '@kttf/shared/brackets';
import type { FormatConfig } from '@kttf/shared/types';

/**
 * Предпросчёт схемы турнира — ADR-024.
 *
 * Считают **те же чистые функции движка**, что и настоящая жеребьёвка. Своя
 * формула здесь рано или поздно разошлась бы с ней, и разошлась бы молча:
 * организатор принимает решение по числу «получится 32 встречи», а в зале
 * обнаруживает другое. Это запрет №2 брифа.
 *
 * Число участников — предположение организатора, а не настройка турнира:
 * турнир заводится до записи, и сколько человек придёт, никто не знает. Оно
 * нигде не сохраняется.
 */
export interface FormatPreview {
  /** Размеры групп по порядку. Пусто — у схемы нет группового этапа. */
  readonly groups: readonly number[];
  readonly groupMatches: number;
  /** Сколько человек выходит из групп дальше. */
  readonly advancing: number;
  /** Размеры финальных групп — только у схемы «финалы по местам». */
  readonly finalGroups: readonly number[];
  readonly finalGroupMatches: number;
  /** Размер олимпийской сетки, ноль — сетки в схеме нет. */
  readonly bracketSize: number;
  readonly bracketMatches: number;
  /** Туров у круговой схемы. У остальных ноль: там их считает сетка. */
  readonly roundRobinRounds: number;
  readonly totalMatches: number;
  /**
   * Из групп выходит меньше двух — плей-офф не из кого собрать.
   *
   * Ровно та проверка, которой жеребьёвка отвергает конфигурацию. Здесь она
   * предупреждение, а не отказ: настоящее число участников выяснится к
   * жеребьёвке, и запрещать создание по догадке не за что.
   */
  readonly tooFewAdvancing: boolean;
}

const EMPTY: FormatPreview = {
  groups: [],
  groupMatches: 0,
  advancing: 0,
  finalGroups: [],
  finalGroupMatches: 0,
  bracketSize: 0,
  bracketMatches: 0,
  roundRobinRounds: 0,
  totalMatches: 0,
  tooFewAdvancing: false,
};

/** Заглушки участников: движку нужны только их количество и различимость. */
function placeholders(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `p${String(index + 1)}`);
}

export function previewFormat(config: FormatConfig, participants: number): FormatPreview {
  if (!Number.isInteger(participants) || participants < 2) return EMPTY;

  switch (config.type) {
    case 'ROUND_ROBIN': {
      const matches = countRoundRobinMatches(participants) * config.rounds;

      return {
        ...EMPTY,
        roundRobinRounds: countRounds(participants) * config.rounds,
        totalMatches: matches,
      };
    }

    case 'KNOCKOUT': {
      const bracket = buildKnockout(placeholders(participants), {
        thirdPlace: config.thirdPlace,
      });

      return {
        ...EMPTY,
        bracketSize: bracket.bracketSize,
        bracketMatches: bracket.matches.length,
        totalMatches: bracket.matches.length,
      };
    }

    case 'GROUPS_KNOCKOUT': {
      const stage = groupStage(config, participants);
      const bracket = buildKnockout(placeholders(stage.advancing), {
        thirdPlace: config.thirdPlace,
      });

      return {
        ...EMPTY,
        ...stage,
        bracketSize: bracket.bracketSize,
        bracketMatches: bracket.matches.length,
        totalMatches: stage.groupMatches + bracket.matches.length,
        tooFewAdvancing: stage.advancing < 2,
      };
    }

    default: {
      const stage = groupStage(config, participants);

      // Финалы по местам: k-я группа собирает занявших k-е место. Значит в
      // ней столько человек, сколько групп доросло до k-го места.
      const finalGroups = Array.from(
        { length: config.advancePerGroup },
        (_, place) => stage.groups.filter((size) => size > place).length,
      );

      const finalGroupMatches = finalGroups.reduce(
        (total, size) => total + countRoundRobinMatches(size) * config.groupRounds,
        0,
      );

      return {
        ...EMPTY,
        ...stage,
        finalGroups,
        finalGroupMatches,
        totalMatches: stage.groupMatches + finalGroupMatches,
        tooFewAdvancing: stage.advancing < 2,
      };
    }
  }
}

/**
 * Групповой этап схем «группы + сетка» и «группы + финальные группы».
 *
 * Разбивку делает `splitIntoGroups` — та же, что в жеребьёвке. Разведение по
 * клубам выключено: клубы участников до записи неизвестны, а на размеры групп
 * оно не влияет — перестановки идут внутри полосы (ADR-011).
 */
function groupStage(
  config: Extract<FormatConfig, { type: 'GROUPS_KNOCKOUT' | 'GROUPS_FINAL_GROUPS' }>,
  participants: number,
): { groups: number[]; groupMatches: number; advancing: number } {
  const split = splitIntoGroups(
    placeholders(participants).map((participant) => ({ participant })),
    {
      ...(config.groupCount === undefined ? {} : { groupCount: config.groupCount }),
      ...(config.groupSize === undefined ? {} : { groupSize: config.groupSize }),
      separateByClub: false,
    },
  );

  const groups = split.groups.map((group) => group.participants.length);

  return {
    groups,
    groupMatches: groups.reduce(
      (total, size) => total + countRoundRobinMatches(size) * config.groupRounds,
      0,
    ),
    // Группа меньше зоны выхода отдаёт всех, кто в ней есть.
    advancing: groups.reduce((total, size) => total + Math.min(size, config.advancePerGroup), 0),
  };
}
