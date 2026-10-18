import type { CreateClubApplicationInput } from '@kttf/shared/types';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useMutation } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { CircleCheck } from 'lucide-react';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { BackLink } from '@/common/ui/page-header';
import { sendClubApplication } from '@/features/club-applications/api';
import ApplicationForm from '@/features/club-applications/application-form';

export const Route = createFileRoute('/_public/feedback')({
  component: FeedbackPage,
});

/**
 * «Напишите нам» — заявка клуба, ADR-047.
 *
 * Отдельным адресом, а не окном на главной: ссылку на форму пересылают
 * в WhatsApp, и на телефоне длинная форма в окне неудобна. Входить не
 * нужно — представитель зала ещё не пользователь.
 */
function FeedbackPage(): ReactNode {
  const t = useT();

  const send = useMutation({
    mutationFn: (input: CreateClubApplicationInput) => sendClubApplication(input),
  });

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/" label={t('nav.home')} />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('page.feedback.title')}
      </Typography>

      {send.isSuccess ? (
        // Подтверждение вместо формы: повторная отправка той же заявки
        // ничего не добавит, а «Заявка отправлена» — то, что человек ищет.
        <Paper variant="outlined" role="status" sx={{ mt: 3, p: { xs: 3, sm: 5 }, maxWidth: 640 }}>
          <CircleCheck size={32} color="var(--ok)" aria-hidden />
          <Typography variant="h2" sx={{ mt: 1.5 }}>
            {t('apply.sent.title')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t('apply.sent.text')}
          </Typography>
          <Button href="/" sx={{ mt: 3, minHeight: 44 }}>
            {t('nav.home')}
          </Button>
        </Paper>
      ) : (
        <Paper variant="outlined" sx={{ mt: 3, p: { xs: 3, sm: 5 }, maxWidth: 880 }}>
          <Typography color="text.secondary" sx={{ maxWidth: '68ch' }}>
            {t('apply.lead')}
          </Typography>
          <ApplicationForm
            isPending={send.isPending}
            error={send.error}
            onSubmit={(values) => {
              send.mutate(values);
            }}
          />
        </Paper>
      )}
    </Container>
  );
}
