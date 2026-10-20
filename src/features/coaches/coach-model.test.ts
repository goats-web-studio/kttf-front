import { coachMissing } from '@kttf/shared/types';
import { describe, expect, it } from 'vitest';

import { fill, formatMoney, type MessageKey } from '@/common/i18n';
import { ru } from '@/common/i18n/ru';
import { whatsappHref } from '@/features/clubs/contacts';
import { COACH, DRAFT_COACH } from '@/test/coach-fixtures';

import { coachMessage, primaryCoachContact } from './contacts';
import {
  COACH_REQUIREMENT_KEYS,
  coachPhoto,
  hasWhere,
  headerBadges,
  mainQualification,
  priceText,
  youngestAge,
} from './labels';
import { coachStatusText, coachStatusTone } from './status';
import { summarizeCoachStats } from './stats-model';

const t = (key: MessageKey): string => ru[key];

describe('готовый текст в WhatsApp', () => {
  it('приветствие по имени и «пишу со страницы тренера на KTTF»', () => {
    expect(coachMessage('Иван', t)).toBe('Здравствуйте, Иван! Пишу со страницы тренера на KTTF.');
  });

  it('цель запроса дописывается после приветствия', () => {
    expect(coachMessage('Иван', t, 'trial')).toBe(
      'Здравствуйте, Иван! Пишу со страницы тренера на KTTF. Хочу записаться на пробную тренировку.',
    );
  });

  it('ссылка wa.me несёт текст целиком', () => {
    const href = whatsappHref(COACH.whatsapp ?? '', coachMessage('Иван', t, 'child'));

    expect(href.startsWith('https://wa.me/77011234567?text=')).toBe(true);
    expect(decodeURIComponent(href.split('text=')[1] ?? '')).toContain('для ребёнка');
  });

  it('главная кнопка — выбранная тренером, а без её контакта — первый заполненный', () => {
    expect(primaryCoachContact(COACH)).toBe('WHATSAPP');
    expect(primaryCoachContact({ ...COACH, primaryContact: 'TELEGRAM' })).toBe('TELEGRAM');
    expect(primaryCoachContact({ ...COACH, primaryContact: 'TELEGRAM', telegram: null })).toBe(
      'WHATSAPP',
    );
    expect(
      primaryCoachContact({ ...COACH, whatsapp: null, phone: null, telegram: null }),
    ).toBeNull();
  });
});

describe('подписи страницы', () => {
  it('цена: «20 000 ₸ в месяц» или «по договорённости»', () => {
    expect(priceText({ priceKzt: 20000, unit: 'MONTH' }, t, 'ru')).toBe(
      `${formatMoney(20000, 'ru')} в месяц`,
    );
    expect(priceText({ priceKzt: 5000, unit: 'NONE' }, t, 'ru')).toBe(formatMoney(5000, 'ru'));
    expect(priceText({ priceKzt: null, unit: 'NONE' }, t, 'ru')).toBe('по договорённости');
  });

  it('«дети с N лет» — самый младший возраст детских тренировок', () => {
    expect(youngestAge(COACH.trainings)).toBe(6);
    expect(
      youngestAge([
        { audiences: ['TEENS'], kidsFromAge: 12 },
        { audiences: ['KIDS'], kidsFromAge: 7 },
        // У взрослых возраст не учитывается, даже если пришёл.
        { audiences: ['AMATEURS'], kidsFromAge: 3 },
      ]),
    ).toBe(7);
    expect(youngestAge([])).toBeNull();
  });

  it('метки шапки: звание, категория, дети, языки', () => {
    expect(headerBadges(COACH, t)).toEqual([
      'КМС',
      'Тренер высшей категории',
      'дети с 6 лет',
      'Казахский, Русский',
    ]);
  });

  it('главная метка карточки — звание, иначе категория; «без категории» — не метка', () => {
    expect(mainQualification(COACH, t)).toBe('КМС');
    expect(mainQualification({ sportsRank: null, coachCategory: 'FIRST' }, t)).toBe(
      'Тренер первой категории',
    );
    expect(mainQualification({ sportsRank: null, coachCategory: 'NONE' }, t)).toBeNull();
  });

  it('фото — своё со страницы, иначе из профиля', () => {
    const own = '/api/v1/files/coaches/00000000-0000-4000-8000-000000000999.webp';

    expect(coachPhoto({ photoUrl: own, player: { photoUrl: '/p.jpg' } })).toBe(
      '/api/v1/files/coaches/00000000-0000-4000-8000-000000000999-480.webp',
    );
    expect(coachPhoto({ photoUrl: null, player: { photoUrl: '/p.jpg' } })).toBe('/p.jpg');
  });

  it('«Где тренирует» прячется, когда сказать нечего', () => {
    expect(hasWhere(COACH)).toBe(true);
    expect(hasWhere({ city: null, formats: [], visitAreas: null })).toBe(false);
  });
});

describe('статус и отправка на проверку', () => {
  it('недостающее для отправки — словами под кнопкой', () => {
    const missing = coachMissing(DRAFT_COACH);
    const text = fill(t('coach.missing.lead'), {
      items: missing.map((item) => t(COACH_REQUIREMENT_KEYS[item])).join(', '),
    });

    expect(missing).toEqual(['city', 'trainings']);
    expect(text).toBe('Чтобы отправить, не хватает: города, хотя бы одной тренировки.');
    expect(coachMissing(COACH)).toEqual([]);
  });

  it('статус словами: отказ и скрытие — с причиной', () => {
    expect(coachStatusText(DRAFT_COACH, t)).toBe('Черновик');
    expect(coachStatusText({ ...COACH, status: 'REJECTED', rejectReason: 'Нет фото' }, t)).toBe(
      'Отклонено: Нет фото',
    );
    // Скрытие важнее статуса заявки: скрытую опубликованную никто не видит.
    expect(coachStatusText({ ...COACH, hidden: true, hiddenReason: 'Жалоба' }, t)).toBe(
      'Скрыта: Жалоба',
    );
    expect(coachStatusTone(COACH)).toBe('ok');
    expect(coachStatusTone({ ...COACH, hidden: true })).toBe('warn');
    expect(coachStatusTone(DRAFT_COACH)).toBe('neutral');
  });
});

describe('статистика тренера', () => {
  it('суммы по способам связи и реклама отдельно; пустые дни — нулями', () => {
    const row = {
      phone: 0,
      whatsapp: 2,
      telegram: 1,
      instagram: 0,
    };
    const summary = summarizeCoachStats({
      from: '2026-10-18',
      to: '2026-10-20',
      rows: [
        { date: '2026-10-18', source: 'ORGANIC', views: 5, ...row },
        { date: '2026-10-20', source: 'CAMPAIGN', views: 3, ...row },
      ],
    });

    expect(summary.totals.views).toEqual({ total: 8, campaign: 3 });
    expect(summary.totals.whatsapp).toEqual({ total: 4, campaign: 2 });
    expect(summary.totals.telegram).toEqual({ total: 2, campaign: 1 });
    expect(summary.days).toEqual([
      { date: '2026-10-18', organic: 5, campaign: 0 },
      { date: '2026-10-19', organic: 0, campaign: 0 },
      { date: '2026-10-20', organic: 0, campaign: 3 },
    ]);
  });
});
