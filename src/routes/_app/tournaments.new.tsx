import type { CreateTournamentInput } from '@kttf/shared/types';
import Container from '@mui/material/Container';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { z } from 'zod';

import { useT } from '@/common/i18n';
import { searchId } from '@/common/search';
import { useSessionStore } from '@/features/auth/session-store';
import { managedClubIds } from '@/features/clubs/roles';
import { createTournament } from '@/features/tournaments/api';
import { tournamentKeys } from '@/features/tournaments/queries';
import TournamentForm from '@/features/tournaments/tournament-form';

const searchSchema = z.object({ club: searchId });

export const Route = createFileRoute('/_app/tournaments/new')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: NewTournamentPage,
});

/**
 * Создание турнира — ТЗ 4.2.
 *
 * Живёт в оболочке `_app`: без входа сюда не пускает её охрана, и повторять
 * проверку на странице незачем.
 *
 * Сюда приходят из управления клубом с `?club=` — клуб в форме выбран сразу
 * — и из календаря турниров, где клуб выбирается в форме.
 */
function NewTournamentPage(): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Сессия из хранилища, а не из контекста роутера: контекст — копия для
  // `beforeLoad`, и он не обновится от того, что человека добавили в клуб.
  const user = useSessionStore((state) => state.user);
  const { club } = Route.useSearch();
  // Клуб из адреса — первым: форма берёт первый из списка по умолчанию.
  // Чужой клуб в адресе ничего не меняет, список остаётся своим.
  const managed = managedClubIds(user);
  const clubIds =
    club !== undefined && managed.includes(club)
      ? [club, ...managed.filter((id) => id !== club)]
      : managed;

  const create = useMutation({
    mutationFn: (input: CreateTournamentInput) => createTournament(input),
    onSuccess: async (tournament) => {
      await queryClient.invalidateQueries({ queryKey: tournamentKeys.all });
      // Созданный турнир открывается сразу: следующий шаг организатора —
      // опубликовать его и открыть запись, а это уже его страница.
      await navigate({
        to: '/tournaments/$tournamentId',
        params: { tournamentId: tournament.id },
      });
    },
  });

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Typography variant="h1">{t('page.newTournament.title')}</Typography>

      {clubIds.length === 0 ? (
        // Клуб-хозяин обязателен (ТЗ 4.2). Показывать форму, которую сервер
        // отвергнет, — ложное обещание.
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          {t('tournament.form.noClubs')}{' '}
          <Link href="/cabinet/clubs/new">{t('club.create')}</Link>
        </Typography>
      ) : (
        <TournamentForm
          clubIds={clubIds}
          isPending={create.isPending}
          error={create.error}
          onSubmit={(values) => {
            create.mutate(values);
          }}
        />
      )}
    </Container>
  );
}
