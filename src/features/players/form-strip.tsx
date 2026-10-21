import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { fill, formatDate, useLocale, useT } from '@/common/i18n';

import { playerName } from './player-name';
import { playerTournamentsQuery } from './queries';
import { recentForm, type FormMatch } from './recent-form';

/**
 * «Форма» — последние десять встреч точками в шапке профиля: видно, идёт
 * игрок в гору или под горку, ещё до графика.
 *
 * Победа — залитый кружок, поражение — пустое кольцо: форма, а не только
 * цвет, несёт смысл (07, 9). Свежая встреча справа, как время на графике.
 * Подсказка — соперник, счёт, турнир и дата; касание показывает её сразу.
 *
 * Запрос — тот же, что у «Результатов» ниже: второй раз на сервер не идёт.
 * Нет сыгранных встреч — нет и строки.
 */
export default function FormStrip({ playerId }: { readonly playerId: string }): ReactNode {
  const t = useT();
  const results = useInfiniteQuery(playerTournamentsQuery(playerId));
  const form = recentForm(results.data?.pages[0]?.items ?? []);

  if (form.length === 0) return null;

  const wins = form.filter((entry) => entry.match.won).length;

  return (
    <Box data-form-strip sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {t('profile.form.title')}
      </Typography>
      <Box
        component="ol"
        aria-label={fill(t('profile.form.label'), {
          wins: String(wins),
          count: String(form.length),
        })}
        sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', mx: -0.5 }}
      >
        {[...form].reverse().map((entry) => (
          <Dot key={entry.match.matchId} entry={entry} />
        ))}
      </Box>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontVariantNumeric: 'tabular-nums' }}
        aria-hidden
      >
        {`${String(wins)}–${String(form.length - wins)}`}
      </Typography>
    </Box>
  );
}

/** Точка встречи. Зона касания 28px вокруг кружка 14px — точки стоят плотно. */
function Dot({ entry }: { readonly entry: FormMatch }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const { match, tournament } = entry;
  const opponent =
    match.opponent === null ? t('player.matches.noOpponent') : playerName(match.opponent);
  const score = `${String(match.setsFor)}:${String(match.setsAgainst)}`;
  const result = t(match.won ? 'profile.form.win' : 'profile.form.loss');
  const date = formatDate(match.startedAt ?? match.playedAt ?? tournament.startsAt, locale);

  return (
    <Tooltip
      arrow
      enterTouchDelay={0}
      title={
        <>
          <Box component="span" sx={{ display: 'block', fontWeight: 600 }}>
            {`${result} · ${opponent} · ${score}`}
          </Box>
          {`${tournament.name}, ${date}`}
        </>
      }
    >
      <Box
        component="li"
        tabIndex={0}
        data-form={match.won ? 'win' : 'loss'}
        aria-label={`${result}: ${opponent}, ${score}, ${tournament.name}, ${date}`}
        sx={{
          width: 28,
          height: 28,
          display: 'grid',
          placeItems: 'center',
          borderRadius: '50%',
          cursor: 'default',
          '&:focus-visible': { outline: '2px solid var(--red-600)', outlineOffset: '-2px' },
        }}
      >
        <Box
          component="span"
          aria-hidden
          sx={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            ...(match.won
              ? { bgcolor: 'var(--ok)' }
              : { border: '2px solid var(--red-500)', bgcolor: 'transparent' }),
          }}
        />
      </Box>
    </Tooltip>
  );
}
