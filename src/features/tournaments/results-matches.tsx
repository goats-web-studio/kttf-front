import type { MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';

import { MATCH_STATUS_KEYS, RESULT_TYPE_KEYS, stageTitle } from './labels';

interface ResultsMatchesProps {
  readonly stages: readonly StageView[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Все встречи со счётом — ТЗ 9.4.
 *
 * Порядок встреч внутри этапа задаёт сервер (круг, затем слот). Здесь только
 * разбивка по группам: без неё круговые встречи трёх групп сливаются в один
 * список, в котором не видно, кто с кем в одной группе.
 */
export default function ResultsMatches({ stages, names }: ResultsMatchesProps): ReactNode {
  const t = useT();

  if (stages.length === 0) {
    return null;
  }

  return (
    <Box component="section" sx={{ mt: 6 }}>
      <Typography variant="h2">{t('results.matches.title')}</Typography>
      {stages.map((stage) => (
        <Box key={stage.id} sx={{ mt: 3 }}>
          <Typography variant="h3">{stageTitle(stage, t)}</Typography>
          {partition(stage).map((part) => (
            <Box key={part.label} sx={{ mt: 1.5 }}>
              {part.label !== '' && (
                <Typography variant="caption" color="text.secondary" component="p">
                  {part.label}
                </Typography>
              )}
              <Box component="ul" sx={{ listStyle: 'none', m: 0, mt: 0.5, p: 0 }}>
                {part.matches.map((match) => (
                  <Row key={match.id} match={match} names={names} />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

interface Partition {
  readonly label: string;
  readonly matches: readonly MatchView[];
}

/**
 * Встречи этапа, разложенные по группам.
 *
 * У этапа без групп остаётся одна часть с пустым заголовком: сетке и круговой
 * схеме делить нечего.
 */
function partition(stage: StageView): readonly Partition[] {
  if (stage.groups.length === 0) {
    return [{ label: '', matches: stage.matches }];
  }

  const parts = stage.groups.map((group) => ({
    label: group.label,
    matches: stage.matches.filter((match) => match.groupId === group.id),
  }));

  // Встречи без группы у этапа с группами существуют: так выглядит стыковой
  // матч, достроенный по итогам групп (ADR-021).
  const loose = stage.matches.filter((match) => match.groupId === null);

  return loose.length === 0 ? parts : [...parts, { label: '', matches: loose }];
}

function Row({
  match,
  names,
}: {
  readonly match: MatchView;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const played = match.setsA !== null && match.setsB !== null;

  const note = [
    match.resultType === null || match.resultType === 'NORMAL'
      ? null
      : t(RESULT_TYPE_KEYS[match.resultType]),
    match.status === 'FINISHED' ? null : t(MATCH_STATUS_KEYS[match.status]),
  ].filter((value) => value !== null);

  return (
    <Box
      component="li"
      sx={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 1.5,
        py: 1,
        typography: 'body2',
        borderBottom: 1,
        borderColor: 'divider',
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <span>
        <Name id={match.playerAId} names={names} /> — <Name id={match.playerBId} names={names} />
      </span>
      <Box component="span" sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
        {note.length > 0 && (
          <Typography component="span" variant="caption" color="text.secondary">
            {note.join(' · ')}
          </Typography>
        )}
        <Box
          component="span"
          sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, whiteSpace: 'nowrap' }}
        >
          {played ? `${String(match.setsA)} : ${String(match.setsB)}` : '—'}
        </Box>
      </Box>
    </Box>
  );
}

function Name({
  id,
  names,
}: {
  readonly id: string | null;
  readonly names: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();

  if (id === null) {
    return (
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {t('results.match.pending')}
      </Box>
    );
  }

  return names.get(id) ?? t('results.match.unknownPlayer');
}
