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

  'page.login.title': 'Вход',
  'login.lead': 'Пришлём одноразовый код на номер телефона. Пароля нет.',
  'login.phone.label': 'Номер телефона',
  'login.phone.placeholder': '+7XXXXXXXXXX',
  'login.code.label': 'Код из сообщения',
  'login.code.sent': 'Код отправлен на номер',
  'login.submit.requestCode': 'Получить код',
  'login.submit.verify': 'Войти',
  'login.changePhone': 'Изменить номер',
  'login.signOut': 'Выйти',

  'error.form.phone': 'Номер ожидается в формате +7XXXXXXXXXX',
  'error.form.code': 'Код состоит из шести цифр',

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
  'error.api.TOURNAMENT_NOT_RUNNING': 'Турнир не идёт',
  'error.api.MATCH_NOT_READY': 'Участники встречи ещё не определены',
  'error.api.MATCH_ALREADY_FINISHED': 'Результат уже введён',
  'error.api.MATCH_HAS_NO_RESULT': 'У встречи нет результата',
  'error.api.INVALID_SCORE': 'Счёт не соответствует схеме встречи',
  'error.api.DOWNSTREAM_MATCH_PLAYED': 'Следующая встреча уже сыграна — сначала отмените её',
  'error.api.TIE_DECISION_INVALID': 'Эти участники не делят место',

  'pwa.update.message': 'Доступна новая версия',
  'pwa.update.apply': 'Обновить',
  'pwa.update.dismiss': 'Позже',
} as const satisfies Record<string, string>;
