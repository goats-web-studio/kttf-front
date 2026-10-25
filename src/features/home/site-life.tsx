import type { DuelItemView, ForumTopicItem } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, MessageSquare } from 'lucide-react';
import type { ReactNode } from 'react';

import { formatDateTime, useLocale, useT, type MessageKey } from '@/common/i18n';
import RatingValue from '@/common/ui/rating-value';
import Surface from '@/common/ui/surface';
import { duelsBoardQuery } from '@/features/duels/queries';
import { topicHref } from '@/features/forum/labels';
import { forumTopicsQuery } from '@/features/forum/queries';
import { Birthdays } from '@/features/forum/sidebar';

/** Тем в «Жизни на сайте» — как у RTTF, экран-полтора колонки. */
const ACTIVE_TOPICS = 8;
/** Открытых вызовов и сыгранных дуэлей. */
const DUELS = 4;

const rowSx = {
  listStyle: 'none',
  px: 2,
  py: 1,
  borderTop: '1px solid var(--line)',
} as const;

/**
 * Правая колонка главной — «жизнь на сайте», как у RTTF (ADR-071): свежее на
 * форуме, дуэли, дни рождения и два коротких приглашения — клубам и
 * тренерам. Новости клубов и тренеров — в ленте (ADR-073). Пустые блоки не
 * выводятся.
 */
export default function SiteLife(): ReactNode {
  return (
    <Box sx={{ display: 'grid', gap: 3, alignContent: 'start' }}>
      <ForumActivity />
      <Duels />
      <Birthdays />
      <PartnerBanner
        title="home.banner.club.title"
        text="home.banner.club.text"
        action="home.banner.club.action"
        href="/clubs#join"
      />
      <PartnerBanner
        title="home.banner.coach.title"
        text="home.banner.coach.text"
        action="home.banner.coach.action"
        href="/trainings?view=coaches#join"
      />
    </Box>
  );
}

function ForumActivity(): ReactNode {
  const t = useT();
  const topics = useQuery(forumTopicsQuery({ sort: 'ACTIVE', limit: ACTIVE_TOPICS }));

  if ((topics.data?.items.length ?? 0) === 0) return null;

  return (
    <Surface
      flush
      title={t('home.life.title')}
      action={
        <Link href="/forum" variant="body2" underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {t('home.forum.all')}
        </Link>
      }
    >
      <Box component="ul" sx={{ m: 0, p: 0 }} data-home-life>
        {topics.data?.items.map((topic) => (
          <TopicLine key={topic.id} topic={topic} tag={topic.section.title} />
        ))}
      </Box>
    </Surface>
  );
}

function TopicLine({
  topic,
  tag,
}: {
  readonly topic: ForumTopicItem;
  readonly tag: string | null;
}): ReactNode {
  const locale = useLocale();
  const replies = Math.max(0, topic.postsCount - 1);

  return (
    <Box component="li" sx={rowSx}>
      {tag !== null && (
        <Typography
          component="span"
          sx={{
            display: 'block',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {tag}
        </Typography>
      )}
      <Link
        href={topicHref(topic.id)}
        underline="hover"
        color="text.primary"
        sx={{ display: 'block', fontWeight: 600, fontSize: 14, lineHeight: 1.35 }}
      >
        {topic.title}
      </Link>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mt: 0.25,
          fontSize: 12,
          color: 'text.secondary',
          minWidth: 0,
        }}
      >
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
          <MessageSquare size={12} aria-hidden />
          {replies}
        </Box>
        <Box
          component="span"
          sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {topic.lastAuthorName !== null && `${topic.lastAuthorName} · `}
          {formatDateTime(topic.lastPostAt, locale)}
        </Box>
      </Box>
    </Box>
  );
}

/**
 * Дуэли: открытые вызовы — на них можно откликнуться, — а если их нет,
 * недавно сыгранные. Одна строка — кто, рейтинг, где и когда.
 */
