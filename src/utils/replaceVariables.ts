export function replaceVariables(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (window.puzzleCodeData?.[key as keyof typeof window.puzzleCodeData]) {
      return String(window.puzzleCodeData[key as keyof typeof window.puzzleCodeData]);
    }
    if (window.puzzleUser?.[key.toLowerCase() as keyof typeof window.puzzleUser]) {
      return String(window.puzzleUser[key.toLowerCase() as keyof typeof window.puzzleUser]);
    }
    return `{{${key}}}`;
  });
}
