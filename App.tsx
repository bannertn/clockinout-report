import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  DollarSign, 
  Clock, 
  Calendar, 
  Settings, 
  Sparkles,
  Download,
  AlertCircle,
  Link as LinkIcon,
  Check,
  Code
} from 'lucide-react';
import { AppState, MonthlyReport, Shift } from './types';
import { parseCSV, fetchGASData, groupShiftsByDate } from './services/dataService';
import { generateMonthlyInsight } from './services/geminiService';
import { PrintableReport } from './components/PrintableReport';

const DEMO_CSV = `Date,Start Time,End Time,Break (min),Notes
2023-10-01,09:00,,0,上班打卡
2023-10-01,,18:00,0,下班打卡
2023-10-02,09:00,18:30,60,整日紀錄
2023-10-03,09:15,18:00,60,遲到
`;

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [gasUrl, setGasUrl] = useState('');
  const [rawShifts, setRawShifts] = useState<Shift[]>([]);
  const [hourlyRate, setHourlyRate] = useState<number>(180);
  const [userName, setUserName] = useState('王小明');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('warmSync_userName');
    const savedRate = localStorage.getItem('warmSync_hourlyRate');
    const savedUrl = localStorage.getItem('warmSync_gasUrl');

    if (savedName) setUserName(savedName);
    if (savedRate) setHourlyRate(Number(savedRate));
    if (savedUrl) setGasUrl(savedUrl);

    const params = new URLSearchParams(window.location.search);
    const paramSheet = params.get('sheet');
    if (paramSheet) {
      setGasUrl(paramSheet);
      performFetch(paramSheet, true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('warmSync_userName', userName);
    localStorage.setItem('warmSync_hourlyRate', hourlyRate.toString());
  }, [userName, hourlyRate]);

  const report: MonthlyReport | null = useMemo(() => {
    if (rawShifts.length === 0) return null;
    try {
      const dailyShifts = groupShiftsByDate(rawShifts);
      const totalHours = dailyShifts.reduce((acc, curr) => acc + (Number(curr.totalHours) || 0), 0);
      const totalPay = Math.floor(totalHours * hourlyRate);
      const month = dailyShifts[0].date.substring(0, 7); 

      return {
        month,
        totalHours,
        hourlyRate,
        totalPay,
        shifts: dailyShifts
      };
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [rawShifts, hourlyRate]);

  const performFetch = async (url: string, isAuto = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchGASData(url);
      setRawShifts(data);
      setAppState(AppState.DASHBOARD);
      localStorage.setItem('warmSync_gasUrl', url);
    } catch (err) {
      setError(isAuto ? '自動連線失敗。' : '連線失敗，請檢查網址或權限設定。');
      setAppState(AppState.SETUP);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSheet = () => gasUrl && performFetch(gasUrl);
  const handleUseDemo = () => {
    setRawShifts(parseCSV(DEMO_CSV));
    setAppState(AppState.DASHBOARD);
  };

  const handleGenerateInsight = async () => {
    if (!report) return;
    setAiLoading(true);
    setAiInsight(await generateMonthlyInsight(report));
    setAiLoading(false);
  };

  const renderSetup = () => (
    <div className="max-w-3xl mx-auto px-4 py-12 text-black">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-orange-100 rounded-full mb-6 text-orange-600">
          <FileSpreadsheet className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black text-black mb-4 tracking-tight uppercase">WarmSync Timesheet</h1>
        <p className="text-lg text-black font-bold">同步 Google Sheets 資料，自動整併每日打卡紀錄。</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-black overflow-hidden">
        <div className="p-8 bg-gray-50 border-b border-black">
          <h2 className="text-xl font-black text-black mb-4 flex items-center gap-2"><Settings className="w-5 h-5" /> 基本設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black text-black mb-1">員工姓名</label>
              <input type="text" value={userName} onChange={e => setUserName(e.target.value)} className="w-full px-4 py-2 rounded-lg border-2 border-black outline-none text-black font-bold" />
            </div>
            <div>
              <label className="block text-sm font-black text-black mb-1">時薪 (TWD)</label>
              <input type="number" value={hourlyRate} onChange={e => setHourlyRate(Number(e.target.value))} className="w-full px-4 py-2 rounded-lg border-2 border-black outline-none text-black font-bold" />
            </div>
          </div>
        </div>
        <div className="p-8">
          <h2 className="text-xl font-black text-black mb-4">資料來源網址</h2>
          <div className="flex gap-2 mb-4">
            <input type="text" value={gasUrl} onChange={e => setGasUrl(e.target.value)} className="flex-1 px-4 py-3 rounded-lg border-2 border-black font-mono text-sm text-black font-bold" placeholder="Google Apps Script URL" />
            <button onClick={handleFetchSheet} disabled={loading || !gasUrl} className="bg-black text-white px-6 py-3 rounded-lg font-black hover:bg-gray-800 disabled:opacity-50">
              {loading ? '連線中...' : '讀取資料'}
            </button>
          </div>
          {error && <div className="p-3 bg-red-100 text-red-900 border-2 border-red-900 rounded-lg text-sm flex gap-2 font-bold"><AlertCircle className="w-5 h-5" /> {error}</div>}
          <div className="mt-8 flex justify-center"><button onClick={handleUseDemo} className="text-black underline font-black text-sm uppercase">試用範例資料</button></div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="max-w-5xl mx-auto px-4 py-8 text-black">
      <div className="flex justify-between items-center mb-8">
        <button onClick={() => setAppState(AppState.SETUP)} className="text-black font-black hover:underline flex items-center gap-1">← 返回設定</button>
        <div className="flex gap-3">
          <button onClick={handleGenerateInsight} className="bg-white border-2 border-black text-black px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm font-black hover:bg-gray-50"><Sparkles className="w-4 h-4" /> AI 分析</button>
          <button onClick={() => setAppState(AppState.PRINT_PREVIEW)} className="bg-black text-white px-6 py-2 rounded-lg flex items-center gap-2 shadow-md font-black hover:bg-gray-800"><Printer className="w-4 h-4" /> 產生列印報表</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 text-center">
        <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-sm">
          <DollarSign className="w-8 h-8 text-black mx-auto mb-2" />
          <p className="text-sm text-black font-black uppercase">本月薪資估計</p>
          <p className="text-3xl font-black text-black">${report?.totalPay.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-sm">
          <Clock className="w-8 h-8 text-black mx-auto mb-2" />
          <p className="text-sm text-black font-black uppercase">累計總工時</p>
          <p className="text-3xl font-black text-black">{report?.totalHours.toFixed(2)} 小時</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border-2 border-black shadow-sm">
          <Calendar className="w-8 h-8 text-black mx-auto mb-2" />
          <p className="text-sm text-black font-black uppercase">出勤天數</p>
          <p className="text-3xl font-black text-black">{report?.shifts.length} 天</p>
        </div>
      </div>

      {(aiLoading || aiInsight) && (
        <div className="bg-white rounded-2xl border-4 border-black p-6 mb-8 shadow-md">
          <div className="flex items-center gap-2 mb-3 text-black font-black uppercase"><Sparkles className="w-5 h-5" /> AI 報表解讀</div>
          {aiLoading ? <div className="h-4 bg-gray-200 animate-pulse rounded w-1/2"></div> : <div className="text-sm text-black font-bold whitespace-pre-wrap leading-relaxed">{aiInsight}</div>}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border-2 border-black overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-black text-white text-sm uppercase font-black">
            <tr>
              <th className="px-6 py-4">日期</th>
              <th className="px-6 py-4">上班時間</th>
              <th className="px-6 py-4">下班時間</th>
              <th className="px-6 py-4 text-right">當日工時</th>
              <th className="px-6 py-4">備註</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black">
            {report?.shifts.map(shift => (
              <tr key={shift.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-black text-black border-r border-gray-100">{shift.date}</td>
                <td className="px-6 py-4 font-mono font-black text-black">{shift.startTime}</td>
                <td className="px-6 py-4 font-mono font-black text-black">{shift.endTime}</td>
                <td className="px-6 py-4 text-right font-black text-black text-lg bg-gray-50">{Number(shift.totalHours).toFixed(2)}</td>
                <td className="px-6 py-4 text-black text-sm font-bold italic">{shift.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${appState === AppState.PRINT_PREVIEW ? 'bg-gray-900' : 'bg-orange-50'}`}>
      {appState === AppState.SETUP && renderSetup()}
      {appState === AppState.DASHBOARD && renderDashboard()}
      {appState === AppState.PRINT_PREVIEW && report && (
        <div className="flex justify-center p-4">
          <div className="no-print fixed top-4 left-4">
            <button onClick={() => setAppState(AppState.DASHBOARD)} className="bg-white text-black font-black px-6 py-2 rounded-full shadow-2xl border-2 border-black hover:scale-105 transition-all">← 返回管理介面</button>
          </div>
          <PrintableReport report={report} userName={userName} />
        </div>
      )}
    </div>
  );
};

export default App;
