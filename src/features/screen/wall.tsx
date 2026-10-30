import type {
  FormatConfig,
  MatchView,
  ScreenView,
  TournamentResultsView,
} from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useMemo, type ReactNode } from 'react';

import { fill, formatDateTime, useLocale, useT } from '@/common/i18n';
import { matchesOf } from '@/features/console/group-matches';
import {
  buildQueue,
  buildTables,
  currentStage,
  matchLabel,
  playedMatches,
  progressOf,
} from '@/features/console/queue';

import CallStrip from './call-strip';
import { FinishedSplash, ResultsSlide } from './finale';
import GroupBoard from './group-board';
import { ratingsOf, shortNamesOf } from './names';
import { DISPLAY, STAGE_HEIGHT, STAGE_WIDTH, TYPE, tint } from './scale';
import { GROUP_CARD, slideAt, type Slide, type SlideKind } from './slides';
import TablesSlide from './tables-slide';
import WallBracket from './wall-bracket';
import {
  BODY_HEIGHT,
  GAP,
  HEADER,
  INNER_WIDTH,
  PAD_X,
  PAD_Y,
  STRIP_HEIGHT,
  TABS,
  isClosed,
  slideTitle,
  wallSlides,
} from './wall-model';

/** Сколько выходит из группы дальше — зона выхода в таблице. */
function advanceOf(config: FormatConfig): number | null {
  return config.type === 'GROUPS_KNOCKOUT' || config.type === 'GROUPS_FINAL_GROUPS'
    ? config.advancePerGroup
    : null;
}

export interface WallProps {
  readonly view: ScreenView;
  /** Итоги закрытого турнира, если уже пришли. */
  readonly results: TournamentResultsView | undefined;
  readonly now: number;
  /** Поток открыт. `false` — на стене последнее известное состояние. */
  readonly live: boolean;
  /** Закреплённый вид (`?show=` в адресе экрана). */
  readonly show?: SlideKind | null;
  readonly splash?: boolean;
}

/**
 * Стена зала целиком на сцене 1920×1080 — ТЗ 6.5, ADR-082.
 *
 * Три экрана по очереди: столы, все группы, вся сетка — у каждого весь
 * экран. Под группами и сеткой — полоса вызова, чтобы позванный не ждал
 * экрана столов. Тот же компонент рисует предпросмотр в консоли судьи.
 *
 * Столы и очередь считаются теми же функциями, что и в консоли судьи
 * (`features/console/queue`): стена и судья обязаны видеть одинаковый
 * порядок вызова пар.
 */
