
import { Shift } from '../types';

// 將字串中的所有空白（含全形）移除，用於標題或姓名比對
const cleanString = (str: any): string => {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[\s\u3000]/g, '');
};

const normalizeTime = (timeStr: string): string => {
  if (!timeStr || timeStr === '00:00' || timeStr === 'undefined' || timeStr === 'null') return '';
  let t = String(timeStr).trim();
  if (t.includes(' ')) {
    const parts = t.split(' ');
    const lastPart = parts[parts.length - 1];
    if (lastPart.includes(':')) t = lastPart;
  }
  const parts = t.split(':');
  if (parts.length < 2) return "";
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}:${m}`;
};

const normalizeDate = (dateStr: string): string => {
  if (!dateStr || dateStr === 'undefined' || dateStr === 'null') return '';
  let d = String(dateStr).trim();
  if (d.includes(' ')) d = d.split(' ')[0];
  if (d.includes('T')) d = d.split('T')[0];
  
  const cleanStr = d.replace(/\//g, '-');
  const parts = cleanStr.split('-');
  
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
    } else if (parts[2].length === 4) {
      return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
  }
  return cleanStr;
};

const calculateHours = (date: string, startTime: string, endTime: string, breakMinutes: number): number => {
    if (!startTime || !endTime || startTime === '未打卡' || endTime === '未打卡') return 0;
    const nDate = normalizeDate(date);
    const dParts = nDate.split('-').map(Number);
    const sParts = startTime.split(':').map(Number);
    const eParts = endTime.split(':').map(Number);
    if (dParts.length !== 3 || sParts.length < 2 || eParts.length < 2) return 0;
    try {
        const start = new Date(dParts[0], dParts[1] - 1, dParts[2], sParts[0], sParts[1], 0);
        let end = new Date(dParts[0], dParts[1] - 1, dParts[2], eParts[0], eParts[1], 0);
        // Fixed typo: iNaN -> isNaN
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
        if (end.getTime() <= start.getTime()) end.setDate(end.getDate() + 1);
        const diffMs = end.getTime() - start.getTime();
        
        // 計算總工時
        const totalHours = (diffMs / (1000 * 60 * 60)) - ((breakMinutes || 0) / 60);
        
        // 使用四捨五入至整數 (依使用者要求)
        return isNaN(totalHours) ? 0 : Math.max(0, Math.round(totalHours));
    } catch (e) { return 0; }
};

export const groupShiftsByDate = (shifts: Shift[]): Shift[] => {
  const groups: { [key: string]: Shift[] } = {};
  shifts.forEach(s => {
    const nDate = normalizeDate(s.date);
    if (!nDate) return;
    if (!groups[nDate]) groups[nDate] = [];
    groups[nDate].push(s);
  });

  return Object.keys(groups).sort().map(date => {
    const dayRows = groups[date];
    let firstStartTime = '';
    let firstEndTime = '';
    let totalBreak = 0;
    let employeeName = dayRows[0]?.employeeName;
    
    const sorted = [...dayRows].sort((a,b) => a.startTime.localeCompare(b.startTime));

    for (const row of sorted) {
        const s = normalizeTime(row.startTime);
        const e = normalizeTime(row.endTime);
        if (!firstStartTime && s) firstStartTime = s;
        if (e && e !== '未打卡') firstEndTime = e;
        totalBreak += (Number(row.breakMinutes) || 0);
    }
    
    if (!firstEndTime && sorted.length > 0) {
        const first = sorted[0];
        if (first.endTime && first.endTime !== '未打卡') firstEndTime = normalizeTime(first.endTime);
    }

    if (!firstEndTime && sorted.length > 1) {
        const last = sorted[sorted.length - 1];
        if (last.startTime) firstEndTime = normalizeTime(last.startTime);
    }

    const dailyHours = calculateHours(date, firstStartTime, firstEndTime, totalBreak);
    return {
      id: `group-${date}`,
      employeeName,
      date,
      startTime: firstStartTime || '未打卡',
      endTime: firstEndTime || '未打卡',
      breakMinutes: totalBreak,
      totalHours: dailyHours,
      notes: dayRows.map(s => s.notes).filter(n => n?.trim()).join('; ')
    };
  });
};

export const fetchGASData = async (url: string, targetName: string = ''): Promise<{ shifts: Shift[], mappedKeys: any }> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('連線錯誤');
    const rawData = await response.json();
    
    let rows: any[] = [];
    if (Array.isArray(rawData)) {
      if (rawData.length > 0 && Array.isArray(rawData[0])) {
        const headers = rawData[0].map((h: any, i: number) => {
          const clean = cleanString(h);
          return clean || String.fromCharCode(65 + i); 
        });
        rows = rawData.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((header: string, i: number) => {
            obj[header] = row[i];
          });
          return obj;
        });
      } else {
        rows = rawData;
      }
    } else if (rawData.data && Array.isArray(rawData.data)) {
        rows = rawData.data;
    } else {
        throw new Error("格式錯誤");
    }

    if (rows.length === 0) return { shifts: [], mappedKeys: {} };
    const keys = Object.keys(rows[0]);

    const nameKey = keys.includes('D') ? 'D' : (keys.find(k => ['員工姓名', '姓名', '員工', 'Name'].some(kw => cleanString(k).includes(kw))) || keys[3]);
    const dateKey = keys.includes('A') ? 'A' : (keys.find(k => ['日期', 'date', 'Timestamp'].some(kw => cleanString(k).includes(kw))) || keys[0]);
    const startKey = keys.includes('B') ? 'B' : (keys.find(k => ['上班', 'startTime', 'start'].some(kw => cleanString(k).includes(kw))) || keys[1]);
    const endKey = keys.includes('C') ? 'C' : (keys.find(k => ['下班', 'endTime', 'end'].some(kw => cleanString(k).includes(kw))) || keys[2]);
    const noteKey = keys.includes('E') ? 'E' : (keys.find(k => ['備註', 'notes', 'Remark'].some(kw => cleanString(k).includes(kw))) || keys[4]);
    
    const brkKey = keys.find(k => k !== nameKey && ['休息', 'break'].some(kw => cleanString(k).toLowerCase().includes(kw.toLowerCase())));

    const shifts = rows.map((item: any, index: number) => ({
      id: `gas-${index}`,
      employeeName: String(item[nameKey] || '').trim(),
      date: normalizeDate(item[dateKey]),
      startTime: String(item[startKey] || ''),
      endTime: String(item[endKey] || ''),
      breakMinutes: brkKey ? (parseInt(item[brkKey]) || 0) : 0,
      totalHours: 0,
      notes: String(item[noteKey] || '')
    }));

    return { 
      shifts, 
      mappedKeys: { name: nameKey, date: dateKey, start: startKey, end: endKey, break: brkKey, note: noteKey } 
    };
  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
};

export const parseCSV = (csvText: string): Shift[] => {
  return []; // Placeholder
};
