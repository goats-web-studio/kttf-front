import type { DuelItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { fill, useLocale, useT } from '@/common/i18n';
import { RowsSkeleton } from '@/common/ui/skeleton';
import Surface from '@/common/ui/surface';
import { Badge } from '@/features/coaches/coach-cards';

import { DuelBadges } from './duel-parts';
import { DUELS_HREF, MY_DUELS_HREF, byTodo, duelHref, duelTodo, formatSlot } from './labels';
import { myDuelsQuery } from './queries';

/** Сколько активных показывает кабинет; остальное — на странице «Мои дуэли». */
const DESK_LIMIT = 20;

/**
 * «Мои дуэли» на рабочем столе — `docs/13` 5.5. Активные: вызов ждёт
 * ответа, новые отклики, подтвердить счёт — первыми, с меткой, что нужно
 * сделать. Пусто — короткая строка и путь на доску: рабочий стол отвечает
 * на «что мне сейчас делать».
 */
export default function MyDuels({ playerId }: { readonly playerId: string }): ReactNode {
  const t = useT();
  const duels = useQuery(myDuelsQuery({ scope: 'active', page: 1, limit: DESK_LIMIT }));
  // «Сейчас» — на время жизни блока: метка «внесите счёт» не мигает.
  const [now] = useState(() => new Date());
  const items = byTodo(duels.data?.items ?? [], playerId, now);

  return (
    <Surface
      title={t('duel.mine.title')}
      action={<Button href={MY_DUELS_HREF}>{t('duel.mine.history')}</Button>}
      flush
    >
      <Box data-my-duels>
        {duels.isPending ? (
          <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
            <RowsSkeleton rows={2} />
          </Box>
        ) : items.length === 0 ? (
          <Box
            sx={{
              px: { xs: 2, sm: 3 },
              pb: 2.5,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography color="text.secondary">{t('duel.mine.empty')}</Typography>
            <Button href={DUELS_HREF} variant="text" sx={{ minHeight: 44 }}>
              {t('duel.mine.find')}
            </Button>
          </Box>
        ) : (
          <DuelRows duels={items} playerId={playerId} now={now} />
        )}
      </Box>
    </Surface>
  );
}

/** Строки «моих» дуэлей — в кабинете и на странице «Мои дуэли». */
export function DuelRows({
  duels,
  playerId,
  now,
}: {
  readonly duels: readonly DuelItemView[];
  readonly playerId: string;
  readonly now: Date;
}): ReactNode {
  return (
    <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      {duels.map((duel) => (
        <DuelRow key={duel.id} duel={duel} playerId={playerId} now={now} />
      ))}
    </Box>
  );
}

function DuelRow({
  duel,
  playerId,
  now,
}: {
  readonly duel: DuelItemView;
  readonly playerId: string;
  readonly now: Date;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const todo = duelTodo(duel, playerId, now);
  const other = duel.author.id === playerId ? duel.opponent : duel.author;
  const title =
    other === null ? t('duel.mine.lookingFor') : fill(t('duel.mine.with'), { name: other.name });
  const when =
    duel.startsAt !== null && duel.endsAt !== null
      ? formatSlot(duel.startsAt, duel.endsAt, locale)
      : duel.slots[0] === undefined
        ? null
        : formatSlot(duel.slots[0].startsAt, duel.slots[0].endsAt, locale);

  return (
    <Box
      component="li"
      data-my-duel={duel.id}
      data-todo={todo ?? undefined}
      sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: 1, borderColor: 'divider' }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
        <Link
          href={duelHref(duel.id)}
          sx={{ fontWeight: 600, overflowWrap: 'anywhere', minHeight: 32, alignContent: 'center' }}
        >
          {title}
        </Link>
        {todo !== null && (
          <Badge tone="warn">
            {todo === 'duel.todo.responses'
              ? fill(t(todo), { count: String(duel.responsesNew ?? 0) })
              : t(todo)}
          </Badge>
        )}
      </Box>
      <Box sx={{ mt: 1 }}>
        <DuelBadges duel={duel} status />
      </Box>
      {when !== null && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1, fontVariantNumeric: 'tabular-nums' }}
        >
          {when}
          {duel.startsAt === null && duel.slots.length > 1
            ? ` ${fill(t('duel.mine.moreSlots'), { count: String(duel.slots.length - 1) })}`
            : ''}
        </Typography>
      )}
    </Box>
  );
}
