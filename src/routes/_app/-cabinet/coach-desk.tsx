import type { AuthUserView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { ExternalLink, Whistle } from 'lucide-react';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import Surface from '@/common/ui/surface';
import { useBecomeCoach } from '@/features/coaches/become';
import { COACH_STATUS_KEYS } from '@/features/coaches/labels';

/**
 * Тренировки на рабочем столе — ADR-059, `docs/11` 3.1.
 *
 * Игроку без страницы — приглашение «Стать тренером»; со страницей —
 * её статус и путь в редактор. Кнопки обводкой: главное действие
 * кабинета одно, и оно не здесь (ADR-039).
 */
export default function CoachDesk({ user }: { readonly user: AuthUserView }): ReactNode {
  const t = useT();
  const become = useBecomeCoach();
  const coach = user.coach;

  if (coach === null) {
    return (
      <Surface title={t('coach.desk.title')} subtitle={t('coach.desk.lead')}>
        <Button
          startIcon={<Whistle size={16} aria-hidden />}
          disabled={become.isPending}
          onClick={() => {
            become.mutate();
          }}
          sx={{ minHeight: 44 }}
        >
          {t('coach.become.action')}
        </Button>
        {become.error !== null && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {t(errorMessageKey(become.error))}
          </Alert>
        )}
      </Surface>
    );
  }

  return (
    <Surface title={t('page.coach.title')}>
      <Typography data-coach-desk-status={coach.status} sx={{ fontWeight: 600 }}>
        {t(COACH_STATUS_KEYS[coach.status])}
      </Typography>
      <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button href="/cabinet/coach" sx={{ minHeight: 44 }}>
          {t('coach.edit')}
        </Button>
        <Button
          variant="text"
          href={`/coaches/${coach.slug}`}
          endIcon={<ExternalLink size={16} aria-hidden />}
          sx={{ minHeight: 44 }}
        >
          {t(coach.status === 'APPROVED' ? 'coach.open' : 'coach.preview')}
        </Button>
      </Box>
    </Surface>
  );
}
