import {
  respondDuelSchema,
  setsToWin,
  type DuelResponseView,
  type DuelView,
  type ReportDuelInput,
  type RespondDuelInput,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { useId, useState, type ReactNode } from 'react';

import { fill, formatDateTime, useLocale, useT } from '@/common/i18n';
import Surface from '@/common/ui/surface';
import { useSessionStore } from '@/features/auth/session-store';
import { Badge } from '@/features/coaches/coach-cards';

import {
  acceptDuelResponse,
  cancelDuel,
  confirmDuel,
  declineDuel,
  declineDuelResponse,
  disputeDuel,
  reportDuel,
  respondDuel,
  withdrawDuelResponse,
} from './api';
import { DuelPlayerLine } from './duel-parts';
import { duelErrorText, formatSlot } from './labels';
import { useDuelAction } from './queries';
import { EMPTY_SLOT, slotProblem, toSlotInput, type SlotDraft } from './slot-draft';
import SlotEditor from './slot-editor';

/**
 * Действия на странице дуэли — `docs/13` 5.3. Какие кнопки видны, решает
 * сервер (`view.can`): правила состояний, сроков и частоты живут там, и
 * интерфейс их не угадывает. Каждое действие отвечает свежей страницей.
 */

const RESPONSE_STATUS_KEYS = {
  NEW: 'duel.response.status.NEW',
  ACCEPTED: 'duel.response.status.ACCEPTED',
  DECLINED: 'duel.response.status.DECLINED',
  WITHDRAWN: 'duel.response.status.WITHDRAWN',
} as const;

/** Время отклика: выбранный вариант автора или предложенное своё. */
function responseTime(
  duel: DuelView,
  response: DuelResponseView,
): { startsAt: string; endsAt: string } | null {
  const slot = duel.slots.find((item) => item.id === response.slotId);
  if (slot !== undefined) return slot;
  if (response.proposedStartsAt !== null && response.proposedEndsAt !== null) {
    return { startsAt: response.proposedStartsAt, endsAt: response.proposedEndsAt };
  }

  return null;
}

// ---------------------------------------------------------------- отклики

/**
 * Отклики. Автору — все, с «Принять» и «Отклонить» у новых, пока соперник
 * не выбран; остальным сервер присылает только свой, с «Отозвать».
 */
export function ResponsesPanel({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const isAuthor = duel.author.id === me;

  if (duel.responses.length === 0) {
    return isAuthor && duel.status === 'OPEN' ? (
      <Surface title={t('duel.responses.title')}>
        <Typography color="text.secondary">{t('duel.responses.empty')}</Typography>
      </Surface>
    ) : null;
  }

  return (
    <Surface title={t(isAuthor ? 'duel.responses.title' : 'duel.responses.mine')} flush>
      <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }} data-duel-responses>
        {duel.responses.map((response) => (
          <ResponseRow key={response.id} duel={duel} response={response} me={me} />
        ))}
      </Box>
    </Surface>
  );
}

