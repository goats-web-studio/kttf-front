import type { MatchView, StageView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import Surface from '@/common/ui/surface';

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
          <Typography variant="h3" sx={{ mb: 1.5 }}>
            {stageTitle(stage, t)}
          </Typography>
          {/* Группы — карточками в две колонки: встречи группы читаются
              вместе, а не сплошным списком на весь этап. */}
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: stage.groups.length > 0 ? '1fr 1fr' : '1fr' },
              alignItems: 'start',
            }}
          >
            {partition(stage).map((part) => (
              <Surface
                key={part.label}
                component="div"
                flush
                {...(part.label === '' ? {} : { title: part.label })}
              >
                <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, pb: 1 }}>
                  {part.matches.map((match) => (
                    <Row key={match.id} match={match} names={names} />
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
        px: { xs: 2, sm: 3 },
        py: 1.25,
        typography: 'body2',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box component="span" sx={side(wonA, played)}>
        <Name id={match.playerAId} names={names} />
      </Box>
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
      <Box component="span" sx={{ ...side(wonB, played), textAlign: 'right' }}>
        <Name id={match.playerBId} names={names} />
      </Box>
      {note.length > 0 && (
        <Typography
          component="span"
          variant="caption"
          color="text.secondary"
          sx={{ gridColumn: '1 / -1', textAlign: 'center', mt: 0.5 }}
        >
          {note.join(' · ')}
        </Typography>
      )}
    </Box>
  );
}

/** Сторона встречи: победитель полужирный, проигравший приглушён. */
function side(won: boolean, played: boolean) {
  return {
    minWidth: 0,
    overflowWrap: 'anywhere',
    fontWeight: won ? 600 : 400,
    color: played && !won ? 'text.secondary' : 'text.primary',
  } as const;
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
