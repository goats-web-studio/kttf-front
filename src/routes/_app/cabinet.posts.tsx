import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { createFileRoute } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import { useSessionStore } from '@/features/auth/session-store';
import PlayerWall from '@/features/feed/player-wall';

export const Route = createFileRoute('/_app/cabinet/posts')({
  component: MyPostsPage,
});

/** «Мои записи» — стена со всеми инструментами: написать, поправить, архив (ADR-075). */
function MyPostsPage(): ReactNode {
  const t = useT();
  const playerId = useSessionStore((state) => state.user?.playerId ?? null);

  return (
    <Container maxWidth="lg" component="section">
      <Typography variant="h1">{t('cabinet.nav.posts')}</Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        {t('cabinet.posts.lead')}
      </Typography>
      {playerId !== null && <PlayerWall playerId={playerId} own heading={false} />}
    </Container>
  );
}
