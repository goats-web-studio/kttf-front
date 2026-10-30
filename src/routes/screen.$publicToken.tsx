import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';

import { isMissingResource } from '@/common/api';
import { useT } from '@/common/i18n';
import QueryState from '@/common/ui/query-state';
import ThemeRoot from '@/common/ui/theme';
import { useNow } from '@/features/console/use-now';
import { fetchScreenResults } from '@/features/screen/api';
import Stage from '@/features/screen/stage';
import { useScreen } from '@/features/screen/use-screen';
import Wall from '@/features/screen/wall';
import { isClosed } from '@/features/screen/wall-model';

/**
 * `?show=bracket` закрепляет вид на этом экране: второй ТВ в зале может
 * показывать только сетку, а первый — листать всё.
 */
const searchSchema = z.object({
  show: z.enum(['tables', 'groups', 'bracket', 'results']).optional().catch(undefined),
});

export const Route = createFileRoute('/screen/$publicToken')({
  validateSearch: searchSchema,
  component: ScreenRoute,
});

/**
 * Второй экран зала — ТЗ 6.5, ТС 7.7, ADR-082.
 *
 * Без авторизации и без общей оболочки: это телевизор на стене, а не
 * страница для человека с телефоном. Доступ даёт публичный токен в адресе.
 * Сама стена — `features/screen/wall` на сцене 1920×1080.
 */
function ScreenRoute(): ReactNode {
  return (
    // Светлый, как и весь продукт (октябрь 2026): на экране зала белый фон
    // с чёрным текстом читается издалека не хуже, а выглядит своим.
    <ThemeRoot>
      <ScreenPage />
    </ThemeRoot>
  );
}

/** Сколько секунд висит заставка «Турнир завершён». */
const SPLASH_SECONDS = 10;

function ScreenPage(): ReactNode {
  const t = useT();
  const { publicToken } = Route.useParams();
  const { show } = Route.useSearch();
  const { view, isPending, error, live, retry } = useScreen(publicToken);
  // Секунда — для смены слайдов по часам и минуты на столах.
  const now = useNow(1_000);
  const [splash, setSplash] = useState(false);

  const status = view?.tournament.status;
  const closed = isClosed(status);
  // Статус в ключе: переход «Завершён» → «Обсчитан» перезапрашивает итоги, и
  // рейтинг в местах появляется сам.
  const results = useQuery({
    queryKey: ['screen', 'results', view?.tournament.id, status],
    queryFn: () => fetchScreenResults(view?.tournament.id ?? ''),
    enabled: closed && view !== undefined,
    staleTime: Infinity,
  });

  // Заставка — только на переходе, увиденном вживую. Стена, открытая уже
  // после турнира, сразу показывает итоги: «турнир завершён» на весь экран
  // при каждом обновлении страницы мешал бы, а не сообщал.
  const previous = useRef(status);
  useEffect(() => {
    const was = previous.current;
    previous.current = status;

    if (was === 'RUNNING' && isClosed(status)) {
      setSplash(true);
    }
  }, [status]);

  useEffect(() => {
    if (!splash) {
      return;
    }

    const timer = setTimeout(() => {
      setSplash(false);
    }, SPLASH_SECONDS * 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [splash]);

  // Телевизор никто не прокручивает: у страницы экрана прокрутки нет вовсе.
  useEffect(() => {
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = 'hidden';

    return () => {
      root.style.overflow = before;
    };
  }, []);

  // Неизвестный токен — не сбой связи, а неверная ссылка, и висеть на стене
  // с просьбой проверить заполненные поля экран не должен. Отказ приходит
  // только когда состояния нет вовсе: при обрыве связи `view` остаётся, и
  // стена продолжает показывать последнее известное.
  if (isMissingResource(error)) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          px: 3,
          textAlign: 'center',
        }}
      >
        <Typography
          role="alert"
          color="text.secondary"
          sx={{ fontSize: 'clamp(20px, 2vw, 64px)', lineHeight: 1.3 }}
        >
          {t('screen.notFound')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{ width: '100vw', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}
    >
      <QueryState isPending={isPending} error={error} onRetry={retry}>
        {view === undefined ? null : (
          <Stage>
            <Wall
              view={view}
              results={closed ? results.data : undefined}
              now={now}
              live={live}
              show={show ?? null}
              splash={splash}
            />
          </Stage>
        )}
      </QueryState>
    </Box>
  );
}
