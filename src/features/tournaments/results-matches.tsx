import type { MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, formatDelta, useT, type MessageKey } from '@/common/i18n';
import { BRACKET_STAGES, finalRound, isPlacement, roundName } from '@/common/ui/bracket-model';
import RatingValue from '@/common/ui/rating-value';
import Surface from '@/common/ui/surface';
import PlayerLink from '@/features/players/player-link';

import { MATCH_STATUS_KEYS, RESULT_TYPE_KEYS, stageTitle } from './labels';
import { matchMinutes, setScoresLine, type ResultsModel } from './results-model';

interface ResultsMatchesProps {
  readonly stages: readonly StageView[];
  readonly model: ResultsModel;
}

/**
 * Все встречи со счётом — ТЗ 9.4.
 *
 * Как протокол турнира: в группах — карточки групп по турам, в сетке —
 * круги по порядку от первого к финалу. У встречи — рейтинги игроков, счёт
 * по партиям, если его вводили, стол, длительность и изменение рейтинга
 * каждого за эту встречу.
 */
export default function ResultsMatches({ stages, model }: ResultsMatchesProps): ReactNode {
  const t = useT();

  if (stages.length === 0) {
    return null;
  }

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2">{t('results.matches.title')}</Typography>
      {stages.map((stage) => (
        <Box key={stage.id} sx={{ mt: 3 }}>
          <Typography variant="h3" sx={{ mb: 1.5 }}>
            {stageTitle(stage, t)}
          </Typography>
          {/* Группы — карточками в две колонки: встречи группы читаются
              вместе, а не сплошным списком на весь этап. */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              alignItems: 'start',
            }}
          >
            {partition(stage, t).map((part) => (
              <Surface
                key={part.label}
                component="div"
                flush
                {...(part.label === '' ? {} : { title: part.label })}
              >
                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, pb: 1 }}>
                  {part.matches.map((match) => (
                    <Row
                      key={match.id}
                      match={match}
                      model={model}
                      tour={part.tours ? match.bracketRound : null}
                    />
                  ))}
                </Box>
              </Surface>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

interface Partition {
  readonly label: string;
  readonly matches: readonly MatchView[];
  /** Подписывать ли у встречи тур: в группах он есть, в круге сетки — нет. */
  readonly tours: boolean;
}

function byRound(left: MatchView, right: MatchView): number {
  return (
    (left.bracketRound ?? 0) - (right.bracketRound ?? 0) ||
    (left.bracketSlot ?? 0) - (right.bracketSlot ?? 0)
  );
}

/**
 * Встречи этапа частями: в группах — по группам, в сетке — по кругам от
 * первого к финалу, встреча за третье место — после финала.
 */
function partition(stage: StageView, t: (key: MessageKey) => string): readonly Partition[] {
  if (BRACKET_STAGES.has(stage.type)) {
    const final = finalRound(stage.matches);
    const rounds = [...new Set(stage.matches.map((match) => match.bracketRound ?? 1))].sort(
      (left, right) => left - right,
    );
    const parts = rounds.map((round) => ({
      label: roundName(final - round, t),
      matches: stage.matches
        .filter((match) => (match.bracketRound ?? 1) === round && !isPlacement(match))
        .sort(byRound),
      tours: false,
    }));
    const third = stage.matches.filter(isPlacement);

    return [
      ...parts.filter((part) => part.matches.length > 0),
      ...(third.length === 0
        ? []
        : [{ label: t('results.bracket.thirdPlace'), matches: third, tours: false }]),
    ];
  }

  if (stage.groups.length === 0) {
    return [{ label: '', matches: [...stage.matches].sort(byRound), tours: true }];
  }

  const parts = stage.groups.map((group) => ({
    label: group.label,
    matches: stage.matches.filter((match) => match.groupId === group.id).sort(byRound),
    tours: true,
  }));

  // Встречи без группы у этапа с группами существуют: так выглядит стыковой
  // матч, достроенный по итогам групп (ADR-021).
  const loose = stage.matches.filter((match) => match.groupId === null);

  return loose.length === 0 ? parts : [...parts, { label: '', matches: loose, tours: false }];
}

function Row({
  match,
  model,
  tour,
}: {
  readonly match: MatchView;
  readonly model: ResultsModel;
  readonly tour: number | null;
}): ReactNode {
  const t = useT();
  const played = match.setsA !== null && match.setsB !== null;
  const minutes = matchMinutes(match);
  const sets = setScoresLine(match);

  const meta = [
    tour === null ? null : fill(t('results.match.tour'), { n: String(tour) }),
    match.tableNumber === null
      ? null
      : fill(t('results.match.table'), { n: String(match.tableNumber) }),
    minutes === null ? null : fill(t('results.match.minutes'), { n: String(minutes) }),
    match.resultType === null || match.resultType === 'NORMAL'
      ? null
      : t(RESULT_TYPE_KEYS[match.resultType]),
    match.status === 'FINISHED' ? null : t(MATCH_STATUS_KEYS[match.status]),
  ].filter((value) => value !== null);

  const wonA = played && (match.setsA ?? 0) > (match.setsB ?? 0);
  const wonB = played && (match.setsB ?? 0) > (match.setsA ?? 0);

  // Строка встречи как в спортивном табло: игрок — счёт — игрок. Победитель
  // набран полужирным, проигравший приглушён (раздел 3.4).
  return (
    <Box
      component="li"
      sx={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
        alignItems: 'center',
        columnGap: 1.5,
        rowGap: 0.25,
        px: { xs: 2, sm: 3 },
        py: 1.25,
        typography: 'body2',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      {meta.length > 0 && (
        <Typography
          component="span"
          variant="caption"
          color="text.secondary"
          sx={{ gridColumn: '1 / -1', mb: 0.25 }}
        >
          {meta.join(' · ')}
        </Typography>
      )}
      <Side id={match.playerAId} model={model} won={wonA} played={played} />
      <Box
        component="span"
        sx={{
          px: 1.25,
          minWidth: 56,
          height: 28,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: played ? 'var(--ink-100)' : 'transparent',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          color: played ? 'text.primary' : 'text.disabled',
        }}
      >
        {played ? `${String(match.setsA)} : ${String(match.setsB)}` : '—'}
      </Box>
      <Side id={match.playerBId} model={model} won={wonB} played={played} right />

      <MatchDelta id={match.playerAId} matchId={match.id} model={model} />
      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        sx={{ textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
      >
        {sets}
      </Typography>
      <MatchDelta id={match.playerBId} matchId={match.id} model={model} right />
    </Box>
  );
}

/** Сторона встречи: имя ссылкой и рейтинг; победитель полужирный. */
function Side({
  id,
  model,
  won,
  played,
  right = false,
}: {
  readonly id: string | null;
  readonly model: ResultsModel;
  readonly won: boolean;
  readonly played: boolean;
  readonly right?: boolean;
}): ReactNode {
  const t = useT();

  return (
    <Box
      component="span"
      sx={{
        minWidth: 0,
        overflowWrap: 'anywhere',
        fontWeight: won ? 600 : 400,
        color: played && !won ? 'text.secondary' : 'text.primary',
        textAlign: right ? 'right' : 'left',
      }}
    >
      {id === null ? (
        <Box component="span" sx={{ color: 'text.secondary' }}>
          {t('results.match.pending')}
        </Box>
      ) : (
        <>
          <PlayerLink id={id}>{model.names.get(id) ?? t('results.match.unknownPlayer')}</PlayerLink>
          {model.ratings.has(id) && (
            <RatingValue
              value={model.ratings.get(id) ?? ''}
              sx={{ ml: 0.75, typography: 'caption', color: 'text.secondary', fontWeight: 400 }}
            />
          )}
        </>
      )}
    </Box>
  );
}

/** Изменение рейтинга игрока за эту встречу — из журнала (ТЗ 7.3). */
function MatchDelta({
  id,
  matchId,
  model,
  right = false,
}: {
  readonly id: string | null;
  readonly matchId: string;
  readonly model: ResultsModel;
  readonly right?: boolean;
}): ReactNode {
  const delta = id === null ? undefined : model.deltas.get(`${matchId}:${id}`);
  const value = delta === undefined ? 0 : Number(delta);

  return (
    <Box
      component="span"
      sx={{
        typography: 'caption',
        fontVariantNumeric: 'tabular-nums',
        textAlign: right ? 'right' : 'left',
        color: value > 0 ? 'var(--ok)' : value < 0 ? 'var(--red-600)' : 'text.disabled',
      }}
    >
      {delta === undefined ? '' : formatDelta(delta)}
    </Box>
  );
}
