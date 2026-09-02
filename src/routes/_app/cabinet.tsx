import type { AuthUserView, CreatePlayerInput, PlayerView } from '@kttf/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import { reloadUser } from '@/features/auth/session';
import { useSessionStore } from '@/features/auth/session-store';
import { clubRoleKey } from '@/features/clubs/labels';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { createPlayer, updatePlayer } from '@/features/players/api';
import PlayerForm from '@/features/players/player-form';
import { playerName } from '@/features/players/player-name';
import { playerKeys, playerQuery } from '@/features/players/queries';

export const Route = createFileRoute('/_app/cabinet')({
  component: CabinetPage,
});

/**
 * Кабинет — свой профиль игрока, ТЗ 2.2.
 *
 * Разделов ТЗ кабинету не отводит: здесь ровно то, чего без него сделать
 * нельзя, — завести и править собственный профиль. После входа `playerId`
 * пуст, и до этой страницы заполнить его было нечем.
 *
 * Права проверяет сервер (ТС 8.3): правка чужого профиля закрыта там же,
 * а не тем, что кнопки нет.
 */
function CabinetPage(): ReactNode {
  const t = useT();
  // Сессия берётся из хранилища, а не из контекста роутера: контекст —
  // копия для `beforeLoad`, где хуков нет, и он не обновится от того, что
  // человек завёл себе профиль. Так же читает сессию публичная оболочка.
  const user = useSessionStore((state) => state.user);

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">{t('page.cabinet.title')}</h1>

      {/* Охрана оболочки `_app` без сессии сюда не пускает: ветка нужна типу. */}
      {user !== null && (
        <>
          {user.playerId === null ? <NewProfile /> : <Profile playerId={user.playerId} />}
          <Account user={user} />
        </>
      )}
    </section>
  );
}

/**
 * Заведение профиля после регистрации.
 *
 * Тот же маршрут, что и заведение игрока организатором: какой из двух
 * случаев — решает сервер по наличию профиля у вошедшего (ADR-014).
 */
function NewProfile(): ReactNode {
  const t = useT();

  const create = useMutation({
    mutationFn: (values: CreatePlayerInput) => createPlayer(values),
    // Профиль заведён — в сессии обязан появиться `playerId`, иначе кабинет
    // продолжит предлагать завести его заново.
    onSuccess: () => reloadUser(),
  });

  return (
    <>
      <p className="mt-2 text-slate-600">{t('cabinet.profile.lead')}</p>
      <PlayerForm
        submitLabel="cabinet.profile.create"
        isPending={create.isPending}
        error={create.error}
        onSubmit={(values) => {
          create.mutate(values);
        }}
      />
    </>
  );
}

/** Свой профиль: карточка, правка и ссылка на публичную страницу. */
function Profile({ playerId }: { readonly playerId: string }): ReactNode {
  const queryClient = useQueryClient();
  const [isEditing, setEditing] = useState(false);

  const player = useQuery(playerQuery(playerId));

  const update = useMutation({
    mutationFn: (values: CreatePlayerInput) => updatePlayer(playerId, values),
    onSuccess: (updated) => {
      queryClient.setQueryData(playerKeys.detail(playerId), updated);
      setEditing(false);
      // Списки и история показывают имя и клуб: после правки они устарели.
      // Ждать их обновления незачем — карточка уже показывает новое.
      void queryClient.invalidateQueries({ queryKey: playerKeys.all });
    },
  });

  return (
    <QueryState
      isPending={player.isPending}
      error={player.error}
      onRetry={() => void player.refetch()}
    >
      {player.data === undefined ? null : isEditing ? (
        <PlayerForm
          defaultValues={toFormValues(player.data)}
          submitLabel="cabinet.profile.save"
          isPending={update.isPending}
          error={update.error}
          onSubmit={(values) => {
            update.mutate(values);
          }}
          onCancel={() => {
            setEditing(false);
          }}
        />
      ) : (
        <Card
          player={player.data}
          onEdit={() => {
            setEditing(true);
          }}
        />
      )}
    </QueryState>
  );
}

function Card({
  player,
  onEdit,
}: {
  readonly player: PlayerView;
  readonly onEdit: () => void;
}): ReactNode {
  const t = useT();
  const clubs = useQuery(clubDirectoryQuery);

  return (
    <div className="mt-6 rounded border border-slate-200 bg-white p-4">
      <p className="text-lg font-medium text-slate-900">{playerName(player)}</p>
      <p className="mt-1 text-sm text-slate-600">
        {player.city}
        {player.clubId !== null && ` · ${clubs.data?.get(player.clubId)?.name ?? ''}`}
        {` · ${String(player.birthYear)}`}
      </p>
      <p className="mt-3 text-sm text-slate-600">
        {t('cabinet.profile.rating')} <span className="tabular-nums">{player.rating}</span>
      </p>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <button type="button" onClick={onEdit} className="text-blue-700 underline">
          {t('cabinet.profile.edit')}
        </button>
        <Link
          to="/players/$playerId"
          params={{ playerId: player.id }}
          className="text-blue-700 underline"
        >
          {t('cabinet.profile.public')}
        </Link>
      </div>
    </div>
  );
}

/**
 * Аккаунт и роли в клубах.
 *
 * Телефон и почта показываются, но не правятся: маршрута их изменить в
 * контракте ТС 7.1 нет. Роли нужны здесь потому, что по ним человек узнаёт,
 * где он вправе действовать: в самом клубе они видны только его составу.
 */
function Account({ user }: { readonly user: AuthUserView }): ReactNode {
  const t = useT();
  const clubs = useQuery(clubDirectoryQuery);

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">{t('cabinet.account.title')}</h2>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[max-content_1fr]">
        <dt className="text-slate-500">{t('cabinet.account.phone')}</dt>
        <dd className="text-slate-900">{user.phone}</dd>
        <dt className="text-slate-500">{t('cabinet.account.email')}</dt>
        <dd className="text-slate-900">
          {user.email ?? <span className="text-slate-400">{t('cabinet.account.noEmail')}</span>}
        </dd>
      </dl>

      <h3 className="mt-6 text-sm font-semibold text-slate-900">{t('cabinet.roles.title')}</h3>
      {user.clubRoles.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">{t('cabinet.roles.empty')}</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {user.clubRoles.map((role) => (
            <li key={`${role.clubId}-${role.role}`} className="text-slate-700">
              {clubs.data?.get(role.clubId)?.name ?? role.clubId}
              {' · '}
              <RoleName role={role.role} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Название роли.
 *
 * В контракте ТС 7.1 роль осталась строкой, а не перечнем, поэтому значение
 * приходится сверять с известными. Неизвестное показывается как есть: молча
 * подставленная чужая роль хуже непереведённого слова.
 */
function RoleName({ role }: { readonly role: string }): ReactNode {
  const t = useT();
  const key = clubRoleKey(role);

  return key === undefined ? role : t(key);
}

/** Профиль — в значения формы. Пустые поля контракта форма показывает пустыми. */
function toFormValues(player: PlayerView): Partial<CreatePlayerInput> {
  return {
    lastName: player.lastName,
    firstName: player.firstName,
    ...(player.middleName === null ? {} : { middleName: player.middleName }),
    birthYear: player.birthYear,
    // Пол в ответе — строка, а не перечень (ТС 7.2). Незнакомое значение не
    // подставляется молча: человек выберет сам.
    ...(player.gender === 'MALE' || player.gender === 'FEMALE' ? { gender: player.gender } : {}),
    city: player.city,
    ...(player.clubId === null ? {} : { clubId: player.clubId }),
  };
}
