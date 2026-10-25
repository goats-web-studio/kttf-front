import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import Surface from '@/common/ui/surface';
import MyTrialRequests from '@/features/trial-requests/my-requests';

export const Route = createFileRoute('/_app/cabinet/trainings')({
  component: MyTrainingsPage,
});

/**
 * «Тренировки» — ADR-075: заявки на пробные и ответы тренеров и клубов,
 * плюс короткий путь к поиску группы и тренера.
 */
function MyTrainingsPage(): ReactNode {
  const t = useT();

  return (
    <Container maxWidth="lg" component="section">
      <Typography variant="h1">{t('cabinet.nav.trainings')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        {t('cabinet.trainings.lead')}
      </Typography>
      <Stack spacing={3}>
        <MyTrialRequests />
        <Surface title={t('cabinet.trainings.find')} subtitle={t('cabinet.trainings.findLead')}>
          <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Button variant="contained" href="/trainings" sx={{ minHeight: 44 }}>
              {t('cabinet.trainings.groups')}
            </Button>
            <Button href="/trainings?view=coaches" sx={{ minHeight: 44 }}>
              {t('cabinet.trainings.coaches')}
            </Button>
          </Stack>
        </Surface>
      </Stack>
    </Container>
  );
}
