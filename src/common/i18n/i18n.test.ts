import { describe, expect, it } from 'vitest';

import { kk } from './kk';
import { DEFAULT_LOCALE, detectLocale, LOCALES } from './locale';
import { ru } from './ru';

describe('словари', () => {
  it('казахский покрывает русский полностью', () => {
    // Тип уже не даёт пропустить ключ, но не мешает добавить лишний: такой
    // ключ остаётся мёртвым и уводит переводчика в сторону.
    expect(Object.keys(kk).sort()).toEqual(Object.keys(ru).sort());
  });

  it('пустых строк нет ни в одном языке', () => {
    // Пустая строка проходит проверку типов и доезжает до пользователя
    // пустым местом. Интерфейс обязан полностью работать на русском и
    // казахском — критерий готовности MVP, ТЗ 14.
    for (const [locale, dictionary] of Object.entries({ ru, kk })) {
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
    expect(detectLocale(['en-US', 'ru-RU', 'kk'])).toBe('ru');
  });

  it('на неизвестном языке отдаёт русский', () => {
    // ТЗ 11: приоритет наполнения русский → казахский → английский.
    expect(detectLocale(['de', 'fr'])).toBe(DEFAULT_LOCALE);
    expect(detectLocale([])).toBe(DEFAULT_LOCALE);
  });

  it('отдаёт только объявленные языки', () => {
    for (const preference of ['ru', 'kk', 'tr', '']) {
      expect(LOCALES).toContain(detectLocale([preference]));
    }
  });
});