function Duels(): ReactNode {
  const t = useT();
  const open = useQuery(duelsBoardQuery({ scope: 'open', page: 1, limit: DUELS }));
  const recent = useQuery(duelsBoardQuery({ scope: 'recent', page: 1, limit: DUELS }));
  const openItems = open.data?.items ?? [];
  const recentItems = recent.data?.items ?? [];

  if (openItems.length + recentItems.length === 0) return null;

  return (
    <Surface
      flush
      title={t('home.duels.title')}
      action={
        <Link href="/duels" variant="body2" underline="hover" sx={{ whiteSpace: 'nowrap' }}>
          {t('home.duels.all')}
        </Link>
      }
    >
      <Box component="ul" sx={{ m: 0, p: 0 }} data-home-duels>
        {(openItems.length > 0 ? openItems : recentItems).map((duel) => (
          <DuelLine key={duel.id} duel={duel} />
        ))}
      </Box>
    </Surface>
  );
}

function DuelLine({ duel }: { readonly duel: DuelItemView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const when = duel.startsAt ?? duel.slots[0]?.startsAt ?? null;
  const place = duel.venue.club?.name ?? duel.venue.venueName;
  const result = duel.result;

  return (
    <Box component="li" sx={rowSx}>
      <Typography
        component="span"
        sx={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'text.secondary',
        }}
      >
        {t(duel.kind === 'DUEL' ? 'home.duels.kind.DUEL' : 'home.duels.kind.SPARRING')}
      </Typography>
      <Link
        href={`/duels/${duel.id}`}
        underline="hover"
        color="text.primary"
        sx={{ display: 'flex', alignItems: 'baseline', gap: 0.75, fontWeight: 600, fontSize: 14 }}
      >
        <span>{duel.author.name}</span>
        <RatingValue value={duel.author.rating} animate={false} sx={{ fontSize: 12 }} />
        {duel.opponent !== null && (
          <>
            <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
              {result === null
                ? '—'
                : result.winnerId === duel.author.id
                  ? `${String(result.winnerSets)}:${String(result.loserSets)}`
                  : `${String(result.loserSets)}:${String(result.winnerSets)}`}
            </Box>
            <span>{duel.opponent.name}</span>
          </>
        )}
      </Link>
      {(place !== null || when !== null) && (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.25 }}>
          {[place, when === null ? null : formatDateTime(when, locale)]
            .filter((part) => part !== null)
            .join(' · ')}
        </Typography>
      )}
    </Box>
  );
}

/**
 * Приглашение клубу или тренеру — коротко, со ссылкой на подробный блок
 * внизу страницы клубов или тренеров. Подробности жили на главной и
 * занимали треть её высоты; здесь — одна карточка.
 */
function PartnerBanner({
  title,
  text,
  action,
  href,
}: {
  readonly title: MessageKey;
  readonly text: MessageKey;
  readonly action: MessageKey;
  readonly href: string;
}): ReactNode {
  const t = useT();

  return (
    <Box
      component="aside"
      sx={{
        p: 2.5,
        borderRadius: 3,
        color: 'var(--paper)',
        bgcolor: 'var(--ink-900)',
        backgroundImage:
          'radial-gradient(120% 90% at 100% 0%, rgb(224 52 44 / 0.45), transparent 60%)',
        display: 'grid',
        gap: 1,
      }}
    >
      <Typography variant="h3" component="h2" sx={{ color: 'inherit' }}>
        {t(title)}
      </Typography>
      <Typography variant="body2" sx={{ color: 'var(--ink-300)' }}>
        {t(text)}
      </Typography>
      <Link
        href={href}
        underline="none"
        sx={{
          mt: 0.5,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          minHeight: 44,
          fontWeight: 700,
          color: 'var(--paper)',
          '&:hover': { color: 'var(--red-200)' },
        }}
      >
        {t(action)}
        <ArrowRight size={16} aria-hidden />
      </Link>
    </Box>
  );
}
