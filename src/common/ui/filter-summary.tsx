import type { ReactNode } from 'react';

import { fill, formatCount, useLocale, useT } from '@/common/i18n';

import Button from './button';
import { Skeleton } from './skeleton';

export interface ActiveFilter {
  readonly key: string;
  /** «Город: Алматы» — подпись и значение, чтобы чип читался без панели. */
  readonly label: string;
  readonly onRemove: () => void;
}

interface FilterSummaryProps {
  /**
   * Сколько нашлось. `undefined` — ответа ещё нет, `null` — запрос отказал,
   * и считать нечего: вечная заготовка на месте числа выглядела бы загрузкой.
   */
  readonly total: number | null | undefined;
  readonly filters: readonly ActiveFilter[];
  readonly onReset: () => void;
}

/**
 * Строка под панелью фильтров — docs/07-design-system.md, 6.2.
 *
 * Число найденного видно всегда, активные фильтры — чипами с крестиком,
 * рядом «Сбросить все». Чип снимает одно условие, не трогая остальные:
 * человек, сузивший рейтинг до города и клуба, часто хочет убрать только
 * клуб.
 */
export default function FilterSummary({ total, filters, onReset }: FilterSummaryProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
      {total !== null && (
        <p className="mr-2 text-ink-700" aria-live="polite">
          {t('filter.found')}{' '}
          <span className="font-medium tabular-nums text-ink-900">
            {total === undefined ? (
              <Skeleton className="inline-block h-3 w-8 align-middle" />
            ) : (
              formatCount(total, locale)
            )}
          </span>
        </p>
      )}

      {filters.map((filter) => (
        <span
          key={filter.key}
          className="inline-flex h-8 items-center gap-1 rounded-xs border border-line-strong bg-paper pl-3 text-ink-900"
        >
          {filter.label}
          <button
            type="button"
            aria-label={fill(t('filter.chip'), { label: t('filter.remove'), value: filter.label })}
            onClick={filter.onRemove}
            // Крестик 32px, зона нажатия 44px (раздел 9) — псевдоэлементом,
            // чтобы чип не раздувался по высоте.
            className="relative grid h-8 w-8 place-items-center rounded-xs text-ink-500 after:absolute after:-inset-1.5 hover:bg-paper-hover hover:text-ink-900"
          >
            <span aria-hidden>×</span>
          </button>
        </span>
      ))}

      {filters.length > 0 && (
        <Button variant="ghost" className="h-11 sm:h-8 sm:px-3 sm:text-sm" onClick={onReset}>
          {t('filter.resetAll')}
        </Button>
      )}
    </div>
  );
}
