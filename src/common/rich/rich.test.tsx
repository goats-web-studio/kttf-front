import { mentionToken } from '@kttf/shared/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { ru } from '@/common/i18n/ru';

import RichField from './rich-field';
import RichText from './rich-text';

const ID = '00000000-0000-4000-8000-000000000001';

describe('показ разметки — ADR-076', () => {
  it('жирный, список, ссылка с подписью и отметка игрока', () => {
    const { container } = render(
      <RichText
        text={`**Итоги** турнира\n- ${mentionToken('player', ID, 'Ким Артём')}\n- [фото](https://kttf.kz/f)`}
      />,
    );

    expect(container.querySelector('strong')?.textContent).toBe('Итоги');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(screen.getByRole('link', { name: '@Ким Артём' }).getAttribute('href')).toBe(
      `/players/${ID}`,
    );
    const photo = screen.getByRole('link', { name: 'фото' });
    expect(photo.getAttribute('href')).toBe('https://kttf.kz/f');
    expect(photo.getAttribute('rel')).toContain('nofollow');
  });

  it('чужая схема ссылкой не становится', () => {
    render(<RichText text="[жми](javascript:alert(1))" />);

    expect(screen.queryByRole('link')).toBeNull();
  });
});

function Field({ initial }: { readonly initial: string }): ReactNode {
  const [value, setValue] = useState(initial);

  return (
    <>
      <RichField value={value} onChange={setValue} placeholder="Текст" />
      <output data-testid="value">{value}</output>
    </>
  );
}

describe('редактор — ADR-076', () => {
  it('«Ж» оборачивает выделение в жирный', () => {
    render(<Field initial="важно" />);
    const field = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Текст' });
    field.setSelectionRange(0, 5);

    fireEvent.click(screen.getByRole('button', { name: ru['rich.bold'] }));

    expect(screen.getByTestId('value').textContent).toBe('**важно**');
  });

  it('список — маркер в начало строк выделения', () => {
    render(<Field initial={'дети\nвзрослые'} />);
    const field = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Текст' });
    field.setSelectionRange(0, field.value.length);

    fireEvent.click(screen.getByRole('button', { name: ru['rich.bullets'] }));

    expect(screen.getByTestId('value').textContent).toBe('- дети\n- взрослые');
  });

  it('«Просмотр» показывает текст так, как его увидят', () => {
    render(<Field initial="**жирно**" />);

    fireEvent.click(screen.getByRole('button', { name: ru['rich.preview'] }));

    expect(document.querySelector('[data-rich-preview] strong')?.textContent).toBe('жирно');
  });
});
