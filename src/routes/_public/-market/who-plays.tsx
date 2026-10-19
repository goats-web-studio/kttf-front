import type { ListPlayersRequest, ProductView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { fill, formatCount, useLocale, useT, type MessageKey } from '@/common/i18n';
import PlayerAvatar from '@/common/ui/player-avatar';
import RatingValue from '@/common/ui/rating-value';
import { useSessionStore } from '@/features/auth/session-store';
import { rememberProductLabel } from '@/features/market/picked-product';
import { marketKeys } from '@/features/market/queries';
import { updatePlayer } from '@/features/players/api';
import { playPatch, playsWith, type EquipmentSide } from '@/features/players/play-patch';
import { playerName } from '@/features/players/player-name';
import { playerKeys, playerQuery, playersQuery } from '@/features/players/queries';

/** Сколько игроков видно на странице товара; остальные — «Все игроки». */
const WHO_PLAYS = 9;

const SIDE_LABELS: Readonly<Record<EquipmentSide, { off: MessageKey; on: MessageKey }>> = {
  blade: { off: 'market.play.blade', on: 'market.play.bladeMine' },
  forehand: { off: 'market.play.forehand', on: 'market.play.forehandMine' },
  backhand: { off: 'market.play.backhand', on: 'market.play.backhandMine' },
};

/**
 * «Кто играет» — `docs/10` 3.1 (M1.2): игроки с этим основанием или
 * накладкой, сильные первыми, как отдаёт сервер. «Играю» правит свою анкету:
 * основание — одним нажатием, накладку — справа или слева.
 *
 * Никто не играет и отметиться некому — блока нет (ADR-042).
 */
export default function WhoPlays({ product }: { readonly product: ProductView }): ReactNode {
  const t = useT();
  const locale = useLocale();
  const user = useSessionStore((state) => state.user);
  const isBlade = product.category === 'BLADE';
  const filter: Pick<ListPlayersRequest, 'bladeId' | 'rubberId'> = isBlade
    ? { bladeId: product.id }
    : { rubberId: product.id };
  const players = useQuery(playersQuery({ page: 1, limit: WHO_PLAYS, ...filter }));
  const total = players.data?.total ?? 0;
  const canPlay = user !== null && user.playerId !== null;

  if (players.isPending || (total === 0 && !canPlay)) return null;

  const allHref = `/players?${isBlade ? 'bladeId' : 'rubberId'}=${product.id}`;

  return (
    <Box component="section" sx={{ mt: { xs: 4, md: 6 } }}>
      <Stack
        direction="row"
        useFlexGap
        spacing={2}
        sx={{ alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', mb: 2 }}
      >
        <Typography variant="h2">
          {total > 0
            ? fill(t('market.whoPlays.titleCount'), { count: formatCount(total, locale) })
            : t('market.whoPlays.title')}
        </Typography>
        {total > 0 && (
          <Link
            href={allHref}
            variant="body2"
            sx={{ py: 1.5 }}
            onClick={() => {
              rememberProductLabel(product.id, `${product.brand.name} ${product.name}`);
            }}
          >
            {t('market.whoPlays.all')}
          </Link>
        )}
      </Stack>

      {players.error !== null && (
        <Alert severity="error">{t(errorMessageKey(players.error))}</Alert>
      )}

      {total > 0 && (
        <Paper
          variant="outlined"
          component="ol"
          sx={{
            m: 0,
            p: 0,
            listStyle: 'none',
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' },
          }}
        >
          {(players.data?.items ?? []).map((player) => (
            <Box
              component="li"
              key={player.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                px: 2,
                py: 1.5,
                minWidth: 0,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <PlayerAvatar
                lastName={player.lastName}
                firstName={player.firstName}
                photoUrl={player.photoUrl}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Link
                  href={`/players/${player.id}`}
                  color="text.primary"
                  sx={{ fontWeight: 600, display: 'block', overflowWrap: 'anywhere' }}
                >
                  {playerName(player)}
                </Link>
              </Box>
              <RatingValue
                value={player.rating}
                sx={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}
              />
            </Box>
          ))}
        </Paper>
      )}

      <Box sx={{ mt: 2 }}>
        {user === null ? (
          <Link href={`/login?redirect=/market/items/${product.slug}`} variant="body2">
            {t('market.play.signIn')}
          </Link>
        ) : user.playerId === null ? (
          <Link href="/settings/profile" variant="body2">
            {t('market.play.createProfile')}
          </Link>
        ) : (
          <PlayControl product={product} playerId={user.playerId} />
        )}
      </Box>
    </Box>
  );
}

function PlayControl({
  product,
  playerId,
}: {
  readonly product: ProductView;
  readonly playerId: string;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const own = useQuery(playerQuery(playerId));
  const sides: readonly EquipmentSide[] =
    product.category === 'BLADE' ? ['blade'] : ['forehand', 'backhand'];

  const play = useMutation({
    mutationFn: ({ side, on }: { readonly side: EquipmentSide; readonly on: boolean }) =>
      updatePlayer(playerId, playPatch(side, product.id, on)),
    onSuccess: async (updated) => {
      queryClient.setQueryData(playerKeys.detail(playerId), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: playerKeys.all }),
        queryClient.invalidateQueries({ queryKey: marketKeys.all }),
      ]);
    },
  });

  if (own.data === undefined) return null;
  const profile = own.data;

  return (
    <Box>
      <Stack direction="row" useFlexGap spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        {sides.length > 1 && (
          <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
            {t('market.play.label')}
          </Typography>
        )}
        {sides.map((side) => {
          const mine = playsWith(profile, side, product.id);

          return (
            <Button
              key={side}
              variant={mine ? 'outlined' : sides.length === 1 ? 'contained' : 'outlined'}
              aria-pressed={mine}
              startIcon={mine ? <Check size={16} aria-hidden /> : undefined}
              disabled={play.isPending}
              onClick={() => {
                play.mutate({ side, on: !mine });
              }}
              sx={{ minHeight: 44 }}
            >
              {t(mine ? SIDE_LABELS[side].on : SIDE_LABELS[side].off)}
            </Button>
          );
        })}
      </Stack>
      {sides.some((side) => playsWith(profile, side, product.id)) && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {t('market.play.undoHint')}
        </Typography>
      )}
      {play.error !== null && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {t(errorMessageKey(play.error))}
        </Alert>
      )}
    </Box>
  );
}
