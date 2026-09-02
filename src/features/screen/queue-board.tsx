import type { ReactNode } from 'react';

import { useT } from '@/common/i18n';
import type { QueuedMatch } from '@/features/console/queue';

interface QueueBoardProps {
  readonly queue: readonly QueuedMatch[];
  readonly names: ReadonlyMap<string, string>;
}

/**
 * Очередь ближайших встреч — ТЗ 6.5.
 *
 * Порядок тот же, что у судьи в консоли, и считается тем же `buildQueue`:
 * игрок, увидевший себя третьим на стене, не должен обнаружить у судьи другой
 * порядок. Второе правило очереди на клиенте — верный способ поссорить зал.
 *
 * Показываются первые шесть: экран висит на стене, а не листается.
 */
const SHOWN = 6;

export default function QueueBoard({ queue, names }: QueueBoardProps): ReactNode {
  const t = useT();

  return (
    <section>
      <h2 className="text-xl font-semibold tracking-wide text-slate-400 uppercase">
        {t('screen.queue.title')}
      </h2>

      {queue.length === 0 ? (
        <p className="mt-3 text-xl text-slate-500">{t('screen.queue.empty')}</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {queue.slice(0, SHOWN).map((item) => (
            <li key={item.match.id} className="rounded border border-slate-700 bg-slate-900 p-3">
              <p className="text-sm text-slate-400">
                {item.stageName}
                {item.groupLabel === null ? '' : ` · ${item.groupLabel}`}
              </p>
              <p className="text-2xl text-slate-100">
                {name(item.match.playerAId, names, t('screen.match.pending'))}
                <span className="px-3 text-slate-500">—</span>
                {name(item.match.playerBId, names, t('screen.match.pending'))}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function name(id: string | null, names: ReadonlyMap<string, string>, fallback: string): string {
  return id === null ? fallback : (names.get(id) ?? fallback);
}
