import ur from './ur.json';

export type Language = 'en' | 'ur';
let language: Language = 'en';
const listeners = new Set<() => void>();
export const currentLanguage = () => language;
export function subscribeLanguage(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function applyLanguage(value: Language) {
  if (language === value) return;
  language = value;
  listeners.forEach(listener => listener());
}
export function displayLocale(english = 'en-GB') {
  return language === 'ur' ? 'ur-PK' : english;
}
// Translate app-owned copy only. Arguments are inserted verbatim, including names and amounts.
export function t(message: string, ...values: readonly unknown[]): string {
  const text =
    language === 'ur' && Object.prototype.hasOwnProperty.call(ur, message)
      ? ur[message as keyof typeof ur]
      : message;
  return values.length
    ? text.replace(/\{(\d+)\}/g, (token, index) =>
        Number(index) < values.length ? String(values[Number(index)]) : token,
      )
    : text;
}
