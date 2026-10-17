import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import IntegerField from '@/common/ui/integer-field';

import { previewFormat } from './format-preview';
import { toFormatConfig, type FormatDraft, type FormatType } from './format-draft';
import PlayoffLengths from './playoff-lengths';

interface FormatEditorProps {
  readonly draft: FormatDraft;
  readonly onChange: (draft: FormatDraft) => void;
  /** Предположение организатора о числе участников. Нигде не сохраняется. */
  readonly participants: number;
  readonly onParticipantsChange: (participants: number) => void;
}

/** Две колонки от 640px, одна на телефоне: поле во всю ширину пальца. */
const GRID = {
  display: 'grid',
  gap: 2,
  alignItems: 'center',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
} as const;

/**
 * Редактор схемы проведения — ТЗ 5.2, ADR-024, часть 3.
 *
 * Правит существующий `formatConfig`, а не собственную модель настроек:
 * его читают жеребьёвка, расчёт таблиц, расчёт мест и офлайн-консоль, и
 * вторая модель означала бы перевод между ними — место, где схема турнира
 * понимается двумя способами.
 *
 * Рядом с настройками стоит предпросчёт, и считает его движок. Организатор
 * принимает решение по числу встреч, и это число обязано быть тем же, что
 * получится при жеребьёвке.
 */
export default function FormatEditor({
  draft,
  onChange,
  participants,
  onParticipantsChange,
}: FormatEditorProps): ReactNode {
  const t = useT();

  const set = <K extends keyof FormatDraft>(key: K, value: FormatDraft[K]): void => {
    onChange({ ...draft, [key]: value });
  };

  const hasGroups = draft.type === 'GROUPS_KNOCKOUT' || draft.type === 'GROUPS_FINAL_GROUPS';

  return (
    <Section legend={t('tournament.form.format')}>
      <Box sx={GRID}>
        <TextField
          select
          label={t('tournament.form.formatType')}
          value={draft.type}
          onChange={(event) => {
            set('type', event.target.value as FormatType);
          }}
        >
          {FORMAT_KEYS.map(([value, key]) => (
            <MenuItem key={value} value={value}>
              {t(key)}
            </MenuItem>
          ))}
        </TextField>

        {draft.type === 'ROUND_ROBIN' && (
          <RoundsField
            label="tournament.form.rounds"
            value={draft.rounds}
            onChange={(rounds) => {
              set('rounds', rounds);
            }}
          />
        )}

        {hasGroups && (
          <>
            <TextField
              select
              label={t('tournament.form.sizing')}
              value={draft.sizing}
              onChange={(event) => {
                set('sizing', event.target.value === 'size' ? 'size' : 'count');
              }}
            >
              <MenuItem value="count">{t('tournament.form.byGroupCount')}</MenuItem>
              <MenuItem value="size">{t('tournament.form.byGroupSize')}</MenuItem>
            </TextField>

            <NumberField
              label={
                draft.sizing === 'count'
                  ? 'tournament.form.groupCount'
                  : 'tournament.form.groupSize'
              }
              value={draft.sizing === 'count' ? draft.groupCount : draft.groupSize}
              onChange={(value) => {
                set(draft.sizing === 'count' ? 'groupCount' : 'groupSize', value);
              }}
            />

            <NumberField
              label="tournament.form.advancePerGroup"
              value={draft.advancePerGroup}
              onChange={(value) => {
                set('advancePerGroup', value);
              }}
            />

            <RoundsField
              label="tournament.form.groupRounds"
              value={draft.groupRounds}
              onChange={(rounds) => {
                set('groupRounds', rounds);
              }}
            />
          </>
        )}

        {/* Длина встречи задаётся отдельно для групп и плей-офф — ТЗ 5.2.
            Только у схемы «группы + сетка» этих этапов два разных; у
            остальных планка одна на весь турнир. */}
        {draft.type === 'GROUPS_KNOCKOUT' ? (
          <>
            <SetsField
              label="tournament.form.groupSetsToWin"
              value={draft.groupSetsToWin}
              onChange={(value) => {
                set('groupSetsToWin', value);
              }}
            />
            <SetsField
              label="tournament.form.koSetsToWin"
              value={draft.koSetsToWin}
              onChange={(value) => {
                set('koSetsToWin', value);
              }}
            />
          </>
        ) : (
          <SetsField
            label="tournament.form.setsToWin"
            value={draft.setsToWin}
            onChange={(value) => {
              set('setsToWin', value);
            }}
          />
        )}

        {(draft.type === 'KNOCKOUT' || draft.type === 'GROUPS_KNOCKOUT') && (
          <FormControlLabel
            sx={{ minHeight: 44 }}
            label={t('tournament.form.thirdPlace')}
            control={
              <Checkbox
                checked={draft.thirdPlace}
                onChange={(event) => {
                  set('thirdPlace', event.target.checked);
                }}
              />
            }
          />
        )}
      </Box>

      {(draft.type === 'KNOCKOUT' || draft.type === 'GROUPS_KNOCKOUT') && (
        <PlayoffLengths
          base={draft.type === 'GROUPS_KNOCKOUT' ? draft.koSetsToWin : draft.setsToWin}
          lengths={draft.playoffSetsToWin}
          bracketSize={previewFormat(toFormatConfig(draft), participants).bracketSize}
          thirdPlace={draft.thirdPlace}
          onChange={(lengths) => {
            set('playoffSetsToWin', lengths);
          }}
        />
      )}

      <Preview
        draft={draft}
        participants={participants}
        onParticipantsChange={onParticipantsChange}
      />
    </Section>
  );
}

/**
 * Раздел формы турнира: рамка без тени (запрет №13), подпись — название
 * группы полей. Общий у редактора схемы и формы создания: разделы одной
 * формы обязаны выглядеть одинаково.
 */
