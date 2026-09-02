import type { ReactNode } from 'react';

import { useT, type MessageKey } from '@/common/i18n';

import { previewFormat } from './format-preview';
import { toFormatConfig, type FormatDraft, type FormatType } from './format-draft';

interface FormatEditorProps {
  readonly draft: FormatDraft;
  readonly onChange: (draft: FormatDraft) => void;
  /** Предположение организатора о числе участников. Нигде не сохраняется. */
  readonly participants: number;
  readonly onParticipantsChange: (participants: number) => void;
}

/**
 * Редактор схемы проведения — ТЗ 5.2, ADR-024, часть 3.
 *
 * Правит существующий `formatConfig`, а не собственную модель настроек:
 * его читают жеребьёвка, расчёт таблиц, расчёт мест и офлайн-консоль, и
 * вторая модель означала бы перевод между ними — место, где схема турнира
 * понимается двумя способами.
 *
 * Рядом с настройками стоит предпросчёт, и считает его движок. Организатор
 * принимает решение по числу встреч, и это число обязано быть тем же, что
 * получится при жеребьёвке.
 */
export default function FormatEditor({
  draft,
  onChange,
  participants,
  onParticipantsChange,
}: FormatEditorProps): ReactNode {
  const t = useT();

  const set = <K extends keyof FormatDraft>(key: K, value: FormatDraft[K]): void => {
    onChange({ ...draft, [key]: value });
  };

  const hasGroups = draft.type === 'GROUPS_KNOCKOUT' || draft.type === 'GROUPS_FINAL_GROUPS';

  return (
    <fieldset className="mt-8 rounded border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">
        {t('tournament.form.format')}
      </legend>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="tournament.form.formatType">
          <select
            aria-label={t('tournament.form.formatType')}
            value={draft.type}
            onChange={(event) => {
              set('type', event.target.value as FormatType);
            }}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            {FORMAT_KEYS.map(([value, key]) => (
              <option key={value} value={value}>
                {t(key)}
              </option>
            ))}
          </select>
        </Field>

        {draft.type === 'ROUND_ROBIN' && (
          <RoundsField
            label="tournament.form.rounds"
            value={draft.rounds}
            onChange={(rounds) => {
              set('rounds', rounds);
            }}
          />
        )}

        {hasGroups && (
          <>
            <Field label="tournament.form.sizing">
              <select
                aria-label={t('tournament.form.sizing')}
                value={draft.sizing}
                onChange={(event) => {
                  set('sizing', event.target.value === 'size' ? 'size' : 'count');
                }}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="count">{t('tournament.form.byGroupCount')}</option>
                <option value="size">{t('tournament.form.byGroupSize')}</option>
              </select>
            </Field>

            <NumberField
              label={
                draft.sizing === 'count'
                  ? 'tournament.form.groupCount'
                  : 'tournament.form.groupSize'
              }
              value={draft.sizing === 'count' ? draft.groupCount : draft.groupSize}
              onChange={(value) => {
                set(draft.sizing === 'count' ? 'groupCount' : 'groupSize', value);
              }}
            />

            <NumberField
              label="tournament.form.advancePerGroup"
              value={draft.advancePerGroup}
              onChange={(value) => {
                set('advancePerGroup', value);
              }}
            />

            <RoundsField
              label="tournament.form.groupRounds"
              value={draft.groupRounds}
              onChange={(rounds) => {
                set('groupRounds', rounds);
              }}
            />
          </>
        )}

        {/* Длина встречи задаётся отдельно для групп и плей-офф — ТЗ 5.2.
            Только у схемы «группы + сетка» этих этапов два разных; у
            остальных планка одна на весь турнир. */}
        {draft.type === 'GROUPS_KNOCKOUT' ? (
          <>
            <SetsField
              label="tournament.form.groupSetsToWin"
              value={draft.groupSetsToWin}
              onChange={(value) => {
                set('groupSetsToWin', value);
              }}
            />
            <SetsField
              label="tournament.form.koSetsToWin"
              value={draft.koSetsToWin}
              onChange={(value) => {
                set('koSetsToWin', value);
              }}
            />
          </>
        ) : (
          <SetsField
            label="tournament.form.setsToWin"
            value={draft.setsToWin}
            onChange={(value) => {
              set('setsToWin', value);
            }}
          />
        )}

        {(draft.type === 'KNOCKOUT' || draft.type === 'GROUPS_KNOCKOUT') && (
          <label className="flex items-center gap-2 self-end text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.thirdPlace}
              onChange={(event) => {
                set('thirdPlace', event.target.checked);
              }}
            />
            {t('tournament.form.thirdPlace')}
          </label>
        )}
      </div>

      <Preview
        draft={draft}
        participants={participants}
        onParticipantsChange={onParticipantsChange}
      />
    </fieldset>
  );
}

/**
 * Что получится — считает движок.
 *
 * Число участников здесь предположение, а не настройка: турнир заводится до
 * записи. Оно никуда не сохраняется и нужно только затем, чтобы у выбора
 * схемы был видимый результат.
 */
