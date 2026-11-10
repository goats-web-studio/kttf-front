import { beforeAll, describe, expect, it } from 'vitest';

import { DEFAULT_LOCALE, detectLocale, loadDictionary, LOCALES, type Dictionary } from './locale';
import { ru } from './ru';

let DICTIONARIES: Record<string, Dictionary> = {};

beforeAll(async () => {
  const entries = await Promise.all(
    LOCALES.map(async (locale) => [locale, await loadDictionary(locale)] as const),
  );
  DICTIONARIES = Object.fromEntries(entries);
});

describe('словари', () => {
  it('каждый язык покрывает русский полностью', () => {
    // Тип уже не даёт пропустить ключ, но не мешает добавить лишний: такой
    // ключ остаётся мёртвым и уводит переводчика в сторону.
    for (const dictionary of Object.values(DICTIONARIES)) {
      expect(Object.keys(dictionary).sort()).toEqual(Object.keys(ru).sort());
    }
  });

  it('подстановки совпадают с русскими', () => {
    const placeholders = (value: string): string[] => (value.match(/\{\w+\}/g) ?? []).sort();

    for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
      for (const [key, value] of Object.entries(ru)) {
        expect(placeholders(dictionary[key as keyof typeof ru]), `${locale}: ${key}`).toEqual(
          placeholders(value),
        );
      }
    }
  });

  it('пустых строк нет ни в одном языке', () => {
    // Пустая строка проходит проверку типов и доезжает до пользователя
    // пустым местом. Интерфейс обязан полностью работать на русском и
    // казахском — критерий готовности MVP, ТЗ 14.
    for (const [locale, dictionary] of Object.entries(DICTIONARIES)) {
      for (const [key, value] of Object.entries(dictionary)) {
        expect(value.trim(), `${locale}: ключ ${key} пуст`).not.toBe('');
      }
    }
  });
});

describe('detectLocale', () => {
  it('понимает язык с регионом', () => {
    expect(detectLocale(['kk-KZ'])).toBe('kk');
  });

  it('берёт первый поддерживаемый из списка предпочтений', () => {
    expect(detectLocale(['de-DE', 'ru-RU', 'kk'])).toBe('ru');
  });

  it('на неизвестном языке отдаёт основной — казахский', () => {
    expect(DEFAULT_LOCALE).toBe('kk');
    expect(detectLocale(['de', 'fr'])).toBe(DEFAULT_LOCALE);
    expect(detectLocale([])).toBe(DEFAULT_LOCALE);
  });

  it('отдаёт только объявленные языки', () => {
    for (const preference of ['ru', 'kk', 'tr', '']) {
      expect(LOCALES).toContain(detectLocale([preference]));
    }
  });
});
