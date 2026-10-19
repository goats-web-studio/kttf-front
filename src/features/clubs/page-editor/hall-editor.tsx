import {
  CLUB_AMENITIES,
  FLOOR_TYPES,
  type ClubView,
  type FloorType,
  type UpdateClubInput,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';

import { AMENITY_ICONS, amenityLabel } from '../amenity-meta';
import { updateClub } from '../api';
import { clubKeys } from '../queries';
import EditorSection from './editor-section';
import { hallPatch, type HallValues } from './hall-patch';

/** Зал и удобства — ADR-055. Удобства — чипами: их видно все сразу, ничего не надо раскрывать. */
export default function HallEditor({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<HallValues>({
    amenities: club.amenities,
    tableBrand: club.tableBrand ?? '',
    floorType: club.floorType ?? '',
    ceiling: club.ceilingHeightCm === null ? '' : String(club.ceilingHeightCm),
  });
  const [invalid, setInvalid] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: (patch: UpdateClubInput) => updateClub(club.id, patch),
    onSuccess: async () => {
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: clubKeys.all });
    },
  });

  const change = (patch: Partial<HallValues>): void => {
    setSaved(false);
    setValues((current) => ({ ...current, ...patch }));
  };

  return (
    <EditorSection
      title={t('manage.page.hall')}
      isPending={save.isPending}
      saved={saved}
      error={save.error}
      invalid={invalid}
      onSave={() => {
        const patch = hallPatch(club, values);

        if (patch === undefined) {
          setInvalid('error.form.ceiling');
          return;
        }

        setInvalid(null);

        if (patch === null) {
          setSaved(true);
          return;
        }

        save.mutate(patch);
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {CLUB_AMENITIES.map((amenity) => {
          const Icon = AMENITY_ICONS[amenity];
          const selected = values.amenities.includes(amenity);

          return (
            <Chip
              key={amenity}
              icon={<Icon size={16} aria-hidden />}
              label={t(amenityLabel(amenity))}
              clickable
              variant={selected ? 'filled' : 'outlined'}
              aria-pressed={selected}
              onClick={() => {
                change({
                  amenities: selected
                    ? values.amenities.filter((item) => item !== amenity)
                    : [...values.amenities, amenity],
                });
              }}
              sx={{ height: 40 }}
            />
          );
        })}
      </Box>
      <Box
        sx={{
          mt: 3,
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' },
        }}
      >
        {/* Марка строкой — только пока моделей из каталога нет: на странице
            клуба модели её заменяют (ADR-058). */}
        {club.tables.length === 0 && (
          <TextField
            label={t('club.field.tableBrandFallback')}
            helperText={t('club.field.tableBrandHint')}
            value={values.tableBrand}
            onChange={(event) => {
              change({ tableBrand: event.target.value });
            }}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
        )}
        <TextField
          select
          label={t('club.field.floorType')}
          value={values.floorType}
          onChange={(event) => {
            change({ floorType: event.target.value as FloorType | '' });
          }}
        >
          <MenuItem value="">{t('club.field.floorType.none')}</MenuItem>
          {FLOOR_TYPES.map((floor) => (
            <MenuItem key={floor} value={floor}>
              {t(`club.floor.${floor}`)}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label={t('club.field.ceilingHeight')}
          value={values.ceiling}
          onChange={(event) => {
            change({ ceiling: event.target.value });
          }}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
        />
      </Box>
    </EditorSection>
  );
}
