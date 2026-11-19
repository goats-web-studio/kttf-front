import type { ClubListItemView, CoachListItemView, PlayerListItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputBase from '@mui/material/InputBase';
import Popper from '@mui/material/Popper';
import Skeleton from '@mui/material/Skeleton';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowRight, Search } from 'lucide-react';
import {
  useEffect,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type SyntheticEvent,
} from 'react';

import { fill, useT, type MessageKey } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import ClubMark from '@/features/clubs/club-mark';
import { clubsQuery } from '@/features/clubs/queries';
import { coachesQuery } from '@/features/coaches/queries';
import { ALL_CITIES, useMyCity } from '@/features/places/my-city';
import { usePlaceName } from '@/features/places/place-name';
import { playerName } from '@/features/players/player-name';
import { playersQuery } from '@/features/players/queries';

/** Раздел подсказки: ищем сразу во всех трёх. */
type Section = 'players' | 'clubs' | 'coaches';

/** Пауза после набора: запрос уходит, когда человек перестал печатать. */
export const SEARCH_DEBOUNCE_MS = 250;
/** С одной буквы совпадает полбазы — подсказка начинается со второй. */
const MIN_LENGTH = 2;
/** Строк на раздел: дальше — полный список по ссылке. */
const LIMIT = 5;

/** Строка подсказки: игрок, клуб, тренер или «все результаты». */
type Found =
  | { readonly kind: 'player'; readonly item: PlayerListItemView }
  | { readonly kind: 'club'; readonly item: ClubListItemView }
  | { readonly kind: 'coach'; readonly item: CoachListItemView };
type Option = Found | { readonly kind: 'more' };

interface Group {
  readonly key: Section;
  readonly title: MessageKey;
  readonly options: readonly Found[];
}

/**
 * Живой поиск первого экрана — игроки, клубы, тренеры.
 *
 * Ищет сразу везде, без переключателя разделов. Подсказка появляется со
 * второй буквы, через четверть секунды после набора: до пяти строк в
 * каждом из трёх разделов с заголовками. Стрелки двигают выделение, Enter открывает выделенное,
 * а без выделения ведёт в рейтинг игроков с тем же запросом. Escape
 * закрывает подсказку.
 *
 * Разметка — комбобокс по WAI-ARIA: фокус остаётся в поле, выделенная
 * строка объявляется через `aria-activedescendant`. Список — в слое поверх
 * страницы: постер обрезает всё, что выходит за его край.
 */
