import { ru } from './ru';

/**
 * Английский словарь — пока частичный.
 *
 * ТЗ 11 ставит английский последним в очереди наполнения. Сейчас переведены
 * шапка и первый экран главной; остальные строки берутся из русского, пока
 * словарь не заполнен целиком.
 */
export const en: Readonly<Record<keyof typeof ru, string>> = {
  ...ru,
  'app.tagline': 'Kazakh Table Tennis Forum',
  'app.logo': 'KTTF — Kazakh Table Tennis Forum',
  'page.home.title': 'Kazakh Table Tennis Forum',
  'nav.home': 'Home',
  'nav.ratings': 'Rating',
  'nav.players': 'Players',
  'nav.tournaments': 'Tournaments',
  'nav.clubs': 'Clubs',
  'nav.market': 'Market',
  'nav.trainings': 'Training',
  'nav.forum': 'Forum',
  'nav.sections': 'Site sections',
  'nav.language': 'Language',
  'page.login.title': 'Sign in',
  'home.hero.find': 'Search',
  'home.hero.titleWhite': 'Kazakh Table',
  'home.hero.titleRed': 'Tennis Forum',
  'home.hero.line': 'KTTF · tournaments · rating · clubs · players',
  'home.hero.forum': 'KTTF — Kazakh Table Tennis Forum',
  'home.hero.about':
    'The home of table tennis in Kazakhstan: tournaments, player ratings, clubs and coaches in one place.',
  'home.hero.placeholder': 'Player surname',
  'home.counts.players': 'Players',
  'home.counts.clubs': 'Clubs',
  'home.counts.tournaments': 'Tournaments',
  'home.counts.coaches': 'Coaches',
};
