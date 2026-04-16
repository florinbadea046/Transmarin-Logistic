export function stripDiacritics(input: string): string {
  return input
    .replace(/[ăâ]/g, "a")
    .replace(/[ĂÂ]/g, "A")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/[șş]/g, "s")
    .replace(/[ȘŞŠ]/g, "S")
    .replace(/[țţ]/g, "t")
    .replace(/[ȚŢŤ]/g, "T");
}
