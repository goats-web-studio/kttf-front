import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import { Settings } from 'lucide-react';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';

import AdminDesk from './-cabinet/admin-desk';
import ClubDesk from './-cabinet/club-desk';
import PlayerDesk from './-cabinet/player-desk';

export const Route = createFileRoute('/_app/cabinet/')({
  component: CabinetPage,
});

/**
 * Кабинет — рабочий стол, ADR-048.
 *
 * Отвечает на вопрос «что мне сейчас делать», а не «как меня зовут»: анкета
 * игрока и настройки аккаунта уехали в «Настройки». Состав зависит от ролей
 * и складывается: владелец клуба, который сам играет, видит оба набора.
 *
 * Порядок — от ежедневного к редкому: клубы и их турниры, свой рейтинг и
 * записи, в самом конце администрирование платформы.
 */
function CabinetPage(): ReactNode {
  const t = useT();
  // Сессия — из хранилища: она обновляется, когда человек заводит профиль
  // или получает роль в клубе.
  const user = useSessionStore((state) => state.user);

  return (
    <Container maxWidth="lg" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Typography variant="h1">{t('page.cabinet.title')}</Typography>
        <Button
          variant="text"
          href="/settings"
          startIcon={<Settings size={16} aria-hidden />}
          sx={{ color: 'text.secondary' }}
        >
          {t('nav.settings')}
        </Button>
      </Stack>

      {/* Охрана оболочки `_app` без сессии сюда не пускает: ветка нужна типу. */}
      {user !== null && (
        <Stack spacing={3} sx={{ mt: 4 }}>
          {user.playerId === null && (
            // Без профиля игрока нельзя записаться на турнир и получить
            // рейтинг — это первое, что стоит сделать.
            <Surface title={t('cabinet.noProfile.title')} subtitle={t('cabinet.noProfile.text')}>
              <Button variant="contained" href="/settings/profile">
                {t('cabinet.noProfile.action')}
              </Button>
            </Surface>
          )}

          {user.clubRoles.length > 0 && <ClubDesk user={user} />}

          {user.playerId !== null && <PlayerDesk playerId={user.playerId} />}

          {user.isAdmin && <AdminDesk />}
        </Stack>
      )}
    </Container>
  );
}
