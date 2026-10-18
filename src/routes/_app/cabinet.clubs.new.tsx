import type { CreateClubInput } from '@kttf/shared/types';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { BackLink } from '@/common/ui/page-header';
import { reloadUser } from '@/features/auth/session';
import { createClub } from '@/features/clubs/api';
import ClubForm from '@/features/clubs/club-form';
import { clubKeys } from '@/features/clubs/queries';

export const Route = createFileRoute('/_app/cabinet/clubs/new')({
  component: NewClubPage,
});

/**
 * Новый клуб — ТЗ 3.1.
 *
 * Создатель сразу становится владельцем (ТЗ 1). Кто вправе заводить клуб,
 * ТЗ не оговаривает — сейчас любой вошедший, без модерации (ОВ-13).
 */
function NewClubPage(): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (input: CreateClubInput) => createClub(input),
    onSuccess: async (club) => {
      // Роль владельца приходит в сессии, а не в ответе создания: без
      // перечитывания пользователя «Мои клубы» и создание турнира не
      // увидели бы новый клуб до перезагрузки страницы.
      await Promise.all([reloadUser(), queryClient.invalidateQueries({ queryKey: clubKeys.all })]);
      await navigate({ to: '/cabinet/club/$clubId', params: { clubId: club.id } });
    },
  });

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/cabinet/clubs" label={t('nav.myClubs')} />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('page.newClub.title')}
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {t('page.newClub.lead')}
      </Typography>
      <ClubForm
        isPending={create.isPending}
        error={create.error}
        submitLabel={t('club.create')}
        onSubmit={(values) => {
          create.mutate(values);
        }}
      />
    </Container>
  );
}
