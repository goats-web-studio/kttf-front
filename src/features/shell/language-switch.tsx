import ButtonBase from '@mui/material/ButtonBase';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { ChevronDown, Globe } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { LOCALE_NAMES, LOCALES, useLocale, useSetLocale, useT } from '@/common/i18n';

/** Короткая метка текущего языка в шапке. */
const SHORT: Readonly<Record<(typeof LOCALES)[number], string>> = {
  kk: 'ҚАЗ',
  en: 'ENG',
  ru: 'РУС',
  zh: '中文',
  ko: '한국어',
  ja: '日本語',
};

/** Выпадающий список языков в шапке. Выбор запоминается в браузере. */
export default function LanguageSwitch(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const setLocale = useSetLocale();
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  return (
    <>
      <ButtonBase
        aria-label={t('nav.language')}
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        aria-controls={anchor === null ? undefined : menuId}
        onClick={(event) => {
          setAnchor(event.currentTarget);
        }}
        sx={{
          gap: 0.5,
          minHeight: 44,
          px: 1,
          mr: 1,
          borderRadius: 1,
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: 'var(--ink-700)',
        }}
      >
        <Globe size={16} aria-hidden />
        <span lang={locale}>{SHORT[locale]}</span>
        <ChevronDown size={14} aria-hidden />
      </ButtonBase>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => {
          setAnchor(null);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {LOCALES.map((item) => (
          <MenuItem
            key={item}
            lang={item}
            selected={item === locale}
            onClick={() => {
              setLocale(item);
              setAnchor(null);
            }}
            sx={{ minHeight: 44, minWidth: 160 }}
          >
            {LOCALE_NAMES[item]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
