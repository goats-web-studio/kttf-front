import {
  PRICE_UNITS,
  TRAINING_AUDIENCES,
  TRAINING_KINDS,
  type PriceUnit,
  type TrainingKind,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';

import {
  PRICE_UNIT_KEYS,
  TRAINING_AUDIENCE_KEYS,
  TRAINING_KIND_KEYS,
  isForChildren,
} from '../labels';
import type { ClubTrainingRow, CoachTrainingRow } from '../training-rows';
import { ToggleChips } from './page-editor';

const AGES = Array.from({ length: 15 }, (_, index) => index + 3);

type Row = CoachTrainingRow | ClubTrainingRow;

/** Поля, общие у строки тренера и клуба. */
type Common = Pick<
  Row,
  'kind' | 'audiences' | 'kidsFromAge' | 'title' | 'schedule' | 'price' | 'unit' | 'note'
>;

interface TrainingFieldsProps {
  readonly row: Common;
  readonly onPatch: (change: Partial<Common>) => void;
  readonly index: number;
  readonly count: number;
  readonly onMove: (by: -1 | 1) => void;
  readonly onRemove: () => void;
  /** Где (у тренера) или тренер (у клуба) — между аудиторией и расписанием. */
  readonly children: ReactNode;
  /** Статус связи со второй стороной. */
  readonly status: ReactNode;
}

/**
 * Строка тренировки в кабинете — по образцу прайса клуба (ADR-055): вид,
 * название, цена и за что; для кого и возраст ребёнка; место или тренер;
 * расписание и примечание. Порядок — стрелками.
 */
export default function TrainingFields({
  row,
  onPatch,
  index,
  count,
  onMove,
  onRemove,
  children,
  status,
}: TrainingFieldsProps): ReactNode {
  const t = useT();
  const forChildren = isForChildren(row.audiences);

  return (
    <Box
      data-training-row
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr 1fr', md: '190px minmax(0, 1fr) 130px 150px auto' },
        alignItems: 'start',
        pb: 2.5,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <TextField
        select
        size="small"
        label={t('coach.editor.kind')}
        value={row.kind}
        onChange={(event) => {
          onPatch({ kind: event.target.value as TrainingKind });
        }}
      >
        {TRAINING_KINDS.map((kind) => (
          <MenuItem key={kind} value={kind}>
            {t(TRAINING_KIND_KEYS[kind])}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        size="small"
        label={t('coach.editor.serviceTitle')}
        value={row.title}
        onChange={(event) => {
          onPatch({ title: event.target.value });
        }}
        slotProps={{ htmlInput: { maxLength: 100 } }}
        sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, gridRow: { xs: 1, md: 'auto' } }}
      />
      <TextField
        size="small"
        label={t('coach.editor.price')}
        value={row.price}
        onChange={(event) => {
          onPatch({ price: event.target.value });
        }}
        helperText={row.price.trim() === '' ? t('coach.price.negotiable') : undefined}
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
      />
      <TextField
        select
        size="small"
        label={t('manage.prices.unit')}
        value={row.unit}
        disabled={row.price.trim() === ''}
        onChange={(event) => {
          onPatch({ unit: event.target.value as PriceUnit });
        }}
      >
        {PRICE_UNITS.map((unit) => (
          <MenuItem key={unit} value={unit}>
            {t(PRICE_UNIT_KEYS[unit])}
          </MenuItem>
        ))}
      </TextField>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          gridColumn: { xs: '1 / -1', md: 'auto' },
        }}
      >
        <Box sx={{ display: { md: 'none' } }}>{status}</Box>
        <Box sx={{ display: 'flex', ml: 'auto' }}>
          <IconButton
            aria-label={t('manage.prices.up')}
            disabled={index === 0}
            onClick={() => {
              onMove(-1);
            }}
            sx={{ width: 44, height: 44 }}
          >
            <ArrowUp size={18} aria-hidden />
          </IconButton>
          <IconButton
            aria-label={t('manage.prices.down')}
            disabled={index === count - 1}
            onClick={() => {
              onMove(1);
            }}
            sx={{ width: 44, height: 44 }}
          >
            <ArrowDown size={18} aria-hidden />
          </IconButton>
          <IconButton
            aria-label={t('manage.prices.remove')}
            onClick={onRemove}
            sx={{ width: 44, height: 44 }}
          >
            <X size={18} aria-hidden />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ gridColumn: '1 / -1', display: { xs: 'none', md: 'block' } }}>{status}</Box>

      <Box
        sx={{
          gridColumn: '1 / -1',
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 190px' },
          alignItems: 'start',
        }}
      >
        <ToggleChips
          label={t('trainings.filter.audience')}
          values={TRAINING_AUDIENCES}
          selected={row.audiences}
          keys={TRAINING_AUDIENCE_KEYS}
          onChange={(next) => {
            onPatch({ audiences: next });
          }}
        />
        {forChildren && (
          <TextField
            select
            size="small"
            label={t('coach.editor.kidsFromAge')}
            value={row.kidsFromAge}
            onChange={(event) => {
              onPatch({ kidsFromAge: event.target.value });
            }}
            sx={{ mt: { md: 3 } }}
          >
            <MenuItem value="">{t('filter.any')}</MenuItem>
            {AGES.map((age) => (
              <MenuItem key={age} value={String(age)}>
                {fill(t('coach.kidsFrom'), { age: String(age) })}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      <Box sx={{ gridColumn: '1 / -1' }}>{children}</Box>

      <TextField
        size="small"
        label={t('coach.editor.schedule')}
        placeholder={t('coach.editor.scheduleHint')}
        value={row.schedule}
        onChange={(event) => {
          onPatch({ schedule: event.target.value });
        }}
        slotProps={{ htmlInput: { maxLength: 200 } }}
        sx={{ gridColumn: { xs: '1 / -1', md: '1 / 3' } }}
      />
      <TextField
        size="small"
        label={t('manage.prices.note')}
        value={row.note}
        onChange={(event) => {
          onPatch({ note: event.target.value });
        }}
        slotProps={{ htmlInput: { maxLength: 200 } }}
        sx={{ gridColumn: { xs: '1 / -1', md: '3 / -1' } }}
      />
    </Box>
  );
}
