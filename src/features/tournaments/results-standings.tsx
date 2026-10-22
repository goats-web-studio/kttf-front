import type {
  GroupStandingsView,
  MatchView,
  StageView,
  TournamentStandingsView,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import DeltaPill from '@/common/ui/delta-pill';
import RatingValue from '@/common/ui/rating-value';
import Surface from '@/common/ui/surface';
import PlayerLink from '@/features/players/player-link';

import type { ResultsModel } from './results-model';
import ResultsTies from './results-ties';

/** Числа — одной ширины цифр, чтобы разряды стояли столбиком (раздел 6.1). */
const NUM = { fontVariantNumeric: 'tabular-nums' } as const;

/**
 * Колонка с фамилиями липкая при прокрутке вбок (раздел 6.1): на телефоне
 * таблица шире экрана, и без имени строка цифр ничего не значит.
 */
const STICKY = { position: 'sticky', left: 0, zIndex: 1, bgcolor: 'background.paper' } as const;

/**
 * На телефоне — место, игрок, очки, сеты и рейтинг: то, ради чего таблицу
 * открывают. Матрица и подробные колонки — с планшета, иначе очки уезжали за
 * край экрана.
 */
const WIDE = { display: { xs: 'none', sm: 'table-cell' } } as const;

interface ResultsStandingsProps {
  readonly standings: TournamentStandingsView;
  readonly stages: readonly StageView[];
  readonly model: ResultsModel;
  /** Сколько выходит из группы дальше; `null` — схема без выхода. */
  readonly advance: number | null;
  /** Правило равенства турнира (ADR-062): подписывается над таблицами. */
  readonly tieBreak: 'SET_DIFF' | 'SET_RATIO';
}

/**
 * Групповые таблицы — ТЗ 9.4 и ТЗ 6.6.
 *
 * Как протокол группы в зале: матрица «каждый с каждым» со счётом встреч,
 * рейтинг у фамилии, очки, сеты с разницей и изменение рейтинга за турнир.
 * Мячей нет: счёт по партиям клубы не ведут, и колонка была бы нулями.
 * Выходящие дальше отмечены полосой слева.
 *
 * Места, очки и разницы приходят от сервера ровно такими, какими их
 * посчитал общий движок: сложить их здесь ещё раз означало бы второе
 * понимание таблицы на клиенте — запрет №2 брифа. Матрица берёт счёт из
 * самих встреч.
 */
export default function ResultsStandings({
  standings,
  stages,
  model,
  advance,
  tieBreak,
}: ResultsStandingsProps): ReactNode {
  const t = useT();

  if (standings.groups.length === 0) {
    return null;
  }

  return (
    <Box component="section" sx={{ mt: 6, display: 'grid', gap: 2 }}>
      <Box>
        <Typography variant="h2">{t('results.standings.title')}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {t(
            tieBreak === 'SET_RATIO'
              ? 'results.standings.rule.ratio'
              : 'results.standings.rule.diff',
          )}
        </Typography>
      </Box>
      {standings.groups.map((group) => (
        <GroupTable
          key={`${group.stageId}:${group.groupId ?? 'single'}`}
          group={group}
          matches={
            stages
              .find((stage) => stage.id === group.stageId)
              ?.matches.filter((match) => match.groupId === group.groupId) ?? []
          }
          model={model}
          advance={advance}
        />
      ))}
    </Box>
  );
}

function GroupTable({
  group,
  matches,
  model,
  advance,
}: {
  readonly group: GroupStandingsView;
  readonly matches: readonly MatchView[];
  readonly model: ResultsModel;
  readonly advance: number | null;
}): ReactNode {
  const t = useT();
  const order = group.rows.map((row) => row.participant);

  return (
    <Surface title={group.label} component="div" flush>
      <TableContainer>
        <Table size="small" sx={{ minWidth: { sm: 640 } }}>
          <TableHead>
            <TableRow>
              <TableCell align="right" sx={{ width: 48 }}>
                {t('standings.place')}
              </TableCell>
              <TableCell sx={STICKY}>{t('standings.player')}</TableCell>
              {order.map((id, index) => (
                <TableCell
                  key={id}
                  align="center"
                  sx={{ ...WIDE, ...NUM, width: 52, px: 0.5 }}
                  title={model.names.get(id)}
                >
                  {index + 1}
                </TableCell>
              ))}
              <TableCell align="right" sx={WIDE}>
                {t('standings.played')}
              </TableCell>
              <TableCell align="right" sx={WIDE}>
                {t('standings.wins')}
              </TableCell>
              <TableCell align="right" sx={WIDE}>
                {t('standings.losses')}
              </TableCell>
              <TableCell align="right">{t('standings.points')}</TableCell>
              <TableCell align="right">{t('standings.sets')}</TableCell>
              <TableCell align="right">{t('results.col.delta')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {group.rows.map((row, index) => {
              const advancing = advance !== null && row.place !== null && row.place <= advance;
              const delta = model.rating.get(row.participant);

              return (
                <TableRow key={row.participant} sx={{ height: 52 }}>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      ...NUM,
                      // Выходящие дальше — полосой у места, как на экране зала.
                      boxShadow: advancing ? 'inset 3px 0 0 var(--ok)' : 'none',
                    }}
                  >
                    {/* Пусто, пока равенство не разрешил судья — ADR-008. */}
                    {row.place ?? (
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        —
                      </Box>
                    )}
                  </TableCell>
                  <TableCell
                    sx={{ ...STICKY, fontWeight: 500, whiteSpace: { xs: 'normal', sm: 'nowrap' } }}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: { xs: 'none', sm: 'inline' },
                        color: 'text.disabled',
                        mr: 1,
                        ...NUM,
                      }}
                    >
                      {index + 1}
                    </Box>
                    <PlayerLink id={row.participant}>
                      {model.names.get(row.participant) ?? row.participant}
                    </PlayerLink>
                    {model.ratings.has(row.participant) && (
                      <RatingValue
                        value={model.ratings.get(row.participant) ?? ''}
                        sx={{
                          // На телефоне — строкой под фамилией: место нужно числам.
                          display: { xs: 'flex', sm: 'inline-flex' },
                          ml: { xs: 0, sm: 1 },
                          typography: 'caption',
                          color: 'text.secondary',
                        }}
                      />
                    )}
                  </TableCell>
                  {order.map((other) => (
                    <MatrixCell
                      key={other}
                      self={row.participant === other}
                      result={meeting(matches, row.participant, other)}
                    />
                  ))}
                  <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
                    {row.played}
                  </TableCell>
                  <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
                    {row.wins}
                  </TableCell>
                  <TableCell align="right" sx={{ ...WIDE, ...NUM, color: 'text.secondary' }}>
                    {row.losses}
                  </TableCell>
                  <TableCell align="right" sx={{ ...NUM, fontWeight: 700, fontSize: 16 }}>
                    {row.points}
                  </TableCell>
                  <TableCell align="right" sx={{ ...NUM, whiteSpace: 'nowrap' }}>
                    {row.setsWon}:{row.setsLost}{' '}
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                      <Diff value={row.setDiff} />
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={NUM}>
                    {delta?.ratingAfter == null ? (
                      <Box component="span" sx={{ color: 'text.disabled' }}>
                        —
                      </Box>
                    ) : (
                      <DeltaPill value={delta.totalDelta} />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {advance !== null && (
        <Typography
          variant="caption"
          color="text.secondary"
          component="p"
          sx={{ px: { xs: 2, sm: 3 }, pt: 1.5, pb: group.unresolved.length > 0 ? 0 : 2 }}
        >
          <Box
            component="span"
            aria-hidden
            sx={{
              display: 'inline-block',
              width: 10,
              height: 10,
              mr: 0.75,
              borderRadius: '2px',
              bgcolor: 'var(--ok)',
              verticalAlign: 'middle',
            }}
          />
          {fill(t('results.standings.advance'), { count: String(advance) })}
        </Typography>
      )}

      {group.unresolved.length > 0 && (
        <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
          <ResultsTies
            title={t('results.unresolved.title')}
            ties={group.unresolved}
            names={model.names}
          />
        </Box>
      )}
    </Surface>
  );
}

interface Meeting {
  readonly mine: number;
  readonly theirs: number;
}

/** Сыгранная встреча двоих глазами `self`: его сеты первыми. */
function meeting(matches: readonly MatchView[], self: string, other: string): Meeting | null {
  for (const match of matches) {
    if (match.setsA === null || match.setsB === null) continue;

    if (match.playerAId === self && match.playerBId === other) {
      return { mine: match.setsA, theirs: match.setsB };
    }

    if (match.playerAId === other && match.playerBId === self) {
      return { mine: match.setsB, theirs: match.setsA };
    }
  }

  return null;
}

/**
 * Клетка матрицы: счёт встречи строки со столбцом. Победа — зелёная, поражение
 * — красная заливка, цифры дублируют цвет.
 */
function MatrixCell({
  self,
  result,
}: {
  readonly self: boolean;
  readonly result: Meeting | null;
}): ReactNode {
  if (self) {
    return <TableCell sx={{ ...WIDE, bgcolor: 'var(--ink-100)', p: 0 }} aria-hidden />;
  }

  if (result === null) {
    return (
      <TableCell align="center" sx={{ ...WIDE, color: 'text.disabled', px: 0.5 }}>
        ·
      </TableCell>
    );
  }

  const won = result.mine > result.theirs;
  const cell = (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        minWidth: 40,
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        fontWeight: 600,
        bgcolor: won ? 'var(--ok-50)' : 'var(--red-50)',
        color: won ? 'var(--ok-text)' : 'var(--red-700)',
      }}
    >
      {result.mine}:{result.theirs}
    </Box>
  );

  return (
    <TableCell align="center" sx={{ ...WIDE, ...NUM, px: 0.5 }}>
      {cell}
    </TableCell>
  );
}

/** Разница со знаком: по ней читается порядок, когда очки равны (ТЗ 6.6). */
function Diff({ value }: { readonly value: number }): ReactNode {
  return (
    <Box component="span" sx={{ color: 'text.disabled' }}>
      {value > 0 ? `+${String(value)}` : String(value)}
    </Box>
  );
}
