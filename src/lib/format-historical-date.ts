/**
 * formatHistoricalDate
 *
 * Formats historical dates for museum-grade display.
 * E.g., formatHistoricalDate(120, 'BCE', true) -> "c. 120 BCE"
 *       formatHistoricalDate(1968, 'CE', false) -> "1968 CE"
 */
export function formatHistoricalDate(
  creationYear: number | null | undefined,
  calendarEra: string | null | undefined,
  isEstimated: boolean | null | undefined
): string {
  if (creationYear === null || creationYear === undefined || isNaN(creationYear)) {
    return "Unknown";
  }

  const era = calendarEra || "CE";
  const prefix = isEstimated !== false ? "c. " : "";
  return `${prefix}${creationYear} ${era}`;
}
