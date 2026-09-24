import Box from '@mui/material/Box';
import CardActionArea from '@mui/material/CardActionArea';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
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
    <Box
      component="ul"
      sx={{ listStyle: 'none', m: 0, p: 0, borderTop: 1, borderColor: 'divider' }}
    >
      {items.map((item) => (
        <Box component="li" key={item.id} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          {item.kind === 'result' ? <ResultEntry item={item} /> : <ArticleEntry item={item} />}
        </Box>
      ))}
    </Box>
  );
}

function Entry({
  href,
  kicker,
  date,
  title,
  children,
}: {
  readonly href: string;
  readonly kicker: string;
  readonly date: string;
  readonly title: string;
  readonly children: ReactNode;
}): ReactNode {
  const locale = useLocale();

  return (
    <CardActionArea href={href} sx={{ py: 2, px: { sm: 1.5 } }}>
      <Typography variant="caption" color="text.secondary">
        {kicker} · <time dateTime={date}>{formatDate(date, locale)}</time>
      </Typography>
      <Typography variant="h3" component="h3" sx={{ mt: 0.25 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
        {children}
      </Typography>
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
      kicker={t('home.news.kind.article')}
      date={item.date}
      title={item.title}
    >
      {item.summary}
    </Entry>
  );
}
