import ButtonBase from '@mui/material/ButtonBase';
import Stack from '@mui/material/Stack';
import { type ReactNode } from 'react';

import { LOCALES, useLocale, useSetLocale, useT, type Locale } from '@/common/i18n';

/**
 * Названия языков — на самих языках, поэтому не из словаря: человек ищет
 * свой язык, а не перевод его названия.
 */
const LABELS: Readonly<Record<Locale, string>> = {
  kk: 'ҚАЗ',
  en: 'ENG',
  ru: 'РУС',
};

/** Переключатель языка в шапке: каз → англ → рус. */
export default function LanguageSwitch(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const setLocale = useSetLocale();

  return (
    <Stack
      role="group"
      aria-label={t('nav.language')}
      direction="row"
      sx={{ alignItems: 'center', mr: 1 }}
    >
      {LOCALES.map((item) => {
        const active = item === locale;

        return (
          <ButtonBase
            key={item}
            lang={item}
            aria-pressed={active}
            onClick={() => {
              setLocale(item);
            }}
            sx={{
              minWidth: 40,
              minHeight: 44,
              px: 0.75,
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              letterSpacing: '0.04em',
              color: active ? 'var(--red-500)' : 'var(--ink-500)',
              borderRadius: 1,
            }}
          >
            {LABELS[item]}
          </ButtonBase>
        );
      })}
    </Stack>
  );
}
