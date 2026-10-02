/** Non-mutating slide reorder for tap controls. Drag/drop uses insertion indices separately. */
export function moveItemByStep<T>(items: readonly T[], index: number, direction: -1 | 1): T[] {
  const destination = index + direction;
  if (!Number.isInteger(index) || index < 0 || destination < 0 || destination >= items.length) {
    return [...items];
  }
  const next = [...items];
  const original = next[index]!;
  next[index] = next[destination]!;
  next[destination] = original;
  return next;
}