function ResponseRow({
  duel,
  response,
  me,
}: {
  readonly duel: DuelView;
  readonly response: DuelResponseView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const accept = useDuelAction(() => acceptDuelResponse(response.id));
  const decline = useDuelAction(() => declineDuelResponse(response.id));
  const withdraw = useDuelAction(() => withdrawDuelResponse(response.id));
  const time = responseTime(duel, response);
  const own = response.player.id === me;
  // В контракте нет `can` на отклик: принять и отклонить может автор, пока
  // соперник не выбран, — то же правило сервер проверит сам
  // (`DUEL_INVALID_STATE`).
  const decides =
    duel.author.id === me &&
    response.status === 'NEW' &&
    (duel.status === 'OPEN' || duel.status === 'CHALLENGE');
  const error = accept.error ?? decline.error ?? withdraw.error;
  const pending = accept.isPending || decline.isPending || withdraw.isPending;

  return (
    <Box
      component="li"
      data-duel-response={response.id}
      sx={{ px: { xs: 2, sm: 3 }, py: 2, borderTop: 1, borderColor: 'divider' }}
    >
      <DuelPlayerLine
        player={response.player}
        meta={
          <Typography variant="body2" color="text.secondary">
            {fill(t('duel.response.at'), { at: formatDateTime(response.createdAt, locale) })}
          </Typography>
        }
      />
      <Box sx={{ mt: 1.5, display: 'grid', gap: 0.5 }}>
        {time !== null && (
          <Typography sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {fill(t(response.slotId === null ? 'duel.response.proposed' : 'duel.response.slot'), {
              time: formatSlot(time.startsAt, time.endsAt, locale),
            })}
          </Typography>
        )}
        {response.message !== null && (
          <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
            «{response.message}»
          </Typography>
        )}
        {response.status !== 'NEW' && (
          <Box>
            <Badge tone={response.status === 'ACCEPTED' ? 'ok' : 'ink'}>
              {t(RESPONSE_STATUS_KEYS[response.status])}
            </Badge>
          </Box>
        )}
      </Box>

      {(decides || (own && duel.can.withdraw && response.status === 'NEW')) && (
        <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {decides && (
            <>
              <Button
                variant="contained"
                disabled={pending}
                onClick={() => {
                  accept.mutate(undefined);
                }}
                sx={{ minHeight: 44 }}
              >
                {t('duel.response.accept')}
              </Button>
              <Button
                variant="outlined"
                disabled={pending}
                onClick={() => {
                  decline.mutate(undefined);
                }}
                sx={{ minHeight: 44 }}
              >
                {t('duel.response.decline')}
              </Button>
            </>
          )}
          {own && duel.can.withdraw && response.status === 'NEW' && (
            <Button
              variant="text"
              color="error"
              disabled={pending}
              onClick={() => {
                withdraw.mutate(undefined);
              }}
              sx={{ minHeight: 44 }}
            >
              {t('duel.response.withdraw')}
            </Button>
          )}
        </Box>
      )}
      {error !== null && (
        <Alert severity="error" sx={{ mt: 1.5 }} data-duel-error>
          {duelErrorText(error, t, me)}
        </Alert>
      )}
    </Box>
  );
}

// ---------------------------------------------------------------- отклик и ответ на вызов

/**
 * Отклик на публикацию или ответ вызванного (`docs/13` 3.3): вариант автора
 * или своё время, плюс сообщение. Вызванному выбор варианта — согласие
 * сразу, поэтому кнопка называется по-другому. Отказ — `can.decline`.
 */
export function RespondPanel({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const challenged = duel.status === 'CHALLENGE' && duel.opponent?.id === me;
  const [choice, setChoice] = useState<string>(duel.slots[0]?.id ?? 'OWN');
  const [proposed, setProposed] = useState<SlotDraft>(EMPTY_SLOT);
  const [message, setMessage] = useState('');
  // Как связаться — по умолчанию телефон аккаунта (ADR-068 §3).
  const accountPhone = useSessionStore((state) => state.user?.phone ?? '');
  const [contact, setContact] = useState(accountPhone);
  const [tried, setTried] = useState(false);
  const [declining, setDeclining] = useState(false);
  const respond = useDuelAction((input: RespondDuelInput) => respondDuel(duel.id, input));
  const decline = useDuelAction((reason: string) =>
    declineDuel(duel.id, reason === '' ? {} : { reason }),
  );

  const own = choice === 'OWN';
  const slot = toSlotInput(proposed);
  const input = {
    ...(own ? (slot === null ? {} : { proposed: slot }) : { slotId: choice }),
    ...(message.trim() === '' ? {} : { message: message.trim() }),
    ...(contact.trim() === '' ? {} : { contact: contact.trim() }),
  };
  const parsed = respondDuelSchema.safeParse(input);
  const problem = own ? slotProblem(proposed, new Date()) : null;

  return (
    <Surface
      title={t(challenged ? 'duel.respond.challengeTitle' : 'duel.respond.title')}
      subtitle={t(challenged ? 'duel.respond.challengeLead' : 'duel.respond.lead')}
    >
      {duel.can.respond && (
        <Box
          component="form"
          noValidate
          data-duel-respond
          onSubmit={(event) => {
            event.preventDefault();
            setTried(true);
            if (parsed.success && problem === null) respond.mutate(parsed.data);
          }}
          sx={{ display: 'grid', gap: 2 }}
        >
          <RadioGroup
            value={choice}
            onChange={(event) => {
              setChoice(event.target.value);
            }}
            aria-label={t('duel.respond.when')}
          >
            {duel.slots.map((item) => (
              <FormControlLabel
                key={item.id}
                value={item.id}
                control={<Radio />}
                label={formatSlot(item.startsAt, item.endsAt, locale)}
                sx={{ minHeight: 44 }}
              />
            ))}
            <FormControlLabel
              value="OWN"
              control={<Radio />}
              label={t('duel.respond.own')}
              sx={{ minHeight: 44 }}
            />
          </RadioGroup>
          {own && (
            <SlotEditor
              label={t('duel.slot.day')}
              value={proposed}
              onChange={setProposed}
              problem={tried ? problem : null}
            />
          )}
          <TextField
            label={t('duel.respond.message')}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
            }}
            multiline
            minRows={2}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 500 } }}
          />
          <TextField
            label={t('duel.contact.label')}
            value={contact}
            onChange={(event) => {
              setContact(event.target.value);
            }}
            helperText={t('duel.contact.hint')}
            fullWidth
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          {respond.error !== null && (
            <Alert severity="error" data-duel-error>
              {duelErrorText(respond.error, t, me)}
            </Alert>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              type="submit"
              variant="contained"
              disabled={respond.isPending}
              sx={{ minHeight: 44 }}
            >
              {t(
                challenged
                  ? own
                    ? 'duel.respond.propose'
                    : 'duel.respond.acceptSlot'
                  : 'duel.respond.submit',
              )}
            </Button>
            {duel.can.decline && (
              <Button
                variant="text"
                color="error"
                onClick={() => {
                  setDeclining(true);
                }}
                sx={{ minHeight: 44 }}
              >
                {t('duel.respond.decline')}
              </Button>
            )}
          </Box>
        </Box>
      )}
      {!duel.can.respond && duel.can.decline && (
        <Button
          variant="text"
          color="error"
          onClick={() => {
            setDeclining(true);
          }}
          sx={{ minHeight: 44 }}
        >
          {t('duel.respond.decline')}
        </Button>
      )}
      <TextDialog
        open={declining}
        title={t('duel.respond.declineTitle')}
        hint={t('duel.respond.declineHint')}
        label={t('duel.reason')}
        submitLabel={t('duel.respond.decline')}
        required={false}
        onClose={() => {
          setDeclining(false);
        }}
        onSubmit={(reason) => decline.mutateAsync(reason)}
        errorText={(error) => duelErrorText(error, t, me)}
      />
    </Surface>
  );
}

