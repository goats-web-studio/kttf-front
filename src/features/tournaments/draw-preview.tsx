import type { StageView } from '@kttf/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';

import { swapDraw } from './api';
import { STAGE_TYPE_KEYS } from './labels';
import { tournamentKeys } from './queries';

interface DrawPreviewProps {
  readonly tournamentId: string;
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
}

/** Состав, который можно править: у группы — её игроки, у сетки — все её. */
interface Placement {
  readonly key: string;
  readonly label: string;
  readonly participants: readonly string[];
}

/**
 * Расстановка после жеребьёвки — ТЗ 5.3.
 *
 * Организатору её нужно увидеть **до** старта: после старта менять уже
 * нечего. Публичная часть страницы показывает результаты только начатого
 * турнира — пустые таблицы до первой встречи выглядят поломкой, — поэтому
 * состав живёт здесь, у органов управления.
 *
 * Отсюда же идёт ручная корректировка: два нажатия меняют игроков местами
 * (ADR-033). Перестановка в свободный проход сетки — тот же обмен с тем, кто
 * этот проход занимает; отдельного действия для неё нет.
 *
 * Сетка рисуется тем же `ResultsBracket`, что и после турнира: второй способ
 * нарисовать ту же сетку разошёлся бы с первым.
 */
export default function DrawPreview({ tournamentId, stages, names }: DrawPreviewProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const swap = useMutation({
    mutationFn: (pair: { readonly a: string; readonly b: string }) =>
      swapDraw(tournamentId, { playerAId: pair.a, playerBId: pair.b }),
    onSuccess: async () => {
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });

  if (stages.length === 0) {
    return null;
  }

  const choose = (playerId: string): void => {
    if (selected === null) {
      setSelected(playerId);
      return;
    }

    // Повторное нажатие по выбранному отменяет выбор: иначе передумать можно
    // только обменом, который потом придётся отменять вторым обменом.
    if (selected === playerId) {
      setSelected(null);
      return;
    }

    swap.mutate({ a: selected, b: playerId });
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">{t('draw.title')}</h2>
      <p className="mt-1 text-sm text-slate-600">{t('draw.swap.hint')}</p>

      {swap.error !== null && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {t(errorMessageKey(swap.error))}
        </p>
      )}

      {stages.map((stage) => (
        <div key={stage.id} className="mt-3">
          <h3 className="text-sm font-medium text-slate-700">
            {/* Название этапа задаёт жеребьёвка, и у круговой схемы оно
                совпадает с названием типа. Повторять его дважды незачем. */}
            {stage.name === t(STAGE_TYPE_KEYS[stage.type])
              ? stage.name
              : `${stage.name} · ${t(STAGE_TYPE_KEYS[stage.type])}`}{' '}
            {/* «Встреч: 2», а не «2 встречи»: русское число согласуется
                с существительным, а системы склонения в словаре нет. */}
            <span className="font-normal text-slate-500">
              {t('draw.matches')}: <span className="tabular-nums">{stage.matches.length}</span>
            </span>
          </h3>

          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {placementsOf(stage, t('draw.bracket')).map((placement) => (
              <li key={placement.key} className="rounded border border-slate-200 p-3 text-sm">
                <p className="font-medium text-slate-900">{placement.label}</p>
                {/* Список назван группой: у страницы их много, и без имени
                    состав неотличим для чтеца экрана. */}
                <ol aria-label={placement.label} className="mt-1">
                  {placement.participants.map((id) => (
                    // Порядок — посевной: первый в группе сильнейший.
                    <li key={id}>
                      <button
                        type="button"
                        aria-pressed={selected === id}
                        disabled={swap.isPending}
                        onClick={() => {
                          choose(id);
                        }}
                        className={
                          selected === id
                            ? 'rounded bg-blue-700 px-2 py-0.5 text-white'
                            : 'rounded px-2 py-0.5 text-slate-700 hover:bg-slate-100 disabled:text-slate-400'
                        }
                      >
                        {names.get(id) ?? t('results.match.unknownPlayer')}
                      </button>
                    </li>
                  ))}
                </ol>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/**
 * Что показывать у этапа.
 *
 * У группового этапа — его группы. У сетки групп нет вовсе, но переставлять
 * игроков в ней требование позволяет так же (ТЗ 5.3), поэтому её участники
 * собираются из встреч одним списком.
 */
function placementsOf(stage: StageView, bracketLabel: string): Placement[] {
  if (stage.groups.length > 0) {
    return stage.groups.map((group) => ({
      key: group.id,
      label: group.label,
      participants: group.participants,
    }));
  }

  const participants = [
    ...new Set(
      stage.matches.flatMap((match) =>
        [match.playerAId, match.playerBId].filter((id): id is string => id !== null),
      ),
    ),
  ];

  return participants.length === 0 ? [] : [{ key: stage.id, label: bracketLabel, participants }];
}
