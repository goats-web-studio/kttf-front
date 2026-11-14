import type { FormatConfig, TournamentView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  CalendarDays,
  Crown,
  LayoutGrid,
  ListChecks,
  Network,
  Star,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatDateTime, formatMoney, useLocale, useT, type MessageKey } from '@/common/i18n';
import { Count } from '@/common/ui/motion';
import StatTile from '@/common/ui/stat-tile';
import PlayerLink from '@/features/players/player-link';

import { TOURNAMENT_LEVEL_KEYS } from './labels';
import StatusBadge from './status-badge';

/** Сводка по ходу турнира — когда результаты уже есть. */
export interface TournamentFacts {
  /** Средний рейтинг поля, целым. */
  readonly average: number | null;
  readonly progress: { readonly played: number; readonly total: number };
  readonly champion: { readonly id: string; readonly name: string } | null;
}

interface TournamentSummaryProps {
  readonly tournament: TournamentView;
  /** `null` — справочник клубов ещё не пришёл либо клуб из него удалён. */
  readonly clubName: string | null;
  /** Сводка по ходу; без неё шапка — только условия турнира. */
  readonly facts?: TournamentFacts | null;
}

/**
 * Шапка страницы турнира: то, что человек ищет глазами первым (ТЗ 4.2).
 *
 * Карточка, а не строчки «Подпись — значение»: состояние пилюлей над
 * названием, а «когда, сколько, какой, почём» — плитками, которые читаются
 * с одного взгляда и на телефоне, и на экране зала. Вторым рядом — как
 * играется и как идёт: формат, сила поля, сыгранные встречи, столы. Когда
 * турнир сыгран — победитель над плитками.
 */
export default function TournamentSummary({
  tournament,
  clubName,
  facts = null,
}: TournamentSummaryProps): ReactNode {
  const t = useT();
  const locale = useLocale();

  const fee =
    tournament.entryFee === 0
      ? t('tournament.entryFee.free')
      : formatMoney(tournament.entryFee, locale);
  const level = t(TOURNAMENT_LEVEL_KEYS[tournament.level]);
  const average = facts?.average == null ? '—' : `★${String(facts.average)}`;
  const progress =
    facts == null
      ? '—'
      : fill(t('results.facts.progress'), {
          played: String(facts.progress.played),
          total: String(facts.progress.total),
        });

  return (
    <Paper variant="outlined" component="header" sx={{ p: { xs: 2.5, sm: 4 } }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <StatusBadge status={tournament.status} />
        {clubName !== null && (
          <Link href={`/clubs/${tournament.clubId}`} variant="body2" sx={{ fontWeight: 500 }}>
            {clubName}
          </Link>
        )}
      </Stack>

      <Typography
        variant="h1"
        sx={{ mt: 1.5, fontSize: { xs: 30, sm: 40 }, lineHeight: { xs: '34px', sm: '44px' } }}
      >
        {tournament.name}
      </Typography>

      {facts?.champion != null && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ mt: 1.5, alignItems: 'center', color: 'text.secondary' }}
        >
          <Crown size={18} aria-hidden color="var(--warn)" />
          <Typography variant="body1">
            {t('results.finish.champion')}:{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              <PlayerLink id={facts.champion.id}>{facts.champion.name}</PlayerLink>
            </Box>
          </Typography>
        </Stack>
      )}

      <Box
        sx={{
          mt: 3,
          display: 'grid',
          gap: 1.5,
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
        }}
      >
        <StatTile
          icon={CalendarDays}
          label={t('tournament.startsAt')}
          value={formatDateTime(tournament.startsAt, locale)}
        />
        <StatTile
          icon={Users}
          label={t('tournament.participants')}
          value={<Count value={tournament.participantCount} />}
        />
        <StatTile icon={Wallet} label={t('tournament.entryFee')} value={fee} />
        <StatTile
          icon={Network}
          label={t('results.facts.format')}
          value={formatLine(tournament.formatConfig, t)}
        />
        {/* Второй ряд — справочный. На телефоне он строкой ниже: восемь
            плиток занимали весь первый экран, и до итогов надо было листать. */}
        <Box sx={SECONDARY}>
          <StatTile icon={Trophy} label={t('tournament.level')} value={level} />
        </Box>
        <Box sx={SECONDARY}>
          <StatTile icon={Star} label={t('results.facts.average')} value={average} />
        </Box>
        <Box sx={SECONDARY}>
          <StatTile icon={ListChecks} label={t('results.facts.matches')} value={progress} />
        </Box>
        <Box sx={SECONDARY}>
          <StatTile
            icon={LayoutGrid}
            label={t('tournament.form.tableCount')}
            value={tournament.tableCount}
          />
        </Box>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ display: { xs: 'block', sm: 'none' }, mt: 1.5 }}
      >
        {[
          `${t('tournament.level')}: ${level}`,
          `${t('results.facts.average')}: ${average}`,
          `${t('results.facts.matches')}: ${progress}`,
          `${t('tournament.form.tableCount')}: ${String(tournament.tableCount)}`,
        ].join(' · ')}
      </Typography>

      {tournament.prizeInfo !== null && tournament.prizeInfo !== '' && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
          <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {t('results.facts.prize')}:
          </Box>{' '}
          {tournament.prizeInfo}
        </Typography>
      )}
    </Paper>
  );
}

/** Справочная плитка: с 600px — в сетке, на телефоне — в строке под ней. */
const SECONDARY = { display: { xs: 'none', sm: 'block' } } as const;

const FORMAT_KEYS: Readonly<Record<FormatConfig['type'], MessageKey>> = {
  ROUND_ROBIN: 'tournament.format.ROUND_ROBIN',
  KNOCKOUT: 'tournament.format.KNOCKOUT',
  GROUPS_KNOCKOUT: 'tournament.format.GROUPS_KNOCKOUT',
  GROUPS_FINAL_GROUPS: 'tournament.format.GROUPS_FINAL_GROUPS',
};

/** «Группы и сетка · выходят по 2 · до 3 побед» — схема одной строкой. */
function formatLine(config: FormatConfig, t: (key: MessageKey) => string): string {
  const length = (sets: number): string => fill(t('results.facts.length'), { n: String(sets) });
  const parts = [t(FORMAT_KEYS[config.type])];

  switch (config.type) {
    case 'ROUND_ROBIN':
    case 'KNOCKOUT':
      parts.push(length(config.setsToWin));
      break;
    case 'GROUPS_KNOCKOUT':
      parts.push(
        fill(t('results.facts.advance'), { n: String(config.advancePerGroup) }),
        length(config.koSetsToWin),
      );
      break;
    case 'GROUPS_FINAL_GROUPS':
      parts.push(
        fill(t('results.facts.advance'), { n: String(config.advancePerGroup) }),
        length(config.setsToWin),
      );
      break;
  }

  return parts.join(' · ');
}
