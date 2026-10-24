import type { DuelItemView } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

import { fill, formatDate, useLocale, useT } from '@/common/i18n';

import { DuelBadges, DuelPlayerLine, ScoreLine, SlotList, VenueLine } from './duel-parts';
import { duelHref, formatSlot } from './labels';

/**
 * Карточка доски — `docs/13` 5.1. Открытое предложение: вид и формат,
 * автор с рейтингом и городом, место, варианты времени, комментарий и
 * «Откликнуться». Сыгранная — счёт и дата: по ним видно, кто с кем и как
 * играет. Отклик — на странице дуэли: там выбирают вариант времени.
 */
export default function DuelCard({ duel }: { readonly duel: DuelItemView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const titleId = `duel-${duel.id}`;
  const played = duel.result !== null;

  return (
    <Paper
      variant="outlined"
      component="article"
      aria-labelledby={titleId}
      data-duel-card={duel.id}
      sx={{
        p: { xs: 2, sm: 3 },
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <DuelBadges duel={duel} />
        {played && duel.startsAt !== null && (
          <Typography variant="body2" color="text.secondary">
            {formatDate(duel.startsAt, locale)}
          </Typography>
        )}
      </Box>

      {/* Заголовок карточки для чтеца экрана — имя автора: на доске ищут людей. */}
      <Box id={titleId}>
        {played ? (
          <ScoreLine duel={duel} />
        ) : (
          <DuelPlayerLine
            player={duel.author}
            {...(duel.opponent === null
              ? {}
              : {
                  meta: (
                    <Typography variant="body2" color="text.secondary">
                      {fill(t('duel.card.vs'), { name: duel.opponent.name })}
                    </Typography>
                  ),
                })}
          />
        )}
      </Box>

      {!played && (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <VenueLine venue={duel.venue} />
          {duel.startsAt !== null && duel.endsAt !== null ? (
            <Typography sx={{ pl: 3, fontVariantNumeric: 'tabular-nums' }}>
              {formatSlot(duel.startsAt, duel.endsAt, locale)}
            </Typography>
          ) : (
            <SlotList slots={duel.slots} />
          )}
        </Box>
      )}

      {!played && duel.note !== null && (
        <Typography
          color="text.secondary"
          sx={{
            overflowWrap: 'anywhere',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {duel.note}
        </Typography>
      )}

      <Box sx={{ mt: 'auto' }}>
        <Button
          href={duelHref(duel.id)}
          variant={duel.status === 'OPEN' ? 'contained' : 'outlined'}
          sx={{ minHeight: 44, width: { xs: '100%', sm: 'auto' } }}
        >
          {t(duel.status === 'OPEN' ? 'duel.card.respond' : 'duel.card.open')}
        </Button>
      </Box>
    </Paper>
  );
}
