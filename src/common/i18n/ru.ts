/**
 * Русский словарь — эталонный.
 *
 * Из него выводится тип ключа, поэтому остальные языки не могут разойтись
 * с ним молча: пропущенный ключ не компилируется. Приоритет наполнения
 * задан ТЗ 11: русский → казахский → английский.
 */
export const ru = {
  'app.name': 'KTTF',
  'app.tagline': 'Настольный теннис Казахстана',

  'nav.home': 'Главная',
  'nav.ratings': 'Рейтинг',
  'nav.tournaments': 'Турниры',

  'page.home.title': 'Настольный теннис Казахстана',
  'page.home.lead': 'Турниры, рейтинг и календарь по стране.',
  'page.ratings.title': 'Рейтинг',
  'page.tournaments.title': 'Календарь турниров',
  'page.player.title': 'Профиль игрока',
  'page.cabinet.title': 'Кабинет',
  'page.console.title': 'Консоль судьи',
  'page.screen.title': 'Экран зала',

  'common.soon': 'Раздел готовится.',
  'common.loading': 'Загрузка',

  'error.notFound.title': 'Страница не найдена',
  'error.notFound.action': 'На главную',
  'error.unexpected.title': 'Что-то пошло не так',
  'error.unexpected.action': 'Повторить',

  'error.network': 'Нет связи с сервером',
  'error.api.VALIDATION_FAILED': 'Проверьте заполненные поля',
  'error.api.NOT_FOUND': 'Не найдено',
  'error.api.UNAUTHORIZED': 'Нужно войти заново',
  'error.api.FORBIDDEN': 'Недостаточно прав',
  'error.api.RATE_LIMITED': 'Слишком много запросов, попробуйте позже',
  'error.api.INTERNAL_ERROR': 'Ошибка на сервере',

  'pwa.update.message': 'Доступна новая версия',
  'pwa.update.apply': 'Обновить',
  'pwa.update.dismiss': 'Позже',
} as const satisfies Record<string, string>;
