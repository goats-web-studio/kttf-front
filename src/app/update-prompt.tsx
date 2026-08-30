import type { ReactNode } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { useT } from '@/common/i18n';

/**
 * Предложение обновиться.
 *
 * Обновление не применяется само. Автоматическая перезагрузка вкладки в момент
 * выкатки может застать судью посреди турнира, а приоритет №2 брифа ставит
 * надёжность консоли выше свежести версии. Момент выбирает человек.
 */
export default function UpdatePrompt(): ReactNode {
  const t = useT();
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
    >
      <span className="grow">{t('pwa.update.message')}</span>
      <button
        type="button"
        className="rounded bg-white px-3 py-1 font-medium text-slate-900"
        onClick={() => void updateServiceWorker(true)}
      >
        {t('pwa.update.apply')}
      </button>
      <button
        type="button"
        className="rounded px-2 py-1 text-slate-300"
        onClick={() => {
          setNeedRefresh(false);
        }}
      >
        {t('pwa.update.dismiss')}
      </button>
    </div>
  );
}
