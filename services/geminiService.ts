import { GoogleGenAI } from "@google/genai";
import { MonthlyReport } from '../types';

// Initialize Gemini
// Note: In a real production app, ensure API_KEY is set in environment
const getAi = () => {
    // Fallback for demo purposes if env is missing, but adhering to instructions to use process.env
    const apiKey = process.env.API_KEY || ''; 
    return new GoogleGenAI({ apiKey });
};

export const generateMonthlyInsight = async (report: MonthlyReport): Promise<string> => {
    const ai = getAi();
    
    // Create a simplified text representation of the data to save tokens
    const dataSummary = `
    Month: ${report.month}
    Total Hours: ${report.totalHours}
    Hourly Rate: $${report.hourlyRate}
    Total Pay: $${report.totalPay}
    
    Shift Data (Date, Hours, Notes):
    ${report.shifts.map(s => `- ${s.date}: ${s.totalHours}h (${s.notes || 'No notes'})`).join('\n')}
    `;

    const prompt = `
    Analyze this monthly timesheet data. 
    1. Provide a brief, encouraging summary of the work month.
    2. Point out any patterns (e.g., lots of overtime, consistent schedule, or irregular hours).
    3. Draft a very short, polite email content (2-3 sentences) that the employee can copy-paste to send this report to their manager ("Manager").
    
    Keep the tone professional yet warm and energetic. Use Markdown for formatting.
    Data:
    ${dataSummary}
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
        });
        return response.text || "無法生成分析，請稍後再試。";
    } catch (error) {
        console.error("Gemini Error:", error);
        return "AI 分析服務目前暫時無法使用，請檢查 API Key 設定。";
    }
};
