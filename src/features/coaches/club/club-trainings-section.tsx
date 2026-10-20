import type { ClubView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';

import { clubTrainingsQuery } from '../queries';
import { QuickRequests } from '@/features/clubs/contact-actions';

import { ClubTrainingParts } from '../training-list';

/**
 * «Тренировки в клубе» на странице клуба (ADR-059): группы клуба и личные
 * тренировки тренеров в его зале — двумя частями по владельцу, у каждой
 * строки «Записаться» и «Подробнее». Сюда же переехала «Записаться на
 * пробную»: тренировки из прайса ушли. Пустой раздел не выводится (ADR-042).
 */
export default function ClubTrainingsSection({ club }: { readonly club: ClubView }): ReactNode {
  const t = useT();
  const trainings = useQuery(clubTrainingsQuery(club.id));

  if (trainings.data?.length === 0) return null;

  return (
    <Box component="section" data-club-trainings sx={{ mt: 6 }}>
      <Typography variant="h2" sx={{ mb: 2 }}>
        {t('training.inClub.title')}
      </Typography>
      <QueryState
        isPending={trainings.isPending}
        error={trainings.error}
        onRetry={() => void trainings.refetch()}
        loading={<RowsSkeleton rows={2} />}
      >
        {trainings.data !== undefined && (
          <>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
              <ClubTrainingParts trainings={trainings.data} />
            </Paper>
            <Box sx={{ mt: 2 }}>
              <QuickRequests club={club} requests={['trial']} />
            </Box>
          </>
        )}
      </QueryState>
    </Box>
  );
}
