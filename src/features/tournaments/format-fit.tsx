import type { FormatConfig } from '@kttf/shared/types';
import type { ReactNode } from 'react';

import { useLocale } from '@/common/i18n';

import { FormatAdvice } from './format-advice-box';
import { fromFormatConfig, toFormatConfig } from './format-draft';
import { FORM_CHECK_TEXTS } from './tournament-form-texts';

interface FormatFitProps {
  readonly format: FormatConfig;
  /** Сколько человек на самом деле играет, а не сколько ждали. */
  readonly participants: number;
  readonly onSwitch: (format: FormatConfig) => void;
}

/**
 * Схема под фактический состав — ADR-101.
 *
 * Тот же совет, что в форме турнира («для четверых группы не нужны —
 * хватит круговой»), но по числу пришедших: записалось 32, пришли четверо.
 * «Переключить» отдаёт новую схему наверх — сохраняет её вызывающий.
 */
export default function FormatFit({ format, participants, onSwitch }: FormatFitProps): ReactNode {
  const locale = useLocale();

  // Одного не во что посеять: жеребьёвка сама скажет, что участников мало.
  if (participants < 2) return null;

  return (
    <FormatAdvice
      draft={fromFormatConfig(format)}
      participants={participants}
      texts={FORM_CHECK_TEXTS[locale]}
      onChange={(draft) => {
        onSwitch(toFormatConfig(draft));
      }}
    />
  );
}
