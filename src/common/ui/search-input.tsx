import { useEffect, useState, type ComponentProps, type ReactNode } from 'react';

import { Input } from './field';

/** Пауза после последней буквы, после которой фильтр применяется. */
const SETTLE_MS = 400;

type SearchInputProps = Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  /** Применённое значение — то, что сейчас в адресе. */
  readonly value: string | undefined;
  /** Вызывается, когда человек перестал печатать или нажал Enter. */
  readonly onCommit: (value: string) => void;
};

/**
 * Текстовый фильтр без кнопки «Показать» — docs/07-design-system.md, 6.2.
 *
 * Быстрый фильтр применяется сам, но не на каждую букву: иначе «Алматы»
 * — это шесть запросов и шесть записей в истории браузера. Поле держит
 * набранное у себя и отдаёт наружу, когда человек остановился.
 *
 * Обратная связь тоже нужна: «Сбросить все» очищает адрес, и поле обязано
 * опустеть. Сравнение идёт с обрезанным текстом — иначе пробел между
 * фамилией и именем съедался бы, едва человек задумался после него.
 */
export default function SearchInput({ value, onCommit, ...props }: SearchInputProps): ReactNode {
  const applied = value ?? '';
  const [draft, setDraft] = useState(applied);
  const [seen, setSeen] = useState(applied);

  if (applied !== seen) {
    setSeen(applied);
    if (draft.trim() !== applied) {
      setDraft(applied);
    }
  }

  useEffect(() => {
    if (draft.trim() === applied) {
      return;
    }

    const timer = setTimeout(() => {
      onCommit(draft);
    }, SETTLE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [draft, applied, onCommit]);

  return (
    <Input
      type="search"
      value={draft}
      onChange={(event) => {
        setDraft(event.target.value);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          onCommit(draft);
        }
      }}
      {...props}
    />
  );
}