// ---------------------------------------------------------------- счёт

/**
 * Внести счёт (`docs/13` 3.5): кто выиграл и сколько партий взял
 * проигравший. У победителя их всегда `setsToWin(bestOf)` — поле не нужно.
 */
export function ReportPanel({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const winnerLabel = useId();
  const loserLabel = useId();
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [loserSets, setLoserSets] = useState<number | null>(null);
  const report = useDuelAction((input: ReportDuelInput) => reportDuel(duel.id, input));
  const { opponent, bestOf } = duel;

  if (opponent === null || bestOf === null) return null;

  const toWin = setsToWin(bestOf);
  const players = [duel.author, opponent];
  const ready = winnerId !== null && loserSets !== null;

  return (
    <Surface title={t('duel.report.title')} subtitle={t('duel.report.lead')}>
      <Box
        component="form"
        noValidate
        data-duel-report
        onSubmit={(event) => {
          event.preventDefault();
          if (winnerId !== null && loserSets !== null) {
            report.mutate({ winnerId, winnerSets: toWin, loserSets });
          }
        }}
        sx={{ display: 'grid', gap: 2 }}
      >
        <Box>
          <Typography id={winnerLabel} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {t('duel.report.winner')}
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            aria-labelledby={winnerLabel}
            value={winnerId}
            onChange={(_, next: string | null) => {
              if (next !== null) setWinnerId(next);
            }}
            sx={{ flexDirection: { xs: 'column', sm: 'row' } }}
          >
            {players.map((player) => (
              <ToggleButton key={player.id} value={player.id} sx={{ minHeight: 44 }}>
                {player.id === me ? fill(t('duel.report.me'), { name: player.name }) : player.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Box>
          <Typography id={loserLabel} variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            {t('duel.report.score')}
          </Typography>
          <ToggleButtonGroup
            exclusive
            aria-labelledby={loserLabel}
            value={loserSets}
            onChange={(_, next: number | null) => {
              if (next !== null) setLoserSets(next);
            }}
            sx={{ flexWrap: 'wrap' }}
          >
            {Array.from({ length: toWin }, (_, sets) => (
              <ToggleButton
                key={sets}
                value={sets}
                sx={{ minHeight: 44, minWidth: 64, fontVariantNumeric: 'tabular-nums' }}
              >
                {toWin}:{sets}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        {report.error !== null && (
          <Alert severity="error" data-duel-error>
            {duelErrorText(report.error, t, me)}
          </Alert>
        )}
        <Box>
          <Button
            type="submit"
            variant="contained"
            disabled={!ready || report.isPending}
            sx={{ minHeight: 44 }}
          >
            {t('duel.report.submit')}
          </Button>
        </Box>
      </Box>
    </Surface>
  );
}

/**
 * Подтвердить или оспорить счёт за 48 часов. Срок виден: молчание — тоже
 * решение (`UNCONFIRMED`, рейтинг не меняется).
 */
export function ConfirmPanel({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const locale = useLocale();
  const [disputing, setDisputing] = useState(false);
  const confirm = useDuelAction(() => confirmDuel(duel.id));
  const dispute = useDuelAction((comment: string) => disputeDuel(duel.id, { comment }));
  const { result } = duel;

  return (
    <Surface
      title={t('duel.confirm.title')}
      {...(result === null
        ? {}
        : {
            subtitle: fill(t('duel.confirm.until'), {
              until: formatDateTime(result.confirmBy, locale),
            }),
          })}
    >
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        {t('duel.confirm.lead')}
      </Typography>
      {confirm.error !== null && (
        <Alert severity="error" sx={{ mb: 2 }} data-duel-error>
          {duelErrorText(confirm.error, t, me)}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {duel.can.confirm && (
          <Button
            variant="contained"
            disabled={confirm.isPending}
            onClick={() => {
              confirm.mutate(undefined);
            }}
            sx={{ minHeight: 44 }}
          >
            {t('duel.confirm.submit')}
          </Button>
        )}
        {duel.can.dispute && (
          <Button
            variant="outlined"
            onClick={() => {
              setDisputing(true);
            }}
            sx={{ minHeight: 44 }}
          >
            {t('duel.dispute.action')}
          </Button>
        )}
      </Box>
      <TextDialog
        open={disputing}
        title={t('duel.dispute.title')}
        hint={t('duel.dispute.hint')}
        label={t('duel.dispute.comment')}
        submitLabel={t('duel.dispute.submit')}
        required
        maxLength={500}
        onClose={() => {
          setDisputing(false);
        }}
        onSubmit={(comment) => dispute.mutateAsync(comment)}
        errorText={(error) => duelErrorText(error, t, me)}
      />
    </Surface>
  );
}

/** «Отменить игру» — участник, до счёта; причина по желанию уходит второму. */
export function CancelAction({
  duel,
  me,
}: {
  readonly duel: DuelView;
  readonly me: string | null;
}): ReactNode {
  const t = useT();
  const [open, setOpen] = useState(false);
  const cancel = useDuelAction((reason: string) =>
    cancelDuel(duel.id, reason === '' ? {} : { reason }),
  );

  return (
    <>
      <Button
        variant="text"
        color="error"
        onClick={() => {
          setOpen(true);
        }}
        sx={{ minHeight: 44 }}
        data-duel-cancel
      >
        {t('duel.cancel.action')}
      </Button>
      <TextDialog
        open={open}
        title={t('duel.cancel.title')}
        hint={t('duel.cancel.hint')}
        label={t('duel.reason')}
        submitLabel={t('duel.cancel.submit')}
        required={false}
        onClose={() => {
          setOpen(false);
        }}
        onSubmit={(reason) => cancel.mutateAsync(reason)}
        errorText={(error) => duelErrorText(error, t, me)}
      />
    </>
  );
}

// ---------------------------------------------------------------- окно с текстом

/**
 * Подтверждение с текстом: отказ и отмена — причина по желанию, спор —
 * комментарий обязателен. Закрытое окно снимает форму (MUI без
 * `keepMounted`): следующий раз — с чистого листа.
 */
export function TextDialog({
  open,
  title,
  hint,
  label,
  submitLabel,
  required,
  maxLength = 300,
  onClose,
  onSubmit,
  errorText,
  children,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly hint: string;
  readonly label: string;
  readonly submitLabel: string;
  readonly required: boolean;
  readonly maxLength?: number;
  readonly onClose: () => void;
  readonly onSubmit: (text: string) => Promise<unknown>;
  readonly errorText: (error: unknown) => string;
  /** Поля над текстом: счёт в решении спора. */
  readonly children?: ReactNode;
}): ReactNode {
  const titleId = useId();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <TextForm
        hint={hint}
        label={label}
        submitLabel={submitLabel}
        required={required}
        maxLength={maxLength}
        onClose={onClose}
        onSubmit={onSubmit}
        errorText={errorText}
      >
        {children}
      </TextForm>
    </Dialog>
  );
}

function TextForm({
  hint,
  label,
  submitLabel,
  required,
  maxLength,
  onClose,
  onSubmit,
  errorText,
  children,
}: {
  readonly hint: string;
  readonly label: string;
  readonly submitLabel: string;
  readonly required: boolean;
  readonly maxLength: number;
  readonly onClose: () => void;
  readonly onSubmit: (text: string) => Promise<unknown>;
  readonly errorText: (error: unknown) => string;
  readonly children?: ReactNode;
}): ReactNode {
  const t = useT();
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = !required || text.trim() !== '';

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        setPending(true);
        setError(null);
        onSubmit(text.trim())
          .then(onClose)
          .catch((caught: unknown) => {
            setError(errorText(caught));
          })
          .finally(() => {
            setPending(false);
          });
      }}
    >
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {hint}
        </Typography>
        {children}
        <TextField
          label={label}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
          required={required}
          fullWidth
          multiline
          minRows={2}
          slotProps={{ htmlInput: { maxLength } }}
        />
        {error !== null && (
          <Alert severity="error" sx={{ mt: 2 }} data-duel-error>
            {error}
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
          disabled={!valid || pending}
          sx={{ minHeight: 44 }}
        >
          {submitLabel}
        </Button>
      </DialogActions>
    </form>
  );
}
