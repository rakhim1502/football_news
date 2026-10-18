import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";

export interface Subscriber {
  time: string; // "HH:MM" in the bot's timezone
  lastSent?: string; // "YYYY-MM-DD" in the bot's timezone
}

const DIR = "data";
const FILE = `${DIR}/subscribers.json`;

function load(): Record<string, Subscriber> {
  try {
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

const subscribers = load();

function save() {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${FILE}.tmp`, JSON.stringify(subscribers, null, 2));
  renameSync(`${FILE}.tmp`, FILE);
}

export const getSubscriber = (chatId: number) => subscribers[chatId];

export const allSubscribers = () => Object.entries(subscribers).map(([id, s]) => ({ chatId: Number(id), ...s }));

export function setTime(chatId: number, time: string) {
  const prev = subscribers[chatId];
  // Keep lastSent so changing the time after today's send doesn't cause a second message today.
  subscribers[chatId] = { time, lastSent: prev?.lastSent };
  save();
}

export function markSent(chatId: number, date: string) {
  if (!subscribers[chatId]) return;
  subscribers[chatId].lastSent = date;
  save();
}

export function remove(chatId: number): boolean {
  const existed = chatId in subscribers;
  delete subscribers[chatId];
  if (existed) save();
  return existed;
}
