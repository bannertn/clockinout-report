import { Shift } from '../types';

// Helper to calculate hours
const calculateHours = (date: string, startTime: string, endTime: string, breakMinutes: number): number => {
    const start = new Date(`${date}T${startTime}`);
    const end = new Date(`${date}T${endTime}`);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    let diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) {
        // Assume overnight shift, add 24 hours
        diffMs += 24 * 60 * 60 * 1000;
    }
    
    return parseFloat(((diffMs / (1000 * 60 * 60)) - (breakMinutes / 60)).toFixed(2));
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

    shifts.push({
      id: `demo-${i}`,
      date,
      startTime,
      endTime,
      breakMinutes,
      totalHours: calculateHours(date, startTime, endTime, breakMinutes),
      notes
    });
  }
  return shifts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Fetch from Google Apps Script Web App
export const fetchGASData = async (url: string): Promise<Shift[]> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch from GAS');
    
    const data = await response.json();
    
    // Convert JSON array to Shift objects
    const shifts: Shift[] = data.map((item: any, index: number) => {
        // Ensure data exists, fallback to empty strings if row is incomplete
        const date = item.date || '';
        const startTime = item.startTime || '';
        const endTime = item.endTime || '';
        const breakMinutes = parseInt(item.breakMinutes) || 0;
        const notes = item.notes || '';

        return {
            id: `gas-${index}`,
            date,
            startTime,
            endTime,
            breakMinutes,
            totalHours: calculateHours(date, startTime, endTime, breakMinutes),
            notes
        };
    }).filter((s: Shift) => s.date && s.startTime && s.endTime); // Filter invalid rows

    return shifts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  } catch (error) {
    console.error("Error fetching sheet:", error);
    throw error;
  }
};
