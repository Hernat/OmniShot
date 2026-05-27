const PICKER_CANCELLED_CODE = "ERR_PICKER_CANCELLED";

export function isPickerCancellation(error: unknown): boolean {
  if (error == null) return false;
  const code = (error as { code?: string }).code;
  if (code === PICKER_CANCELLED_CODE) return true;
  const causeCode = (error as { cause?: { code?: string } }).cause?.code;
  if (causeCode === PICKER_CANCELLED_CODE) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /\bcancelled\b/i.test(message);
}
