/** Новый порядок после переноса фото `from` на место `to`. */
export function moveId(ids: readonly string[], from: number, to: number): string[] {
  const next = [...ids];
  const [id] = next.splice(from, 1);

  if (id !== undefined) next.splice(Math.max(0, Math.min(to, next.length)), 0, id);

  return next;
}
