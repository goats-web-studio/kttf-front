import type { ClubCoachView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import ClubMark from '@/features/clubs/club-mark';
import { usePlaceName } from '@/features/places/place-name';

import { confirmClubCoach, removeClubCoach, updateClubCoach } from '../api';
import { coachPhoto, coachShortName } from '../labels';
import { coachKeys } from '../queries';
import { staffActions, type StaffAction } from './staff-model';

/** Подписи кнопок: «Выйти» у тренера и «Убрать» у клуба — одно действие разными словами. */
const ACTION_LABELS: Readonly<Record<'CLUB' | 'COACH', Readonly<Record<StaffAction, MessageKey>>>> =
  {
    CLUB: {
      confirm: 'staff.action.accept',
      decline: 'staff.action.decline',
      revoke: 'staff.action.revoke',
      leave: 'staff.action.remove',
    },
    COACH: {
      confirm: 'staff.action.accept',
      decline: 'staff.action.decline',
      revoke: 'staff.action.revoke',
      leave: 'staff.action.leave',
    },
  };

interface StaffSectionProps {
  readonly title: string;
  readonly lead?: string;
  readonly entries: readonly ClubCoachView[];
  /** Чья это сторона: клуб видит тренеров, тренер — клубы. */
  readonly side: 'CLUB' | 'COACH';
  /** Должность правится на месте — у клуба в разделе «В штабе». */
  readonly editablePosition?: boolean;
  /** Пустой раздел — с пояснением; без него раздел не выводится (ADR-042). */
  readonly empty?: string;
}

/**
 * Связи «клуб — тренер» списком с действиями (T2.1, `docs/11` 3.2.1):
 * кнопки — по `clubCoachAwaits`, каждая — один запрос, после него
 * перечитываются и кабинет, и публичный штаб.
 */
export default function StaffSection({
  title,
  lead,
  entries,
  side,
  editablePosition = false,
  empty,
}: StaffSectionProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const refresh = (): Promise<void> => queryClient.invalidateQueries({ queryKey: coachKeys.all });
  const act = useMutation({
    mutationFn: ({ entry, action }: { entry: ClubCoachView; action: StaffAction }) =>
      action === 'confirm'
        ? confirmClubCoach(entry.club.id, entry.coach.id)
        : removeClubCoach(entry.club.id, entry.coach.id),
    onSuccess: refresh,
  });

  if (entries.length === 0 && empty === undefined) return null;

  return (
    <Paper
      variant="outlined"
      component="section"
      data-staff-section={title}
      sx={{ mt: 3, p: { xs: 2.5, sm: 4 } }}
    >
      <Typography variant="h2">{title}</Typography>
      {lead !== undefined && (
        <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 680 }}>
          {lead}
        </Typography>
      )}
      {entries.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {empty}
        </Typography>
      ) : (
        <Box component="ul" sx={{ m: 0, mt: 2, p: 0, listStyle: 'none' }}>
          {entries.map((entry) => {
            const busy =
              act.isPending &&
              act.variables.entry.club.id === entry.club.id &&
              act.variables.entry.coach.id === entry.coach.id;

            return (
              <Box
                component="li"
                key={`${entry.club.id}-${entry.coach.id}`}
                data-staff-entry={side === 'CLUB' ? entry.coach.id : entry.club.id}
                sx={{
                  py: 1.5,
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' },
                  alignItems: 'center',
                  borderTop: 1,
                  borderColor: 'divider',
                  '&:first-of-type': { borderTop: 0, pt: 0 },
                }}
              >
                <Party entry={entry} side={side} />
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1,
                    justifyContent: { md: 'flex-end' },
                  }}
                >
                  {editablePosition && <PositionEditor entry={entry} />}
                  {staffActions(entry.status, side).map((action) => (
                    <Button
                      key={action}
                      variant={action === 'confirm' ? 'outlined' : 'text'}
                      color={action === 'confirm' ? 'secondary' : 'error'}
                      disabled={busy}
                      onClick={() => {
                        act.mutate({ entry, action });
                      }}
                      sx={{ minHeight: 44 }}
                    >
                      {t(ACTION_LABELS[side][action])}
                    </Button>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}
      {act.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(act.error))}
        </Alert>
      )}
    </Paper>
  );
}

/** Вторая сторона связи: клубу — тренер, тренеру — клуб; должность подписью. */
function Party({
  entry,
  side,
}: {
  readonly entry: ClubCoachView;
  readonly side: 'CLUB' | 'COACH';
}): ReactNode {
  const placeName = usePlaceName();
  const position =
    entry.position === null ? null : (
      <Typography variant="body2" color="text.secondary">
        {entry.position}
      </Typography>
    );

  if (side === 'CLUB') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
        <PlayerAvatar
          lastName={entry.coach.player.lastName}
          firstName={entry.coach.player.firstName}
          photoUrl={coachPhoto(entry.coach)}
          size="md"
        />
        <Box sx={{ minWidth: 0 }}>
          <Link href={`/coaches/${entry.coach.slug}`} sx={{ fontWeight: 600 }}>
            {coachShortName(entry.coach.player)}
          </Link>{' '}
          <RatingValue
            value={entry.coach.player.rating}
            sx={{ typography: 'body2', color: 'text.secondary' }}
          />
          {position}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
      <ClubMark club={entry.club} size={40} />
      <Box sx={{ minWidth: 0 }}>
        <Link href={`/clubs/${entry.club.id}`} sx={{ fontWeight: 600 }}>
          {entry.club.name}
        </Link>
        <Typography variant="body2" color="text.secondary">
          {placeName(entry.club.city)}
          {entry.position === null ? '' : ` · ${entry.position}`}
        </Typography>
      </Box>
    </Box>
  );
}

/** Должность тренера в штабе — правит клуб, на месте. */
function PositionEditor({ entry }: { readonly entry: ClubCoachView }): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const [value, setValue] = useState(entry.position ?? '');
  const changed = value.trim() !== (entry.position ?? '');
  const save = useMutation({
    mutationFn: () =>
      updateClubCoach(entry.club.id, entry.coach.id, {
        position: value.trim() === '' ? null : value.trim(),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: coachKeys.all }),
  });

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <TextField
        size="small"
        label={t('staff.position')}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        slotProps={{ htmlInput: { maxLength: 60 } }}
        error={save.isError}
        sx={{ width: { xs: '100%', sm: 220 } }}
      />
      {changed && (
        <Button
          disabled={save.isPending}
          onClick={() => {
            save.mutate();
          }}
          sx={{ minHeight: 40 }}
        >
          {t('manage.page.save')}
        </Button>
      )}
    </Box>
  );
}
