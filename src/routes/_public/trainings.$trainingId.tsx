import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * Старый адрес страницы тренировки. «Подробнее» теперь — окно поверх
 * раздела (замечание владельца: отдельная страница выглядела пустой), а
 * ссылки, уже ушедшие в рекламу и чаты, ведут в раздел с открытым окном.
 */
export const Route = createFileRoute('/_public/trainings/$trainingId')({
  beforeLoad: ({ params }) => {
    throw redirect({ to: '/trainings', search: { training: params.trainingId }, replace: true });
  },
});
