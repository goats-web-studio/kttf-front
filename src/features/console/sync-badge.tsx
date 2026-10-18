import { isErrorCode } from '@kttf/shared/errors';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { ERROR_MESSAGE_KEYS } from '@/common/api';
import { useT, type MessageKey } from '@/common/i18n';

import type { ConsoleQueue } from './use-console';

interface SyncBadgeProps {
  readonly queue: ConsoleQueue;
}

/**
 * Индикатор связи и очереди — ТС 6.4, ТЗ 6.4.
 *
 * Виден постоянно, а не всплывает при потере сети: судья должен знать
 * состояние связи до того, как оно станет важным, — то есть до конца турнира,
 * когда выяснится, что три часа счёта никуда не уехали.
 *
 * Кнопка «Синхронизировать сейчас» доступна всегда, включая офлайн: попытка
 * при отсутствии сети ничего не портит, а судье нужен способ проверить связь,
 * не дожидаясь таймера.
 */
export default function SyncBadge({ queue }: SyncBadgeProps): ReactNode {
  const t = useT();

  const label =
    queue.connection === 'OFFLINE'
      ? t('console.sync.offline')
      : queue.connection === 'SYNCING'
        ? t('console.sync.syncing')
        : t('console.sync.synced');

  // Цвет — второй носитель: состояние всегда написано словом (запрет №6).
  const color =
    queue.connection === 'OFFLINE'
      ? 'var(--red-700)'
      : queue.connection === 'SYNCING'
        ? 'var(--warn-text)'
        : 'var(--ok)';

  // Состояние и «Отправить сейчас» — одна пилюля: слово слева, кнопка справа.
  // Раньше это были два контрола рядом, и на телефоне шапка консоли
  // занимала два ряда кнопок.
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 44,
        pl: 1.75,
        border: 1,
        borderColor: 'divider',
        borderRadius: 999,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        role="status"
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: 13,
          fontWeight: 600,
          color,
          whiteSpace: 'nowrap',
        }}
      >
        <Box
          aria-hidden
          component="span"
          sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'currentColor' }}
        />
        {label}
        {queue.queued > 0 && (
          <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            · {t('console.sync.queued')} {queue.queued}
          </Box>
        )}
      </Box>

      {/* Подсказка — нативным title: всплывающая подсказка MUI тянет в чанк
          консоли поппер ради мыши, которой у планшета нет. */}
      <IconButton
        onClick={queue.syncNow}
        aria-label={t('console.sync.now')}
        title={t('console.sync.now')}
        sx={{ ml: 0.5, width: 44, height: 44, color: 'text.secondary' }}
      >
        <RefreshCw size={18} aria-hidden />
      </IconButton>
    </Box>
  );
}

/**
 * Отклонённые сервером операции — под шапкой, а не в ней.
 *
 * Сервер отверг операцию: повторять её бессмысленно, и судья решает сам —
 * ввести заново или оставить как есть. Отказ висит, пока судья его не уберёт.
 */
export function SyncRejections({ queue }: SyncBadgeProps): ReactNode {
  const t = useT();

  if (queue.rejected.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {queue.rejected.map((item) => (
        <Alert
          key={item.seq}
          severity="error"
          role="alert"
          action={
            <Button
              variant="text"
              color="error"
              size="large"
              onClick={() => {
                queue.dismiss(item.seq);
              }}
              sx={{ minHeight: 56 }}
            >
              {t('console.failure.dismiss')}
            </Button>
          }
          sx={{ alignItems: 'center', py: 0 }}
        >
          {t('console.sync.rejected')} {t(reasonKey(item.rejectedReason))}
        </Alert>
      ))}
    </Box>
  );
}

/**
 * Текст отказа по коду из очереди.
 *
 * В базе код лежит строкой, а не перечнем: перечень живёт в общем коде.
 * Строка не из перечня означает порчу данных, и показывается она общим
 * текстом, а не собой — пользователю английские коды не показываются
 * (бриф 3.4).
 */
function reasonKey(reason: string | null): MessageKey {
  return reason !== null && isErrorCode(reason)
    ? ERROR_MESSAGE_KEYS[reason]
    : 'error.unexpected.title';
}
