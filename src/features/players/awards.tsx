import type { ClubRef, PlayerAwardView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import { useId, useRef, useState, type MouseEvent, type ReactNode } from 'react';

import { fill, formatDate, useLocale, useT } from '@/common/i18n';
import RankBadge from '@/common/ui/rank-badge';

/** Заливка медали — только места 1–3 (07, 3.1). Цифра на ней — `--ink-900`. */
const MEDAL: Readonly<Record<number, string>> = {
  1: 'var(--gold)',
  2: 'var(--silver)',
  3: 'var(--bronze)',
};

interface ClubAwards {
  readonly club: ClubRef;
  readonly awards: readonly PlayerAwardView[];
}

/**
 * Награды по концепции RTTF — ADR-050: строка на клуб, в ней медаль за
 * каждое призовое место. Видно сразу и сколько взято, и где. Живёт в
 * карточке «Достижения» под шапкой профиля (ADR-060).
 *
 * Медаль — ссылка на турнир. Мышь видит турнир и дату наведением, палец —
 * первым касанием: второе касание открывает турнир. Иначе на телефоне
 * узнать, за что медаль, можно было бы только уйдя со страницы.
 *
 * Пустой список не рисуется: пустые «Награды» у новичка читаются как упрёк,
 * а не сведения.
 */
export function AwardsByClub({
  awards,
}: {
  readonly awards: readonly PlayerAwardView[];
}): ReactNode {
  const t = useT();
  const listId = useId();
  const [open, setOpen] = useState(false);

  if (awards.length === 0) {
    return null;
  }

  const clubs = byClub(awards);

  return (
    <Box data-awards>
      {/* Медали одного клуба — повтор счётчика выше: строки по клубам нужны,
          когда клубов больше одного. Список турниров — кнопкой ниже. */}
      {clubs.length > 1 && (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {clubs.map((row) => (
            <ClubRow key={row.club.id} row={row} />
          ))}
        </Box>
      )}
      <Button
        variant="text"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setOpen((value) => !value);
        }}
        sx={{ mt: 0.5, ml: -1, minHeight: 44, color: 'text.secondary' }}
      >
        {t(open ? 'profile.awards.hide' : 'profile.awards.all')}
      </Button>

      {open && <AwardList id={listId} awards={awards} />}
    </Box>
  );
}

/**
 * Сколько медалей каждого достоинства — крупно, кружком с числом рядом.
 * Достоинство без медалей не выводится: «0 золотых» — не достижение.
 */
