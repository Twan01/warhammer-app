import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toggleArrayItem<T>(array: T[], item: T): T[] {
  return array.includes(item) ? array.filter((x) => x !== item) : [...array, item];
}