export function Section({
  legend,
  children,
}: {
  readonly legend: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Paper
      variant="outlined"
      component="fieldset"
      sx={{ m: 0, mt: 4, px: { xs: 2, sm: 3 }, pt: 1, pb: { xs: 2, sm: 3 }, minWidth: 0 }}
    >
      <Typography component="legend" variant="h3" sx={{ px: 0.5, mb: 1 }}>
        {legend}
      </Typography>
      {children}
    </Paper>
  );
}

/**
 * Что получится — считает движок.
 *
 * Число участников здесь предположение, а не настройка: турнир заводится до
 * записи. Оно никуда не сохраняется и нужно только затем, чтобы у выбора
 * схемы был видимый результат.
 */
function Preview({
  draft,
  participants,
  onParticipantsChange,
}: {
  readonly draft: FormatDraft;
  readonly participants: number;
  readonly onParticipantsChange: (participants: number) => void;
}): ReactNode {
  const t = useT();
  const preview = previewFormat(toFormatConfig(draft), participants);

  const rows: { readonly key: MessageKey; readonly value: string }[] = [];

  if (preview.groups.length > 0) {
    rows.push({
      key: 'tournament.preview.groups',
      value: `${String(preview.groups.length)} × ${preview.groups.join(', ')}`,
    });
    rows.push({
      key: 'tournament.preview.groupMatches',
      value: String(preview.groupMatches),
    });
    rows.push({ key: 'tournament.preview.advancing', value: String(preview.advancing) });
  }

  if (preview.finalGroups.length > 0) {
    rows.push({
      key: 'tournament.preview.finalGroups',
      value: `${String(preview.finalGroups.length)} × ${preview.finalGroups.join(', ')}`,
    });
  }

  if (preview.bracketSize > 0) {
    rows.push({ key: 'tournament.preview.bracketSize', value: String(preview.bracketSize) });
  }

  if (preview.roundRobinRounds > 0) {
    rows.push({ key: 'tournament.preview.rounds', value: String(preview.roundRobinRounds) });
  }

  rows.push({ key: 'tournament.preview.totalMatches', value: String(preview.totalMatches) });

  return (
    <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
      <IntegerField
        label={t('tournament.preview.participants')}
        value={participants}
        onChange={onParticipantsChange}
        sx={{ width: 160 }}
      />

      <Box
        component="dl"
        sx={{
          mt: 2,
          mb: 0,
          display: 'grid',
          columnGap: 2,
          rowGap: 0.5,
          typography: 'body2',
          gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
        }}
      >
        {rows.map((row) => (
          <Box key={row.key} sx={{ display: 'contents' }}>
            <Box component="dt" sx={{ color: 'text.secondary' }}>
              {t(row.key)}
            </Box>
            <Box component="dd" sx={{ m: 0, fontVariantNumeric: 'tabular-nums' }}>
              {row.value}
            </Box>
          </Box>
        ))}
      </Box>

      {preview.tooFewAdvancing && (
        // Ровно та проверка, которой жеребьёвка отвергает конфигурацию.
        // Здесь она предупреждение: настоящее число участников выяснится
        // к жеребьёвке, и запрещать создание по догадке не за что.
        <Alert severity="warning" sx={{ mt: 2 }}>
          {t('tournament.preview.tooFewAdvancing')}
        </Alert>
      )}
    </Box>
  );
}

/**
 * Схемы — в тексты интерфейса.
 *
 * Тип обязывает перечислить все: новая схема в общем коде ломает сборку
 * здесь, а не выходит к человеку английской строкой.
 */
const FORMAT_KEYS: readonly (readonly [FormatType, MessageKey])[] = [
  ['ROUND_ROBIN', 'tournament.format.ROUND_ROBIN'],
  ['KNOCKOUT', 'tournament.format.KNOCKOUT'],
  ['GROUPS_KNOCKOUT', 'tournament.format.GROUPS_KNOCKOUT'],
  ['GROUPS_FINAL_GROUPS', 'tournament.format.GROUPS_FINAL_GROUPS'],
];

function RoundsField({
  label,
  value,
  onChange,
}: {
  readonly label: MessageKey;
  readonly value: 1 | 2;
  readonly onChange: (value: 1 | 2) => void;
}): ReactNode {
  const t = useT();

  return (
    <TextField
      select
      label={t(label)}
      value={String(value)}
      onChange={(event) => {
        onChange(event.target.value === '2' ? 2 : 1);
      }}
    >
      <MenuItem value="1">{t('tournament.form.oneRound')}</MenuItem>
      <MenuItem value="2">{t('tournament.form.twoRounds')}</MenuItem>
    </TextField>
  );
}

/** До скольких побед идёт встреча — ТЗ 5.2: bo3, bo5, bo7. */
function SetsField({
  label,
  value,
  onChange,
}: {
  readonly label: MessageKey;
  readonly value: 2 | 3 | 4;
  readonly onChange: (value: 2 | 3 | 4) => void;
}): ReactNode {
  const t = useT();

  return (
    <TextField
      select
      label={t(label)}
      value={String(value)}
      onChange={(event) => {
        onChange(event.target.value === '2' ? 2 : event.target.value === '4' ? 4 : 3);
      }}
    >
      <MenuItem value="2">{t('tournament.form.bo3')}</MenuItem>
      <MenuItem value="3">{t('tournament.form.bo5')}</MenuItem>
      <MenuItem value="4">{t('tournament.form.bo7')}</MenuItem>
    </TextField>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  readonly label: MessageKey;
  readonly value: number;
  readonly onChange: (value: number) => void;
}): ReactNode {
  const t = useT();

  return <IntegerField label={t(label)} value={value} onChange={onChange} />;
}
