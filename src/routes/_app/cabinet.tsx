import type { AuthUserView, CreatePlayerInput, PlayerProfileView } from '@kttf/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import { formatDate, useLocale, useT, type MessageKey } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import AccountForm from '@/features/auth/account-form';
import PasswordForm from '@/features/auth/password-form';
import { reloadUser } from '@/features/auth/session';
import { useSessionStore } from '@/features/auth/session-store';
import { clubRoleKey } from '@/features/clubs/labels';
import { clubDirectoryQuery } from '@/features/clubs/queries';
import { createPlayer, updatePlayer } from '@/features/players/api';
import { toFormValues, toPlayerPatch } from '@/features/players/form-values';
import PlayerForm from '@/features/players/player-form';
import { playerName } from '@/features/players/player-name';
import { playerKeys, playerQuery } from '@/features/players/queries';

export const Route = createFileRoute('/_app/cabinet')({
  component: CabinetPage,
});

/**
 * Кабинет — ТЗ 2.1 и 2.2.
 *
 * Две разные вещи и потому два раздела: **профиль игрока** — то, что о
 * человеке знает спорт (анкета, инвентарь, клуб, тренер), и **настройки
 * аккаунта** — то, чем он входит и как с ним связаться. Сущности в модели
 * тоже разные: у судьи есть аккаунт без профиля, у игрока, заведённого
 * тренером, — профиль без аккаунта. ADR-035.
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
          <h2 className="mt-8 text-lg font-semibold text-slate-900">
            {t('cabinet.profile.title')}
          </h2>
          {user.playerId === null ? <NewProfile /> : <Profile playerId={user.playerId} />}

          <h2 className="mt-12 text-lg font-semibold text-slate-900">
            {t('cabinet.account.title')}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{t('cabinet.account.lead')}</p>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[max-content_1fr]">
            <dt className="text-slate-500">{t('cabinet.account.phone')}</dt>
            <dd className="text-slate-900">
              {user.phone}
              <span className="ml-2 text-xs text-slate-400">{t('cabinet.account.phoneFixed')}</span>
            </dd>
          </dl>
          <AccountForm user={user} />

          <h3 className="mt-10 text-sm font-semibold text-slate-900">
            {t('account.password.title')}
          </h3>
          <PasswordForm />

          <Roles user={user} />
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
    // Пустое поле формы означает «стереть», а не «оставить как было»:
    // форма отдаёт профиль целиком (см. `toPlayerPatch`).
    mutationFn: (values: CreatePlayerInput) => updatePlayer(playerId, toPlayerPatch(values)),
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
  readonly player: PlayerProfileView;
  readonly onEdit: () => void;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const clubs = useQuery(clubDirectoryQuery);

  return (
    <div className="mt-6 rounded border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-4">
        {player.photoUrl !== null && (
          <img src={player.photoUrl} alt="" className="size-20 rounded-full object-cover" />
        )}
        <div>
          <p className="text-lg font-medium text-slate-900">{playerName(player)}</p>
          <p className="mt-1 text-sm text-slate-600">
            {player.city}
            {player.clubId !== null && ` · ${clubs.data?.get(player.clubId)?.name ?? ''}`}
            {/* Своя карточка показывает дату целиком, если она известна:
                прячут её от посторонних, а не от себя (ADR-037). */}
            {` · ${player.birthDate === null ? String(player.birthYear) : formatDate(player.birthDate, locale)}`}
            {player.birthYearOnly && (
              <span className="ml-2 text-xs text-slate-400">{t('cabinet.profile.yearOnly')}</span>
            )}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            {t('cabinet.profile.rating')} <span className="tabular-nums">{player.rating}</span>
          </p>
        </div>
      </div>

      {/* Анкета показывается только заполненной: пустые строки «не указано»
          на десять полей — это шум, а не сведения. */}
      <dl className="mt-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
        <Row label="player.form.playingHand" value={handLabel(player.playingHand, t)} />
        <Row label="player.form.grip" value={gripLabel(player.grip, t)} />
        <Row label="player.form.blade" value={player.blade} />
        <Row label="player.form.rubberForehand" value={player.rubberForehand} />
        <Row label="player.form.rubberBackhand" value={player.rubberBackhand} />
        <Row label="player.form.coach" value={player.coachName} />
        <Row label="player.form.bio" value={player.bio} />
      </dl>

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

function Row({
  label,
  value,
}: {
  readonly label: MessageKey;
  readonly value: string | null;
}): ReactNode {
  const t = useT();

  if (value === null || value === '') return null;

  return (
    <>
      <dt className="text-slate-500">{t(label)}</dt>
      <dd className="text-slate-900">{value}</dd>
    </>
  );
}

/**
 * Рука и хват — в текст.
 *
 * В ответе это строка, а не перечень (ТС 7.2): незнакомое значение
 * показывается как есть, а не подменяется молча ближайшим известным.
 */
function handLabel(value: string | null, t: (key: MessageKey) => string): string | null {
  if (value === 'RIGHT') return t('player.hand.RIGHT');
  if (value === 'LEFT') return t('player.hand.LEFT');

  return value;
}

function gripLabel(value: string | null, t: (key: MessageKey) => string): string | null {
  if (value === 'SHAKEHAND') return t('player.grip.SHAKEHAND');
  if (value === 'PENHOLD') return t('player.grip.PENHOLD');

  return value;
}

/**
 * Роли в клубах.
 *
 * Нужны здесь потому, что по ним человек узнаёт, где он вправе действовать:
 * в самом клубе они видны только его составу.
 */
function Roles({ user }: { readonly user: AuthUserView }): ReactNode {
  const t = useT();
  const clubs = useQuery(clubDirectoryQuery);

  return (
    <section className="mt-10">
      <h3 className="text-sm font-semibold text-slate-900">{t('cabinet.roles.title')}</h3>
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
