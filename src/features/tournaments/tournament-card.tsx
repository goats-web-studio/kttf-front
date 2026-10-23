import type { ClubView, TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ChevronRight, MapPin } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatDateParts, formatMoney, useLocale, useT } from '@/common/i18n';
import { usePlaceName } from '@/features/places/place-name';

import { TOURNAMENT_LEVEL_KEYS } from './labels';
import StatusBadge from './status-badge';

interface TournamentCardProps {
  readonly tournament: TournamentView;
  /** Из справочника клубов; до его ответа строка клуба просто пуста. */
  readonly club: ClubView | undefined;
}

/**
 * Турнир в календаре — docs/07-design-system.md, 5.2, `TournamentCard`.
 *
 * Слева дата плашкой: календарь пробегают глазами по дням, и число набрано
 * крупно — это якорь карточки. Справа то, что решает «идти или
 * нет»: название, клуб с городом, состояние, уровень и взнос.
 *
 * Вся карточка — одна ссылка (`CardActionArea` с `href`): на телефоне
 * попадать пальцем именно в название не нужно. Доступное имя ссылки —
 * название турнира, остальное читается как описание. Под курсором карточка
 * приподнимается — тень, а не сдвиг: раскладка не прыгает.
 */
export default function TournamentCard({ tournament, club }: TournamentCardProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const locale = useLocale();
  const date = formatDateParts(tournament.startsAt, locale);
  const titleId = `tournament-${tournament.id}`;
  const live = tournament.status === 'RUNNING';

  return (
    <Paper
      variant="outlined"
      sx={{
        height: '100%',
        transition:
          'box-shadow var(--dur-base) var(--ease), border-color var(--dur-base) var(--ease)',
        '&:hover': { boxShadow: 'var(--shadow-card-hover)', borderColor: 'var(--line-strong)' },
      }}
    >
      <CardActionArea
        href={`/tournaments/${tournament.id}`}
        aria-labelledby={titleId}
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 2, sm: 2.5 },
          p: { xs: 2, sm: 2.5 },
          '&:hover .tournament-card-arrow': { color: 'text.primary', transform: 'translateX(2px)' },
        }}
      >
        <Box
          component="time"
          dateTime={tournament.startsAt}
          sx={{
            alignSelf: 'stretch',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: { xs: 60, sm: 68 },
            flexShrink: 0,
            py: 1,
            borderRadius: 3,
            // Идущий турнир — единственная плашка в фирменном цвете на экране.
            bgcolor: live ? 'var(--red-600)' : 'var(--paper-sunken)',
            color: live ? '#ffffff' : 'text.primary',
          }}
        >
          <Typography
            component="span"
            sx={{
              fontWeight: 700,
              fontSize: 28,
              lineHeight: '30px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {date.day}
          </Typography>
          {/* Месяц и время — цветом, а не прозрачностью: полупрозрачные
              чернила на подложке давали 4.3:1, ниже нормы для текста. */}
          <Typography
            variant="caption"
            sx={{ fontWeight: 600, color: live ? 'inherit' : 'var(--ink-700)' }}
          >
            {date.month}
            {date.year !== undefined && ` ${date.year}`}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontVariantNumeric: 'tabular-nums',
              color: live ? 'inherit' : 'var(--ink-500)',
              opacity: live ? 0.9 : 1,
            }}
          >
            {date.time}
          </Typography>
        </Box>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography id={titleId} variant="h3" component="h2" sx={{ lineHeight: '24px' }}>
            {tournament.name}
          </Typography>
          {club !== undefined && (
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <MapPin size={14} aria-hidden style={{ flexShrink: 0 }} />
              {club.name} · {placeName(club.city)}
            </Typography>
          )}
          <Stack
            direction="row"
            useFlexGap
            spacing={1}
            sx={{ mt: 1.25, flexWrap: 'wrap', alignItems: 'center', color: 'text.secondary' }}
          >
            <StatusBadge status={tournament.status} />
            <Chip>{t(TOURNAMENT_LEVEL_KEYS[tournament.level])}</Chip>
            <Chip>
              {tournament.entryFee === 0
                ? t('tournament.entryFee.free')
                : formatMoney(tournament.entryFee, locale)}
            </Chip>
          </Stack>
        </Box>

        <Box
          className="tournament-card-arrow"
          aria-hidden
          sx={{
            display: { xs: 'none', sm: 'flex' },
            color: 'var(--ink-400)',
            transition: 'transform var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)',
          }}
        >
          <ChevronRight size={20} />
        </Box>
      </CardActionArea>
    </Paper>
  );
}

/** Тихая пилюля факта рядом со статусом: уровень, взнос. */
function Chip({ children }: { readonly children: ReactNode }): ReactNode {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        height: 24,
        px: 1.25,
        borderRadius: 999,
        border: 1,
        borderColor: 'divider',
        fontSize: 12,
        fontWeight: 500,
        color: 'text.secondary',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}
