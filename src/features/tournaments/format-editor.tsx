import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { CircleHelp, Maximize2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useLocale, useT, type MessageKey } from '@/common/i18n';
import IntegerField from '@/common/ui/integer-field';

import FormatPicker from './format-picker';
import { FORM_UI_TEXTS } from './format-texts';
import { previewFormat } from './format-preview';
import { toFormatConfig, type FormatDraft } from './format-draft';
import PlayoffLengths from './playoff-lengths';
import SetsField from './sets-field';
import StructurePreview from './structure-preview';
import { FORM_CHECK_TEXTS, type FormCheckText } from './tournament-form-texts';
import { FormatAdvice } from './format-advice-box';

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
  const locale = useLocale();
  const check = FORM_CHECK_TEXTS[locale];

  const set = <K extends keyof FormatDraft>(key: K, value: FormatDraft[K]): void => {
    onChange({ ...draft, [key]: value });
  };

  const hasGroups = draft.type === 'GROUPS_KNOCKOUT' || draft.type === 'GROUPS_FINAL_GROUPS';

  return (
    <Section
      step={3}
      legend={t('tournament.form.format')}
      description={FORM_UI_TEXTS[locale].formatText}
    >
      {/* Число участников — первым: по нему считаются встречи на карточках
          схем, совет по группам и схема турнира ниже. */}
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          alignItems: 'start',
          gridTemplateColumns: { xs: '1fr', sm: '240px 1fr' },
          mb: 3,
        }}
      >
        <IntegerField
          label={check.participants}
          value={participants}
          onChange={onParticipantsChange}
          helperText={check.participantsHint}
        />
        <FormatAdvice draft={draft} participants={participants} texts={check} onChange={onChange} />
      </Box>

      <FormatPicker
        draft={draft}
        participants={participants}
        onType={(type) => {
          set('type', type);
        }}
      />

      <Box sx={{ ...GRID, mt: 3 }}>
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

        {/* Как разводится равенство очков в таблицах — ADR-062. У сетки
            таблиц нет. */}
        {draft.type !== 'KNOCKOUT' && (
          <TextField
            select
            label={t('tournament.form.tieBreak')}
            value={draft.tieBreak}
            helperText={
              <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                {t(
                  draft.tieBreak === 'SET_RATIO'
                    ? 'tournament.form.tieBreak.ratioHint'
                    : 'tournament.form.tieBreak.diffHint',
                )}
                <TieBreakHelp texts={check} />
              </Box>
            }
            onChange={(event) => {
              set('tieBreak', event.target.value === 'SET_RATIO' ? 'SET_RATIO' : 'SET_DIFF');
            }}
            sx={{ gridColumn: { sm: 'span 2' } }}
          >
            <MenuItem value="SET_DIFF">{t('tournament.form.tieBreak.diff')}</MenuItem>
            <MenuItem value="SET_RATIO">{t('tournament.form.tieBreak.ratio')}</MenuItem>
          </TextField>
        )}

        {/* Не вышедшие из групп доигрывают за места — ADR-045. */}
        {draft.type === 'GROUPS_KNOCKOUT' && (
          <FormControlLabel
            sx={{ minHeight: 44, gridColumn: { sm: 'span 2' } }}
            label={t('tournament.form.exitBracket')}
            control={
              <Checkbox
                checked={draft.exitBracket}
                onChange={(event) => {
                  set('exitBracket', event.target.checked);
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

      <Structure draft={draft} participants={participants} texts={check} />
    </Section>
  );
}

/**
 * Раздел формы турнира — шаг с номером, названием и строкой «зачем он».
 *
 * Рамка без тени (запрет №13). Номер шага показывает, сколько осталось:
 * форма длинная, и без него организатор не знает, где он в ней. Общий у
 * редактора схемы и формы создания: разделы одной формы обязаны выглядеть
 * одинаково.
 */
export function Section({
  legend,
  description,
  step,
  children,
}: {
  readonly legend: string;
  readonly description?: string;
  readonly step?: number;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Paper
      variant="outlined"
      component="fieldset"
      sx={{ m: 0, mt: 3, p: { xs: 2, sm: 3 }, minWidth: 0, borderRadius: 4 }}
    >
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 2.5 }}>
        {step !== undefined && (
          <Box
            aria-hidden
            sx={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'var(--red-600)',
              color: 'var(--paper)',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {step}
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          {/* legend — первым потомком fieldset, иначе браузер кладёт его на рамку. */}
          <Typography component="legend" variant="h3" sx={{ p: 0, float: 'left', width: '100%' }}>
            {legend}
          </Typography>
          {description !== undefined && (
            <Typography variant="body2" color="text.secondary" sx={{ clear: 'both', pt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
      </Box>
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
}: {
  readonly draft: FormatDraft;
  readonly participants: number;
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

  if (preview.exitBracketMatches > 0) {
    rows.push({
      key: 'tournament.preview.exitBracket',
      value: String(preview.exitBracketMatches),
    });
  }

  if (preview.roundRobinRounds > 0) {
    rows.push({ key: 'tournament.preview.rounds', value: String(preview.roundRobinRounds) });
  }

  rows.push({ key: 'tournament.preview.totalMatches', value: String(preview.totalMatches) });

  return (
    <Box sx={{ mt: 3, pt: 2, borderTop: 1, borderColor: 'divider' }}>
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

/** Что такое «равенство очков» — по наведению или касанию значка. */
function TieBreakHelp({ texts }: { readonly texts: FormCheckText }): ReactNode {
  const t = useT();

  return (
    <Tooltip
      arrow
      enterTouchDelay={0}
      leaveTouchDelay={8000}
      title={
        <Box sx={{ display: 'grid', gap: 1, p: 0.5 }}>
          <span>{texts.tieBreakHelp}</span>
          <span>
            <b>{t('tournament.form.tieBreak.diff')}</b> — {t('tournament.form.tieBreak.diffHint')}
          </span>
          <span>
            <b>{t('tournament.form.tieBreak.ratio')}</b> — {t('tournament.form.tieBreak.ratioHint')}
          </span>
        </Box>
      }
    >
      <Box
        component="span"
        tabIndex={0}
        role="button"
        aria-label={texts.tieBreakHelp}
        sx={{ display: 'inline-flex', cursor: 'help', color: 'var(--ink-500)' }}
      >
        <CircleHelp size={16} aria-hidden />
      </Box>
    </Tooltip>
  );
}

/** «Как это будет выглядеть»: схема турнира, числа и полный вид в окне. */
function Structure({
  draft,
  participants,
  texts,
}: {
  readonly draft: FormatDraft;
  readonly participants: number;
  readonly texts: FormCheckText;
}): ReactNode {
  const t = useT();
  const [open, setOpen] = useState(false);
  const preview = previewFormat(toFormatConfig(draft), participants);

  return (
    <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          mb: 1.5,
        }}
      >
        <Typography variant="h3">{texts.structureTitle}</Typography>
        <Button
          variant="text"
          startIcon={<Maximize2 size={16} aria-hidden />}
          onClick={() => {
            setOpen(true);
          }}
          sx={{ minHeight: 44 }}
        >
          {texts.structureOpen}
        </Button>
      </Box>
      <StructurePreview draft={draft} preview={preview} participants={participants} texts={texts} />
      <Preview draft={draft} participants={participants} />

      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle variant="h2">{texts.structureTitle}</DialogTitle>
        <DialogContent>
          <StructurePreview
            draft={draft}
            preview={preview}
            participants={participants}
            texts={texts}
            full
          />
          <Preview draft={draft} participants={participants} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setOpen(false);
            }}
          >
            {t('club.gallery.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
