import { createLink } from '@tanstack/react-router';
import { forwardRef, type AnchorHTMLAttributes } from 'react';

/**
 * Якорь для MUI, ведущий через роутер.
 *
 * MUI отдаёт компоненту `href`, роутер ждёт `to` и `search` раздельно:
 * строка запроса разбирается в объект, иначе `?status=REG_OPEN` ушла бы в
 * путь. Внешние адреса и `mailto:` остаются обычной ссылкой.
 */
const Anchor = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  function Anchor(props, ref) {
    return <a ref={ref} {...props} />;
  },
);

const TanStackAnchor = createLink(Anchor);

const RouterLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(
  function RouterLink({ href, ...props }, ref) {
    if (href === undefined || /^([a-z]+:|\/\/)/i.test(href)) {
      return <a ref={ref} href={href} {...props} />;
    }

    // Атрибуты якоря роутер пропускает к <a> как есть; разница только в
    // строгости необязательных полей, поэтому приведение, а не перечисление.
    const [path = '/', query] = href.split('?', 2);
    const search = query === undefined ? undefined : Object.fromEntries(new URLSearchParams(query));

    return (
      <TanStackAnchor
        ref={ref}
        to={path}
        {...(search === undefined ? {} : { search })}
        {...(props as object)}
      />
    );
  },
);

export default RouterLink;
