import type { StageView } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { STAGE_TYPE_KEYS } from './labels';

interface DrawPreviewProps {
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Расстановка после жеребьёвки — ТЗ 5.3.
 *
 * Организатору её нужно увидеть **до** старта: после старта менять уже нечего.
 * Публичная часть страницы показывает результаты только начатого турнира —
 * пустые таблицы до первой встречи выглядят поломкой, — поэтому состав групп
 * живёт здесь, у органов управления.
 *
 * Сетка рисуется тем же `ResultsBracket`, что и после турнира: второй способ
 * нарисовать ту же сетку разошёлся бы с первым.
 */
export default function DrawPreview({ stages, names }: DrawPreviewProps): ReactNode {
  const t = useT();

  if (stages.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">{t('draw.title')}</h2>

      {stages.map((stage) => (
        <div key={stage.id} className="mt-3">
          <h3 className="text-sm font-medium text-slate-700">
            {/* Название этапа задаёт жеребьёвка, и у круговой схемы оно
                совпадает с названием типа. Повторять его дважды незачем. */}
            {stage.name === t(STAGE_TYPE_KEYS[stage.type])
              ? stage.name
              : `${stage.name} · ${t(STAGE_TYPE_KEYS[stage.type])}`}{' '}
            <span className="font-normal text-slate-500 tabular-nums">
              ({stage.matches.length} {t('draw.matches')})
            </span>
          </h3>

          {stage.groups.length > 0 && (
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {stage.groups.map((group) => (
                <li key={group.id} className="rounded border border-slate-200 p-3 text-sm">
                  <p className="font-medium text-slate-900">{group.label}</p>
                  <ol className="mt-1 text-slate-700">
                    {group.participants.map((id) => (
                      // Порядок — посевной: первый в группе сильнейший.
                      <li key={id}>{names.get(id) ?? t('results.match.unknownPlayer')}</li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  );
}
