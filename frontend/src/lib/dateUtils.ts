/**
 * Returns the current local date/time as a string suitable for
 * <input type="datetime-local"> (format: "YYYY-MM-DDTHH:mm").
 *
 * Unlike `new Date().toISOString().slice(0, 16)` which returns UTC,
 * this function returns the user's local time.
 */
export function getLocalDateTimeString(date?: Date): string {
  const d = date ?? new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
