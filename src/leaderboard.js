export const LEADERBOARD_KEY='lantern-leaderboard-v1';
export const NAME_PATTERN=/^[A-Za-z0-9_]{3,12}$/;

export function rankEntries(entries) {
  return [...entries].filter((entry)=>entry&&NAME_PATTERN.test(entry.name)&&Number.isInteger(entry.score)&&entry.score>=0&&Number.isInteger(entry.nights_won)&&entry.nights_won>=0&&entry.nights_won<=3&&Number.isInteger(entry.seed)&&Number.isFinite(Date.parse(entry.achieved_at))&&/(Z|[+-]\d\d:\d\d)$/.test(entry.achieved_at))
    .sort((a,b)=>b.score-a.score||Date.parse(a.achieved_at)-Date.parse(b.achieved_at))
    .slice(0,10);
}

export function readLeaderboard(storage=globalThis.localStorage) {
  try { const value=JSON.parse(storage.getItem(LEADERBOARD_KEY)??'{"entries":[]}');return rankEntries(Array.isArray(value.entries)?value.entries:[]); }
  catch { return []; }
}

export function writeLeaderboard(entry,storage=globalThis.localStorage) {
  if(!NAME_PATTERN.test(entry.name)) throw new Error('Tên cần dài 3–12 ký tự, chỉ dùng A–Z, a–z, 0–9 và gạch dưới.');
  if(!Number.isInteger(entry.score)||entry.score<0||!Number.isInteger(entry.nights_won)||entry.nights_won<0||entry.nights_won>3||!Number.isInteger(entry.seed)) throw new Error('Thông tin điểm không hợp lệ.');
  if(!Number.isFinite(Date.parse(entry.achieved_at))||!/(Z|[+-]\d\d:\d\d)$/.test(entry.achieved_at)) throw new Error('Thời điểm cần là ISO 8601 có múi giờ.');
  const entries=rankEntries([...readLeaderboard(storage),entry]);
  storage.setItem(LEADERBOARD_KEY,JSON.stringify({entries}));
  return entries;
}
