import type { AuthUserView, CreatePlayerInput, PlayerProfileView } from '@kttf/shared/types';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
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

/** Список «подпись — значение»: столбиком на телефоне, в две колонки с 640px. */
const PAIRS = {
  display: 'grid',
  columnGap: 2,
  rowGap: 0.5,
  gridTemplateColumns: { xs: '1fr', sm: 'max-content 1fr' },
  m: 0,
  '& dd': { m: 0 },
} as const;

/** Кнопка на телефоне не ниже 44px — зона нажатия (раздел 9). */
const TOUCH = { minHeight: { xs: 44, sm: 40 } } as const;

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
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Typography variant="h1">{t('page.cabinet.title')}</Typography>

      {/* Охрана оболочки `_app` без сессии сюда не пускает: ветка нужна типу. */}
      {user !== null && (
        <>
          <Typography variant="h2" sx={{ mt: 5 }}>
            {t('cabinet.profile.title')}
          </Typography>
          {user.playerId === null ? <NewProfile /> : <Profile playerId={user.playerId} />}

          <Typography variant="h2" sx={{ mt: 6 }}>
            {t('cabinet.account.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('cabinet.account.lead')}
          </Typography>
          <Box component="dl" sx={{ ...PAIRS, mt: 2 }}>
            <Typography component="dt" variant="body2" color="text.secondary">
              {t('cabinet.account.phone')}
            </Typography>
            <Typography component="dd" variant="body2">
              {user.phone}
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                {t('cabinet.account.phoneFixed')}
              </Typography>
            </Typography>
          </Box>
          <AccountForm user={user} />

          <Typography variant="h3" sx={{ mt: 5 }}>
            {t('account.password.title')}
          </Typography>
          <PasswordForm />

          <Roles user={user} />
        </>
      )}
    </Container>
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
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        {t('cabinet.profile.lead')}
      </Typography>
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
        <ProfileCard
          player={player.data}
          onEdit={() => {
            setEditing(true);
          }}
        />
      )}
    </QueryState>
  );
}

function ProfileCard({
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
    <Card sx={{ mt: 3 }}>
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
          {player.photoUrl !== null && (
            <Avatar src={player.photoUrl} alt="" sx={{ width: 80, height: 80 }} />
          )}
          <Box>
            <Typography variant="subtitle1" component="p">
              {playerName(player)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {player.city}
              {player.clubId !== null && ` · ${clubs.data?.get(player.clubId)?.name ?? ''}`}
              {/* Своя карточка показывает дату целиком, если она известна:
                  прячут её от посторонних, а не от себя (ADR-037). */}
              {` · ${player.birthDate === null ? String(player.birthYear) : formatDate(player.birthDate, locale)}`}
              {player.birthYearOnly && (
                <Typography component="span" variant="caption" sx={{ ml: 1 }}>
                  {t('cabinet.profile.yearOnly')}
                </Typography>
              )}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {t('cabinet.profile.rating')}{' '}
              <Box
                component="span"
                sx={{ color: 'text.primary', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
              >
                {player.rating}
              </Box>
            </Typography>
          </Box>
        </Stack>

        {/* Анкета показывается только заполненной: пустые строки «не указано»
            на десять полей — это шум, а не сведения. */}
        <Box component="dl" sx={{ ...PAIRS, mt: 2 }}>
          <Row label="player.form.playingHand" value={handLabel(player.playingHand, t)} />
          <Row label="player.form.grip" value={gripLabel(player.grip, t)} />
          <Row label="player.form.blade" value={player.blade} />
          <Row label="player.form.rubberForehand" value={player.rubberForehand} />
          <Row label="player.form.rubberBackhand" value={player.rubberBackhand} />
          <Row label="player.form.coach" value={player.coachName} />
          <Row label="player.form.bio" value={player.bio} />
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
          <Button onClick={onEdit} sx={TOUCH}>
            {t('cabinet.profile.edit')}
          </Button>
          <Button variant="text" href={`/players/${player.id}`} sx={TOUCH}>
            {t('cabinet.profile.public')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
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
      <Typography component="dt" variant="body2" color="text.secondary">
        {t(label)}
      </Typography>
      <Typography component="dd" variant="body2">
        {value}
      </Typography>
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
    <Box component="section" sx={{ mt: 5 }}>
      <Typography variant="h3">{t('cabinet.roles.title')}</Typography>
      {user.clubRoles.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t('cabinet.roles.empty')}
        </Typography>
      ) : (
        <Stack component="ul" spacing={0.5} sx={{ mt: 0.5, mb: 0, p: 0, listStyle: 'none' }}>
          {user.clubRoles.map((role) => (
            <Typography
              key={`${role.clubId}-${role.role}`}
              component="li"
              variant="body2"
              color="text.secondary"
            >
              {clubs.data?.get(role.clubId)?.name ?? role.clubId}
              {' · '}
              <RoleName role={role.role} />
            </Typography>
          ))}
        </Stack>
      )}
    </Box>
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
