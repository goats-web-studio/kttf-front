import {
  COACH_ABOUT_MAX,
  COACH_LANGUAGES,
  CONTACT_KINDS,
  TRAINING_PLACES,
  type CoachView,
  type ContactKind,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';
import EditorSection from '@/features/clubs/page-editor/editor-section';
import CityPicker from '@/features/places/city-picker';

import { COACH_LANGUAGE_KEYS, TRAINING_PLACE_KEYS } from '../labels';
import { toggleIn } from '../trainings-search';
import { FIELDS_GRID as GRID, PAGE_FIELDS } from './form-model';
import { useFieldsEditor } from './use-fields-editor';

const CONTACT_LABELS: Readonly<Record<ContactKind, MessageKey>> = {
  WHATSAPP: 'club.contact.whatsapp',
  PHONE: 'club.field.phone',
  TELEGRAM: 'club.contact.telegram',
};

/** Выбор нескольких значений чипами — форматы и языки. */
export function ToggleChips<T extends string>({
  label,
  values,
  selected,
  keys,
  onChange,
}: {
  readonly label: string;
  readonly values: readonly T[];
  readonly selected: readonly T[];
  readonly keys: Readonly<Record<T, MessageKey>>;
  readonly onChange: (next: T[]) => void;
}): ReactNode {
  const t = useT();

  return (
    <Box role="group" aria-label={label}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {values.map((value) => {
          const on = selected.includes(value);

          return (
            <Chip
              key={value}
              label={t(keys[value])}
              clickable
              variant={on ? 'filled' : 'outlined'}
              aria-pressed={on}
              onClick={() => {
                onChange(toggleIn(selected, value));
              }}
              sx={{ height: { xs: 44, sm: 36 } }}
            />
          );
        })}
      </Box>
    </Box>
  );
}

/**
 * «Страница» — шапка, где тренирует, контакты и «О себе» (`docs/11` 5.4).
 * Форма повторяет страницу: что вписано здесь, то и видно в шапке.
 */
export default function CoachPageEditor({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const editor = useFieldsEditor(coach, PAGE_FIELDS);
  const { form, set, isInvalid } = editor;
  const text = (
    key:
      'headline' | 'coachingSince' | 'visitAreas' | 'phone' | 'whatsapp' | 'telegram' | 'instagram',
    label: MessageKey,
    maxLength: number,
    extra: { readonly hint?: MessageKey; readonly numeric?: boolean } = {},
  ): ReactNode => (
    <TextField
      label={t(label)}
      value={form[key]}
      onChange={(event) => {
        set(key, event.target.value);
      }}
      error={isInvalid(key)}
      {...(extra.hint === undefined ? {} : { helperText: t(extra.hint) })}
      slotProps={{
        htmlInput: { maxLength, ...(extra.numeric === true ? { inputMode: 'numeric' } : {}) },
      }}
    />
  );

  return (
    <EditorSection
      title={t('coach.editor.page')}
      lead={t('coach.editor.pageLead')}
      onSave={editor.submit}
      isPending={editor.isPending}
      saved={editor.saved}
      error={editor.error}
      invalid={editor.hasInvalid ? 'coach.editor.invalid' : null}
    >
      <Box sx={{ display: 'grid', gap: 3 }}>
        <Box sx={GRID}>
          <Box sx={{ gridColumn: '1 / -1' }}>
            {text('headline', 'coach.field.headline', 120, { hint: 'coach.field.headlineHint' })}
          </Box>
          <CityPicker
            value={form.cityId}
            onChange={(cityId) => {
              set('cityId', cityId);
            }}
            label={t('filter.city')}
            current={coach.city ?? undefined}
            error={isInvalid('cityId') ? 'error.form.city' : undefined}
          />
          {text('coachingSince', 'coach.field.coachingSince', 4, { numeric: true })}
        </Box>

        <Box sx={{ display: 'grid', gap: 2 }}>
          <ToggleChips
            label={t('coach.field.formats')}
            values={TRAINING_PLACES}
            selected={form.formats}
            keys={TRAINING_PLACE_KEYS}
            onChange={(next) => {
              set('formats', next);
            }}
          />
          {(form.formats.includes('VISIT') || form.visitAreas !== '') &&
            text('visitAreas', 'coach.field.visitAreas', 200, {
              hint: 'coach.field.visitAreasHint',
            })}
          <ToggleChips
            label={t('coach.field.languages')}
            values={COACH_LANGUAGES}
            selected={form.languages}
            keys={COACH_LANGUAGE_KEYS}
            onChange={(next) => {
              set('languages', next);
            }}
          />
        </Box>

        <Box>
          <Typography variant="h3" sx={{ mb: 1.5 }}>
            {t('club.contacts.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 680 }}>
            {t('coach.editor.contactsHint')}
          </Typography>
          <Box sx={GRID}>
            {text('phone', 'club.field.phone', 30)}
            {text('whatsapp', 'club.field.whatsapp', 30)}
            {text('telegram', 'club.field.telegram', 64)}
            {text('instagram', 'club.field.instagram', 100)}
            <TextField
              select
              label={t('club.field.primaryContact')}
              value={form.primaryContact}
              onChange={(event) => {
                set('primaryContact', event.target.value as ContactKind | '');
              }}
            >
              <MenuItem value="">{t('club.field.primaryContact.auto')}</MenuItem>
              {CONTACT_KINDS.map((kind) => (
                <MenuItem key={kind} value={kind}>
                  {t(CONTACT_LABELS[kind])}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </Box>

        <TextField
          label={t('coach.about.title')}
          value={form.about}
          onChange={(event) => {
            set('about', event.target.value);
          }}
          error={isInvalid('about')}
          multiline
          minRows={5}
          helperText={fill(t('coach.editor.aboutCount'), {
            count: String(form.about.length),
            max: String(COACH_ABOUT_MAX),
          })}
          slotProps={{ htmlInput: { maxLength: COACH_ABOUT_MAX } }}
        />
      </Box>
    </EditorSection>
  );
}
