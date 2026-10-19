import { IMPORT_BATCH_MAX, importProductRowSchema, type ImportRowResult } from '@kttf/shared/types';

/**
 * Импорт каталога — `docs/10` 5.8, раздел 6.
 *
 * Файл JSON Lines разбирается и проверяется описанием категорий на клиенте,
 * до записи: администратор видит число строк и первые ошибки, не отправив
 * ни одной. Прошедшие проверку уходят пачками по `IMPORT_BATCH_MAX` строго по
 * очереди — сервер скачивает фото каждой строки, и параллельные пачки
 * только мешали бы друг другу. Остановка — после текущей пачки.
 */

export interface ImportLineError {
  /** Номер строки в файле, с единицы. */
  readonly line: number;
  readonly message: string;
}

export interface ParsedImport {
  /** Строки, прошедшие проверку, — как в файле: разбирает их сервер. */
  readonly rows: readonly unknown[];
  readonly total: number;
  readonly errors: readonly ImportLineError[];
}

/** Разбор файла: пустые строки пропускаются, каждая непустая — объект строки импорта. */
export function parseImportFile(text: string, notJson: string): ParsedImport {
  const rows: unknown[] = [];
  const errors: ImportLineError[] = [];
  let total = 0;

  text.split(/\r?\n/).forEach((source, index) => {
    const line = source.trim();
    if (line === '') return;
    total += 1;

    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      errors.push({ line: index + 1, message: notJson });
      return;
    }

    const result = importProductRowSchema.safeParse(value);
    if (result.success) {
      rows.push(value);
    } else {
      const issue = result.error.issues[0];
      errors.push({
        line: index + 1,
        message:
          issue === undefined
            ? notJson
            : `${issue.path.length === 0 ? '' : `${issue.path.join('.')}: `}${issue.message}`,
      });
    }
  });

  return { rows, total, errors };
}

/** Пачки по порядку, каждая не длиннее `size`. */
export function batches<T>(rows: readonly T[], size: number = IMPORT_BATCH_MAX): T[][] {
  const out: T[][] = [];

  for (let start = 0; start < rows.length; start += size) {
    out.push(rows.slice(start, start + size));
  }

  return out;
}

export interface ImportTally {
  readonly sent: number;
  readonly created: number;
  readonly updated: number;
  readonly rejected: readonly ImportRowResult[];
}

export const EMPTY_TALLY: ImportTally = { sent: 0, created: 0, updated: 0, rejected: [] };

export function addResults(
  tally: ImportTally,
  sent: number,
  results: readonly ImportRowResult[],
): ImportTally {
  return {
    sent: tally.sent + sent,
    created: tally.created + results.filter((row) => row.outcome === 'created').length,
    updated: tally.updated + results.filter((row) => row.outcome === 'updated').length,
    rejected: [...tally.rejected, ...results.filter((row) => row.outcome === 'rejected')],
  };
}

export type ImportOutcome =
  | { readonly status: 'done'; readonly tally: ImportTally }
  | { readonly status: 'stopped'; readonly tally: ImportTally }
  | { readonly status: 'failed'; readonly tally: ImportTally; readonly error: unknown };

/**
 * Отправка пачками по очереди. Ошибка пачки останавливает импорт: следующая
 * пачка, скорее всего, упадёт так же (нет сети, вышла сессия), а итог
 * отправленного уже посчитан.
 */
export async function runImport(
  rows: readonly unknown[],
  send: (batch: readonly unknown[]) => Promise<readonly ImportRowResult[]>,
  {
    size = IMPORT_BATCH_MAX,
    shouldStop = () => false,
    onProgress = () => undefined,
  }: {
    readonly size?: number;
    readonly shouldStop?: () => boolean;
    readonly onProgress?: (tally: ImportTally) => void;
  } = {},
): Promise<ImportOutcome> {
  let tally = EMPTY_TALLY;

  for (const batch of batches(rows, Math.min(size, IMPORT_BATCH_MAX))) {
    if (shouldStop()) return { status: 'stopped', tally };

    try {
      tally = addResults(tally, batch.length, await send(batch));
    } catch (error) {
      return { status: 'failed', tally, error };
    }
    onProgress(tally);
  }

  return { status: 'done', tally };
}
