import type { ScreenView, TournamentResultsView, TournamentSnapshotView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { ExternalLink } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

import { fill, useT } from '@/common/i18n';
import { slideAt } from '@/features/screen/slides';
import Stage from '@/features/screen/stage';
import Wall from '@/features/screen/wall';
import { slideTitle, wallSlides } from '@/features/screen/wall-model';

import { useNow } from './use-now';

/**
 * «ТВ в зале» — что сейчас видит зал (ADR-082).
 *
 * Не `iframe` со стены, а та же стена из состояния консоли: `iframe` запрещён
 * политикой безопасности (`frame-ancestors 'none'`), а состояние консоли есть
 * и офлайн. Слайды листаются по часам, поэтому предпросмотр и телевизор
 * показывают одно и то же в одну секунду.
 */
export default function TvCard({
  snapshot,
  withdrawn,
  results,
  online,
}: {
  readonly snapshot: TournamentSnapshotView;
  readonly withdrawn: ReadonlySet<string>;
  readonly results: TournamentResultsView | undefined;
  readonly online: boolean;
}): ReactNode {
  const t = useT();
  // Своя секунда — у карточки, а не у всей консоли: перерисовывать раз в
  // секунду столы и таблицы судьи незачем.
  const now = useNow(1_000);

  const view = useMemo(
    (): ScreenView => ({
      tournament: snapshot.tournament,
      players: snapshot.registrations.map((registration) => registration.player),
      withdrawn: [...withdrawn],
      standings: snapshot.standings,
      stages: snapshot.stages,
      updatedAt: snapshot.takenAt,
    }),
    [snapshot, withdrawn],
  );
  const slides = useMemo(() => wallSlides(view, results, null), [view, results]);
  const { index, left } = slideAt(slides, now);
  const slide = slides[index];

  return (
    <Paper component="section" variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
      <Box
        sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 1 }}
      >
        <Typography component="h2" variant="h3">
          {t('console.tv.title')}
        </Typography>
        <Button
          component="a"
          href={`/screen/${snapshot.tournament.publicToken}`}
          target="_blank"
          rel="noopener"
          size="small"
          endIcon={<ExternalLink size={16} aria-hidden />}
          sx={{ minHeight: 44 }}
        >
          {t('console.tv.open')}
        </Button>
      </Box>
      <Box
        aria-hidden
        sx={{
          mt: 1,
          aspectRatio: '16 / 9',
          borderRadius: 2,
          overflow: 'hidden',
          border: 1,
          borderColor: 'divider',
          // Предпросмотр смотрят, а не нажимают: касание по нему ничего не делает.
          pointerEvents: 'none',
        }}
      >
        <Stage>
          <Wall view={view} results={results} now={now} live={online} />
        </Stage>
      </Box>
      {slide !== undefined && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
            {fill(t('console.tv.now'), { slide: slideTitle(slide, t) })}
          </Box>
          {slides.length > 1 && ` · ${fill(t('console.tv.next'), { seconds: String(left) })}`}
        </Typography>
      )}
    </Paper>
  );
}
