import {
  PRICE_UNITS,
  TRAINING_AUDIENCES,
  TRAINING_KINDS,
  TRAINING_PLACES,
  coachLimits,
  type CoachServiceInput,
  type CoachView,
  type PriceUnit,
  type TrainingKind,
  type TrainingPlace,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';
import EditorSection from '@/features/clubs/page-editor/editor-section';

import { setCoachServices } from '../api';
import {
  PRICE_UNIT_KEYS,
  TRAINING_AUDIENCE_KEYS,
  TRAINING_KIND_KEYS,
  TRAINING_PLACE_KEYS,
  isForChildren,
} from '../labels';
import { coachKeys } from '../queries';
import {
  emptyServiceRow,
  moveRow,
  serviceRowsOf,
  toServiceInputs,
  type ServiceRow,
} from './form-model';
import { ToggleChips } from './page-editor';

const AGES = Array.from({ length: 15 }, (_, index) => index + 3);

/**
 * «Тренировки» — строки, как прайс клуба (ADR-055): вид, для кого, где,
 * расписание, цена и за что. Порядок задаёт тренер стрелками, список
 * уходит на сервер целиком. Без цены — «по договорённости».
 */
export default function CoachServicesEditor({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<readonly ServiceRow[]>(() => serviceRowsOf(coach));
  const [invalid, setInvalid] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);
  const max = coachLimits('FREE').services;

  const save = useMutation({
    mutationFn: (services: CoachServiceInput[]) => setCoachServices(coach.id, { services }),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: coachKeys.all });
    },
  });

  const update = (next: readonly ServiceRow[]): void => {
    setSaved(false);
    setRows(next);
  };
  const patch = (key: string, change: Partial<ServiceRow>): void => {
    update(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));
  };

  return (
    <EditorSection
      title={t('coach.services.title')}
      lead={t('coach.editor.servicesLead')}
      isPending={save.isPending}
      saved={saved}
      error={save.error}
      invalid={invalid}
      onSave={() => {
        const services = toServiceInputs(rows);

        if (services === null) {
          setInvalid('coach.editor.servicesInvalid');
          return;
        }

        setInvalid(null);
        save.mutate(services);
      }}
    >
      {rows.length === 0 && (
        <Typography color="text.secondary">{t('coach.editor.servicesEmpty')}</Typography>
      )}
      <Box sx={{ display: 'grid', gap: 2 }}>
        {rows.map((row, index) => (
          <Box
            key={row.key}
            data-service-row
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: {
                xs: '1fr 1fr',
                md: '190px minmax(0, 1fr) 130px 150px auto',
              },
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
                patch(row.key, { kind: event.target.value as TrainingKind });
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
                patch(row.key, { title: event.target.value });
              }}
              slotProps={{ htmlInput: { maxLength: 100 } }}
              sx={{ gridColumn: { xs: '1 / -1', md: 'auto' }, gridRow: { xs: 1, md: 'auto' } }}
            />
            <TextField
              size="small"
              label={t('coach.editor.price')}
              value={row.price}
              onChange={(event) => {
                patch(row.key, { price: event.target.value });
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
                patch(row.key, { unit: event.target.value as PriceUnit });
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
                justifyContent: 'flex-end',
                gridColumn: { xs: '1 / -1', md: 'auto' },
              }}
            >
              <IconButton
                aria-label={t('manage.prices.up')}
                disabled={index === 0}
                onClick={() => {
                  update(moveRow(rows, index, -1));
                }}
                sx={{ width: 44, height: 44 }}
              >
                <ArrowUp size={18} aria-hidden />
              </IconButton>
              <IconButton
                aria-label={t('manage.prices.down')}
                disabled={index === rows.length - 1}
                onClick={() => {
                  update(moveRow(rows, index, 1));
                }}
                sx={{ width: 44, height: 44 }}
              >
                <ArrowDown size={18} aria-hidden />
              </IconButton>
              <IconButton
                aria-label={t('manage.prices.remove')}
                onClick={() => {
                  update(rows.filter((item) => item.key !== row.key));
                }}
                sx={{ width: 44, height: 44 }}
              >
                <X size={18} aria-hidden />
              </IconButton>
            </Box>

            <Box sx={{ gridColumn: '1 / -1' }}>
              <ToggleChips
                label={t('trainings.filter.audience')}
                values={TRAINING_AUDIENCES}
                selected={row.audiences}
                keys={TRAINING_AUDIENCE_KEYS}
                onChange={(next) => {
                  patch(row.key, { audiences: next });
                }}
              />
            </Box>

            <Box
              sx={{
                gridColumn: '1 / -1',
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '190px 170px minmax(0, 1fr)' },
              }}
            >
              <TextField
                select
                size="small"
                label={t('coach.editor.place')}
                value={row.place}
                onChange={(event) => {
                  patch(row.key, { place: event.target.value as TrainingPlace });
                }}
              >
                {TRAINING_PLACES.map((place) => (
                  <MenuItem key={place} value={place}>
                    {t(TRAINING_PLACE_KEYS[place])}
                  </MenuItem>
                ))}
              </TextField>
              {isForChildren(row.audiences) ? (
                <TextField
                  select
                  size="small"
                  label={t('coach.editor.kidsFromAge')}
                  value={row.kidsFromAge}
                  onChange={(event) => {
                    patch(row.key, { kidsFromAge: event.target.value });
                  }}
                >
                  <MenuItem value="">{t('filter.any')}</MenuItem>
                  {AGES.map((age) => (
                    <MenuItem key={age} value={String(age)}>
                      {fill(t('coach.kidsFrom'), { age: String(age) })}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <Box sx={{ display: { xs: 'none', md: 'block' } }} />
              )}
              <TextField
                size="small"
                label={t('coach.editor.schedule')}
                placeholder={t('coach.editor.scheduleHint')}
                value={row.schedule}
                onChange={(event) => {
                  patch(row.key, { schedule: event.target.value });
                }}
                slotProps={{ htmlInput: { maxLength: 200 } }}
                sx={{ gridColumn: { sm: '1 / -1', md: 'auto' } }}
              />
            </Box>
            <TextField
              size="small"
              label={t('manage.prices.note')}
              placeholder={row.place === 'CLUB' ? t('coach.editor.noteClubHint') : undefined}
              value={row.note}
              onChange={(event) => {
                patch(row.key, { note: event.target.value });
              }}
              slotProps={{ htmlInput: { maxLength: 200 } }}
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>
        ))}
      </Box>
      {rows.length < max && (
        <Button
          startIcon={<Plus size={16} aria-hidden />}
          onClick={() => {
            update([...rows, emptyServiceRow()]);
          }}
          sx={{ mt: 2, minHeight: 44 }}
        >
          {t('coach.editor.addService')}
        </Button>
      )}
    </EditorSection>
  );
}
