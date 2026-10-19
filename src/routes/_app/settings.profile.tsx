import type { CreatePlayerInput } from '@kttf/shared/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import Surface from '@/common/ui/surface';
import { reloadUser } from '@/features/auth/session';
import { useSessionStore } from '@/features/auth/session-store';
import { createPlayer, updatePlayer } from '@/features/players/api';
import { equipmentProducts, toFormValues, toPlayerPatch } from '@/features/players/form-values';
import PlayerForm from '@/features/players/player-form';
import { playerKeys, playerQuery } from '@/features/players/queries';
import SettingsLayout from '@/features/settings/settings-layout';

export const Route = createFileRoute('/_app/settings/profile')({
  component: ProfileSettingsPage,
});

/**
 * Настройки профиля игрока — ТЗ 2.2, ADR-048.
 *
 * Здесь только то, что видят другие на публичной странице: фото, имя,
 * город, клуб, дата рождения и её видимость, анкета. Вход, почта и пароль —
 * в «Аккаунте». После сохранения человек попадает на свой профиль и видит
 * результат так, как его увидят другие.
 */
function ProfileSettingsPage(): ReactNode {
  const t = useT();
  // Сессия — из хранилища: она обновляется, когда человек заводит профиль.
  const user = useSessionStore((state) => state.user);

  return (
    <SettingsLayout section="profile" lead={t('settings.profile.lead')}>
      {user === null ? null : user.playerId === null ? (
        <NewProfile />
      ) : (
        <EditProfile playerId={user.playerId} />
      )}
    </SettingsLayout>
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
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: (values: CreatePlayerInput) => createPlayer(values),
    // Профиль заведён — в сессии обязан появиться `playerId`, иначе
    // настройки продолжат предлагать завести его заново.
    onSuccess: async (created) => {
      await reloadUser();
      await navigate({ to: '/players/$playerId', params: { playerId: created.id } });
    },
  });

  return (
    <Surface title={t('settings.profile.new')} subtitle={t('cabinet.profile.lead')}>
      <PlayerForm
        submitLabel="cabinet.profile.create"
        isPending={create.isPending}
        error={create.error}
        onSubmit={(values) => {
          create.mutate(values);
        }}
      />
    </Surface>
  );
}

function EditProfile({ playerId }: { readonly playerId: string }): ReactNode {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const player = useQuery(playerQuery(playerId));

  const update = useMutation({
    // Пустое поле формы означает «стереть», а не «оставить как было»:
    // форма отдаёт профиль целиком (см. `toPlayerPatch`).
    mutationFn: (values: CreatePlayerInput) => updatePlayer(playerId, toPlayerPatch(values)),
    onSuccess: async (updated) => {
      queryClient.setQueryData(playerKeys.detail(playerId), updated);
      // Списки и история показывают имя и клуб: после правки они устарели.
      void queryClient.invalidateQueries({ queryKey: playerKeys.all });
      await navigate({ to: '/players/$playerId', params: { playerId } });
    },
  });

  return (
    <QueryState
      isPending={player.isPending}
      error={player.error}
      onRetry={() => void player.refetch()}
    >
      {player.data === undefined ? null : (
        <Surface>
          <PlayerForm
            defaultValues={toFormValues(player.data)}
            city={player.data.city}
            products={equipmentProducts(player.data)}
            submitLabel="cabinet.profile.save"
            isPending={update.isPending}
            error={update.error}
            onSubmit={(values) => {
              update.mutate(values);
            }}
            onCancel={() => {
              void navigate({ to: '/players/$playerId', params: { playerId } });
            }}
          />
        </Surface>
      )}
    </QueryState>
  );
}
