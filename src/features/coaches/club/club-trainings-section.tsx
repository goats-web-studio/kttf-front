import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { RowsSkeleton } from '@/common/ui/skeleton';

import { clubTrainingsQuery } from '../queries';
import { TrainingList } from '../training-list';

/**
 * «Тренировки в клубе» на странице клуба (ADR-059): свои тренировки клуба
 * и подтверждённые тренерские, тренеры — ссылками на их страницы. Пустой
 * раздел не выводится (ADR-042).
 */
export default function ClubTrainingsSection({ clubId }: { readonly clubId: string }): ReactNode {
  const t = useT();
  const trainings = useQuery(clubTrainingsQuery(clubId));

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
          <TrainingList trainings={trainings.data} showCoach showPlace={false} />
        )}
      </QueryState>
    </Box>
  );
}
