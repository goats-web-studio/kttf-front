import type { CreateClubInput } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { fill, useT } from '@/common/i18n';
import EmptyState from '@/common/ui/empty-state';
import { BackLink } from '@/common/ui/page-header';
import { reloadUser } from '@/features/auth/session';
import { useSessionStore } from '@/features/auth/session-store';
import { updateClubApplication } from '@/features/club-applications/api';
import { clubApplicationKeys } from '@/features/club-applications/queries';
import { createClub } from '@/features/clubs/api';
import ClubForm from '@/features/clubs/club-form';
import { clubKeys } from '@/features/clubs/queries';

/**
 * Заявка, из которой заводится клуб (ADR-049): её поля заполняют форму, а
 * сама она после создания отмечается обработанной. Значения — строками:
 * ссылка приходит с карточки заявки.
 */
const searchSchema = z.object({
  application: z.string().optional().catch(undefined),
  name: z.coerce.string().optional().catch(undefined),
  address: z.coerce.string().optional().catch(undefined),
  tables: z.coerce.number().int().positive().optional().catch(undefined),
  about: z.coerce.string().optional().catch(undefined),
});

export const Route = createFileRoute('/_app/cabinet/clubs/new')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: NewClubPage,
});

/**
 * Новый клуб — ТЗ 3.1, ADR-049.
 *
 * Клуб заводит администратор платформы по заявке «Напишите нам»: раньше
 * клуб мог завести любой вошедший, без проверки (ОВ-13), и рядом жила
 * заявка федерации — два пути к одному и тому же. Заведший становится
 * владельцем, поэтому после создания он попадает в состав клуба: добавить
 * владельцем представителя зала.
 *
 * Остальным страница объясняет, как получить клуб, и ведёт на заявку.
 */
function NewClubPage(): ReactNode {
  const t = useT();
  const user = useSessionStore((state) => state.user);

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <BackLink href="/cabinet/clubs" label={t('nav.myClubs')} />
      <Typography variant="h1" sx={{ mt: 1 }}>
        {t('page.newClub.title')}
      </Typography>

      {user?.isAdmin === true ? (
        <AdminForm />
      ) : (
        <Box sx={{ mt: 3 }}>
          <EmptyState
            title={t('clubs.new.byApplication.title')}
            text={t('clubs.new.byApplication.text')}
            action={
              <Button variant="contained" href="/feedback">
                {t('clubs.apply')}
              </Button>
            }
          />
        </Box>
      )}
    </Container>
  );
}

function AdminForm(): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();

  const create = useMutation({
    mutationFn: (input: CreateClubInput) => createClub(input),
    onSuccess: async (club) => {
      // Заявка, по которой заведён клуб, — обработана: второй раз её не
      // разбирать. Отказ отметки клуб не отменяет — отметят руками.
      if (search.application !== undefined) {
        await updateClubApplication(search.application, { status: 'DONE' }).catch(() => undefined);
        void queryClient.invalidateQueries({ queryKey: clubApplicationKeys.all });
      }

      // Роль владельца приходит в сессии, а не в ответе создания: без
      // перечитывания пользователя «Мои клубы» не увидели бы новый клуб.
      await Promise.all([reloadUser(), queryClient.invalidateQueries({ queryKey: clubKeys.all })]);
      // Сразу в состав: следующий шаг — сделать владельцем представителя зала.
      await navigate({
        to: '/cabinet/club/$clubId',
        params: { clubId: club.id },
        search: { tab: 'staff' },
      });
    },
  });

  return (
    <>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {t('clubs.new.adminLead')}
      </Typography>
      {search.application !== undefined && search.name !== undefined && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {fill(t('clubs.new.fromApplication'), { club: search.name })}
        </Alert>
      )}
      <ClubForm
        initial={{
          ...(search.name === undefined ? {} : { name: search.name }),
          ...(search.address === undefined ? {} : { address: search.address }),
          ...(search.tables === undefined ? {} : { tableCount: search.tables }),
          ...(search.about === undefined ? {} : { description: search.about }),
        }}
        isPending={create.isPending}
        error={create.error}
        submitLabel={t('club.create')}
        onSubmit={(values) => {
          create.mutate(values);
        }}
      />
    </>
  );
}
