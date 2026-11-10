import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import { reloadUser } from '@/features/auth/session';

import { claimPlayer } from './api';
import { PlayerCandidate, PlayerSearchField } from './player-pick';
import { usePlayerSearch } from './player-search';
import { playerKeys } from './queries';

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
 * раз — в той же карточке, без диалога. Карточка та же, что при
 * регистрации (`player-pick.tsx`): поиск по мере набора, фото, город,
 * год рождения, уровень и рейтинг.
 */
export default function ClaimProfile({ hasSheet }: ClaimProfileProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  const found = usePlayerSearch(search);

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
    <Box sx={{ display: 'grid', gap: 1.5, maxWidth: 640 }}>
      <Typography variant="body2" color="text.secondary">
        {t('claim.lead')}
      </Typography>
      {hasSheet && (
        <Typography variant="body2" color="text.secondary">
          {t('claim.sheet')}
        </Typography>
      )}

      <PlayerSearchField
        label={t('claim.search')}
        value={search}
        onChange={(value) => {
          setChosen(null);
          setSearch(value);
        }}
        loading={found.isFetching}
      />

      {claim.error !== null && <Alert severity="error">{t(errorMessageKey(claim.error))}</Alert>}

      {found.items !== undefined &&
        (found.items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t('claim.empty')}
          </Typography>
        ) : (
          <Box
            component="ul"
            aria-label={t('claim.results')}
            sx={{ m: 0, p: 0, listStyle: 'none', display: 'grid', gap: 1 }}
          >
            {found.items.map((player) => {
              const isChosen = chosen === player.id;

              return (
                <li key={player.id}>
                  <PlayerCandidate
                    player={player}
                    selected={isChosen}
                    {...(isChosen ? { note: t('claim.confirm') } : {})}
                    action={
                      isChosen ? (
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            loading={claim.isPending}
                            onClick={() => {
                              claim.mutate(player.id);
                            }}
                            sx={{ minHeight: 40 }}
                            data-claim
                          >
                            {t('claim.yes')}
                          </Button>
                          <Button
                            variant="text"
                            onClick={() => {
                              setChosen(null);
                            }}
                            sx={{ minHeight: 40 }}
                          >
                            {t('claim.no')}
                          </Button>
                        </Stack>
                      ) : (
                        <Button
                          variant="outlined"
                          onClick={() => {
                            setChosen(player.id);
                          }}
                          sx={{ minHeight: 40 }}
                        >
                          {t('claim.action')}
                        </Button>
                      )
                    }
                  />
                </li>
              );
            })}
          </Box>
        ))}
    </Box>
  );
}
