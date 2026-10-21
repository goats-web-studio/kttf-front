import {
  TRAINING_PLACES,
  coachLimits,
  type CoachTrainingInput,
  type CoachView,
  type TrainingBooking,
  type TrainingPlace,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import EditorSection from '@/features/clubs/page-editor/editor-section';

import { setCoachTrainings } from '../api';
import { LINK_KEYS_FOR_COACH, TRAINING_PLACE_KEYS } from '../labels';
import { LinkStatus, LinkedTrainings } from '../link-requests';
import { coachKeys } from '../queries';
import {
  canBookViaClub,
  coachTrainingRowsOf,
  emptyCoachTrainingRow,
  toCoachTrainingInputs,
  type ClubPlaceMode,
  type CoachTrainingRow,
} from '../training-rows';
import { moveRow } from './form-model';
import { ClubPicker } from './pickers';
import TrainingFields from './training-fields';

/**
 * Вкладка «Тренировки» кабинета тренера (ADR-059, решение владельца от
 * 20.10.2026): приглашения от клубов, свои тренировки и клубные, где тренер
 * подтвердил участие. Свои правятся списком; у места «в клубе» — клуб KTTF
 * (клуб подтверждает) или другой зал с адресом.
 */
export default function CoachTrainingsTab({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const clubTrainings = coach.trainings.filter((training) => training.author === 'CLUB');

  return (
    <>
      <LinkedTrainings
        title={t('training.requests.coachTitle')}
        lead={t('training.requests.coachLead')}
        trainings={coach.trainingRequests}
        confirm
        declineLabel={t('training.link.decline')}
        showCoach={false}
      />
      <CoachTrainingsEditor coach={coach} />
      <LinkedTrainings
        title={t('training.clubOwned.title')}
        lead={t('training.clubOwned.lead')}
        trainings={clubTrainings}
        confirm={false}
        declineLabel={t('training.link.leave')}
        showCoach={false}
      />
    </>
  );
}

function CoachTrainingsEditor({ coach }: { readonly coach: CoachView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<readonly CoachTrainingRow[]>(() =>
    coachTrainingRowsOf(coach.trainings),
  );
  const [invalid, setInvalid] = useState<MessageKey | null>(null);
  const [saved, setSaved] = useState(false);
  const max = coachLimits('FREE').trainings;

  const save = useMutation({
    mutationFn: (trainings: CoachTrainingInput[]) => setCoachTrainings(coach.id, { trainings }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: coachKeys.all });
      // Новые строки получили идентификаторы, а связь с клубом — статус:
      // форма берёт их из свежей страницы, иначе следующее сохранение
      // завело бы тренировки заново и сбросило связь.
      const fresh = queryClient.getQueryData<CoachView>(coachKeys.detail(coach.id));
      if (fresh !== undefined) setRows(coachTrainingRowsOf(fresh.trainings));
      setSaved(true);
    },
  });

  const update = (next: readonly CoachTrainingRow[]): void => {
    setSaved(false);
    setRows(next);
  };
  const patch = (key: string, change: Partial<CoachTrainingRow>): void => {
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
        const trainings = toCoachTrainingInputs(rows);

        if (trainings === null) {
          setInvalid('training.editor.coachInvalid');
          return;
        }

        setInvalid(null);
        save.mutate(trainings);
      }}
    >
      {rows.length === 0 && (
        <Typography color="text.secondary">{t('coach.editor.servicesEmpty')}</Typography>
      )}
      <Box sx={{ display: 'grid', gap: 2 }}>
        {rows.map((row, index) => (
          <TrainingFields
            key={row.key}
            row={row}
            onPatch={(change) => {
              patch(row.key, change);
            }}
            index={index}
            count={rows.length}
            onMove={(by) => {
              update(moveRow(rows, index, by));
            }}
            onRemove={() => {
              update(rows.filter((item) => item.key !== row.key));
            }}
            showErrors={invalid !== null}
            status={<LinkStatus link={row.link} keys={LINK_KEYS_FOR_COACH} />}
          >
            <PlaceFields
              row={row}
              showErrors={invalid !== null}
              onPatch={(change) => {
                patch(row.key, change);
              }}
            />
          </TrainingFields>
        ))}
      </Box>
      {rows.length < max && (
        <Button
          startIcon={<Plus size={16} aria-hidden />}
          onClick={() => {
            update([...rows, emptyCoachTrainingRow()]);
          }}
          sx={{ mt: 2, minHeight: 44 }}
        >
          {t('coach.editor.addService')}
        </Button>
      )}
    </EditorSection>
  );
}

