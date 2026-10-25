import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import {
  CalendarCheck,
  Dumbbell,
  Heart,
  NotebookPen,
  Swords,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';
import RouterLink from '@/common/ui/router-link';
import Surface from '@/common/ui/surface';

const HIDDEN_KEY = 'kttf.cabinet.guide.hidden';

interface Stop {
  readonly href: string;
  readonly title: MessageKey;
  readonly text: MessageKey;
  readonly icon: LucideIcon;
}

function readHidden(): boolean {
  try {
    return window.localStorage.getItem(HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Мини-гид кабинета — ADR-075: всё, что у игрока есть в системе, одним
 * взглядом и одним нажатием. Прочитал — закрыл: меню слева остаётся, гид
 * больше не мешает. Помнится на этом устройстве.
 */
export default function CabinetGuide({ playerId }: { readonly playerId: string }): ReactNode {
  const t = useT();
  const [hidden, setHidden] = useState(readHidden);

  if (hidden) return null;

  const stops: readonly Stop[] = [
    {
      href: '/cabinet/tournaments',
      title: 'cabinet.nav.tournaments',
      text: 'cabinet.guide.tournaments',
      icon: CalendarCheck,
    },
    {
      href: '/cabinet/trainings',
      title: 'cabinet.nav.trainings',
      text: 'cabinet.guide.trainings',
      icon: Dumbbell,
    },
    {
      href: '/cabinet/duels',
      title: 'cabinet.nav.duels',
      text: 'cabinet.guide.duels',
      icon: Swords,
    },
    {
      href: '/cabinet/posts',
      title: 'cabinet.nav.posts',
      text: 'cabinet.guide.posts',
      icon: NotebookPen,
    },
    {
      href: '/cabinet/follows',
      title: 'cabinet.nav.follows',
      text: 'cabinet.guide.follows',
      icon: Heart,
    },
    {
      href: `/players/${playerId}`,
      title: 'nav.myProfile',
      text: 'cabinet.guide.profile',
      icon: User,
    },
  ];

  return (
    <Surface
      title={t('cabinet.guide.title')}
      subtitle={t('cabinet.guide.lead')}
      action={
        <IconButton
          aria-label={t('cabinet.guide.close')}
          onClick={() => {
            try {
              window.localStorage.setItem(HIDDEN_KEY, '1');
            } catch {
              // Приватный режим: закроется до перезагрузки.
            }
            setHidden(true);
          }}
        >
          <X size={18} aria-hidden />
        </IconButton>
      }
    >
      <Box
        data-cabinet-guide
        sx={{
          display: 'grid',
          gap: 1,
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
        }}
      >
        {stops.map((stop) => {
          const Icon = stop.icon;

          return (
            <ButtonBase
              key={stop.href}
              LinkComponent={RouterLink}
              href={stop.href}
              sx={{
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 1.5,
                borderRadius: 2,
                textAlign: 'left',
                bgcolor: 'var(--paper-sunken)',
                '&:hover': { bgcolor: 'var(--paper-hover)' },
              }}
            >
              <Icon size={20} aria-hidden style={{ flexShrink: 0, color: 'var(--red-600)' }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 700, typography: 'body2' }}>
                  {t(stop.title)}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="p">
                  {t(stop.text)}
                </Typography>
              </Box>
            </ButtonBase>
          );
        })}
      </Box>
    </Surface>
  );
}
