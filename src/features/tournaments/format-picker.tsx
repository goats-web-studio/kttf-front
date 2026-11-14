import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import { Info } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { fill, useLocale, useT, type MessageKey } from '@/common/i18n';

import FormatArt from './format-art';
import { toFormatConfig, type FormatDraft, type FormatType } from './format-draft';
import { previewFormat } from './format-preview';
import { FORM_UI_TEXTS, FORMAT_TEXTS } from './format-texts';

/** Схемы по порядку — от самой простой к самой сложной. */
const FORMAT_TYPES: readonly FormatType[] = [
  'ROUND_ROBIN',
  'KNOCKOUT',
  'GROUPS_KNOCKOUT',
  'GROUPS_FINAL_GROUPS',
];

/** Название схемы — в общем словаре: оно же в карточке турнира и в календаре. */
const FORMAT_TITLE: Readonly<Record<FormatType, MessageKey>> = {
  ROUND_ROBIN: 'tournament.format.ROUND_ROBIN',
  KNOCKOUT: 'tournament.format.KNOCKOUT',
  GROUPS_KNOCKOUT: 'tournament.format.GROUPS_KNOCKOUT',
  GROUPS_FINAL_GROUPS: 'tournament.format.GROUPS_FINAL_GROUPS',
};

/**
 * Выбор схемы карточками — с картинкой, одной строкой смысла и числом
 * встреч при ожидаемом составе.
 *
 * Выпадающий список из четырёх названий не объяснял, чем «группы и сетка»
 * отличаются от «финалов по местам». Карточка показывает силуэт схемы, а
 * число встреч считает тот же движок, что и предпросчёт ниже, — по текущим
 * настройкам групп, — поэтому схемы можно сравнить, не переключая их.
 * «Как это работает» открывает объяснение с крупной картинкой.
 */
export default function FormatPicker({
  draft,
  participants,
  onType,
}: {
  readonly draft: FormatDraft;
  readonly participants: number;
  readonly onType: (type: FormatType) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const ui = FORM_UI_TEXTS[locale];
  const [explained, setExplained] = useState<FormatType | null>(null);

  return (
    <>
      <Box
        role="radiogroup"
        aria-label={t('tournament.form.formatType')}
        sx={{
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
        }}
      >
        {FORMAT_TYPES.map((type) => {
          const selected = draft.type === type;
          const matches = previewFormat(
            toFormatConfig({ ...draft, type }),
            participants,
          ).totalMatches;

          return (
            <Box
              key={type}
              data-format-card={type}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3,
                border: '2px solid',
                borderColor: selected ? 'var(--red-600)' : 'var(--line)',
                bgcolor: selected ? 'var(--red-50)' : 'var(--paper)',
                transition: 'border-color var(--dur-fast) var(--ease)',
                overflow: 'hidden',
              }}
            >
              <ButtonBase
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  onType(type);
                }}
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  textAlign: 'left',
                  gap: 1,
                  p: 2,
                  '&.Mui-focusVisible': {
                    outline: '2px solid var(--red-600)',
                    outlineOffset: '-4px',
                  },
                }}
              >
                <FormatArt type={type} height={64} />
                <Typography component="span" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {t(FORMAT_TITLE[type])}
                </Typography>
                <Typography component="span" variant="body2" color="text.secondary">
                  {FORMAT_TEXTS[locale][type].short}
                </Typography>
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums', mt: 'auto' }}
                >
                  {fill(ui.matchesAt, {
                    matches: String(matches),
                    participants: String(participants),
                  })}
                </Typography>
              </ButtonBase>
              <Button
                variant="text"
                size="small"
                startIcon={<Info size={16} aria-hidden />}
                onClick={() => {
                  setExplained(type);
                }}
                sx={{ justifyContent: 'flex-start', px: 2, minHeight: 40, borderRadius: 0 }}
              >
                {ui.how}
              </Button>
            </Box>
          );
        })}
      </Box>

      <FormatExplainer
        type={explained}
        onClose={() => {
          setExplained(null);
        }}
        onChoose={(type) => {
          onType(type);
          setExplained(null);
        }}
      />
    </>
  );
}

/** Объяснение схемы: крупная картинка, как работает, кому подходит. */
function FormatExplainer({
  type,
  onClose,
  onChoose,
}: {
  readonly type: FormatType | null;
  readonly onClose: () => void;
  readonly onChoose: (type: FormatType) => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const ui = FORM_UI_TEXTS[locale];

  return (
    <Dialog open={type !== null} onClose={onClose} maxWidth="sm" fullWidth>
      {type !== null && (
        <>
          <DialogTitle variant="h2">{t(FORMAT_TITLE[type])}</DialogTitle>
          <DialogContent>
            <Box
              sx={{
                display: 'grid',
                placeItems: 'center',
                py: 3,
                mb: 2,
                borderRadius: 3,
                bgcolor: 'var(--paper-sunken)',
              }}
            >
              <FormatArt type={type} height={144} />
            </Box>
            <Typography sx={{ whiteSpace: 'pre-line' }}>
              {FORMAT_TEXTS[locale][type].how}
            </Typography>
            <Typography variant="h3" sx={{ mt: 3, mb: 1 }}>
              {ui.fit}
            </Typography>
            <Typography color="text.secondary">{FORMAT_TEXTS[locale][type].fit}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={onClose}>{ui.close}</Button>
            <Button
              variant="contained"
              onClick={() => {
                onChoose(type);
              }}
            >
              {ui.choose}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
