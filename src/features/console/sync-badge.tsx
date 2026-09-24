import { isErrorCode } from '@kttf/shared/errors';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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
  const tone =
    queue.connection === 'OFFLINE'
      ? 'error'
      : queue.connection === 'SYNCING'
        ? 'warning'
        : 'success';

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
      <Chip
        role="status"
        variant="outlined"
        color={tone}
        label={
          <>
            {label}
            {queue.queued > 0 && (
              <Box component="span" sx={{ ml: 1, fontVariantNumeric: 'tabular-nums' }}>
                {t('console.sync.queued')} {queue.queued}
              </Box>
            )}
          </>
        }
        sx={{ height: 'auto', minHeight: 40, fontSize: 13, '& .MuiChip-label': { py: 1 } }}
      />

      <Button size="large" onClick={queue.syncNow} sx={{ minHeight: 56 }}>
        {t('console.sync.now')}
      </Button>

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
          {/* Сервер отверг операцию: повторять её бессмысленно, и судья
              решает сам — ввести заново или оставить как есть. */}
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
