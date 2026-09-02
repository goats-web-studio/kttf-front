import { isErrorCode } from '@kttf/shared/errors';
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

  const tone =
    queue.connection === 'OFFLINE'
      ? 'border-red-700 bg-red-950 text-red-200'
      : queue.connection === 'SYNCING'
        ? 'border-amber-700 bg-amber-950 text-amber-200'
        : 'border-emerald-800 bg-emerald-950 text-emerald-200';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`rounded border px-2 py-1 text-sm ${tone}`} role="status">
        {label}
        {queue.queued > 0 && (
          <span className="ml-2 tabular-nums">
            {t('console.sync.queued')} {queue.queued}
          </span>
        )}
      </span>

      <button
        type="button"
        onClick={queue.syncNow}
        className="rounded border border-slate-700 px-2 py-1 text-sm text-slate-300"
      >
        {t('console.sync.now')}
      </button>

      {queue.rejected.map((item) => (
        <span
          key={item.seq}
          role="alert"
          className="flex items-center gap-2 rounded border border-red-700 bg-red-950 px-2 py-1 text-sm text-red-200"
        >
          {/* Сервер отверг операцию: повторять её бессмысленно, и судья
              решает сам — ввести заново или оставить как есть. */}
          {t('console.sync.rejected')} {t(reasonKey(item.rejectedReason))}
          <button
            type="button"
            onClick={() => {
              queue.dismiss(item.seq);
            }}
            className="text-xs underline"
          >
            {t('console.failure.dismiss')}
          </button>
        </span>
      ))}
    </div>
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
