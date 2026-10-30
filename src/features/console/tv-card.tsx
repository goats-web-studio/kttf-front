import type {
  ScreenControlView,
  ScreenSlide,
  ScreenView,
  TournamentResultsView,
  TournamentSnapshotView,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

import { fill, useLocale, useT, type MessageKey } from '@/common/i18n';
import { fetchScreenControl, putScreenControl } from '@/features/screen/api';
import { slideAt } from '@/features/screen/slides';
import Stage from '@/features/screen/stage';
import Wall from '@/features/screen/wall';
import { slideTitle, wallSlides } from '@/features/screen/wall-model';

import { useNow } from './use-now';

/** Сколько минут держится закреплённый слайд. */
const PIN_MINUTES = 5;

const AUTO = 'auto';

const SLIDE_LABEL: Readonly<Record<ScreenSlide, MessageKey>> = {
  tables: 'screen.tables.title',
  groups: 'screen.slide.groups',
  bracket: 'console.tv.bracket',
  results: 'screen.slide.results',
};

const NO_PIN: ScreenControlView = { pin: null, until: null };

/**
 * «ТВ в зале» — что сейчас видит зал и что ему показать (ADR-082).
 *
 * Предпросмотр — не `iframe` со стены, а та же стена из состояния консоли:
 * `iframe` запрещён политикой безопасности (`frame-ancestors 'none'`), а
 * состояние консоли есть и офлайн. Слайды листаются по часам, поэтому
 * предпросмотр и телевизор показывают одно и то же в одну секунду.
 *
 * Под ним — управление, как кнопки «Второй монитор» у RTTF, но поверх
 * автосмены: судья закрепляет слайд на пять минут («показать сетку сейчас»),
 * и стена сама вернётся к «Авто». Действие сетевое: без сети кнопки
 * неактивны, стена листает сама.
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
  const locale = useLocale();
  const queryClient = useQueryClient();
  // Своя секунда — у карточки, а не у всей консоли: перерисовывать раз в
  // секунду столы и таблицы судьи незачем.
  const now = useNow(1_000);
  const tournamentId = snapshot.tournament.id;
  const key = ['console', 'screen-control', tournamentId] as const;

  const control = useQuery({
    queryKey: key,
    queryFn: () => fetchScreenControl(tournamentId),
    enabled: online,
    // Закрепление ставит только эта консоль (или соседняя): раз в полминуты
    // достаточно, чтобы увидеть чужое.
    refetchInterval: 30_000,
  });
  const change = useMutation({
    mutationFn: (pin: ScreenSlide | null) =>
      putScreenControl(tournamentId, { pin, minutes: PIN_MINUTES }),
    onSuccess: (saved) => {
      queryClient.setQueryData(key, saved);
    },
  });

  const current = control.data ?? NO_PIN;
  const until = current.until === null ? 0 : Date.parse(current.until);
  const pinned = current.pin !== null && until > now ? current.pin : null;

  const view = useMemo(
    (): ScreenView => ({
      tournament: snapshot.tournament,
      players: snapshot.registrations.map((registration) => registration.player),
      withdrawn: [...withdrawn],
      standings: snapshot.standings,
      stages: snapshot.stages,
      updatedAt: snapshot.takenAt,
      control: current,
    }),
    [snapshot, withdrawn, current],
  );
  // Кнопки — по слайдам, которые у турнира есть: без групп нет «Групп».
  const kinds = useMemo(
    () => [...new Set(wallSlides(view, results, null).map((slide) => slide.kind))],
    [view, results],
  );
  const slides = useMemo(() => wallSlides(view, results, pinned), [view, results, pinned]);
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

      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={pinned ?? AUTO}
        disabled={!online || change.isPending}
        onChange={(_event, next: ScreenSlide | typeof AUTO | null) => {
          // Повторное касание выбранного продлевает закрепление, а не снимает его.
          const pin = next === null ? pinned : next === AUTO ? null : next;
          change.mutate(pin);
        }}
        aria-label={t('console.tv.control')}
        sx={{ mt: 1.5, '& .MuiToggleButton-root': { minHeight: 44, textTransform: 'none' } }}
      >
        <ToggleButton value={AUTO}>{t('console.tv.auto')}</ToggleButton>
        {kinds.map((kind) => (
          <ToggleButton key={kind} value={kind}>
            {t(SLIDE_LABEL[kind])}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Typography
        variant="caption"
        role="status"
        sx={{
          mt: 1,
          display: 'block',
          color: change.isError ? 'error.main' : 'text.secondary',
        }}
      >
        {!online
          ? t('console.tv.offline')
          : change.isError
            ? t('console.tv.failed')
            : pinned !== null
              ? fill(t('console.tv.pinned'), {
                  time: new Date(until).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })
              : t('console.tv.autoHint')}
      </Typography>
    </Paper>
  );
}
