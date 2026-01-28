import { Shift } from '../types';

// Helper to normalize time strings (e.g., "9:00" -> "09:00")
const normalizeTime = (timeStr: string): string => {
  if (!timeStr) return '00:00';
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return timeStr;
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  // Optional: handle seconds if present, though usually not needed for this app
  return `${h}:${m}`;
};

// Helper to normalize date strings (e.g., "2023/1/1" -> "2023-01-01")
const normalizeDate = (dateStr: string): string => {
  if (!dateStr) return '';
  // Replace slashes with dashes
  const cleanStr = dateStr.trim().replace(/\//g, '-');
  const parts = cleanStr.split('-');
  if (parts.length === 3) {
    // Assume YYYY-MM-DD format
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }
  return cleanStr;
};

// Helper to calculate hours
const calculateHours = (date: string, startTime: string, endTime: string, breakMinutes: number): number => {
    const nDate = normalizeDate(date);
    const nStart = normalizeTime(startTime);
    const nEnd = normalizeTime(endTime);

    const start = new Date(`${nDate}T${nStart}`);
    const end = new Date(`${nDate}T${nEnd}`);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    let diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) {
        // Assume overnight shift, add 24 hours
        diffMs += 24 * 60 * 60 * 1000;
    }
    
    const hours = (diffMs / (1000 * 60 * 60)) - (breakMinutes / 60);
    return Math.max(0, parseFloat(hours.toFixed(2)));
};

// Group shifts by date to consolidate multiple entries into one daily row
export const groupShiftsByDate = (shifts: Shift[]): Shift[] => {
  const groups: { [key: string]: Shift[] } = {};
  
  // 1. Group by date (normalized)
  shifts.forEach(s => {
    const nDate = normalizeDate(s.date);
    if (!groups[nDate]) groups[nDate] = [];
    groups[nDate].push(s);
  });

  // 2. Aggregate and Sort
  return Object.keys(groups).sort().map(date => {
    const dayShifts = groups[date];
    
    // Sort shifts within the day by start time
    dayShifts.sort((a, b) => {
        const tA = normalizeTime(a.startTime);
        const tB = normalizeTime(b.startTime);
        return tA.localeCompare(tB);
    });

    // Sum up the pre-calculated totals of each shift
    const totalHours = dayShifts.reduce((sum, s) => sum + s.totalHours, 0);
    const totalBreak = dayShifts.reduce((sum, s) => sum + s.breakMinutes, 0);
    
    // Combine time ranges (e.g., "09:00-12:00 / 13:00-18:00")
    const timeRanges = dayShifts.map(s => 
        `${normalizeTime(s.startTime)}-${normalizeTime(s.endTime)}`
    ).join(' / ');
    
    // Combine notes
    const combinedNotes = dayShifts
      .map(s => s.notes)
      .filter(n => n && n.trim() !== '')
      .join('; ');

    return {
      id: `group-${date}`,
      date,
      startTime: timeRanges, // Display string containing all intervals
      endTime: '',           // Unused in aggregated view
      breakMinutes: totalBreak,
      totalHours: parseFloat(totalHours.toFixed(2)),
      notes: combinedNotes
    };
  });
};

// Parse Legacy CSV (For Demo Button)
export const parseCSV = (csvText: string): Shift[] => {
  const lines = csvText.trim().split('\n');
  const shifts: Shift[] = [];
  const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    if (parts.length < 3) continue;

    const [date, startTime, endTime] = parts;
    const breakMinutes = parts[3] ? parseInt(parts[3]) || 0 : 0;
    const notes = parts[4] || '';

    // Calculate immediately using normalized values
    shifts.push({
      id: `demo-${i}`,
      date: normalizeDate(date),
      startTime: normalizeTime(startTime),
      endTime: normalizeTime(endTime),
      breakMinutes,
      totalHours: calculateHours(date, startTime, endTime, breakMinutes),
      notes
    });
  }
  return shifts;
};

// Fetch from Google Apps Script Web App
export const fetchGASData = async (url: string): Promise<Shift[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch from GAS');
    
    const data = await response.json();
    
    // Convert JSON array to Shift objects
    const shifts: Shift[] = data.map((item: any, index: number) => {
        const date = item.date || '';
        const startTime = item.startTime || '';
        const endTime = item.endTime || '';
        const breakMinutes = parseInt(item.breakMinutes) || 0;
        const notes = item.notes || '';

        return {
            id: `gas-${index}`,
            date: normalizeDate(date),
            startTime: normalizeTime(startTime),
            endTime: normalizeTime(endTime),
            breakMinutes,
            totalHours: calculateHours(date, startTime, endTime, breakMinutes),
            notes
        };
    }).filter((s: Shift) => s.date && s.startTime && s.endTime); 

    return shifts;

  } catch (error) {
    console.error("Error fetching sheet:", error);
    throw error;
  }
};