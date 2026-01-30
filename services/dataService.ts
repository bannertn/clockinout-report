import { Shift } from '../types';

// Helper to normalize time strings (handles "2026-01-28 16:16" -> "16:16")
const normalizeTime = (timeStr: string): string => {
  if (!timeStr || timeStr === '00:00') return '';
  let t = timeStr.trim();
  
  if (t.includes(' ')) {
    const parts = t.split(' ');
    t = parts[parts.length - 1];
  }

  const parts = t.split(':');
  if (parts.length < 2) return "";
  
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}:${m}`;
};

const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  let d = dateStr.trim();
  if (d.includes('T')) d = d.split('T')[0];
  if (d.includes(' ')) d = d.split(' ')[0];

  const cleanStr = d.replace(/\//g, '-');
  const parts = cleanStr.split('-');
  
  if (parts.length === 3) {
    if (parts[2].length === 4) {
        return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return cleanStr;
};

// Calculation for a single pair of start and end
const calculateHours = (date: string, startTime: string, endTime: string, breakMinutes: number): number => {
    if (!startTime || !endTime) return 0;

    const nDate = normalizeDate(date);
    const dParts = nDate.split('-').map(Number);
    const sParts = startTime.split(':').map(Number);
    const eParts = endTime.split(':').map(Number);

    if (dParts.length !== 3 || sParts.length < 2 || eParts.length < 2) return 0;

    try {
        const start = new Date(dParts[0], dParts[1] - 1, dParts[2], sParts[0], sParts[1], 0);
        let end = new Date(dParts[0], dParts[1] - 1, dParts[2], eParts[0], eParts[1], 0);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

        if (end.getTime() <= start.getTime()) {
            end.setDate(end.getDate() + 1);
        }

        const diffMs = end.getTime() - start.getTime();
        const totalHours = (diffMs / (1000 * 60 * 60)) - ((breakMinutes || 0) / 60);
        
        const result = parseFloat(totalHours.toFixed(2));
        return isNaN(result) ? 0 : Math.max(0, result);
    } catch (e) {
        return 0;
    }
};

export const groupShiftsByDate = (shifts: Shift[]): Shift[] => {
  const groups: { [key: string]: Shift[] } = {};
  
  shifts.forEach(s => {
    const nDate = normalizeDate(s.date);
    if (!groups[nDate]) groups[nDate] = [];
    groups[nDate].push(s);
  });

  return Object.keys(groups).sort().map(date => {
    const dayRows = groups[date];
    
    // Pick the first non-empty startTime and first non-empty endTime across ALL rows for this date
    let firstStartTime = '';
    let firstEndTime = '';
    let totalBreak = 0;
    
    for (const row of dayRows) {
        const s = normalizeTime(row.startTime);
        const e = normalizeTime(row.endTime);
        if (!firstStartTime && s) firstStartTime = s;
        if (!firstEndTime && e) firstEndTime = e;
        totalBreak += (Number(row.breakMinutes) || 0);
    }

    // Handle the case where no explicit "End Time" was found, 
    // but there are multiple rows with "Start Time" (treating the second start as an end)
    if (!firstEndTime && dayRows.length > 1) {
        const secondaryStart = normalizeTime(dayRows[1].startTime);
        if (secondaryStart) firstEndTime = secondaryStart;
    }

    const dailyHours = calculateHours(date, firstStartTime, firstEndTime, totalBreak);
    
    const combinedNotes = dayRows
      .map(s => s.notes)
      .filter(n => n && n.trim() !== '')
      .join('; ');

    return {
      id: `group-${date}`,
      date,
      startTime: firstStartTime || '未打卡',
      endTime: firstEndTime || '未打卡',
      breakMinutes: totalBreak,
      totalHours: dailyHours,
      notes: combinedNotes
    };
  });
};

export const parseCSV = (csvText: string): Shift[] => {
  const lines = csvText.trim().split('\n');
  const shifts: Shift[] = [];
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    if (parts.length < 3) continue;

    shifts.push({
      id: `demo-${i}`,
      date: normalizeDate(parts[0]),
      startTime: parts[1] || '',
      endTime: parts[2] || '',
      breakMinutes: parts[3] ? parseInt(parts[3]) || 0 : 0,
      totalHours: 0, // Will be calculated during grouping
      notes: parts[4] || ''
    });
  }
  return shifts;
};

export const fetchGASData = async (url: string): Promise<Shift[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    
    return data.map((item: any, index: number) => ({
        id: `gas-${index}`,
        date: normalizeDate(item.date || ''),
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        breakMinutes: parseInt(item.breakMinutes) || 0,
        totalHours: 0, 
        notes: item.notes || ''
    }));
  } catch (error) {
    console.error("GAS Fetch Error:", error);
    throw error;
  }
};
