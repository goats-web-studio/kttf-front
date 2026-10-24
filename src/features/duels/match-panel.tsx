import { ERROR_CODES, isAppError } from '@kttf/shared/errors';
import {
  setsToWin,
  type DuelPlayer,
  type DuelView,
  type RescheduleDuelInput,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClock, MessageCircle, Phone, Send, Undo2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';

import { fill, formatDateTime, useLocale, useT, type MessageKey } from '@/common/i18n';
import Surface from '@/common/ui/surface';
import { phoneHref, telegramHref, whatsappHref } from '@/features/clubs/contacts';

import {
  answerReschedule,
  finishDuel,
  recordDuelSet,
  rescheduleDuel,
  setDuelContact,
  startDuel,
  undoDuelSet,
} from './api';
import { ReportPanel } from './duel-actions';
import { VenueLine } from './duel-parts';
import {
  MATCH_STAGES,
  duelContact,
  duelErrorText,
  formatSlot,
  matchStage,
  setsOf,
  type MatchStage,
} from './labels';
import { duelKeys, useDuelAction } from './queries';
import { EMPTY_SLOT, slotProblem, toSlotInput, type SlotDraft } from './slot-draft';
import SlotEditor from './slot-editor';

const STAGE_KEYS: Readonly<Record<MatchStage, MessageKey>> = {
  scheduled: 'duel.match.stage.scheduled',
  game: 'duel.match.stage.game',
  score: 'duel.match.stage.score',
  confirm: 'duel.match.stage.confirm',
};

/**
 * Блок «Матч» на странице дуэли — ADR-068, `docs/13` 3.7. После
 * согласования страница не молчит: этапы, когда и где, контакт соперника,
 * перенос, «Начать матч» и табло по партиям, которым пользуются прямо у
 * стола. Кнопки — по `view.can`, правила времени и состояний — на сервере.
 */
export default function MatchPanel({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const { opponent } = duel;
  if (opponent === null) return null;

  const stage = matchStage(duel);
  const started = duel.startedAt !== null && duel.status === 'SCHEDULED';

  return (
    <Surface title={t('duel.match.title')}>
      <Box sx={{ display: 'grid', gap: 3 }} data-duel-match={stage}>
        {/* У нерейтингового спарринга табло и счёта нет — этапы ни к чему. */}
        {duel.rated && <StageStrip stage={stage} />}
        {duel.status === 'SCHEDULED' &&
          (started ? (
            <Scoreboard duel={duel} me={me} author={duel.author} opponent={opponent} />
          ) : (
            <BeforeStart duel={duel} me={me} />
          ))}
      </Box>
    </Surface>
  );
}

/** Этапы строкой: пройденные и текущий — тёмные, текущий — с акцентом. */
function StageStrip({ stage }: { readonly stage: MatchStage }): ReactNode {
  const t = useT();
  const current = MATCH_STAGES.indexOf(stage);

  return (
    <Box
      component="ol"
      aria-label={t('duel.match.stages')}
      sx={{
        m: 0,
        p: 0,
        listStyle: 'none',
        display: 'grid',
        gridTemplateColumns: `repeat(${String(MATCH_STAGES.length)}, minmax(0, 1fr))`,
        gap: 0.5,
      }}
    >
      {MATCH_STAGES.map((item, index) => {
        const active = index === current;
        const done = index < current;

        return (
          <Box
            component="li"
            key={item}
            aria-current={active ? 'step' : undefined}
            data-stage={item}
            sx={{
              pt: 1,
              borderTop: '3px solid',
              borderColor: active ? 'var(--red-600)' : done ? 'var(--ink-700)' : 'var(--line)',
              color: active || done ? 'text.primary' : 'text.secondary',
              fontSize: { xs: 12, sm: 14 },
              fontWeight: active ? 700 : 500,
              lineHeight: 1.3,
            }}
          >
            {t(STAGE_KEYS[item])}
          </Box>
        );
      })}
    </Box>
  );
}

// ---------------------------------------------------------------- до начала

function BeforeStart({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const [rescheduling, setRescheduling] = useState(false);
  const [manual, setManual] = useState(false);
  const start = useDuelAction(() => startDuel(duel.id));
  // «Сейчас» — на время жизни блока: подсказка не мигает.
  const [now] = useState(() => Date.now());
  const startable =
    duel.startableAt !== null && Date.parse(duel.startableAt) > now ? duel.startableAt : null;

  return (
    <>
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {duel.startsAt !== null && duel.endsAt !== null && (
          <Typography
            component="p"
            data-duel-when
            sx={{
              fontSize: { xs: 22, sm: 28 },
              lineHeight: 1.2,
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {formatSlot(duel.startsAt, duel.endsAt, locale)}
          </Typography>
        )}
        <VenueLine venue={duel.venue} />
        {duel.rated && startable !== null && (
          <Typography color="text.secondary" data-duel-startable>
            {fill(t('duel.match.startableAt'), { at: formatDateTime(startable, locale) })}
          </Typography>
        )}
      </Box>

      {duel.contacts !== null && <Contacts duel={duel} me={me} />}

      {duel.reschedule !== null && <RescheduleCard duel={duel} me={me} />}

      {start.error !== null && (
        <Alert severity="error" data-duel-error>
          {duelErrorText(start.error, t, me)}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
        {duel.can.start && (
          <Button
            variant="contained"
            size="large"
            disabled={start.isPending}
            onClick={() => {
              start.mutate(undefined);
            }}
            sx={{ minHeight: 56, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}
          >
            {t('duel.match.start')}
          </Button>
        )}
        {duel.can.reschedule && (
          <Button
            variant="outlined"
            startIcon={<CalendarClock size={18} aria-hidden />}
            onClick={() => {
              setRescheduling(true);
            }}
            sx={{ minHeight: 44 }}
          >
            {t('duel.reschedule.action')}
          </Button>
        )}
      </Box>

      {/* Табло не вели — счёт можно внести и вручную, тем же правилом времени. */}
      {duel.can.report &&
        (manual ? (
          <ReportPanel duel={duel} me={me} />
        ) : (
          <Box>
            <Link
              component="button"
              type="button"
              onClick={() => {
                setManual(true);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('duel.match.manual')}
            </Link>
          </Box>
        ))}

      <RescheduleDialog
        duel={duel}
        me={me}
        open={rescheduling}
        onClose={() => {
          setRescheduling(false);
        }}
      />
    </>
  );
}

/**
 * Контакты: соперника — ссылками на звонок, WhatsApp, Telegram, если строка
 * на них похожа; свой — правится здесь же. Видят только участники
 * согласованной игры (`contacts` у остальных `null`).
 */
function Contacts({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const contacts = duel.contacts;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(contacts?.mine ?? '');
  const save = useDuelAction((contact: string | null) => setDuelContact(duel.id, { contact }));
  if (contacts === null) return null;

  return (
    <Box
      sx={{ p: 2, borderRadius: 3, bgcolor: 'var(--paper-sunken)', display: 'grid', gap: 1.5 }}
      data-duel-contacts
    >
      <Box>
        <Typography variant="body2" color="text.secondary">
          {t('duel.contact.counterpart')}
        </Typography>
        {contacts.counterpart === null ? (
          <Typography color="text.secondary">{t('duel.contact.none')}</Typography>
        ) : (
          <ContactLinks value={contacts.counterpart} />
        )}
      </Box>

      <Box>
        <Typography variant="body2" color="text.secondary">
          {t('duel.contact.mine')}
        </Typography>
        {editing ? (
          <Box
            component="form"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = value.trim();
              save.mutate(trimmed === '' ? null : trimmed, {
                onSuccess: () => {
                  setEditing(false);
                },
              });
            }}
            sx={{ mt: 0.5, display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}
          >
            <TextField
              label={t('duel.contact.label')}
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
              }}
              helperText={t('duel.contact.hint')}
              slotProps={{ htmlInput: { maxLength: 100 } }}
              sx={{ flex: '1 1 240px' }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={save.isPending}
              sx={{ minHeight: 44 }}
            >
              {t('duel.contact.save')}
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography sx={{ overflowWrap: 'anywhere' }} data-duel-contact-mine>
              {contacts.mine ?? t('duel.contact.notSet')}
            </Typography>
            <Button
              variant="text"
              onClick={() => {
                setValue(contacts.mine ?? '');
                setEditing(true);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('duel.contact.edit')}
            </Button>
          </Box>
        )}
        {save.error !== null && (
          <Alert severity="error" sx={{ mt: 1 }} data-duel-error>
            {duelErrorText(save.error, t, me)}
          </Alert>
        )}
      </Box>
    </Box>
  );
}

/** Строка контакта и ссылки по её виду. */
export function ContactLinks({ value }: { readonly value: string }): ReactNode {
  const t = useT();
  const contact = duelContact(value);

  return (
    <Box sx={{ display: 'grid', gap: 0.5 }} data-duel-contact={contact.kind}>
      <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{value}</Typography>
      {contact.kind === 'PHONE' && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            size="small"
            href={phoneHref(contact.phone)}
            startIcon={<Phone size={16} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {t('club.contact.call')}
          </Button>
          <Button
            size="small"
            href={whatsappHref(contact.phone)}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<MessageCircle size={16} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {t('club.contact.whatsapp')}
          </Button>
        </Box>
      )}
      {contact.kind === 'TELEGRAM' && (
        <Box>
          <Button
            size="small"
            href={telegramHref(contact.handle)}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<Send size={16} aria-hidden />}
            sx={{ minHeight: 44 }}
          >
            {t('duel.contact.telegram')}
          </Button>
        </Box>
      )}
    </Box>
  );
}

/**
 * Предложенный перенос: предложившему — «Ждём ответа» и «Отозвать»; второму
 * — новое время, сообщение, «Принять» и «Отказаться» по `can.answerReschedule`.
 * До ответа действует прежнее время.
 */
function RescheduleCard({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const answer = useDuelAction((action: 'accept' | 'decline' | 'withdraw') =>
    answerReschedule(duel.id, action),
  );
  const { reschedule } = duel;
  if (reschedule === null) return null;

  const mine = reschedule.proposedById === me;

  return (
    <Box
      data-duel-reschedule
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid var(--line-strong)',
        display: 'grid',
        gap: 1,
      }}
    >
      <Typography sx={{ fontWeight: 600 }}>
        {t(mine ? 'duel.reschedule.waiting' : 'duel.reschedule.proposed')}
      </Typography>
      <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {fill(t('duel.reschedule.newTime'), {
          time: formatSlot(reschedule.startsAt, reschedule.endsAt, locale),
        })}
      </Typography>
      {reschedule.message !== null && (
        <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          «{reschedule.message}»
        </Typography>
      )}
      <Typography variant="body2" color="text.secondary">
        {t('duel.reschedule.untilAnswer')}
      </Typography>
      {answer.error !== null && (
        <Alert severity="error" data-duel-error>
          {duelErrorText(answer.error, t, me)}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {duel.can.answerReschedule && (
          <>
            <Button
              variant="contained"
              disabled={answer.isPending}
              onClick={() => {
                answer.mutate('accept');
              }}
              sx={{ minHeight: 44 }}
            >
              {t('duel.reschedule.accept')}
            </Button>
            <Button
              variant="outlined"
              disabled={answer.isPending}
              onClick={() => {
                answer.mutate('decline');
              }}
              sx={{ minHeight: 44 }}
            >
              {t('duel.reschedule.decline')}
            </Button>
          </>
        )}
        {/* Отозвать своё — в контракте нет отдельного `can`: это предложивший. */}
        {mine && (
          <Button
            variant="text"
            color="error"
            disabled={answer.isPending}
            onClick={() => {
              answer.mutate('withdraw');
            }}
            sx={{ minHeight: 44 }}
          >
            {t('duel.reschedule.withdraw')}
          </Button>
        )}
      </Box>
    </Box>
  );
}

/** Перенос: новое «дата, с — до» и сообщение второму. */
function RescheduleDialog({
  duel,
  me,
  open,
  onClose,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
  readonly open: boolean;
  readonly onClose: () => void;
}): ReactNode {
  const titleId = useId();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" aria-labelledby={titleId}>
      <RescheduleForm duel={duel} me={me} titleId={titleId} onClose={onClose} />
    </Dialog>
  );
}

function RescheduleForm({
  duel,
  me,
  titleId,
  onClose,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
  readonly titleId: string;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const [slot, setSlot] = useState<SlotDraft>(EMPTY_SLOT);
  const [message, setMessage] = useState('');
  const [tried, setTried] = useState(false);
  const propose = useDuelAction((input: RescheduleDuelInput) => rescheduleDuel(duel.id, input));

  return (
    <form
      noValidate
      data-duel-reschedule-form
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        const input = toSlotInput(slot);
        if (input === null || slotProblem(slot, new Date()) !== null) return;
        propose.mutate(
          { slot: input, ...(message.trim() === '' ? {} : { message: message.trim() }) },
          { onSuccess: onClose },
        );
      }}
    >
      <DialogTitle id={titleId}>{t('duel.reschedule.title')}</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        <Typography color="text.secondary">{t('duel.reschedule.hint')}</Typography>
        <SlotEditor
          label={t('duel.slot.day')}
          value={slot}
          onChange={setSlot}
          problem={tried ? slotProblem(slot, new Date()) : null}
        />
        <TextField
          label={t('duel.respond.message')}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
          }}
          multiline
          minRows={2}
          fullWidth
          slotProps={{ htmlInput: { maxLength: 300 } }}
        />
        {propose.error !== null && (
          <Alert severity="error" data-duel-error>
            {duelErrorText(propose.error, t, me)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
        <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
          {t('duel.action.back')}
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={propose.isPending}
          sx={{ minHeight: 44 }}
        >
          {t('duel.reschedule.submit')}
        </Button>
      </DialogActions>
    </form>
  );
}

// ---------------------------------------------------------------- табло

/**
 * Табло по партиям — у стола, с телефона: крупный счёт, две большие кнопки,
 * «Отменить последнюю», список партий. Очков нет (ADR-063). `index` —
 * сколько партий видно на этом телефоне: нажатие со второго телефона по
 * устаревшему счёту сервер не запишет (`DUEL_INVALID_STATE`) — тогда табло
 * перечитывается. Зрителю — тот же счёт без кнопок.
 */
function Scoreboard({
  duel,
  me,
  author,
  opponent,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
  readonly author: DuelPlayer;
  readonly opponent: DuelPlayer;
}): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const participant = me === author.id || me === opponent.id;
  // Участник видит себя слева: «мои партии : партии соперника».
  const [left, right] = participant && me === opponent.id ? [opponent, author] : [author, opponent];
  const toWin = duel.bestOf === null ? null : setsToWin(duel.bestOf);
  const leftSets = setsOf(duel.sets, left.id);
  const rightSets = setsOf(duel.sets, right.id);
  const decided = toWin !== null && Math.max(leftSets, rightSets) >= toWin;

  const refetchOnConflict = (error: unknown): void => {
    // Партию уже записал второй телефон: показываем то, что на сервере.
    if (isAppError(error) && error.code === ERROR_CODES.DUEL_INVALID_STATE) {
      void queryClient.invalidateQueries({ queryKey: duelKeys.detail(duel.id) });
    }
  };
  const record = useDuelAction((winnerId: string) =>
    recordDuelSet(duel.id, { winnerId, index: duel.sets.length }),
  );
  const undo = useDuelAction(() => undoDuelSet(duel.id, { index: duel.sets.length }));
  const finish = useDuelAction(() => finishDuel(duel.id));
  const pending = record.isPending || undo.isPending || finish.isPending;
  const error = record.error ?? undo.error ?? finish.error;
  const conflict = isAppError(error) && error.code === ERROR_CODES.DUEL_INVALID_STATE;
  const name = (player: DuelPlayer): string =>
    player.id === me ? t('duel.match.meShort') : player.name;

  return (
    <Box sx={{ display: 'grid', gap: 2 }} data-duel-board>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)',
          alignItems: 'center',
          gap: { xs: 1, sm: 2 },
          textAlign: 'center',
        }}
      >
        <SideName player={left} label={left.id === me ? t('duel.match.me') : left.name} />
        <Typography
          component="p"
          aria-live="polite"
          data-duel-board-score
          sx={{
            fontSize: { xs: 56, sm: 72 },
            lineHeight: 1,
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {leftSets}:{rightSets}
        </Typography>
        <SideName player={right} label={right.id === me ? t('duel.match.me') : right.name} />
      </Box>
      {toWin !== null && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {fill(t('duel.match.toWin'), { sets: String(toWin) })}
        </Typography>
      )}

      {participant && duel.can.score && (
        <>
          <Box
            sx={{
              display: 'grid',
              gap: 1.5,
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            }}
          >
            {[left, right].map((player) => (
              <Button
                key={player.id}
                variant={player.id === me ? 'contained' : 'outlined'}
                size="large"
                disabled={pending || decided}
                onClick={() => {
                  record.mutate(player.id, { onError: refetchOnConflict });
                }}
                sx={{ minHeight: 64, fontSize: 18 }}
                data-duel-set-for={player.id}
              >
                {/* «Партия за соперником»: имя не склоняется, а чьё оно — видно над табло. */}
                {player.id === me ? t('duel.match.setMine') : t('duel.match.setFor')}
              </Button>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button
              variant="text"
              startIcon={<Undo2 size={18} aria-hidden />}
              disabled={pending || duel.sets.length === 0}
              onClick={() => {
                undo.mutate(undefined, { onError: refetchOnConflict });
              }}
              sx={{ minHeight: 44 }}
            >
              {t('duel.match.undo')}
            </Button>
          </Box>
        </>
      )}

      {duel.sets.length > 0 && (
        <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none' }} data-duel-sets>
          {duel.sets.map((winnerId, index) => (
            <Typography
              component="li"
              // Партии не переставляются: номер и есть ключ.
              key={index}
              color="text.secondary"
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {fill(t('duel.match.setLine'), {
                n: String(index + 1),
                name: name(winnerId === author.id ? author : opponent),
              })}
            </Typography>
          ))}
        </Box>
      )}

      {error !== null && (
        <Alert severity={conflict ? 'info' : 'error'} data-duel-error>
          {conflict ? t('duel.match.conflict') : duelErrorText(error, t, me)}
        </Alert>
      )}

      {participant && duel.can.score && (
        <Button
          variant="contained"
          size="large"
          disabled={!decided || pending}
          onClick={() => {
            finish.mutate(undefined, { onError: refetchOnConflict });
          }}
          sx={{ minHeight: 56 }}
          data-duel-finish
        >
          {t('duel.match.finish')}
        </Button>
      )}
      {!participant && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('duel.match.live')}
        </Typography>
      )}
    </Box>
  );
}

function SideName({
  player,
  label,
}: {
  readonly player: DuelPlayer;
  readonly label: string;
}): ReactNode {
  return (
    <Typography
      sx={{ fontWeight: 600, overflowWrap: 'anywhere', lineHeight: 1.25 }}
      data-duel-side={player.id}
    >
      {label}
    </Typography>
  );
}
