import {
  FORUM_REPORT_REASONS,
  createForumReportSchema,
  type ForumReportReason,
} from '@kttf/shared/types';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useId, useState, type ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';
import IntegerField from '@/common/ui/integer-field';

import { reportForumPost } from './api';
import { REPORT_REASON_KEYS } from './labels';

/**
 * Окна форума. Закрытое окно снимает форму (`keepMounted` выключен у MUI):
 * следующая жалоба начинается с чистого листа.
 */

interface ShellProps {
  readonly open: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

function Shell({ open, title, onClose, children }: ShellProps): ReactNode {
  const titleId = useId();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      {children}
    </Dialog>
  );
}

/** Жалоба на сообщение: причина, у «Другое» — комментарий обязателен. */
export function ReportDialog({
  postId,
  open,
  onClose,
}: {
  readonly postId: string;
  readonly open: boolean;
  readonly onClose: () => void;
}): ReactNode {
  const t = useT();
  const [reason, setReason] = useState<ForumReportReason>('SPAM');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'pending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const input = {
    reason,
    ...(comment.trim() === '' ? {} : { comment: comment.trim() }),
  };
  const valid = createForumReportSchema.safeParse(input).success;

  return (
    <Shell open={open} title={t('forum.report.title')} onClose={onClose}>
      {state === 'sent' ? (
        <>
          <DialogContent>
            <Typography role="status">{t('forum.report.sent')}</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={onClose} sx={{ minHeight: 44 }}>
              {t('forum.action.close')}
            </Button>
          </DialogActions>
        </>
      ) : (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!valid) return;
            setState('pending');
            setError(null);
            reportForumPost(postId, input)
              .then(() => {
                setState('sent');
              })
              .catch((caught: unknown) => {
                setError(t(errorMessageKey(caught)));
                setState('idle');
              });
          }}
        >
          <DialogContent>
            <RadioGroup
              value={reason}
              onChange={(event) => {
                setReason(event.target.value as ForumReportReason);
              }}
            >
              {FORUM_REPORT_REASONS.map((value) => (
                <FormControlLabel
                  key={value}
                  value={value}
                  control={<Radio />}
                  label={t(REPORT_REASON_KEYS[value])}
                  sx={{ minHeight: 44 }}
                />
              ))}
            </RadioGroup>
            <TextField
              label={t('forum.report.comment')}
              value={comment}
              onChange={(event) => {
                setComment(event.target.value);
              }}
              required={reason === 'OTHER'}
              multiline
              minRows={2}
              fullWidth
              sx={{ mt: 2 }}
              slotProps={{ htmlInput: { maxLength: 500 } }}
            />
            {error !== null && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
              {t('forum.action.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={!valid || state === 'pending'}
              sx={{ minHeight: 44 }}
            >
              {t('forum.report.submit')}
            </Button>
          </DialogActions>
        </form>
      )}
    </Shell>
  );
}

/** Причина скрытия — модератор называет её всегда: она видна всем (ADR-064 §5). */
export function ReasonDialog({
  open,
  title,
  hint,
  submitLabel,
  onClose,
  onSubmit,
}: {
  readonly open: boolean;
  readonly title: string;
  readonly hint: string;
  readonly submitLabel: string;
  readonly onClose: () => void;
  readonly onSubmit: (reason: string) => Promise<unknown>;
}): ReactNode {
  const t = useT();
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Shell open={open} title={title} onClose={onClose}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (reason.trim() === '') return;
          setPending(true);
          setError(null);
          onSubmit(reason.trim())
            .then(onClose)
            .catch((caught: unknown) => {
              setError(t(errorMessageKey(caught)));
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
          <TextField
            label={t('forum.moderation.reason')}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
            required
            fullWidth
            autoFocus
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          {error !== null && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
            {t('forum.action.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={reason.trim() === '' || pending}
            sx={{ minHeight: 44 }}
          >
            {submitLabel}
          </Button>
        </DialogActions>
      </form>
    </Shell>
  );
}

/** Запрет писать: на сколько дней и за что. */
export function MuteDialog({
  open,
  name,
  onClose,
  onSubmit,
}: {
  readonly open: boolean;
  readonly name: string;
  readonly onClose: () => void;
  readonly onSubmit: (input: { days: number; reason: string }) => Promise<unknown>;
}): ReactNode {
  const t = useT();
  const [days, setDays] = useState<number | null>(7);
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = days !== null && days >= 1 && reason.trim() !== '';

  return (
    <Shell open={open} title={t('forum.mute.title')} onClose={onClose}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          setPending(true);
          setError(null);
          onSubmit({ days, reason: reason.trim() })
            .then(onClose)
            .catch((caught: unknown) => {
              setError(t(errorMessageKey(caught)));
            })
            .finally(() => {
              setPending(false);
            });
        }}
      >
        <DialogContent>
          <Typography sx={{ fontWeight: 600, mb: 2 }}>{name}</Typography>
          <IntegerField
            label={t('forum.mute.days')}
            value={days}
            onChange={setDays}
            required
            sx={{ maxWidth: 160 }}
          />
          <TextField
            label={t('forum.moderation.reason')}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
            }}
            required
            fullWidth
            sx={{ mt: 2 }}
            slotProps={{ htmlInput: { maxLength: 200 } }}
          />
          {error !== null && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="text" onClick={onClose} sx={{ minHeight: 44 }}>
            {t('forum.action.cancel')}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!valid || pending}
            sx={{ minHeight: 44 }}
          >
            {t('forum.mute.submit')}
          </Button>
        </DialogActions>
      </form>
    </Shell>
  );
}
