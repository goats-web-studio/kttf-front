import type { PlayerMatchView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { formatDate, formatDelta, useLocale, useT } from '@/common/i18n';
import { RESULT_TYPE_KEYS } from '@/features/tournaments/labels';

import { playerName } from './player-name';

interface MatchesTableProps {
  readonly matches: readonly PlayerMatchView[];
  /**
   * Выбор соперника открывает личный счёт с ним.
   *
   * Не задан там, где соперник уже выбран: в самом личном счёте кнопка вела
   * бы на страницу, которая и так открыта.
   */
  readonly onSelectOpponent?: ((opponentId: string) => void) | undefined;
}

/** Колонки, которых на телефоне нет: дата и турнир уходят подписью под соперника. */
const WIDE = { display: { xs: 'none', sm: 'table-cell' } } as const;

/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

/**
 * Встречи глазами игрока — ТЗ 9.3.
 *
 * Счёт развёрнут на «свои» и «чужие» сеты сервером: игрок не обязан помнить,
 * с какой стороны сетки он стоял, и переворачивать `setsA`/`setsB` на клиенте
 * не приходится.
 *
 * Исход назван словом, а не цветом строки: цвет не читается вслух и не
 * различается частью людей.
 */
export default function MatchesTable({ matches, onSelectOpponent }: MatchesTableProps): ReactNode {
  const t = useT();

  return (
    <Table stickyHeader size="small" sx={{ mt: 2 }}>
      <TableHead>
        <TableRow>
          <TableCell sx={WIDE}>{t('player.matches.date')}</TableCell>
          <TableCell sx={WIDE}>{t('player.matches.tournament')}</TableCell>
          <TableCell>{t('player.matches.opponent')}</TableCell>
          <TableCell align="right">{t('player.matches.score')}</TableCell>
          <TableCell>{t('player.matches.outcome')}</TableCell>
          <TableCell align="right">{t('player.matches.delta')}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {matches.map((match) => (
          <Row key={match.matchId} match={match} onSelectOpponent={onSelectOpponent} />
        ))}
      </TableBody>
    </Table>
  );
}

function Row({
  match,
  onSelectOpponent,
}: {
  readonly match: PlayerMatchView;
  readonly onSelectOpponent?: ((opponentId: string) => void) | undefined;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const date = match.playedAt === null ? '—' : formatDate(match.playedAt, locale);

  return (
    <TableRow
      sx={{
        verticalAlign: 'top',
        // Победа отмечена трижды — словом, насыщенностью счёта и линейкой
        // слева (раздел 3.4): цвет не единственный носитель смысла.
        ...(match.won ? { boxShadow: 'inset 2px 0 0 var(--red-500)' } : {}),
      }}
    >
      <TableCell sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>{date}</TableCell>
      <TableCell sx={WIDE}>
        <Tournament match={match} />
      </TableCell>
      <TableCell>
        <Opponent match={match} onSelectOpponent={onSelectOpponent} />
        {/* На телефоне дата и турнир — подписью под соперником. */}
        <Box sx={{ display: { sm: 'none' } }}>
          <Typography variant="body2" color="text.secondary" sx={NUM}>
            {date}
          </Typography>
          <Tournament match={match} />
        </Box>
      </TableCell>
      <TableCell
        align="right"
        sx={{
          ...NUM,
          fontWeight: match.won ? 600 : 400,
          color: match.won ? 'primary.main' : 'text.secondary',
        }}
      >
        {match.setsFor} : {match.setsAgainst}
        {match.resultType !== 'NORMAL' && (
          <Typography
            component="span"
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block' }}
          >
            {t(RESULT_TYPE_KEYS[match.resultType])}
          </Typography>
        )}
      </TableCell>
      <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}>
        {match.won ? t('player.matches.won') : t('player.matches.lost')}
      </TableCell>
      <TableCell align="right" sx={{ ...NUM, fontWeight: 500 }}>
        {match.delta === null ? (
          <Typography component="span" variant="body2" color="text.secondary">
            {t('player.matches.notRated')}
          </Typography>
        ) : (
          formatDelta(match.delta)
        )}
      </TableCell>
    </TableRow>
  );
}

function Tournament({ match }: { readonly match: PlayerMatchView }): ReactNode {
  return (
    <>
      <Link href={`/tournaments/${match.tournamentId}`}>{match.tournamentName}</Link>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {match.stageName}
      </Typography>
    </>
  );
}

/**
 * Соперник по встрече.
 *
 * Пустой соперник — не пропуск в данных: игрок снялся до встречи, и
 * техническую победу засчитали без него.
 */
function Opponent({
  match,
  onSelectOpponent,
}: {
  readonly match: PlayerMatchView;
  readonly onSelectOpponent?: ((opponentId: string) => void) | undefined;
}): ReactNode {
  const t = useT();

  if (match.opponent === null) {
    return (
      <Typography component="span" color="text.secondary">
        {t('player.matches.noOpponent')}
      </Typography>
    );
  }

  const name = playerName(match.opponent);

  if (onSelectOpponent === undefined) {
    return name;
  }

  const opponentId = match.opponent.id;

  return (
    <Link
      component="button"
      type="button"
      underline="always"
      onClick={() => {
        onSelectOpponent(opponentId);
      }}
      // Зона нажатия на телефоне — не меньше 44px (раздел 9).
      sx={{ textAlign: 'left', minHeight: { xs: 44, sm: 'auto' }, font: 'inherit' }}
    >
      {name}
    </Link>
  );
}
