import { afterEach, describe, expect, it } from 'vitest';

import { installLeadingZeroGuard, stripLeadingZeros } from './leading-zero';

describe('stripLeadingZeros', () => {
  it('убирает ведущие нули перед цифрой', () => {
    expect(stripLeadingZeros('03500')).toBe('3500');
    expect(stripLeadingZeros('004')).toBe('4');
  });

  it('ноль, дробь и пустое — как есть', () => {
    expect(stripLeadingZeros('0')).toBe('0');
    expect(stripLeadingZeros('0.5')).toBe('0.5');
    expect(stripLeadingZeros('0,25')).toBe('0,25');
    expect(stripLeadingZeros('')).toBe('');
  });
});

describe('installLeadingZeroGuard — во всех числовых полях документа', () => {
  let uninstall: () => void = () => undefined;

  afterEach(() => {
    uninstall();
    document.body.innerHTML = '';
  });

  function typeInto(input: HTMLInputElement, value: string): string {
    document.body.append(input);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input.value;
  }

  it('числовое поле и поле с цифровой клавиатурой — без ведущего нуля', () => {
    uninstall = installLeadingZeroGuard();

    const number = document.createElement('input');
    number.type = 'number';
    const numeric = document.createElement('input');
    numeric.inputMode = 'numeric';

    expect(typeInto(number, '03500')).toBe('3500');
    expect(typeInto(numeric, '04')).toBe('4');
  });

  it('телефон и текст не трогает', () => {
    uninstall = installLeadingZeroGuard();

    const tel = document.createElement('input');
    tel.type = 'tel';
    const text = document.createElement('input');

    expect(typeInto(tel, '0701')).toBe('0701');
    expect(typeInto(text, '007')).toBe('007');
  });
});
