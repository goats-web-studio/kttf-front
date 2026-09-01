import type { ReactNode } from 'react';

import { errorMessageKey } from '@/common/api';
import { useT } from '@/common/i18n';

interface QueryStateProps {
  readonly isPending: boolean;
  readonly error: unknown;
  readonly onRetry?: (() => void) | undefined;
  readonly children: ReactNode;
}

/**
 * Ожидание, отказ и повтор для экрана, читающего API.
 *
 * Собрано в одном месте не ради краткости: текст отказа обязан подбираться по
 * коду через `errorMessageKey`, а не показывать `message` из ответа — он
 * диагностический и английский (бриф 3.4). Повторённое на каждом экране,
 * это правило нарушается на первом же, где про него забыли.
 *
 * Состояние отказа отличает отсутствие сети от ответа сервера: за это
 * отвечает `errorMessageKey`, здесь нужен только повтор запроса.
 */
export default function QueryState({
  isPending,
  error,
  onRetry,
  children,
}: QueryStateProps): ReactNode {
  const t = useT();

  if (isPending) {
    return <p className="py-10 text-center text-slate-500">{t('common.loading')}</p>;
  }

  if (error !== null && error !== undefined) {
    return (
      <div className="py-10 text-center">
        <p role="alert" className="text-red-700">
          {t(errorMessageKey(error))}
        </p>
        {onRetry !== undefined && (
          <button type="button" onClick={onRetry} className="mt-3 text-blue-700 underline">
            {t('error.unexpected.action')}
          </button>
        )}
      </div>
    );
  }

  return children;
}