export default function Wall({
  view,
  results,
  now,
  live,
  show = null,
  splash = false,
}: WallProps): ReactNode {
  const t = useT();
  const locale = useLocale();
  const closed = isClosed(view.tournament.status);
  // Слайд, закреплённый судьёй из консоли (ADR-082), — пока не истёк. Адрес
  // экрана (`?show=`) сильнее: ТВ, поставленный только под сетку, им и остаётся.
  const until = view.control?.until == null ? 0 : Date.parse(view.control.until);
  const pinned = view.control?.pin != null && until > now ? view.control.pin : null;
  const shown = show ?? pinned;

  const model = useMemo(() => {
    // Снявшиеся (ADR-061): их встречи не стоят в «Кто следующий» — правило
    // то же, что у очереди судьи.
    const withdrawn = new Set(view.withdrawn);

    return {
      withdrawn,
      queue: buildQueue(view.stages, t, withdrawn),
      played: playedMatches(view.stages),
      progress: progressOf(view.stages, withdrawn),
      names: shortNamesOf(view.players),
      ratings: ratingsOf(view.players),
      stage: currentStage(view.stages, withdrawn),
      slides: wallSlides(view, results, shown),
    };
  }, [view, results, shown, t]);

  // Столы — каждую секунду заново: сыгранная встреча держит стол минуту.
  const tables = buildTables(view.tournament.tableCount, view.stages, model.withdrawn, now);
  const { index } = slideAt(model.slides, now);
  const slide = model.slides[index] ?? null;
  const strip = !closed && slide !== null && slide.kind !== 'tables';
  const bodyHeight = BODY_HEIGHT - (strip ? STRIP_HEIGHT + GAP : 0);
  const labelOf = (match: MatchView): string => matchLabel(view.stages, match, t);
  const percent =
    model.progress.total === 0 ? 0 : Math.round((model.progress.done / model.progress.total) * 100);

  return (
    <Box
      sx={{
        position: 'relative',
        width: STAGE_WIDTH,
        height: STAGE_HEIGHT,
        px: `${String(PAD_X)}px`,
        py: `${String(PAD_Y)}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: `${String(GAP)}px`,
        overflow: 'hidden',
        bgcolor: 'background.default',
        color: 'text.primary',
      }}
    >
      <Box
        component="header"
        sx={{
          height: HEADER,
          flexShrink: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: '32px',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: TYPE.l,
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {view.tournament.name}
          </Typography>
          <Box sx={{ mt: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Box
              component="span"
              sx={{
                px: '12px',
                py: '3px',
                borderRadius: 999,
                fontSize: TYPE.xs,
                fontWeight: 700,
                ...(closed
                  ? { bgcolor: tint('ok', 14), color: 'var(--ok-text)' }
                  : { bgcolor: 'var(--ink-100)', color: 'text.primary' }),
              }}
            >
              {closed ? t('screen.finished') : (model.stage?.name ?? '')}
            </Box>
            {/* Прогресс — первое, что спрашивают в зале: «долго ещё?». */}
            <Box
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              sx={{
                width: 280,
                height: 8,
                borderRadius: '4px',
                bgcolor: 'divider',
                overflow: 'hidden',
              }}
            >
              <Box sx={{ width: `${String(percent)}%`, height: '100%', bgcolor: 'primary.main' }} />
            </Box>
            <Typography
              component="span"
              sx={{
                fontSize: TYPE.xs,
                color: 'text.secondary',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {fill(t('screen.progress'), {
                done: String(model.progress.done),
                total: String(model.progress.total),
              })}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <Box
            component="img"
            src="/logo-wordmark.png"
            alt="KTTF"
            sx={{ height: 30, width: 'auto' }}
          />
          <Box sx={{ textAlign: 'right' }}>
            <Typography
              component="p"
              sx={{
                fontFamily: DISPLAY,
                fontSize: TYPE.xl,
                lineHeight: 1,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {new Date(now).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
            </Typography>
            {/* Метка связи важнее времени обновления: на стене висит
                последнее известное состояние, и зритель обязан знать, что
                оно перестало обновляться. */}
            <Typography
              component="p"
              sx={{
                mt: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '8px',
                fontSize: TYPE.xs,
                color: live ? 'var(--ok-text)' : 'var(--warn-text)',
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: live ? 'success.main' : 'warning.main',
                }}
              />
              {live
                ? t('screen.live')
                : `${t('screen.offline')} · ${formatDateTime(view.updatedAt, locale)}`}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Tabs slides={model.slides} active={index} />

      <Box
        key={index}
        sx={{
          height: bodyHeight,
          flexShrink: 0,
          minHeight: 0,
          // Смена слайда — только прозрачность, без движения (ADR-082).
          animation: 'kttf-slide 300ms ease-out',
          '@keyframes kttf-slide': { from: { opacity: 0 }, to: { opacity: 1 } },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      >
        {slide?.kind === 'tables' && (
          <TablesSlide
            tables={tables}
            queue={model.queue}
            played={model.played}
            names={model.names}
            labelOf={labelOf}
            now={now}
            done={model.progress.done === model.progress.total}
          />
        )}
        {slide?.kind === 'groups' && (
          <GroupsSlide slide={slide} view={view} names={model.names} ratings={model.ratings} />
        )}
        {slide?.kind === 'bracket' && (
          <WallBracket
            stage={slide.stage}
            names={model.names}
            ratings={model.ratings}
            width={INNER_WIDTH}
            height={bodyHeight}
          />
        )}
        {slide?.kind === 'results' && results !== undefined && (
          <ResultsSlide
            results={results}
            participants={slide.participants}
            page={slide.page}
            pages={slide.pages}
          />
        )}
      </Box>

      {strip && <CallStrip tables={tables} queue={model.queue} names={model.names} now={now} />}

      {splash && (
        <FinishedSplash name={view.tournament.name} participants={results?.participants} />
      )}
    </Box>
  );
}

/** Вкладки слайдов: зал видит, что сейчас и что будет следом. */
function Tabs({
  slides,
  active,
}: {
  readonly slides: readonly Slide[];
  readonly active: number;
}): ReactNode {
  const t = useT();

  // Страницы одного вида — одна вкладка: «Группы 1/2» и «Группы 2/2» не
  // стоят рядом двумя пунктами.
  const tabs: { title: string; on: boolean }[] = [];

  for (const [index, slide] of slides.entries()) {
    const previous = slides[index - 1];
    const title = slideTitle(slide, t);

    if (previous?.kind === slide.kind && slide.kind !== 'bracket') {
      const last = tabs.at(-1);

      if (last !== undefined && index === active) {
        last.title = title;
        last.on = true;
      }

      continue;
    }

    tabs.push({ title, on: index === active });
  }

  return (
    <Box
      component="nav"
      aria-hidden
      sx={{ height: TABS, flexShrink: 0, display: 'flex', alignItems: 'flex-end', gap: '32px' }}
    >
      {tabs.map((tab, index) => (
        <Box
          key={index}
          component="span"
          sx={{
            pb: '6px',
            fontSize: TYPE.s,
            borderBottom: '4px solid',
            borderColor: tab.on ? 'primary.main' : 'transparent',
            fontWeight: tab.on ? 700 : 500,
            color: tab.on ? 'text.primary' : 'text.secondary',
          }}
        >
          {`${String(index + 1)} · ${tab.title}`}
        </Box>
      ))}
    </Box>
  );
}

function GroupsSlide({
  slide,
  view,
  names,
  ratings,
}: {
  readonly slide: Extract<Slide, { kind: 'groups' }>;
  readonly view: ScreenView;
  readonly names: ReadonlyMap<string, string>;
  readonly ratings: ReadonlyMap<string, string>;
}): ReactNode {
  const t = useT();
  const width = Math.floor((INNER_WIDTH - (slide.columns - 1) * GROUP_CARD.gap) / slide.columns);

  return (
    <Box component="section" aria-label={t('screen.standings.title')} sx={{ height: '100%' }}>
      <Typography
        component="h2"
        sx={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        {t('screen.standings.title')}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: `${String(GROUP_CARD.gap)}px`,
          alignContent: 'start',
          gridTemplateColumns: `repeat(${String(slide.columns)}, minmax(0, 1fr))`,
        }}
      >
        {slide.groups.map((group) => (
          <GroupBoard
            key={`${group.stageId}:${group.groupId ?? 'single'}`}
            group={group}
            matches={matchesOf(view.stages, group)}
            names={names}
            ratings={ratings}
            advance={advanceOf(view.tournament.formatConfig)}
            width={width}
          />
        ))}
      </Box>
    </Box>
  );
}
