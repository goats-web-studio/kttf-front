import { DEFAULT_PAGE_SIZE, type MentionKind } from '@kttf/shared/types';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { formatRating, useT, type MessageKey } from '@/common/i18n';
import PillTabs from '@/common/ui/pill-tabs';
import { clubsQuery } from '@/features/clubs/queries';
import { coachesQuery } from '@/features/coaches/queries';
import { suggestQuery } from '@/features/market/queries';
import { playersQuery } from '@/features/players/queries';

/** Что можно отметить из окна: турнир отмечают ссылкой на его страницу. */
type Pickable = Exclude<MentionKind, 'tournament'>;

const TABS: readonly (readonly [Pickable, MessageKey])[] = [
  ['player', 'rich.mention.player'],
  ['club', 'rich.mention.club'],
  ['coach', 'rich.mention.coach'],
  ['product', 'rich.mention.product'],
];

export interface PickedMention {
  readonly target: MentionKind;
  readonly ref: string;
  readonly label: string;
}

interface Row {
  readonly ref: string;
  readonly label: string;
  readonly hint: string;
}

/**
 * «Отметить» — ADR-076: игрок, клуб, тренер или товар каталога поиском по
 * имени. В текст встаёт отметка — ссылка на страницу, которую видно и в
 * ленте, и на форуме.
 */
export default function MentionPicker({
  initial = 'player',
  onPick,
  onClose,
}: {
  readonly initial?: Pickable;
  readonly onPick: (mention: PickedMention) => void;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const [tab, setTab] = useState<Pickable>(initial);
  const [search, setSearch] = useState('');
  const q = search.trim();
  const enabled = q.length >= 2;

  const players = useQuery({
    ...playersQuery({ page: 1, limit: 8, search: q }),
    enabled: enabled && tab === 'player',
  });
  const clubs = useQuery({
    ...clubsQuery({ page: 1, limit: DEFAULT_PAGE_SIZE, search: q }),
    enabled: enabled && tab === 'club',
  });
  const coaches = useQuery({
    ...coachesQuery({ page: 1, limit: 8, search: q }),
    enabled: enabled && tab === 'coach',
  });
  const products = useQuery({ ...suggestQuery(q), enabled: enabled && tab === 'product' });

  const rows: readonly Row[] =
    tab === 'player'
      ? (players.data?.items ?? []).map((player) => ({
          ref: player.id,
          label: `${player.lastName} ${player.firstName}`,
          hint: player.confirmed ? formatRating(player.rating) : player.city.name,
        }))
      : tab === 'club'
        ? (clubs.data?.items ?? []).slice(0, 8).map((club) => ({
            ref: club.id,
            label: club.name,
            hint: club.city.name,
          }))
        : tab === 'coach'
          ? (coaches.data?.items ?? []).map((coach) => ({
              ref: coach.slug,
              label: `${coach.player.lastName} ${coach.player.firstName}`,
              hint: coach.city?.name ?? '',
            }))
          : (products.data ?? []).slice(0, 8).map((product) => ({
              ref: product.slug,
              label: product.name,
              hint: product.brand.name,
            }));

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs" data-mention-picker>
      <DialogTitle>{t('rich.mention.title')}</DialogTitle>
      <DialogContent>
        <PillTabs value={tab} options={TABS} label={t('rich.mention.title')} onChange={setTab} />
        <TextField
          autoFocus
          fullWidth
          type="search"
          label={t('rich.mention.search')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
          sx={{ mt: 2 }}
        />
        {enabled && rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            {t('rich.mention.empty')}
          </Typography>
        ) : (
          <List dense sx={{ mt: 1 }}>
            {rows.map((row) => (
              <ListItemButton
                key={row.ref}
                onClick={() => {
                  onPick({ target: tab, ref: row.ref, label: row.label });
                }}
                sx={{ borderRadius: 1.5, minHeight: 44 }}
              >
                <ListItemText primary={row.label} secondary={row.hint} />
              </ListItemButton>
            ))}
          </List>
        )}
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="text" onClick={onClose}>
            {t('rich.cancel')}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
