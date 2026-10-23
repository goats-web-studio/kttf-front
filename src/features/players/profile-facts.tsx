import type { PlayerProfileView, PlayerSummaryView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, formatCount, formatDate, useLocale, useT, type MessageKey } from '@/common/i18n';
import { sinceYear, tenureYears } from '@/features/coaches/staff/staff-model';

import { AwardsByClub, MedalTally } from './awards';
import EquipmentList from './equipment-list';
import { hasEquipment } from './equipment-value';

interface ProfileFactsProps {
  readonly player: PlayerProfileView;
  /** Сводка за всё время; пока не пришла, «Достижения» не рисуются. */
  readonly summary: PlayerSummaryView | undefined;
}

/**
 * «Кто он» — три карточки сразу под шапкой (ADR-060): чем
 * играет, достижения и об игроке. Раньше это была анкета строками в шапке
 * и награды отдельной широкой карточкой внизу; теперь человек раскрывается
 * до истории игры, а история — график, победы, результаты — идёт ниже.
 *
 * Пустая карточка не выводится (ADR-042), остальные делят ширину поровну.
 * На телефоне — одна колонка в том же порядке.
 */
export default function ProfileFacts({ player, summary }: ProfileFactsProps): ReactNode {
  const t = useT();
  const cards = [
    hasEquipment(player) ? (
      <FactCard key="equipment" title={t('coach.equipment.title')} data="equipment">
        <EquipmentList player={player} thumb={40} />
      </FactCard>
    ) : null,
    summary === undefined ? null : (
      <FactCard key="achievements" title={t('profile.facts.achievements')} data="achievements">
        <Achievements summary={summary} />
      </FactCard>
    ),
    <FactCard key="about" title={t('profile.facts.about')} data="about">
      <About player={player} />
    </FactCard>,
  ].filter((card) => card !== null);

  return (
    <Box
      data-profile-facts
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: {
          xs: 'minmax(0, 1fr)',
          md: `repeat(${String(cards.length)}, minmax(0, 1fr))`,
        },
        alignItems: 'start',
      }}
    >
      {cards}
    </Box>
  );
}

function FactCard({
  title,
  data,
  children,
}: {
  readonly title: string;
  readonly data: string;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Paper
      variant="outlined"
      component="section"
      data-fact={data}
      sx={{ p: { xs: 2.5, sm: 3 }, height: { md: '100%' } }}
    >
      <Typography variant="h3" component="h2" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Paper>
  );
}

/**
 * «Достижения» — за всё время: медали крупно, затем турниры, победы,
 * первый турнир и любимый зал, ниже — медали по клубам с подсказками.
 */
function Achievements({ summary }: { readonly summary: PlayerSummaryView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const games = summary.wins + summary.losses;

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <MedalTally awards={summary.awards} />
      <Facts
        columns={2}
        rows={[
          ['profile.stats.tournaments', formatCount(summary.tournaments, locale)],
          [
            'profile.facts.wins',
            games === 0
              ? null
              : fill(t('profile.facts.winsOf'), {
                  wins: formatCount(summary.wins, locale),
                  games: formatCount(games, locale),
                  percent: String(Math.round((summary.wins / games) * 100)),
                }),
          ],
          [
            'profile.stats.first',
            summary.firstTournament === null ? null : (
              <Link href={`/tournaments/${summary.firstTournament.id}`} color="inherit">
                {formatDate(summary.firstTournament.startsAt, locale)}
              </Link>
            ),
          ],
          [
            'profile.stats.favorite',
            summary.favoriteClub === null ? null : (
              <Link href={`/clubs/${summary.favoriteClub.id}`} color="inherit">
                {summary.favoriteClub.name}
              </Link>
            ),
          ],
        ]}
      />
      <AwardsByClub awards={summary.awards} />
    </Box>
  );
}

/** «Об игроке» — тренер с историей, «о себе» и с какого времени на сайте. */
function About({ player }: { readonly player: PlayerProfileView }): ReactNode {
  const t = useT();
  const locale = useLocale();

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      {player.bio !== null && player.bio !== '' && (
        <Typography
          sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', fontWeight: 500 }}
          data-bio
        >
          {player.bio}
        </Typography>
      )}
      <Facts
        rows={[
          ['player.form.coach', coach(player, t)],
          ['profile.coachHistory', coachHistory(player)],
          [
            'profile.since',
            player.lastSeenAt === null
              ? formatDate(player.createdAt, locale)
              : `${formatDate(player.createdAt, locale)} ${fill(t('profile.lastSeen'), {
                  date: formatDate(player.lastSeenAt, locale),
                })}`,
          ],
        ]}
      />
    </Box>
  );
}

/** Факты «подпись над значением»: в узкой карточке две колонки не помещаются. */
function Facts({
  rows,
  columns = 1,
}: {
  readonly rows: readonly (readonly [MessageKey, ReactNode])[];
  /** Короткие значения — числа, даты — встают в две колонки. */
  readonly columns?: 1 | 2;
}): ReactNode {
  const t = useT();

  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: 'grid',
        gridTemplateColumns: `repeat(${String(columns)}, minmax(0, 1fr))`,
        columnGap: 2,
        rowGap: 1.5,
        '& dt': { typography: 'caption', color: 'text.secondary', fontWeight: 500 },
        '& dd': {
          m: 0,
          fontWeight: 600,
          overflowWrap: 'anywhere',
          fontVariantNumeric: 'tabular-nums',
        },
      }}
    >
      {rows.map(([label, value]) =>
        value === null || value === undefined || value === '' ? null : (
          <Box key={label}>
            <dt>{t(label)}</dt>
            <dd>{value}</dd>
          </Box>
        ),
      )}
    </Box>
  );
}

/**
 * Тренер: со страницей на KTTF — ссылкой на неё (ADR-059), иначе именем,
 * как в анкете (ADR-035); «с 2024» — из истории тренера (T2.1).
 */
function coach(player: PlayerProfileView, t: (key: MessageKey) => string): ReactNode {
  if (player.coachName === null) return null;

  const since =
    player.coachSince === null
      ? null
      : fill(t('profile.coachSince'), { year: sinceYear(player.coachSince) });

  return (
    <>
      {player.coachSlug === null ? (
        player.coachName
      ) : (
        <Link href={`/coaches/${player.coachSlug}`}>{player.coachName}</Link>
      )}
      {since !== null && (
        <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
          {` ${since}`}
        </Box>
      )}
    </>
  );
}

/** «Раньше: Y, 2020–2024; Z, 2018–2020» — прежние тренеры, последние первыми. */
function coachHistory(player: PlayerProfileView): ReactNode {
  if (player.coachHistory.length === 0) return null;

  return (
    <span data-coach-history>
      {player.coachHistory.map((tenure, index) => (
        <span key={`${tenure.coachPlayerId}-${tenure.from}`}>
          {index > 0 && '; '}
          {tenure.slug === null ? (
            tenure.name
          ) : (
            <Link href={`/coaches/${tenure.slug}`}>{tenure.name}</Link>
          )}
          {`, ${tenureYears(tenure)}`}
        </span>
      ))}
    </span>
  );
}
