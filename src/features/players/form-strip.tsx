import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useInfiniteQuery, useQueries, useQuery } from '@tanstack/react-query';
import { useMemo, type CSSProperties, type ReactNode } from 'react';

import { fill, formatDate, formatDelta, useLocale, useT } from '@/common/i18n';
import { useMotionGroup } from '@/common/ui/motion-hooks';
import RouterLink from '@/common/ui/router-link';
import { duelQuery } from '@/features/duels/queries';

import { playerRatingHistoryQuery, playerTournamentsQuery } from './queries';
import { FORM_SIZE, recentForm, type DuelFormInput, type FormEntry } from './recent-form';

/**
 * «Форма» — последние десять встреч точками в шапке профиля: видно, идёт
 * игрок в гору или под горку, ещё до графика.
 *
 * Встречи турниров и рейтинговые дуэли — в одном ряду по времени. Дуэль —
 * скруглённым квадратом, встреча турнира — кружком: видно, где что, не
 * открывая подсказку.
 *
 * Победа — залитая точка, поражение — пустая: форма, а не только цвет,
 * несёт смысл (07, 9). Свежая встреча справа, как время на графике.
 * Подсказка — результат, счёт, соперник, изменение рейтинга, а строкой ниже
 * турнир или «Дуэль» и дата; касание показывает её сразу. Точка ведёт на
 * свой турнир или дуэль.
 *
 * Турниры — тот же запрос, что у «Результатов» ниже, история рейтинга — тот
 * же, что у графика: второй раз на сервер они не идут. Добирается только
 * счёт дуэлей — их в ряду не больше десяти.
 */
export default function FormStrip({ playerId }: { readonly playerId: string }): ReactNode {
  const t = useT();
  const results = useInfiniteQuery(playerTournamentsQuery(playerId));
  const history = useQuery(playerRatingHistoryQuery(playerId));

  // История — по возрастанию времени: свежие дуэли в конце.
  const duelPoints = useMemo(
    () =>
      (history.data?.points ?? [])
        .flatMap((point) => (point.duel === null ? [] : [{ ...point, duel: point.duel }]))
        .slice(-FORM_SIZE),
    [history.data],
  );
  const details = useQueries({
    queries: duelPoints.map((point) => duelQuery(point.duel.id)),
  });

  // Точки встают по одной слева направо — от старой встречи к свежей.
  const [motionRef, motion] = useMotionGroup();

  // Ряд собирается, когда известно всё: иначе дуэли вставали бы в него
  // по одной, и точки прыгали бы на глазах.
  const settled = !results.isPending && !history.isPending && details.every((q) => !q.isPending);
  const duels: DuelFormInput[] = duelPoints.map((point, index) => ({
    point,
    detail: details[index]?.data,
  }));
  const form = settled
    ? recentForm({ tournaments: results.data?.pages[0]?.items ?? [], duels, playerId })
    : [];

  if (form.length === 0) return null;

  const wins = form.filter((entry) => entry.won).length;
  const hasDuels = form.some((entry) => entry.source !== 'TOURNAMENT');

  return (
    <Box data-form-strip sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
        {t('profile.form.title')}
      </Typography>
      <Box
        component="ol"
        ref={motionRef}
        data-motion={motion}
        aria-label={fill(t('profile.form.label'), {
          wins: String(wins),
          count: String(form.length),
        })}
        sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', mx: -0.5 }}
      >
        {[...form].reverse().map((entry, index) => (
          <Dot key={entry.key} entry={entry} order={index} />
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
      {/* Подпись к квадрату — только когда дуэли в ряду есть. */}
      {hasDuels && (
        <Typography
          variant="caption"
          color="text.secondary"
          aria-hidden
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}
        >
          <Box
            component="span"
            sx={{ width: 10, height: 10, borderRadius: '2px', border: '2px solid currentColor' }}
          />
          {t('profile.form.duelLegend')}
        </Typography>
      )}
    </Box>
  );
}

/** Подпись места встречи: турнир или вид дуэли. */
function placeOf(entry: FormEntry, t: ReturnType<typeof useT>): string {
  if (entry.source === 'DUEL') return t('duel.kind.DUEL');
  if (entry.source === 'SPARRING') return t('duel.kind.SPARRING');
  return entry.tournamentName ?? '';
}

/** Точка встречи. Зона касания 28px вокруг точки 14px — точки стоят плотно. */
function Dot({ entry, order }: { readonly entry: FormEntry; readonly order: number }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const opponent = entry.opponent ?? t('player.matches.noOpponent');
  const result = t(entry.won ? 'profile.form.win' : 'profile.form.loss');
  const score = entry.score === null ? '' : ` ${String(entry.score[0])}:${String(entry.score[1])}`;
  const delta = entry.delta === null ? '' : ` · ${formatDelta(entry.delta)}`;
  const headline = `${result}${score} · ${opponent}${delta}`;
  const where = `${placeOf(entry, t)} · ${formatDate(entry.at, locale)}`;
  const duel = entry.source !== 'TOURNAMENT';

  return (
    <Box
      component="li"
      data-form={entry.won ? 'win' : 'loss'}
      data-source={entry.source.toLowerCase()}
    >
      <Tooltip
        arrow
        enterTouchDelay={0}
        title={
          <>
            <Box component="span" sx={{ display: 'block', fontWeight: 600 }}>
              {headline}
            </Box>
            {where}
          </>
        }
      >
        <Box
          component={RouterLink}
          href={entry.href}
          aria-label={`${headline}. ${where}`}
          sx={{
            width: 28,
            height: 28,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            '&:focus-visible': { outline: '2px solid var(--red-600)', outlineOffset: '-2px' },
          }}
        >
          <Box
            component="span"
            aria-hidden
            className="motion-pop"
            style={{ '--motion-delay': `${String(order * 50)}ms` } as CSSProperties}
            sx={{
              width: 14,
              height: 14,
              // Дуэль — скруглённый квадрат, турнир — кружок.
              borderRadius: duel ? '3px' : '50%',
              ...(entry.won
                ? { bgcolor: 'var(--ok)' }
                : { border: '2px solid var(--red-500)', bgcolor: 'transparent' }),
            }}
          />
        </Box>
      </Tooltip>
    </Box>
  );
}
