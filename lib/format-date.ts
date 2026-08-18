/** Short "day + month" label for a Note card (e.g. "15 Oct") — a display
 * concern only, kept out of the repository layer. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
