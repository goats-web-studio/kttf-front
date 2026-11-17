import type { LegalLanguage } from '@kttf/shared/types';

/**
 * Операторы персональных данных — ADR-091.
 *
 * Единственное место, которое правится, когда операторы откроют ИП или ТОО:
 * тексты документов ссылаются сюда через `{{OPERATOR}}` и `{{EMAIL}}`.
 */
export const LEGAL_CONTACT_EMAIL = 'aa.amanbayew@gmail.com';

export const OPERATOR_BLOCK: Readonly<Record<LegalLanguage, string>> = {
  ru: '**Операторы персональных данных:** Аманбаев Арлан и Гасанов Амирхан — физические лица, действующие совместно (далее — «мы», «Операторы»).\n\n**Адрес для обращений, в том числе по персональным данным:** {{EMAIL}}\n\n**Сайт:** [kttf.kz](https://kttf.kz)',
  kk: '**Дербес деректер операторлары:** Аманбаев Арлан және Гасанов Амирхан — бірлесіп әрекет ететін жеке тұлғалар (бұдан әрі — «біз», «Операторлар»).\n\n**Өтініштерге, соның ішінде дербес деректер бойынша, арналған мекенжай:** {{EMAIL}}\n\n**Сайт:** [kttf.kz](https://kttf.kz)',
  en: '**Personal data operators:** Arlan Amanbayev and Amirkhan Gasanov, individuals acting jointly ("we", the "Operators").\n\n**Contact for all requests, including personal data:** {{EMAIL}}\n\n**Website:** [kttf.kz](https://kttf.kz)',
};
