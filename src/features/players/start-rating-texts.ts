import type { Locale } from '@/common/i18n';

/**
 * Подсказки поля стартового рейтинга — не в общих словарях.
 *
 * Словари ru и kk грузятся сразу, в том числе в набор консоли судьи, а он
 * упирается в бюджет 420 КБ gzip (ТС 8.1, `precache.test.ts`). Поле живёт на
 * странице турнира, и его подсказки уходят в её чанк.
 */
export const START_RATING_TEXTS: Readonly<
  Record<Locale, { readonly hint: string; readonly invalid: string }>
> = {
  ru: {
    hint: 'Точное число до сотых или уровень ниже — по нему игрок посеется',
    invalid: 'От {min} до {max}, до сотых',
  },
  kk: {
    hint: 'Жүздікке дейін дәл сан немесе төмендегі деңгей — себу соған қарай',
    invalid: '{min}–{max}, жүздікке дейін',
  },
  en: {
    hint: 'An exact number to the hundredth, or a level below — used for seeding',
    invalid: '{min} to {max}, to the hundredth',
  },
  zh: {
    hint: '精确到小数点后两位，或在下方选择水平——种子排位以此为准',
    invalid: '{min}–{max}，最多两位小数',
  },
  ja: {
    hint: '小数第2位までの正確な数値、または下のレベル。シードに使われます',
    invalid: '{min}〜{max}、小数第2位まで',
  },
  ko: {
    hint: '소수점 둘째 자리까지 정확한 숫자 또는 아래 레벨 — 시드 기준이에요',
    invalid: '{min}~{max}, 소수점 둘째 자리까지',
  },
};
