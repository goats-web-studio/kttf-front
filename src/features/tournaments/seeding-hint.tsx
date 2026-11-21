import type { TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, useT } from '@/common/i18n';

import { updateTournament } from './api';
import { tournamentKeys } from './queries';

/**
 * Что значит колонка «Посев» — замечание владельца после пилота, 21.11.2026.
 *
 * Номера в колонке жеребьёвка берёт только при ручном посеве
 * (`seedParticipants`): при посеве по рейтингу или случайном их можно
 * вписать, и они молча ничего не меняют. Здесь это сказано словами, а
 * ручной посев включается одной кнопкой. Смена посева сбрасывает
 * жеребьёвку — её проводят заново, как после правки схемы.
 */
export default function SeedingHint({
  tournament,
}: {
  readonly tournament: TournamentView;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const seeding = tournament.seedingConfig;
  const method = seeding?.method ?? 'RATING';

  const manual = useMutation({
    mutationFn: () =>
      updateTournament(tournament.id, {
        seedingConfig: { method: 'MANUAL', separateByClub: seeding?.separateByClub ?? true },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
    },
  });

  return (
    <Box
      data-seeding-hint
      sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 240 }}>
        {method === 'MANUAL'
          ? t('participants.seeding.manual')
          : fill(t('participants.seeding.ignored'), {
              method: t(`tournament.seeding.${method}`).toLowerCase(),
            })}
      </Typography>
      {method !== 'MANUAL' && (
        <Button
          variant="text"
          size="small"
          disabled={manual.isPending}
          onClick={() => {
            manual.mutate();
          }}
          sx={{ minHeight: 44 }}
        >
          {t('participants.seeding.switch')}
        </Button>
      )}
      {manual.error !== null && (
        <Typography role="alert" variant="body2" color="error" sx={{ width: '100%' }}>
          {t(errorMessageKey(manual.error))}
        </Typography>
      )}
    </Box>
  );
}
