import type { SyncOperation, TournamentSnapshotView } from '@kttf/shared/types';
import Dexie, { type EntityTable } from 'dexie';

/**
 * Локальное хранилище консоли — ТС 6.2, запрет №10 брифа.
 *
 * IndexedDB через Dexie, а не `localStorage`: турнир на 32 участника — это
 * сотня встреч со счётом по сетам, и `localStorage` не даёт ни объёма, ни
 * транзакций, ни асинхронной записи.
 *
 * **Снимок хранится целиком, а не разложенным по таблицам,** как предполагала
 * первая редакция ТС 6.2. Обоснование — ADR-027: консоль читает снимок только
 * целиком, а раскладка потребовала бы собирать его обратно при каждом чтении
 * и раскладывать заново после каждой синхронизации. Очередь операций осталась
 * отдельной таблицей: у неё своя жизнь и свой порядок.
 */

/**
 * Операция без порядкового номера.
 *
 * Раздаётся по членам объединения, а не `Omit` поверх него целиком: обычный
 * `Omit` схлопывает размеченное объединение, и `matchId` перестаёт быть
 * виден там, где он есть.
 */
export type QueuedOperation = SyncOperation extends infer T
  ? T extends SyncOperation
    ? Omit<T, 'seq'>
    : never
  : never;

/** Снимок турнира вместе с моментом, когда он лёг на диск. */
export interface StoredSnapshot {
  readonly tournamentId: string;
  readonly snapshot: TournamentSnapshotView;
  /** Часы устройства судьи: в зале других нет. */
  readonly storedAt: number;
}

/**
 * Операция в очереди на отправку — ТС 6.2.
 *
 * `seq` выдаёт сама Dexie автоинкрементом: порядок применения на сервере
 * обязан совпасть с порядком действий судьи, а часы устройства для этого
 * не годятся — два действия в одну миллисекунду не редкость.
 */
export interface OutboxItem {
  /** Ключ автоинкремента Dexie. При вставке не указывается. */
  seq: number;
  tournamentId: string;
  clientOpId: string;
  /** Тело операции без `seq`: номер известен только после записи. */
  operation: QueuedOperation;
  createdAt: number;
  syncedAt: number | null;
  /** Код отказа сервера. Заполнен — операция отклонена и не повторяется. */
  rejectedReason: string | null;
  attempts: number;
}

class ConsoleDatabase extends Dexie {
  readonly snapshots!: EntityTable<StoredSnapshot, 'tournamentId'>;
  readonly outbox!: EntityTable<OutboxItem, 'seq'>;

  constructor() {
    super('kttf-console');

    this.version(1).stores({
      snapshots: 'tournamentId',
      // Индексы под два вопроса очереди: что не отправлено по этому турниру
      // и в каком порядке это применять.
      outbox: '++seq, tournamentId, syncedAt, [tournamentId+syncedAt]',
    });
  }
}

export const db = new ConsoleDatabase();
