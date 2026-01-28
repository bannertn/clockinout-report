import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  DollarSign, 
  Clock, 
  Calendar, 
  Settings, 
  Sparkles,
  ArrowRight,
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

// Default demo data
const DEMO_CSV = `Date,Start Time,End Time,Break (min),Notes
2023-10-01,09:00,12:00,0,Morning shift
2023-10-01,13:00,18:00,0,Afternoon shift
2023-10-02,09:00,18:30,60,Overtime 30m
2023-10-03,09:15,18:00,60,Late arrival
2023-10-04,09:00,17:00,0,Early leave, no break
2023-10-05,10:00,19:00,60,Shift change
`;

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [gasUrl, setGasUrl] = useState('');
  const [rawShifts, setRawShifts] = useState<Shift[]>([]);
  const [hourlyRate, setHourlyRate] = useState<number>(180); // Default TW hourly rate
  const [userName, setUserName] = useState('王小明');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // AI State
  const [aiInsight, setAiInsight] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);

  // Load settings from LocalStorage and Check URL Params on Mount
  useEffect(() => {
    // 1. Load LocalStorage
    const savedName = localStorage.getItem('warmSync_userName');
    const savedRate = localStorage.getItem('warmSync_hourlyRate');
    const savedUrl = localStorage.getItem('warmSync_gasUrl');

    if (savedName) setUserName(savedName);
    if (savedRate) setHourlyRate(Number(savedRate));
    if (savedUrl) setGasUrl(savedUrl);

    // 2. Check Query Params for Auto-Connect
    const params = new URLSearchParams(window.location.search);
    const paramSheet = params.get('sheet'); // Keeping param name 'sheet' for backward compatibility or simplicity
    
    if (paramSheet) {
      setGasUrl(paramSheet);
      // Execute auto fetch
      performFetch(paramSheet, true);
    }
  }, []);

  // Save settings when changed
  useEffect(() => {
    localStorage.setItem('warmSync_userName', userName);
    localStorage.setItem('warmSync_hourlyRate', hourlyRate.toString());
  }, [userName, hourlyRate]);

  // Derived Data with Grouping Logic
  const report: MonthlyReport | null = useMemo(() => {
    if (rawShifts.length === 0) return null;
    try {
      // Group raw shifts by date to handle multiple punches per day
      const dailyShifts = groupShiftsByDate(rawShifts);

      const totalHours = dailyShifts.reduce((acc, curr) => acc + curr.totalHours, 0);
      const totalPay = Math.floor(totalHours * hourlyRate);
      
      // Determine month from first shift
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
      // Save valid URL to local storage
      localStorage.setItem('warmSync_gasUrl', url);
    } catch (err) {
      const msg = isAuto 
        ? '自動連線失敗，請檢查網址或網路狀態。' 
        : '連線失敗。請確認您已部署 Google Apps Script 並設定權限為「任何人」。';
      setError(msg);
      // If auto-fetch fails, stay on Setup screen
      setAppState(AppState.SETUP);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSheet = () => {
    if (!gasUrl) return;
    performFetch(gasUrl);
  };

  const handleUseDemo = () => {
    const demoData = parseCSV(DEMO_CSV);
    setRawShifts(demoData);
    setAppState(AppState.DASHBOARD);
  };

  const handleGenerateInsight = async () => {
    if (!report) return;
    setAiLoading(true);
    const insight = await generateMonthlyInsight(report);
    setAiInsight(insight);
    setAiLoading(false);
  };

  const copyAutoConnectLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const autoUrl = `${baseUrl}?sheet=${encodeURIComponent(gasUrl)}`;
    navigator.clipboard.writeText(autoUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Setup View
  const renderSetup = () => (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-orange-100 rounded-full mb-6">
          <FileSpreadsheet className="w-12 h-12 text-orange-600" />
        </div>
        <h1 className="text-4xl font-extrabold text-orange-900 mb-4 tracking-tight">
          WarmSync <span className="text-orange-600">Timesheet</span>
        </h1>
        <p className="text-lg text-orange-800/70 max-w-xl mx-auto">
          透過 Google Apps Script 讀取資料，自動合併每日打卡紀錄，生成精美的 A4 月報表。
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
        <div className="p-8 bg-orange-50 border-b border-orange-100">
          <h2 className="text-xl font-bold text-orange-900 mb-2 flex items-center gap-2">
            <Settings className="w-5 h-5" /> 
            基本設定
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-orange-800 mb-1">員工姓名</label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none bg-white"
                placeholder="例如：王小明"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-orange-800 mb-1">時薪 (TWD)</label>
              <input 
                type="number" 
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full px-4 py-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none bg-white"
              />
            </div>
          </div>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">資料來源連接</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                <Code className="w-4 h-4" /> Google Apps Script 網頁應用程式網址 (Web App URL)
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={gasUrl}
                  onChange={(e) => setGasUrl(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono text-sm"
                  placeholder="https://script.google.com/macros/s/.../exec"
                />
                <button 
                  onClick={handleFetchSheet}
                  disabled={loading || !gasUrl}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? '連線中...' : <><Download className="w-4 h-4" /> 連線</>}
                </button>
              </div>
              {error && (
                <div className="mt-3 bg-red-50 text-red-700 p-3 rounded-lg text-sm flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" /> 
                  <div>
                    <p className="font-bold">發生錯誤</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800 border border-blue-100">
                <p className="font-bold mb-1">💡 設定小提示：</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700/80">
                   <li>在 Google Sheet 中建立 Apps Script。</li>
                   <li>實作 <code>doGet</code> 函式回傳 JSON (請參考 AI 提供的程式碼)。</li>
                   <li>部署為「網頁應用程式」，將存取權限設為「任何人 (Anyone)」。</li>
                   <li>複製產生的 URL 貼上至上方欄位。</li>
                </ol>
              </div>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">或</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <div className="flex justify-center">
               <button 
                onClick={handleUseDemo}
                className="text-orange-600 hover:text-orange-800 text-sm font-medium underline decoration-dotted flex items-center gap-1"
              >
                沒資料？試試看 範例資料 (Demo)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Dashboard View
  const renderDashboard = () => {
    if (!report) return <div>Data Error</div>;

    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
              <button 
                onClick={() => setAppState(AppState.SETUP)}
                className="text-gray-500 hover:text-orange-600 font-medium flex items-center gap-1 transition-colors"
              >
                ← 返回設定
              </button>
              {gasUrl && (
                  <button
                    onClick={copyAutoConnectLink}
                    className="text-sm px-3 py-1.5 rounded-full border border-orange-200 text-orange-600 hover:bg-orange-50 flex items-center gap-2 transition-all"
                    title="將此連結加入書籤，下次開啟即可直接連線"
                  >
                     {copiedLink ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
                     {copiedLink ? '連結已複製' : '複製自動連線連結'}
                  </button>
              )}
          </div>
          <div className="flex gap-3">
             <button 
                onClick={handleGenerateInsight}
                className="bg-white text-orange-600 border border-orange-200 hover:bg-orange-50 px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> AI 分析
              </button>
              <button 
                onClick={() => setAppState(AppState.PRINT_PREVIEW)}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-semibold shadow-md transition-colors flex items-center gap-2"
              >
                <Printer className="w-4 h-4" /> 產生列印報表
              </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-full text-red-600">
              <DollarSign className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase">本月預估薪資</p>
              <p className="text-3xl font-extrabold text-gray-900">${report.totalPay.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-full text-blue-600">
              <Clock className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase">總工時</p>
              <p className="text-3xl font-extrabold text-gray-900">{report.totalHours.toFixed(2)} <span className="text-base font-normal text-gray-500">小時</span></p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-full text-green-600">
              <Calendar className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase">出勤天數</p>
              <p className="text-3xl font-extrabold text-gray-900">{report.shifts.length} <span className="text-base font-normal text-gray-500">天</span></p>
            </div>
          </div>
        </div>

        {/* AI Insight Section */}
        {(aiLoading || aiInsight) && (
             <div className="bg-gradient-to-r from-orange-50 to-white rounded-2xl shadow-sm border border-orange-200 p-6 mb-8 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-orange-500" />
                    <h3 className="font-bold text-orange-900">AI 智能助理分析</h3>
                </div>
                {aiLoading ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-4 bg-orange-200 rounded w-3/4"></div>
                        <div className="h-4 bg-orange-100 rounded w-1/2"></div>
                    </div>
                ) : (
                    <div className="prose prose-orange max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                        {aiInsight}
                    </div>
                )}
             </div>
        )}

        {/* Main Table Preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800">打卡明細 ({report.month})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100 text-sm">
                  <th className="px-6 py-3 font-medium">日期</th>
                  <th className="px-6 py-3 font-medium">時間記錄 (上班-下班)</th>
                  <th className="px-6 py-3 font-medium text-right">當日工時</th>
                  <th className="px-6 py-3 font-medium">備註</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {report.shifts.map((shift) => (
                  <tr key={shift.id} className="hover:bg-orange-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-800 whitespace-nowrap">{shift.date}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                      {shift.startTime}
                      {shift.breakMinutes > 0 && <span className="text-xs text-gray-400 ml-2 block sm:inline">(休 {shift.breakMinutes}分)</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-orange-600">{shift.totalHours}</td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{shift.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderPrintPreview = () => {
    if (!report) return null;
    return (
      <div className="bg-gray-600 min-h-screen pb-12">
        {/* Toolbar */}
        <div className="bg-white shadow-md p-4 mb-8 sticky top-0 z-50 no-print">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
             <button 
                onClick={() => setAppState(AppState.DASHBOARD)}
                className="text-gray-600 hover:text-black font-medium flex items-center gap-2"
              >
                ← 返回編輯
              </button>
              <div className="flex gap-4 items-center">
                 <span className="text-sm text-gray-500">提示：請使用瀏覽器列印功能，並選擇 A4 紙張。</span>
                 <button 
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                >
                  <Printer className="w-5 h-5" /> 立即列印
                </button>
              </div>
          </div>
        </div>

        {/* Paper Container */}
        <div className="flex justify-center p-4">
             <PrintableReport report={report} userName={userName} />
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${appState === AppState.PRINT_PREVIEW ? 'bg-gray-600' : 'bg-[#FFF7ED]'}`}>
      {appState === AppState.SETUP && renderSetup()}
      {appState === AppState.DASHBOARD && renderDashboard()}
      {appState === AppState.PRINT_PREVIEW && renderPrintPreview()}
    </div>
  );
};

export default App;