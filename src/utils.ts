import { v4 as uuidv4 } from "uuid";
import { faker } from "@faker-js/faker/locale/de";
import { ERROR_RATE } from "./config.js";

// ─── ID Generation ───

export function genId(): string {
  return uuidv4();
}

// ─── Error Injection ───

/** Returns true ~1.5% of the time (or at the configured ERROR_RATE) */
export function shouldInjectError(rate: number = ERROR_RATE): boolean {
  return Math.random() < rate;
}

/** Pick a random error type from a list */
export function pickErrorType(types: string[]): string {
  return types[Math.floor(Math.random() * types.length)];
}

// ─── Date Helpers ───

export function dateRange(start: string, end: string): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  const endDate = new Date(end);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export function formatTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

export function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function monthsBetween(start: string, end: string): { start: string; end: string }[] {
  const months: { start: string; end: string }[] = [];
  const current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    months.push({
      start: formatDate(monthStart),
      end: formatDate(monthEnd > endDate ? endDate : monthEnd),
    });

    current.setMonth(current.getMonth() + 1);
    current.setDate(1);
  }
  return months;
}

export function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

export function addMonths(date: string, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return formatDate(d);
}

// ─── Number Helpers ───

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Pick a random element from an array */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Pick N random elements from an array (no duplicates) */
export function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ─── German-specific helpers ───

export function generateGermanIBAN(): string {
  return faker.finance.iban({ formatted: false, countryCode: "DE" });
}

export function generateGermanTaxId(): string {
  // German tax ID is 11 digits
  const digits = Array.from({ length: 11 }, () => randomInt(0, 9));
  return digits.join("");
}

export function generateSocialSecurityNumber(): string {
  // German format: XX DDMMYY X XXXX
  const area = randomInt(10, 99);
  const birthPart = `${String(randomInt(1, 28)).padStart(2, "0")}${String(randomInt(1, 12)).padStart(2, "0")}${String(randomInt(60, 99)).padStart(2, "0")}`;
  const letter = String.fromCharCode(65 + randomInt(0, 25));
  const serial = String(randomInt(0, 9999)).padStart(4, "0");
  return `${area}${birthPart}${letter}${serial}`;
}

// ─── Counter for sequential numbering ───

export class SequentialCounter {
  private counters: Map<string, number> = new Map();

  next(prefix: string, padLength: number = 6): string {
    const current = this.counters.get(prefix) || 0;
    const next = current + 1;
    this.counters.set(prefix, next);
    return `${prefix}-${String(next).padStart(padLength, "0")}`;
  }
}

// ─── Progress Logger ───

export function logProgress(label: string, count: number): void {
  console.log(`  ✓ Generated ${count.toLocaleString()} ${label}`);
}