/**
 * Где: в клубе, выезд, онлайн. «В клубе» — обязательный выбор: клуб KTTF
 * поиском или другой зал названием и адресом. Смена клуба — новая связь:
 * подтверждение начнётся заново.
 */
function PlaceFields({
  row,
  showErrors,
  onPatch,
}: {
  readonly row: CoachTrainingRow;
  /** Подсвечивать пустой клуб или зал — после попытки сохранить. */
  readonly showErrors: boolean;
  readonly onPatch: (change: Partial<CoachTrainingRow>) => void;
}): ReactNode {
  const t = useT();
  const missingClub = showErrors && row.mode === 'club' && row.clubId === null;
  const missingVenue =
    showErrors &&
    row.mode === 'venue' &&
    (row.venueName.trim() === '' || row.venueAddress.trim() === '');

  return (
    <Box
      sx={{
        display: 'grid',
        gap: 1.5,
        gridTemplateColumns: { xs: '1fr', md: '190px minmax(0, 1fr)' },
        alignItems: 'start',
      }}
    >
      <TextField
        select
        size="small"
        label={t('coach.editor.place')}
        value={row.place}
        onChange={(event) => {
          // Другое место — запись снова у тренера: «через клуб» только в клубе KTTF.
          onPatch({ place: event.target.value as TrainingPlace, link: 'NONE', booking: 'COACH' });
        }}
      >
        {TRAINING_PLACES.map((place) => (
          <MenuItem key={place} value={place}>
            {t(TRAINING_PLACE_KEYS[place])}
          </MenuItem>
        ))}
      </TextField>
      {row.place === 'CLUB' && (
        <Box sx={{ display: 'grid', gap: 1 }}>
          <RadioGroup
            row
            aria-label={t('coach.editor.place')}
            value={row.mode}
            onChange={(event) => {
              onPatch({
                mode: event.target.value as ClubPlaceMode,
                link: 'NONE',
                booking: 'COACH',
              });
            }}
          >
            <FormControlLabel
              value="club"
              control={<Radio size="small" />}
              label={t('training.editor.modeClub')}
              sx={{ minHeight: 44 }}
            />
            <FormControlLabel
              value="venue"
              control={<Radio size="small" />}
              label={t('training.editor.modeVenue')}
              sx={{ minHeight: 44 }}
            />
          </RadioGroup>
          {row.mode === 'club' ? (
            <>
              <ClubPicker
                value={row.clubId}
                name={row.clubName}
                error={missingClub}
                onChange={(club) => {
                  onPatch({
                    clubId: club?.id ?? null,
                    clubName: club?.name ?? '',
                    link: 'NONE',
                    ...(club === null ? { booking: 'COACH' as const } : {}),
                  });
                }}
              />
              <Typography variant="body2" color="text.secondary">
                {t('training.editor.clubHint')}
              </Typography>
              {canBookViaClub(row) && (
                // Кто записывает и принимает оплату — решение владельца от
                // 21.10.2026: в зале клуба тренер может работать через клуб.
                <Box data-training-booking>
                  <Typography id={`${row.key}-booking`} variant="body2" sx={{ fontWeight: 600 }}>
                    {t('training.editor.booking')}
                  </Typography>
                  <RadioGroup
                    row
                    aria-labelledby={`${row.key}-booking`}
                    value={row.booking}
                    onChange={(event) => {
                      onPatch({ booking: event.target.value as TrainingBooking });
                    }}
                  >
                    <FormControlLabel
                      value="COACH"
                      control={<Radio size="small" />}
                      label={t('training.editor.bookingCoach')}
                      sx={{ minHeight: 44 }}
                    />
                    <FormControlLabel
                      value="CLUB"
                      control={<Radio size="small" />}
                      label={t('training.editor.bookingClub')}
                      sx={{ minHeight: 44 }}
                    />
                  </RadioGroup>
                </Box>
              )}
            </>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) minmax(0, 2fr)' },
              }}
            >
              <TextField
                size="small"
                label={t('training.editor.venueName')}
                value={row.venueName}
                error={missingVenue && row.venueName.trim() === ''}
                onChange={(event) => {
                  onPatch({ venueName: event.target.value });
                }}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <TextField
                size="small"
                label={t('training.editor.venueAddress')}
                value={row.venueAddress}
                error={missingVenue && row.venueAddress.trim() === ''}
                onChange={(event) => {
                  onPatch({ venueAddress: event.target.value });
                }}
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
