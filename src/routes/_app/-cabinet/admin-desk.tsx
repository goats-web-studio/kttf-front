import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import Surface from '@/common/ui/surface';
import { newClubApplicationsCountQuery } from '@/features/club-applications/queries';
import { pendingCoachesCountQuery } from '@/features/coaches/queries';

/**
 * Администрирование платформы — ADR-046, ADR-047.
 *
 * В кабинете последним блоком: у администратора обычно есть и клуб, и
 * профиль, и платформенные дела — реже ежедневных. Сами страницы проверяют
 * признак, права на запись — сервер (ТС 8.3).
 */
export default function AdminDesk(): ReactNode {
  const t = useT();
  // Число новых заявок прямо на кнопке: видно, что есть работа, не
  // открывая раздел (ADR-047).
  const fresh = useQuery(newClubApplicationsCountQuery).data ?? 0;
  const coaches = useQuery(pendingCoachesCountQuery).data ?? 0;

  return (
    <Surface title={t('cabinet.admin.title')} subtitle={t('cabinet.admin.lead')}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        <Button href="/cabinet/applications" sx={{ minHeight: 44 }}>
          {fresh > 0
            ? fill(t('cabinet.admin.applicationsNew'), { count: String(fresh) })
            : t('cabinet.admin.applications')}
        </Button>
        {/* Заявки тренеров — вкладкой того же раздела (ADR-059). */}
        <Button href="/cabinet/applications?tab=coaches" sx={{ minHeight: 44 }}>
          {coaches > 0
            ? fill(t('cabinet.admin.coachesNew'), { count: String(coaches) })
            : t('cabinet.admin.coaches')}
        </Button>
        <Button href="/cabinet/content" sx={{ minHeight: 44 }}>
          {t('page.content.title')}
        </Button>
        <Button href="/cabinet/places" sx={{ minHeight: 44 }}>
          {t('page.places.title')}
        </Button>
        <Button href="/cabinet/catalog" sx={{ minHeight: 44 }}>
          {t('page.catalog.title')}
        </Button>
      </Box>
    </Surface>
  );
}