function Preview({
  draft,
  participants,
  onParticipantsChange,
}: {
  readonly draft: FormatDraft;
  readonly participants: number;
  readonly onParticipantsChange: (participants: number) => void;
}): ReactNode {
  const t = useT();
  const preview = previewFormat(toFormatConfig(draft), participants);

  const rows: { readonly key: MessageKey; readonly value: string }[] = [];

  if (preview.groups.length > 0) {
    rows.push({
      key: 'tournament.preview.groups',
      value: `${String(preview.groups.length)} × ${preview.groups.join(', ')}`,
    });
    rows.push({
      key: 'tournament.preview.groupMatches',
      value: String(preview.groupMatches),
    });
    rows.push({ key: 'tournament.preview.advancing', value: String(preview.advancing) });
  }

  if (preview.finalGroups.length > 0) {
    rows.push({
      key: 'tournament.preview.finalGroups',
      value: `${String(preview.finalGroups.length)} × ${preview.finalGroups.join(', ')}`,
    });
  }

  if (preview.bracketSize > 0) {
    rows.push({ key: 'tournament.preview.bracketSize', value: String(preview.bracketSize) });
  }

  if (preview.roundRobinRounds > 0) {
    rows.push({ key: 'tournament.preview.rounds', value: String(preview.roundRobinRounds) });
  }

  rows.push({ key: 'tournament.preview.totalMatches', value: String(preview.totalMatches) });

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <label className="block text-sm">
        <span className="text-slate-700">{t('tournament.preview.participants')}</span>
        <input
          type="number"
          inputMode="numeric"
          min={2}
          value={participants}
          onChange={(event) => {
            onParticipantsChange(Number(event.target.value));
          }}
          className="mt-1 w-28 rounded border border-slate-300 px-3 py-2"
        />
      </label>

      <dl className="mt-3 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
        {rows.map((row) => (
          <div key={row.key} className="contents">
            <dt className="text-slate-500">{t(row.key)}</dt>
            <dd className="tabular-nums text-slate-900">{row.value}</dd>
          </div>
        ))}
      </dl>

      {preview.tooFewAdvancing && (
        // Ровно та проверка, которой жеребьёвка отвергает конфигурацию.
        // Здесь она предупреждение: настоящее число участников выяснится
        // к жеребьёвке, и запрещать создание по догадке не за что.
        <p role="alert" className="mt-3 text-sm text-amber-700">
          {t('tournament.preview.tooFewAdvancing')}
        </p>
      )}
    </div>
  );
}

/**
 * Схемы — в тексты интерфейса.
 *
 * Тип обязывает перечислить все: новая схема в общем коде ломает сборку
 * здесь, а не выходит к человеку английской строкой.
 */
const FORMAT_KEYS: readonly (readonly [FormatType, MessageKey])[] = [
  ['ROUND_ROBIN', 'tournament.format.ROUND_ROBIN'],
  ['KNOCKOUT', 'tournament.format.KNOCKOUT'],
  ['GROUPS_KNOCKOUT', 'tournament.format.GROUPS_KNOCKOUT'],
  ['GROUPS_FINAL_GROUPS', 'tournament.format.GROUPS_FINAL_GROUPS'],
];

function RoundsField({
  label,
  value,
  onChange,
}: {
  readonly label: MessageKey;
  readonly value: 1 | 2;
  readonly onChange: (value: 1 | 2) => void;
}): ReactNode {
  const t = useT();

  return (
    <Field label={label}>
      <select
        aria-label={t(label)}
        value={value}
        onChange={(event) => {
          onChange(event.target.value === '2' ? 2 : 1);
        }}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
      >
        <option value="1">{t('tournament.form.oneRound')}</option>
        <option value="2">{t('tournament.form.twoRounds')}</option>
      </select>
    </Field>
  );
}

/** До скольких побед идёт встреча — ТЗ 5.2: bo3, bo5, bo7. */
function SetsField({
  label,
  value,
  onChange,
}: {
  readonly label: MessageKey;
  readonly value: 2 | 3 | 4;
  readonly onChange: (value: 2 | 3 | 4) => void;
}): ReactNode {
  const t = useT();

  return (
    <Field label={label}>
      <select
        aria-label={t(label)}
        value={value}
        onChange={(event) => {
          onChange(event.target.value === '2' ? 2 : event.target.value === '4' ? 4 : 3);
        }}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
      >
        <option value="2">{t('tournament.form.bo3')}</option>
        <option value="3">{t('tournament.form.bo5')}</option>
        <option value="4">{t('tournament.form.bo7')}</option>
      </select>
    </Field>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  readonly label: MessageKey;
  readonly value: number;
  readonly onChange: (value: number) => void;
}): ReactNode {
  const t = useT();

  return (
    <Field label={label}>
      <input
        aria-label={t(label)}
        type="number"
        inputMode="numeric"
        min={1}
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
      />
    </Field>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: MessageKey;
  readonly children: ReactNode;
}): ReactNode {
  const t = useT();

  return (
    <label className="block text-sm">
      <span className="text-slate-700">{t(label)}</span>
      {children}
    </label>
  );
}
