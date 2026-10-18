import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { Newspaper, Trophy, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { fill, formatDate, useLocale, useT } from '@/common/i18n';
import { playerName } from '@/features/players/player-name';
import { tournamentResultsQuery } from '@/features/tournaments/queries';

import type { NewsItem } from './news';

/**
 * Лента новостей — ТЗ 9.5.
 *
 * Каждая запись — одна ссылка: на результаты турнира или на статью. Вид
 * записи подписан словом над заголовком («Итоги», «Новость»), а не цветом.
 */
export default function NewsFeed({ items }: { readonly items: readonly NewsItem[] }): ReactNode {
  return (
    <Paper variant="outlined" component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {items.map((item) => (
        <Box
          component="li"
          key={item.id}
          sx={{ borderTop: 1, borderColor: 'divider', '&:first-of-type': { borderTop: 0 } }}
        >
          {item.kind === 'result' ? <ResultEntry item={item} /> : <ArticleEntry item={item} />}
        </Box>
      ))}
    </Paper>
  );
}

function Entry({
  href,
  icon: Icon,
  kicker,
  date,
  title,
  children,
}: {
  readonly href: string;
  readonly icon: LucideIcon;
  readonly kicker: string;
  readonly date: string;
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  const locale = useLocale();

  return (
    <CardActionArea
      href={href}
      sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, p: { xs: 2, sm: 2.5 } }}
    >
      <Box
        aria-hidden
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: 3,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'var(--gold-50)',
          color: 'var(--gold-text)',
        }}
      >
        <Icon size={20} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
          {kicker} · <time dateTime={date}>{formatDate(date, locale)}</time>
        </Typography>
        <Typography variant="h3" component="h3" sx={{ mt: 0.25, lineHeight: '24px' }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
          {children}
        </Typography>
      </Box>
    </CardActionArea>
  );
}

/**
 * Итоги турнира. Победитель читается из результатов турнира отдельным
 * запросом: в списке турниров мест нет. Пока он в пути — заготовка строки,
 * а не пустота, чтобы запись не прыгала по высоте.
 */
function ResultEntry({
  item,
}: {
  readonly item: Extract<NewsItem, { kind: 'result' }>;
}): ReactNode {
  const t = useT();
  const results = useQuery(tournamentResultsQuery(item.tournament.id));
  const winner = results.data?.participants.find((participant) => participant.place === 1);

  return (
    <Entry
      href={`/tournaments/${item.tournament.id}`}
      icon={Trophy}
      kicker={t('home.news.kind.result')}
      date={item.date}
      title={fill(t('home.news.result.title'), { name: item.tournament.name })}
    >
      {results.isPending ? (
        <Skeleton width="40%" />
      ) : winner === undefined ? (
        t('home.news.result.noWinner')
      ) : (
        fill(t('home.news.result.winner'), { name: playerName(winner.player) })
      )}
      {item.tournament.status === 'RATED' && ` · ${t('home.news.result.rated')}`}
    </Entry>
  );
}

function ArticleEntry({
  item,
}: {
  readonly item: Extract<NewsItem, { kind: 'article' }>;
}): ReactNode {
  const t = useT();

  return (
    <Entry
      href={item.href}
      icon={Newspaper}
      kicker={t('home.news.kind.article')}
      date={item.date}
      title={item.title}
    >
      {item.summary}
    </Entry>
  );
}