export default function LiveSearch(): ReactNode {
  const t = useT();
  const navigate = useNavigate();
  const placeName = usePlaceName();
  const myCity = useMyCity();
  const id = useId();
  const listboxId = `${id}-listbox`;

  const [anchor, setAnchor] = useState<HTMLFormElement | null>(null);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [highlight, setHighlight] = useState({ key: '', index: -1 });

  const typed = text.trim();
  const term = useDebounced(typed, SEARCH_DEBOUNCE_MS);
  const ready = term.length >= MIN_LENGTH;
  // Прежний ответ держится, пока идёт новый: список не мигает на каждой букве.
  const players = useQuery({
    ...playersQuery({ search: term, page: 1, limit: LIMIT }),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  const clubs = useQuery({
    ...clubsQuery({ search: term, page: 1, limit: LIMIT }),
    enabled: ready,
    placeholderData: keepPreviousData,
  });
  const coaches = useQuery({
    ...coachesQuery({ search: term, page: 1, limit: LIMIT }),
    enabled: ready,
    placeholderData: keepPreviousData,
  });

  const queries = ready ? [players, clubs, coaches] : [];

  const groups: Group[] = ready
    ? [
        {
          key: 'players',
          title: 'home.search.scope.players',
          options: (players.data?.items ?? []).map((item) => ({ kind: 'player', item })),
        },
        {
          key: 'clubs',
          title: 'home.search.scope.clubs',
          options: (clubs.data?.items ?? []).map((item) => ({ kind: 'club', item })),
        },
        {
          key: 'coaches',
          title: 'home.search.scope.coaches',
          options: (coaches.data?.items ?? []).map((item) => ({ kind: 'coach', item })),
        },
      ]
    : [];
  const shown = groups.filter((group) => group.options.length > 0);
  const found = shown.flatMap((group) => group.options);
  // Последняя строка — полный список раздела: до неё доходят и стрелками.
  const options: readonly Option[] = found.length > 0 ? [...found, { kind: 'more' }] : [];

  const settled = typed === term && queries.every((query) => !query.isFetching);
  const failed = queries.some((query) => query.isError);
  const state: 'loading' | 'error' | 'empty' | 'results' =
    found.length > 0 ? 'results' : failed ? 'error' : settled ? 'empty' : 'loading';

  const open = focused && !dismissed && typed.length >= MIN_LENGTH;

  // Новый запрос — выделение с начала: старый номер указал бы не туда.
  const resultKey = term;
  const active = highlight.key === resultKey ? highlight.index : -1;
  const setActive = (next: number | ((current: number) => number)): void => {
    setHighlight((previous) => {
      const current = previous.key === resultKey ? previous.index : -1;
      return { key: resultKey, index: typeof next === 'function' ? next(current) : next };
    });
  };

  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(`${id}-option-${String(active)}`)?.scrollIntoView({ block: 'nearest' });
  }, [active, open, id]);

  /** Полный список — рейтинг игроков с тем же запросом, по всем городам, как и подсказка. */
  const openList = (): void => {
    const search = typed === '' ? undefined : typed;
    // Без поля город списка — город шапки, а подсказка искала везде.
    const city = myCity === null ? undefined : ALL_CITIES;

    void navigate({ to: '/players', search: { search, city } });
  };

  const choose = (option: Option): void => {
    setDismissed(true);
    if (option.kind === 'player') {
      void navigate({ to: '/players/$playerId', params: { playerId: option.item.id } });
    } else if (option.kind === 'club') {
      void navigate({ to: '/clubs/$clubId', params: { clubId: option.item.id } });
    } else if (option.kind === 'coach') {
      void navigate({ to: '/coaches/$slug', params: { slug: option.item.slug } });
    } else {
      openList();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setDismissed(false);
        return;
      }
      if (options.length === 0) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) =>
        current < 0 && step < 0
          ? options.length - 1
          : (current + step + options.length) % options.length,
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const option = open && active >= 0 ? options[active] : undefined;
      if (option === undefined) openList();
      else choose(option);
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      setDismissed(true);
      setActive(-1);
    }
  };

  const submit = (event: SyntheticEvent): void => {
    event.preventDefault();
    openList();
  };

  const optionId = (index: number): string => `${id}-option-${String(index)}`;
  let index = -1;

  return (
    <Box sx={{ width: '100%' }}>
      <Box
        ref={setAnchor}
        component="form"
        role="search"
        onSubmit={submit}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 0.75,
          pl: 2,
          borderRadius: 999,
          bgcolor: 'var(--paper)',
          boxShadow: '0 12px 40px rgb(0 0 0 / 0.35)',
        }}
      >
        <Box component="span" sx={{ display: 'inline-flex', color: 'var(--ink-500)' }}>
          <Search size={18} aria-hidden />
        </Box>
        <InputBase
          type="text"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setDismissed(false);
          }}
          onFocus={() => {
            setFocused(true);
          }}
          onBlur={() => {
            setFocused(false);
          }}
          onKeyDown={onKeyDown}
          placeholder={t('home.search.placeholder.all')}
          autoComplete="off"
          inputProps={{
            role: 'combobox',
            'aria-label': t('home.search.label'),
            'aria-autocomplete': 'list',
            'aria-expanded': open,
            'aria-controls': listboxId,
            ...(open && active >= 0 ? { 'aria-activedescendant': optionId(active) } : {}),
            enterKeyHint: 'search',
            spellCheck: false,
          }}
          sx={{ flex: 1, minWidth: 0, color: 'var(--ink-900)', fontSize: 16, minHeight: 44 }}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          sx={{ flexShrink: 0, borderRadius: 999, minHeight: 44, px: { xs: 2, sm: 3 } }}
        >
          {t('home.hero.find')}
        </Button>
      </Box>

      <Popper
        open={open && anchor !== null}
        anchorEl={anchor}
        placement="bottom-start"
        modifiers={[{ name: 'offset', options: { offset: [0, 8] } }]}
        sx={(theme) => ({ zIndex: theme.zIndex.modal, width: anchor?.offsetWidth ?? 'auto' })}
      >
        <Box
          // Клик по строке не уводит фокус из поля — иначе подсказка
          // закрылась бы раньше, чем клик дошёл до строки.
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          sx={{
            maxHeight: 'min(70vh, 560px)',
            overflowY: 'auto',
            bgcolor: 'var(--paper)',
            color: 'var(--ink-900)',
            borderRadius: 2,
            boxShadow: 'var(--shadow-pop)',
            py: 1,
          }}
        >
          <Box
            role="listbox"
            id={listboxId}
            aria-label={t('home.search.results')}
            aria-busy={state === 'loading'}
          >
            {state === 'results' &&
              shown.map((group) => {
                const headerId = `${id}-group-${group.key}`;

                return (
                  <Box key={group.key} role="group" aria-labelledby={headerId}>
                    <Box
                      id={headerId}
                      role="presentation"
                      sx={{
                        px: 2,
                        pt: 1,
                        pb: 0.5,
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--ink-500)',
                      }}
                    >
                      {t(group.title)}
                    </Box>
                    {group.options.map((option) => {
                      index += 1;
                      const current = index;

                      return (
                        <Row
                          key={rowKey(option)}
                          id={optionId(current)}
                          active={current === active}
                          onHover={() => {
                            setActive(current);
                          }}
                          onChoose={() => {
                            choose(option);
                          }}
                        >
                          <OptionContent option={option} placeName={placeName} />
                        </Row>
                      );
                    })}
                  </Box>
                );
              })}

            {state === 'results' && (
              <Row
                id={optionId(options.length - 1)}
                active={active === options.length - 1}
                divider
                onHover={() => {
                  setActive(options.length - 1);
                }}
                onChoose={() => {
                  openList();
                }}
              >
                <Box
                  sx={{
                    gridColumn: '1 / -1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--red-600)',
                  }}
                >
                  <Box
                    component="span"
                    sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    {fill(t('home.search.more.players'), { query: typed })}
                  </Box>
                  <ArrowRight size={16} aria-hidden />
                </Box>
              </Row>
            )}
          </Box>

          {state === 'loading' && (
            <Box role="status" aria-label={t('home.search.loading')} sx={{ px: 2, py: 0.5 }}>
              {[0, 1, 2].map((key) => (
                <Box
                  key={key}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 52 }}
                >
                  <Skeleton variant="circular" width={36} height={36} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton width="45%" />
                    <Skeleton width="25%" />
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {state === 'empty' && (
            <Box role="status" sx={{ px: 2, py: 1.5, fontSize: 14, color: 'var(--ink-700)' }}>
              {t('home.search.empty')}
            </Box>
          )}

          {state === 'error' && (
            <Box
              role="alert"
              sx={{
                px: 2,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                fontSize: 14,
                color: 'var(--ink-700)',
              }}
            >
              {t('home.search.error')}
              <Button
                size="small"
                onClick={() => {
                  for (const query of queries) void query.refetch();
                }}
                sx={{ minHeight: 44, flexShrink: 0 }}
              >
                {t('home.search.retry')}
              </Button>
            </Box>
          )}
        </Box>
      </Popper>
    </Box>
  );
}

function rowKey(option: Option): string {
  return option.kind === 'more' ? 'more' : `${option.kind}-${option.item.id}`;
}

/** Строка списка: выделение — под курсором и стрелками, одно на весь список. */
function Row({
  id,
  active,
  divider = false,
  onHover,
  onChoose,
  children,
}: {
  readonly id: string;
  readonly active: boolean;
  readonly divider?: boolean;
  readonly onHover: () => void;
  readonly onChoose: () => void;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <Box
      id={id}
      role="option"
      aria-selected={active}
      onMouseMove={onHover}
      onClick={onChoose}
      sx={{
        display: 'grid',
        gridTemplateColumns: 'auto minmax(0, 1fr) auto',
        alignItems: 'center',
        columnGap: 1.5,
        minHeight: 52,
        px: 2,
        py: 0.5,
        cursor: 'pointer',
        bgcolor: active ? 'var(--paper-hover)' : 'transparent',
        ...(divider ? { mt: 0.5, borderTop: '1px solid var(--line)' } : {}),
      }}
    >
      {children}
    </Box>
  );
}

/** Содержимое строки: знак, имя и город, у игрока — рейтинг справа. */
function OptionContent({
  option,
  placeName,
}: {
  readonly option: Found;
  readonly placeName: ReturnType<typeof usePlaceName>;
}): ReactNode {
  const t = useT();

  if (option.kind === 'player') {
    const { item } = option;
    return (
      <>
        <PlayerAvatar
          lastName={item.lastName}
          firstName={item.firstName}
          photoUrl={item.photoUrl}
        />
        <Lines title={playerName(item, t)} subtitle={placeName(item.city)} />
        <RatingValue value={item.rating} animate={false} sx={{ fontSize: 14, fontWeight: 600 }} />
      </>
    );
  }

  if (option.kind === 'club') {
    const { item } = option;
    return (
      <>
        <ClubMark club={item} size={36} />
        <Lines title={item.name} subtitle={placeName(item.city)} />
        <span />
      </>
    );
  }

  const { item } = option;
  const city = item.city ?? item.player.city;
  return (
    <>
      <PlayerAvatar
        lastName={item.player.lastName}
        firstName={item.player.firstName}
        photoUrl={item.photoUrl ?? item.player.photoUrl}
      />
      <Lines
        title={`${item.player.lastName} ${item.player.firstName}`}
        subtitle={placeName(city)}
      />
      <span />
    </>
  );
}

function Lines({
  title,
  subtitle,
}: {
  readonly title: string;
  readonly subtitle: string;
}): ReactNode {
  const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as const;

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box sx={{ ...ellipsis, fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{title}</Box>
      <Box sx={{ ...ellipsis, fontSize: 12, color: 'var(--ink-500)', lineHeight: 1.3 }}>
        {subtitle}
      </Box>
    </Box>
  );
}

/** Значение, которое догоняет исходное через `delay` после последней смены. */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debounced;
}
