import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Cake, MessagesSquare, ScrollText, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatCount, useLocale, useT } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import Surface from '@/common/ui/surface';

import { FEED_HREF, RULES_HREF, splitName, topicHref } from './labels';
import { forumBirthdaysQuery, forumOnlineQuery, forumTopicsQuery } from './queries';

/** Сколько тем в «Обсуждение турниров». */
const TOURNAMENT_TOPICS = 5;

const rowSx = {
  listStyle: 'none',
  px: 2.5,
  py: 1.25,
  borderTop: '1px solid var(--line)',
  '&:first-of-type': { borderTop: 0 },
} as const;

/**
 * Боковая колонка форума — ADR-067 §6, как у RTTF: сколько игроков на сайте,
 * ссылки на ленту и правила, «Обсуждение турниров» и дни рождения. Пустые
 * блоки не выводятся.
 */
export default function ForumSidebar(): ReactNode {
  return (
    <Box sx={{ display: 'grid', gap: 3, alignContent: 'start' }}>
      <OnlineAndLinks />
      <TournamentTalk />
      <Birthdays />
    </Box>
  );
}

function OnlineAndLinks(): ReactNode {
  const t = useT();
  const locale = useLocale();
  const online = useQuery(forumOnlineQuery);

  return (
    <Surface>
      <Box sx={{ display: 'grid', gap: 1.25 }}>
        {online.data !== undefined && (
          <Typography
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
            data-forum-online-count
          >
            <Box
              component="span"
              sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: 'var(--ok)' }}
            />
            <Users size={18} aria-hidden />
            {fill(t('forum.side.online'), { count: formatCount(online.data.players, locale) })}
          </Typography>
        )}
        <Link
          href={FEED_HREF}
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 32 }}
        >
          <MessagesSquare size={18} aria-hidden />
          {t('forum.feed.title')}
        </Link>
        <Link
          href={RULES_HREF}
          underline="hover"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 32 }}
        >
          <ScrollText size={18} aria-hidden />
          {t('forum.rules.title')}
        </Link>
      </Box>
    </Surface>
  );
}

function TournamentTalk(): ReactNode {
  const t = useT();
  const topics = useQuery(
    forumTopicsQuery({ subjectType: 'TOURNAMENT', limit: TOURNAMENT_TOPICS }),
  );

  if ((topics.data?.items.length ?? 0) === 0) return null;

  return (
    <Surface title={t('forum.side.tournaments')} flush component="section">
      <Box component="ul" sx={{ m: 0, p: 0 }} data-forum-tournament-talk>
        {topics.data?.items.map((topic) => (
          <Box component="li" key={topic.id} sx={rowSx}>
            <Link
              href={topicHref(topic.id)}
              underline="hover"
              color="text.primary"
              sx={{ fontWeight: 600 }}
            >
              {topic.title}
            </Link>
            <Typography variant="body2" color="text.secondary">
              {fill(t('forum.topic.replies'), { count: String(Math.max(0, topic.postsCount - 1)) })}
              {topic.lastAuthorName !== null && ` · ${topic.lastAuthorName}`}
            </Typography>
          </Box>
        ))}
      </Box>
    </Surface>
  );
}

export function Birthdays(): ReactNode {
  const t = useT();
  const birthdays = useQuery(forumBirthdaysQuery);

  if ((birthdays.data?.length ?? 0) === 0) return null;

  return (
    <Surface title={t('forum.side.birthdays')} flush component="section">
      <Box component="ul" sx={{ m: 0, p: 0 }} data-forum-birthdays>
        {birthdays.data?.map((player) => {
          const { lastName, firstName } = splitName(player.name);

          return (
            <Box
              component="li"
              key={player.playerId}
              sx={{ ...rowSx, display: 'flex', alignItems: 'center', gap: 1.5 }}
            >
              <PlayerAvatar
                lastName={lastName}
                firstName={firstName}
                photoUrl={player.photoUrl}
                size="sm"
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Link
                  href={`/players/${player.playerId}`}
                  underline="hover"
                  color="text.primary"
                  sx={{ fontWeight: 600 }}
                >
                  {player.name}
                </Link>
                <Typography variant="body2" color="text.secondary">
                  {fill(t('forum.side.age'), { age: String(player.age) })}
                </Typography>
              </Box>
              <Box sx={{ color: 'var(--red-500)', display: 'flex' }}>
                <Cake size={18} aria-hidden />
              </Box>
            </Box>
          );
        })}
      </Box>
    </Surface>
  );
}
