import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string as "MMM D, YYYY" (e.g., "Jan 1, 2024")
 */
export function formatDate(dateString: string): string {
  return format(new Date(dateString), "MMM d, yyyy");
}
