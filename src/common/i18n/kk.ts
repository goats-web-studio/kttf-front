import type { MessageKey } from './locale';

/**
 * Казахский словарь.
 *
 * Тип обязывает перечислить все ключи: интерфейс полностью работает на русском
 * и казахском — критерий готовности MVP, ТЗ 14. Пропуск ключа ломает сборку,
 * а не появляется у пользователя пустым местом.
 */
export const kk: Record<MessageKey, string> = {
  'app.name': 'KTTF',
  'app.tagline': 'Қазақстан үстел теннисі',

  'nav.home': 'Басты бет',
  'nav.ratings': 'Рейтинг',
  'nav.tournaments': 'Турнирлер',

  'page.home.title': 'Қазақстан үстел теннисі',
  'page.home.lead': 'Ел бойынша турнирлер, рейтинг және күнтізбе.',
  'page.ratings.title': 'Рейтинг',
  'page.tournaments.title': 'Турнирлер күнтізбесі',
  'page.player.title': 'Ойыншы профилі',
  'page.cabinet.title': 'Жеке кабинет',
  'page.console.title': 'Төреші консолі',
  'page.screen.title': 'Зал экраны',

  'common.soon': 'Бөлім дайындалуда.',
  'common.loading': 'Жүктелуде',

  'error.notFound.title': 'Бет табылмады',
  'error.notFound.action': 'Басты бетке',
  'error.unexpected.title': 'Бірдеңе дұрыс болмады',
  'error.unexpected.action': 'Қайталау',

  'error.network': 'Сервермен байланыс жоқ',
  'error.api.VALIDATION_FAILED': 'Толтырылған өрістерді тексеріңіз',
  'error.api.NOT_FOUND': 'Табылмады',
  'error.api.UNAUTHORIZED': 'Қайта кіру қажет',
  'error.api.FORBIDDEN': 'Құқық жеткіліксіз',
  'error.api.RATE_LIMITED': 'Сұраныс тым көп, кейінірек көріңіз',
  'error.api.INTERNAL_ERROR': 'Серверде қате',

  'pwa.update.message': 'Жаңа нұсқа қолжетімді',
  'pwa.update.apply': 'Жаңарту',
  'pwa.update.dismiss': 'Кейінірек',
};
