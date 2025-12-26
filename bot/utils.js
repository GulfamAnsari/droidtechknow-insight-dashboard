export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getISTNow() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}


export function getNextIntervalMs() {
  const now = getISTNow();
  const day = now.getDay(); // 0 Sun, 6 Sat
  const hour = now.getHours();

  const isWeekend = day === 0 || day === 6;

  // Weekends → every 1 hour
  if (isWeekend) {
    return 60 * 60 * 1000;
  }

  // Weekdays
  if (hour >= 7 && hour < 16) {
    return 1 * 60 * 1000; // 1 minute
  }

  if (hour >= 1 && hour < 7) {
    return 2 * 60 * 60 * 1000; // 2 hour
  }

  // Rest (16:00–01:00)
  return 30 * 60 * 1000; // 30 minutes
}
