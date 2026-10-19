import { IMPORT_BATCH_MAX, type ImportRowResult } from '@kttf/shared/types';
import { describe, expect, it, vi } from 'vitest';

import { batches, parseImportFile, runImport } from './import-run';

/** Строка выгрузки в формате `importProductRowSchema`. */
function row(rttfId: number, attrs: Record<string, unknown> = { bladeType: 'OFF' }): unknown {
  return {
    rttfId,
    category: 'BLADE',
    brand: { rttfId: 1, name: 'Butterfly' },
    name: `Blade ${String(rttfId)}`,
    attrs,
  };
}

/** Сервер-заглушка: чётные заводит, нечётные обновляет, кратные десяти отвергает. */
function serve(batch: readonly unknown[]): Promise<ImportRowResult[]> {
  return Promise.resolve(
    batch.map((item) => {
      const id = (item as { rttfId: number }).rttfId;

      return id % 10 === 0
        ? { rttfId: id, outcome: 'rejected', reason: 'нет фото' }
        : { rttfId: id, outcome: id % 2 === 0 ? 'created' : 'updated' };
    }),
  );
}

describe('разбор файла импорта', () => {
  it('строки проверяются описанием категории до отправки', () => {
    const text = [
      JSON.stringify(row(1)),
      '',
      '{не json',
      JSON.stringify(row(2, { bladeType: 'OFF-' })),
      JSON.stringify(row(3)),
    ].join('\r\n');

    const parsed = parseImportFile(text, 'не JSON');

    expect(parsed.total).toBe(4);
    expect(parsed.rows).toEqual([row(1), row(3)]);
    expect(parsed.errors.map((error) => error.line)).toEqual([3, 4]);
    expect(parsed.errors[0]?.message).toBe('не JSON');
    // Опечатка RTTF «OFF-» — не значение перечисления: строка не уйдёт.
    expect(parsed.errors[1]?.message).toContain('attrs.bladeType');
  });
});

describe('импорт пачками', () => {
  it('пачки по очереди и не длиннее предела', () => {
    expect(batches([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(batches([], 50)).toEqual([]);
  });

  it('уходит строго по одной пачке и считает итог', async () => {
    const rows = Array.from({ length: 120 }, (_, index) => row(index + 1));
    let inFlight = 0;
    const sizes: number[] = [];
    const send = vi.fn(async (batch: readonly unknown[]) => {
      inFlight += 1;
      expect(inFlight).toBe(1);
      sizes.push(batch.length);
      const result = await serve(batch);
      inFlight -= 1;
      return result;
    });
    const progress = vi.fn();

    const outcome = await runImport(rows, send, { onProgress: progress });

    expect(sizes).toEqual([IMPORT_BATCH_MAX, IMPORT_BATCH_MAX, 20]);
    expect(outcome.status).toBe('done');
    expect(outcome.tally.sent).toBe(120);
    expect(outcome.tally.rejected).toHaveLength(12);
    expect(outcome.tally.created + outcome.tally.updated).toBe(108);
    expect(progress).toHaveBeenCalledTimes(3);
  });

  it('предел пачки не превышается, даже если попросили больше', async () => {
    const sizes: number[] = [];
    await runImport(
      Array.from({ length: 60 }, (_, index) => row(index + 1)),
      (batch) => {
        sizes.push(batch.length);
        return serve(batch);
      },
      { size: 500 },
    );

    expect(sizes).toEqual([IMPORT_BATCH_MAX, 10]);
  });

  it('«Остановить» — после текущей пачки', async () => {
    let stop = false;
    const send = vi.fn((batch: readonly unknown[]) => {
      stop = true;
      return serve(batch);
    });

    const outcome = await runImport(
      Array.from({ length: 150 }, (_, index) => row(index + 1)),
      send,
      { shouldStop: () => stop },
    );

    expect(send).toHaveBeenCalledTimes(1);
    expect(outcome).toMatchObject({ status: 'stopped', tally: { sent: IMPORT_BATCH_MAX } });
  });

  it('отказ пачки останавливает импорт, отправленное посчитано', async () => {
    const failure = new Error('offline');
    const send = vi
      .fn<(batch: readonly unknown[]) => Promise<readonly ImportRowResult[]>>()
      .mockImplementationOnce(serve)
      .mockRejectedValueOnce(failure);

    const outcome = await runImport(
      Array.from({ length: 150 }, (_, index) => row(index + 1)),
      send,
    );

    expect(send).toHaveBeenCalledTimes(2);
    expect(outcome).toEqual({
      status: 'failed',
      error: failure,
      tally: expect.objectContaining({ sent: IMPORT_BATCH_MAX }) as unknown,
    });
  });
});
