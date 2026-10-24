import {
  DUEL_BEST_OF,
  DUEL_SLOTS_MAX,
  createDuelSchema,
  type CreateDuelInput,
  type DuelBestOf,
  type DuelKind,
  type DuelPlayer,
  type PlayerView,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { fill, useT } from '@/common/i18n';
import { searchId } from '@/common/search';
import PageHeader from '@/common/ui/page-header';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import { ClubPicker } from '@/features/coaches/editor/pickers';
import { createDuel } from '@/features/duels/api';
import { DuelPlayerLine } from '@/features/duels/duel-parts';
import {
  BEST_OF_KEYS,
  DUELS_HREF,
  KIND_KEYS,
  duelErrorText,
  duelHref,
  newDuelHref,
} from '@/features/duels/labels';
import { useDuelUpdated } from '@/features/duels/queries';
import SlotEditor from '@/features/duels/slot-editor';
import { EMPTY_SLOT, slotProblem, toSlotInput, type SlotDraft } from '@/features/duels/slot-draft';
import CityPicker from '@/features/places/city-picker';
import { playerName } from '@/features/players/player-name';
import { playerQuery } from '@/features/players/queries';

const searchSchema = z.object({
  /** Вызов этому игроку; без него — публикация для всех. */
  opponent: searchId,
});

export const Route = createFileRoute('/_app/duels/new')({
  validateSearch: (search: Record<string, unknown>) => searchSchema.parse(search),
  component: NewDuelPage,
});

const KINDS: readonly DuelKind[] = ['DUEL', 'SPARRING'];

type VenueMode = 'CLUB' | 'OWN';

/**
 * Предложить игру — ADR-065, `docs/13` 3.1 и 5.2.
 *
 * С `?opponent=` — вызов этому игроку (кнопка в его профиле), без —
 * публикация на доске. Писать может только игрок с профилем: без него у
 * предложения нет ни рейтинга, ни города (`DUEL_PROFILE_REQUIRED`).
 */
function NewDuelPage(): ReactNode {
  const t = useT();
  const search = Route.useSearch();
  const user = useSessionStore((state) => state.user);
  const challenge = search.opponent !== undefined;

  return (
    <Container maxWidth="md" component="section" sx={{ py: { xs: 5, sm: 6 } }}>
      <PageHeader
        back={{ href: DUELS_HREF, label: t('page.duels.title') }}
        title={t(challenge ? 'duel.new.challengeTitle' : 'duel.new.title')}
        subtitle={t(challenge ? 'duel.new.challengeLead' : 'duel.new.lead')}
      />

      {user?.playerId == null ? (
        <Alert
          severity="info"
          icon={false}
          data-duel-gate="profile"
          action={
            <Button href="/settings/profile" color="inherit" sx={{ minHeight: 44 }}>
              {t('duel.gate.profileAction')}
            </Button>
          }
        >
          {t('error.api.DUEL_PROFILE_REQUIRED')}
        </Alert>
      ) : (
        <DuelForm me={user.playerId} opponentId={search.opponent} />
      )}
    </Container>
  );
}

function DuelForm({
  me,
  opponentId,
}: {
  readonly me: string;
  readonly opponentId: string | undefined;
}): ReactNode {
  const t = useT();
  const navigate = Route.useNavigate();
  const updated = useDuelUpdated();
  // Город своего зала по умолчанию — город игрока: играют обычно рядом.
  const self = useQuery(playerQuery(me));
  const opponent = useQuery({
    ...playerQuery(opponentId ?? ''),
    enabled: opponentId !== undefined,
  });

  const [kind, setKind] = useState<DuelKind>('DUEL');
  const [sparringRated, setSparringRated] = useState(false);
  const [bestOf, setBestOf] = useState<DuelBestOf>(5);
  const [venueMode, setVenueMode] = useState<VenueMode>('CLUB');
  const [club, setClub] = useState<{ readonly id: string; readonly name: string } | null>(null);
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [cityId, setCityId] = useState<string | null>(null);
  const [slots, setSlots] = useState<readonly SlotDraft[]>([EMPTY_SLOT]);
  const [note, setNote] = useState('');
  // Как связаться — по умолчанию телефон аккаунта (ADR-068 §3).
  const accountPhone = useSessionStore((state) => state.user?.phone ?? '');
  const [contact, setContact] = useState(accountPhone);
  // Ошибки у полей — после первой попытки отправить, не с первого символа.
  const [tried, setTried] = useState(false);
  // «Сейчас» — на момент отправки: вариант, ставший прошлым, пока человек
  // заполнял форму, сервер всё равно отвергнет.
  const [now, setNow] = useState(() => new Date());

  const city = cityId ?? self.data?.city.id ?? '';
  const rated = kind === 'DUEL' || sparringRated;
  const slotInputs = slots.map(toSlotInput);
  const input = {
    kind,
    rated,
    ...(rated ? { bestOf } : {}),
    ...(opponentId === undefined ? {} : { opponentId }),
    ...(venueMode === 'CLUB'
      ? club === null
        ? {}
        : { clubId: club.id }
      : {
          ...(venueName.trim() === '' ? {} : { venueName: venueName.trim() }),
          ...(venueAddress.trim() === '' ? {} : { venueAddress: venueAddress.trim() }),
          ...(city === '' ? {} : { cityId: city }),
        }),
    slots: slotInputs.filter((slot) => slot !== null),
    ...(note.trim() === '' ? {} : { note: note.trim() }),
    ...(contact.trim() === '' ? {} : { contact: contact.trim() }),
  };
  // Та же схема, что на сервере; время — своими правилами (`slotProblem`).
  const parsed = createDuelSchema.safeParse(input);
  const problems = slots.map((slot) => slotProblem(slot, now));
  const issue = (field: string): boolean =>
    !parsed.success && parsed.error.issues.some((item) => item.path[0] === field);
  const opponentInvalid =
    opponent.data !== undefined && (opponent.data.userId === null || opponent.data.id === me);

  const send = useMutation({
    mutationFn: (body: CreateDuelInput) => createDuel(body),
    onSuccess: async (view) => {
      await updated(view);
      await navigate({ href: duelHref(view.id) });
    },
  });

  const kindLabel = useId();
  const formatLabel = useId();
  const venueLabel = useId();

  return (
    <Box
      component="form"
      noValidate
      data-duel-form
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        const moment = new Date();
        setNow(moment);
        const fresh = slots.map((slot) => slotProblem(slot, moment));
        if (parsed.success && fresh.every((problem) => problem === null) && !opponentInvalid) {
          send.mutate(parsed.data);
        }
      }}
      sx={{ display: 'grid', gap: 3 }}
    >
      {opponentId !== undefined && (
        <Surface title={t('duel.new.opponent')}>
          {opponent.data === undefined ? (
            <Typography color="text.secondary">
              {opponent.isError ? t('player.notFound') : t('common.loading')}
            </Typography>
          ) : (
            <Box data-duel-opponent={opponent.data.id}>
              <DuelPlayerLine player={asDuelPlayer(opponent.data)} />
              {opponentInvalid && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  {t(
                    opponent.data.id === me
                      ? 'duel.error.opponent.SELF'
                      : 'duel.error.opponent.NO_ACCOUNT',
                  )}
                </Alert>
              )}
            </Box>
          )}
          <Button href={newDuelHref()} variant="text" sx={{ mt: 1.5, minHeight: 44 }}>
            {t('duel.new.toEveryone')}
          </Button>
        </Surface>
      )}

      <Surface title={t('duel.new.game')}>
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          <Box>
            <Typography id={kindLabel} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t('duel.new.kind')}
            </Typography>
            <ToggleButtonGroup
              exclusive
              fullWidth
              aria-labelledby={kindLabel}
              value={kind}
              onChange={(_, next: DuelKind | null) => {
                // Повторное нажатие не снимает выбор: вид есть всегда.
                if (next !== null) setKind(next);
              }}
            >
              {KINDS.map((option) => (
                <ToggleButton key={option} value={option} sx={{ minHeight: 44 }}>
                  {t(KIND_KEYS[option])}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t(kind === 'DUEL' ? 'duel.new.kindHint.DUEL' : 'duel.new.kindHint.SPARRING')}
            </Typography>
          </Box>

          {kind === 'SPARRING' && (
            <FormControlLabel
              control={
                <Switch
                  checked={sparringRated}
                  onChange={(event) => {
                    setSparringRated(event.target.checked);
                  }}
                />
              }
              label={t('duel.new.rated')}
              sx={{ minHeight: 44, mr: 0 }}
            />
          )}

          {rated && (
            <Box>
              <Typography id={formatLabel} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {t('duel.new.format')}
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                aria-labelledby={formatLabel}
                value={bestOf}
                onChange={(_, next: DuelBestOf | null) => {
                  if (next !== null) setBestOf(next);
                }}
              >
                {DUEL_BEST_OF.map((option) => (
                  <ToggleButton key={option} value={option} sx={{ minHeight: 44 }}>
                    {t(BEST_OF_KEYS[option])}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('duel.new.ratedHint')}
              </Typography>
            </Box>
          )}
        </Box>
      </Surface>

      <Surface title={t('duel.new.venue')}>
        <Box sx={{ display: 'grid', gap: 2 }}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            aria-labelledby={venueLabel}
            value={venueMode}
            onChange={(_, next: VenueMode | null) => {
              if (next !== null) setVenueMode(next);
            }}
          >
            <ToggleButton value="CLUB" sx={{ minHeight: 44 }}>
              {t('duel.venue.club')}
            </ToggleButton>
            <ToggleButton value="OWN" sx={{ minHeight: 44 }}>
              {t('duel.venue.own')}
            </ToggleButton>
          </ToggleButtonGroup>
          <Typography id={venueLabel} variant="body2" color="text.secondary">
            {t(venueMode === 'CLUB' ? 'duel.venue.clubHint' : 'duel.venue.ownHint')}
          </Typography>

          {venueMode === 'CLUB' ? (
            <Box>
              <ClubPicker
                value={club?.id ?? null}
                name={club?.name ?? ''}
                error={tried && club === null}
                onChange={setClub}
                label={t('duel.venue.clubLabel')}
                noOptions={t('duel.venue.noClub')}
              />
              {tried && club === null && (
                <Typography role="alert" variant="body2" color="error" sx={{ mt: 0.5 }}>
                  {t('duel.venue.clubError')}
                </Typography>
              )}
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              <TextField
                label={t('duel.venue.name')}
                value={venueName}
                onChange={(event) => {
                  setVenueName(event.target.value);
                }}
                required
                error={tried && venueName.trim() === ''}
                helperText={t('duel.venue.nameHint')}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
              <TextField
                label={t('duel.venue.address')}
                value={venueAddress}
                onChange={(event) => {
                  setVenueAddress(event.target.value);
                }}
                required
                error={tried && venueAddress.trim() === ''}
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
              <CityPicker
                value={city}
                onChange={setCityId}
                label={t('duel.venue.city')}
                {...(tried && issue('cityId') ? { error: 'duel.venue.cityError' } : {})}
              />
            </Box>
          )}
        </Box>
      </Surface>

      <Surface title={t('duel.new.time')} subtitle={t('duel.new.timeLead')}>
        <Box sx={{ display: 'grid', gap: 2.5 }}>
          {slots.map((slot, index) => (
            <SlotEditor
              // Варианты не переставляются, поля управляемые: порядковый ключ
              // не сбивает значения при удалении среднего.
              key={index}
              label={fill(t('duel.slot.label'), { n: String(index + 1) })}
              value={slot}
              problem={tried ? (problems[index] ?? null) : null}
              onChange={(next) => {
                setSlots(slots.map((item, position) => (position === index ? next : item)));
              }}
              onRemove={
                slots.length > 1
                  ? () => {
                      setSlots(slots.filter((_, position) => position !== index));
                    }
                  : undefined
              }
            />
          ))}
          {slots.length < DUEL_SLOTS_MAX && (
            <Box>
              <Button
                variant="text"
                startIcon={<Plus size={16} aria-hidden />}
                onClick={() => {
                  setSlots([...slots, EMPTY_SLOT]);
                }}
                sx={{ minHeight: 44 }}
              >
                {t('duel.slot.add')}
              </Button>
            </Box>
          )}
        </Box>
      </Surface>

      <Surface>
        <TextField
          label={t('duel.contact.label')}
          value={contact}
          onChange={(event) => {
            setContact(event.target.value);
          }}
          helperText={t('duel.contact.hint')}
          fullWidth
          slotProps={{ htmlInput: { maxLength: 100 } }}
          sx={{ mb: 2.5 }}
        />
        <TextField
          label={t('duel.new.note')}
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
          }}
          helperText={t('duel.new.noteHint')}
          multiline
          minRows={3}
          fullWidth
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
      </Surface>

      {send.error !== null && (
        <Alert severity="error" data-duel-error>
          {duelErrorText(send.error, t, me)}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <Button href={DUELS_HREF} variant="text" sx={{ minHeight: 44 }}>
          {t('duel.action.cancel')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={send.isPending || opponentInvalid}
          sx={{ minHeight: 44, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}
        >
          {send.isPending
            ? t('common.loading')
            : t(opponentId === undefined ? 'duel.new.publish' : 'duel.new.challenge')}
        </Button>
      </Box>
    </Box>
  );
}

/** Игрок из профиля — в вид игрока дуэли для строки с фото и рейтингом. */
function asDuelPlayer(player: PlayerView): DuelPlayer {
  return {
    id: player.id,
    name: playerName(player),
    photoUrl: player.photoUrl,
    rating: player.rating,
    isProvisional: player.isProvisional,
    city: player.city,
  };
}
