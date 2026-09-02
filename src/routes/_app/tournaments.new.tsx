import type { CreateTournamentInput } from '@kttf/shared/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import { managedClubIds } from '@/features/clubs/roles';
import { createTournament } from '@/features/tournaments/api';
import { tournamentKeys } from '@/features/tournaments/queries';
import TournamentForm from '@/features/tournaments/tournament-form';

export const Route = createFileRoute('/_app/tournaments/new')({
  component: NewTournamentPage,
});

/**
 * Создание турнира — ТЗ 4.2.
 *
 * Живёт в оболочке `_app`: без входа сюда не пускает её охрана, и повторять
 * проверку на странице незачем.
 *
 * Отдельного раздела кабинета под турниры не заводится — ТЗ его кабинету не
 * отводит. Сюда приходят с календаря турниров, где организатор их и смотрит.
 */
function NewTournamentPage(): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Сессия из хранилища, а не из контекста роутера: контекст — копия для
  // `beforeLoad`, и он не обновится от того, что человека добавили в клуб.
  const user = useSessionStore((state) => state.user);
  const clubIds = managedClubIds(user);

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
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">{t('page.newTournament.title')}</h1>

      {clubIds.length === 0 ? (
        // Клуб-хозяин обязателен (ТЗ 4.2). Показывать форму, которую сервер
        // отвергнет, — ложное обещание.
        <p className="mt-6 text-slate-600">
          {t('tournament.form.noClubs')}{' '}
          <Link to="/tournaments" className="text-blue-700 underline">
            {t('page.tournaments.title')}
          </Link>
        </p>
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
    </section>
  );
}