export function MedalTally({ awards }: { readonly awards: readonly PlayerAwardView[] }): ReactNode {
  const t = useT();
  const places = [1, 2, 3]
    .map((place) => ({ place, count: awards.filter((award) => award.place === place).length }))
    .filter((entry) => entry.count > 0);

  if (places.length === 0) return null;

  return (
    <Box
      component="ul"
      data-medal-tally
      sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', gap: 2.5 }}
    >
      {places.map(({ place, count }) => (
        <Box
          component="li"
          key={place}
          aria-label={fill(t('profile.medals.count'), {
            place: String(place),
            count: String(count),
          })}
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}
        >
          <Box
            component="span"
            aria-hidden
            sx={{
              width: 40,
              height: 40,
              display: 'inline-grid',
              placeItems: 'center',
              borderRadius: '50%',
              bgcolor: MEDAL[place],
              color: 'var(--ink-900)',
              fontWeight: 700,
              fontSize: 16,
              boxShadow: 'inset 0 -3px 0 rgb(31 31 29 / 0.12)',
            }}
          >
            {place}
          </Box>
          <Box
            component="span"
            aria-hidden
            sx={{
              fontWeight: 700,
              fontSize: 24,
              lineHeight: '32px',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {`×${String(count)}`}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function ClubRow({ row }: { readonly row: ClubAwards }): ReactNode {
  const t = useT();

  return (
    <Box
      component="li"
      data-award-club={row.club.id}
      sx={{
        py: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr)',
        columnGap: 3,
        rowGap: 0.5,
        alignItems: 'center',
        '& + &': { borderTop: 1, borderColor: 'divider' },
      }}
    >
      <Link
        href={`/clubs/${row.club.id}`}
        color="inherit"
        sx={{ typography: 'body2', fontWeight: 600, overflowWrap: 'anywhere' }}
      >
        {row.club.name}
      </Link>
      <Box
        role="list"
        aria-label={fill(t('profile.awards.club'), { club: row.club.name })}
        sx={{ display: 'flex', flexWrap: 'wrap', mx: -0.75 }}
      >
        {row.awards.map((award) => (
          <Medal key={award.tournament.id} award={award} />
        ))}
      </Box>
    </Box>
  );
}

/**
 * Медаль-кружок. Зона нажатия 44px вокруг кружка 30px (07, 9): медали стоят
 * плотно, и промах пальцем открывал бы соседний турнир.
 */
function Medal({ award }: { readonly award: PlayerAwardView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const pointer = useRef<string>('mouse');
  const date = formatDate(award.tournament.startsAt, locale);
  const label = fill(t('profile.awards.medal'), {
    place: String(award.place),
    tournament: award.tournament.name,
    date,
  });

  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    // Первое касание — подсказка, второе — переход. У мыши и клавиатуры
    // подсказка уже видна наведением или фокусом, клик сразу ведёт.
    if (pointer.current === 'touch' && !open) {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <Box role="listitem" sx={{ display: 'inline-flex' }}>
      {/* Касание мимо медали закрывает подсказку: у пальца нет «увести курсор». */}
      <ClickAwayListener
        onClickAway={() => {
          setOpen(false);
        }}
      >
        <Tooltip
          open={open}
          onOpen={() => {
            setOpen(true);
          }}
          onClose={() => {
            setOpen(false);
          }}
          // Касание ведёт подсказку само, иначе она мигала бы на каждом тапе.
          disableTouchListener
          arrow
          title={
            <>
              <Box component="span" sx={{ display: 'block', fontWeight: 600 }}>
                {award.tournament.name}
              </Box>
              {date}
            </>
          }
        >
          <Link
            href={`/tournaments/${award.tournament.id}`}
            aria-label={label}
            data-medal={award.place}
            onPointerDown={(event) => {
              pointer.current = event.pointerType;
            }}
            onClick={click}
            sx={{
              width: 44,
              height: 44,
              display: 'inline-grid',
              placeItems: 'center',
              borderRadius: '50%',
              textDecoration: 'none',
              '&:hover': { textDecoration: 'none' },
              '&:focus-visible': { outline: '2px solid var(--red-600)', outlineOffset: '-2px' },
            }}
          >
            <Box
              component="span"
              aria-hidden
              sx={{
                width: 30,
                height: 30,
                display: 'inline-grid',
                placeItems: 'center',
                borderRadius: '50%',
                bgcolor: MEDAL[award.place],
                color: 'var(--ink-900)',
                fontSize: 13,
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                boxShadow: 'inset 0 -2px 0 rgb(31 31 29 / 0.12)',
                transition: 'transform var(--dur-fast) var(--ease)',
                '@media (hover: hover)': { 'a:hover > &': { transform: 'scale(1.08)' } },
              }}
            >
              {award.place}
            </Box>
          </Link>
        </Tooltip>
      </ClickAwayListener>
    </Box>
  );
}

/** «Все призовые турниры» — тот же список строками: дата, турнир, клуб, место. */
function AwardList({
  id,
  awards,
}: {
  readonly id: string;
  readonly awards: readonly PlayerAwardView[];
}): ReactNode {
  const locale = useLocale();

  return (
    <Table id={id} size="small" sx={{ mt: 2 }} data-award-list>
      <TableBody>
        {awards.map((award) => (
          <TableRow key={award.tournament.id}>
            <TableCell sx={{ pl: 0, width: 32 }}>
              <RankBadge rank={award.place} />
            </TableCell>
            <TableCell>
              <Link href={`/tournaments/${award.tournament.id}`} color="inherit">
                {award.tournament.name}
              </Link>
            </TableCell>
            <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' }, color: 'text.secondary' }}>
              {award.club.name}
            </TableCell>
            <TableCell align="right" sx={{ pr: 0, color: 'text.secondary', whiteSpace: 'nowrap' }}>
              {formatDate(award.tournament.startsAt, locale)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Награды по клубам. Порядок клубов — по самой свежей награде, внутри клуба —
 * свежие слева: сервер отдаёт награды свежими сверху, и порядок сохраняется.
 */
function byClub(awards: readonly PlayerAwardView[]): readonly ClubAwards[] {
  const rows = new Map<string, { club: ClubRef; awards: PlayerAwardView[] }>();

  for (const award of awards) {
    const row = rows.get(award.club.id) ?? { club: award.club, awards: [] };
    row.awards.push(award);
    rows.set(award.club.id, row);
  }

  return [...rows.values()];
}
