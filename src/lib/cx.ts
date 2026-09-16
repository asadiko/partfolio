type ClassValue = string | false | null | undefined;

/** Joins conditional class names; immune to formatters that trim whitespace inside template literals. */
export const cx = (...parts: ClassValue[]): string => parts.filter(Boolean).join(' ');
