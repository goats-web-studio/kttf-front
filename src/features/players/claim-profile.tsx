import type { PlayerListItemView } from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { formatRating, useT } from '@/common/i18n';
import { reloadUser } from '@/features/auth/session';
import { usePlaceName } from '@/features/places/place-name';

import { claimPlayer } from './api';
import { playerName } from './player-name';
import { playerKeys, playersQuery } from './queries';

interface ClaimProfileProps {
  /** У вошедшего уже есть своя анкета без рейтинга — она вольётся в найденный профиль. */
  readonly hasSheet: boolean;
}

/**
 * «Мой рейтинг», как у RTTF, — привязка к игровому профилю (ADR-072).
 *
 * Профиль с рейтингом заводит организатор, когда человек впервые приходит
 * на турнир. Человек находит в нём себя и привязывает к кабинету — сразу
 * при регистрации или позже, здесь. Искать — только среди профилей без
 * кабинета: остальные уже чьи-то.
 *
 * Привязку человек отменить сам не может, поэтому «Это я» спрашивает ещё
 * раз — в той же строке, без диалога.
 */
export default function ClaimProfile({ hasSheet }: ClaimProfileProps): ReactNode {
  const t = useT();
  const placeName = usePlaceName();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);

  const found = useQuery({
    ...playersQuery({ search, withoutAccount: true, page: 1, limit: 10 }),
    enabled: search.length >= 2,
  });

  const claim = useMutation({
    mutationFn: claimPlayer,
    onSuccess: async (player) => {
      // В сессии меняется `playerId`: прежняя анкета, если была, удалена.
      await reloadUser();
      await queryClient.invalidateQueries({ queryKey: playerKeys.all });
      await navigate({ to: '/players/$playerId', params: { playerId: player.id } });
    },
  });

  return (
    <>
      <Typography variant="body2" color="text.secondary">
        {t('claim.lead')}
      </Typography>
      {hasSheet && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t('claim.sheet')}
        </Typography>
      )}

      <Stack
        component="form"
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mt: 2, alignItems: { sm: 'flex-start' } }}
        onSubmit={(event) => {
          event.preventDefault();
          setChosen(null);
          setSearch(draft.trim());
        }}
      >
        <TextField
          label={t('claim.search')}
          value={draft}
          type="search"
          autoComplete="off"
          onChange={(event) => {
            setDraft(event.target.value);
          }}
          sx={{ maxWidth: { sm: 320 } }}
        />
        <Button type="submit" sx={{ minHeight: { xs: 44, sm: 40 } }}>
          {t('claim.find')}
        </Button>
      </Stack>

      {claim.error !== null && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {t(errorMessageKey(claim.error))}
        </Alert>
      )}

      {search.length >= 2 && found.data !== undefined && (
        <List dense disablePadding aria-label={t('claim.results')} sx={{ mt: 1 }}>
          {found.data.items.length === 0 ? (
            <ListItem disableGutters>
              <Typography variant="body2" color="text.secondary">
                {t('claim.empty')}
              </Typography>
            </ListItem>
          ) : (
            found.data.items.map((player) => (
              <Candidate
                key={player.id}
                player={player}
                city={placeName(player.city)}
                isChosen={chosen === player.id}
                isPending={claim.isPending}
                onChoose={() => {
                  setChosen(player.id);
                }}
                onCancel={() => {
                  setChosen(null);
                }}
                onClaim={() => {
                  claim.mutate(player.id);
                }}
              />
            ))
          )}
        </List>
      )}
    </>
  );
}

function Candidate({
  player,
  city,
  isChosen,
  isPending,
  onChoose,
  onCancel,
  onClaim,
}: {
  readonly player: PlayerListItemView;
  readonly city: string;
  readonly isChosen: boolean;
  readonly isPending: boolean;
  readonly onChoose: () => void;
  readonly onCancel: () => void;
  readonly onClaim: () => void;
}): ReactNode {
  const t = useT();

  return (
    <ListItem disableGutters divider sx={{ flexWrap: 'wrap', gap: 1 }}>
      <ListItemText
        primary={playerName(player)}
        secondary={`${city} · ${String(player.birthYear)} · ${formatRating(player.rating)}`}
        sx={{ minWidth: 200 }}
      />
      {isChosen ? (
        <Stack direction="row" spacing={1}>
          <Button disabled={isPending} onClick={onClaim} sx={{ minHeight: 44 }} data-claim>
            {t('claim.yes')}
          </Button>
          <Button variant="text" onClick={onCancel} sx={{ minHeight: 44 }}>
            {t('claim.no')}
          </Button>
        </Stack>
      ) : (
        <Button variant="text" onClick={onChoose} sx={{ minHeight: 44 }}>
          {t('claim.action')}
        </Button>
      )}
    </ListItem>
  );
}
