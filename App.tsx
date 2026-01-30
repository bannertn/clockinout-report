
import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  DollarSign, 
  Clock, 
  Calendar, 
  Settings, 
  AlertCircle, 
  Search, 
  UserCheck, 
  TableProperties, 
  Database, 
  ArrowRight 
} from 'lucide-react';
import { AppState, MonthlyReport, Shift } from './types';
import { fetchGASData, groupShiftsByDate } from './services/dataService';
import { PrintableReport } from './components/PrintableReport';

const cleanStr = (s: string) => s.replace(/[\s\u3000]/g, '').toLowerCase();

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.SETUP);
  const [gasUrl, setGasUrl] = useState('');
  const [rawShifts, setRawShifts] = useState<Shift[]>([]);
  const [hourlyRate, setHourlyRate] = useState<number>(196); 
  const [userName, setUserName] = useState('alex lu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mappedKeys, setMappedKeys] = useState<any>(null);

  useEffect(() => {
    const savedName = localStorage.getItem('warmSync_userName');
    const savedRate = localStorage.getItem('warmSync_hourlyRate');
    const savedUrl = localStorage.getItem('warmSync_gasUrl');
    if (savedName) setUserName(savedName);
    if (savedRate) setHourlyRate(Number(savedRate));
    if (savedUrl) setGasUrl(savedUrl);
  }, []);

  const allDetectedNames = useMemo(() => {
    const names = new Set<string>();
    rawShifts.forEach(s => { 
      if(s.employeeName && s.employeeName !== 'undefined' && s.employeeName !== 'null' && s.employeeName.length > 0) {
        names.add(s.employeeName); 
      }
    });
    return Array.from(names);
  }, [rawShifts]);

  const report: MonthlyReport | null = useMemo(() => {
    if (rawShifts.length === 0) return null;
    try {
      const target = cleanStr(userName);
      const filtered = rawShifts.filter(s => {
        if (!target) return true;
        return cleanStr(s.employeeName || '') === target;
      });

      const dailyShifts = groupShiftsByDate(filtered);
      if (dailyShifts.length === 0) return null;

      const totalHours = dailyShifts.reduce((acc, curr) => acc + (Number(curr.totalHours) || 0), 0);
      // Ensure totalHours for the month is also rounded to 2 decimal places
      const roundedTotalHours = Math.round((totalHours + Number.EPSILON) * 100) / 100;
      
      return {
        month: dailyShifts[0].date.substring(0, 7),
        totalHours: roundedTotalHours,
        hourlyRate,
        totalPay: Math.floor(roundedTotalHours * hourlyRate),
        shifts: dailyShifts
      };
    } catch (e) { return null; }
  }, [rawShifts, hourlyRate, userName]);

  const performFetch = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchGASData(url, userName);
      setRawShifts(result.shifts);
      setMappedKeys(result.mappedKeys);
      setAppState(AppState.DASHBOARD);
      
      localStorage.setItem('warmSync_gasUrl', url);
      localStorage.setItem('warmSync_userName', userName);
      localStorage.setItem('warmSync_hourlyRate', hourlyRate.toString());
    } catch (err) {
      setError('讀取失敗。請檢查 GAS 網址是否正確設定為任何人可讀取。');
    } finally { setLoading(false); }
  };

  const renderSetup = () => (
    <div className="max-w-3xl mx-auto px-4 py-12 text-black">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-orange-100 rounded-full mb-6 text-orange-600 shadow-inner">
          <FileSpreadsheet className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-black mb-4 uppercase tracking-tighter text-black">ALEX SYSTEM Timesheet</h1>
        <p className="text-lg font-bold text-black">同步 Google Sheets，自動完成薪資結算。</p>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl border-4 border-black overflow-hidden">
        <div className="p-10 bg-gray-50 border-b-4 border-black space-y-8">
          <h2 className="text-2xl font-black flex items-center gap-3 text-black"><Settings className="w-6 h-6" /> 報表條件設定</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-3">
              <label className="block text-sm font-black uppercase tracking-widest text-black">員工姓名 (對應 D 欄)</label>
              <input 
                type="text" 
                value={userName} 
                onChange={e => setUserName(e.target.value)} 
                className="w-full px-6 py-4 rounded-2xl border-4 border-black bg-black text-white font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] focus:scale-[1.02] transition-transform outline-none" 
                placeholder="例如：alex lu"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-black uppercase tracking-widest text-black">時薪 (TWD)</label>
              <input 
                type="number" 
                value={hourlyRate} 
                onChange={e => setHourlyRate(Number(e.target.value))} 
                className="w-full px-6 py-4 rounded-2xl border-4 border-black bg-black text-white font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,0.2)] focus:scale-[1.02] transition-transform outline-none" 
              />
            </div>
          </div>
        </div>
        <div className="p-10 space-y-6">
          <h2 className="text-xl font-black text-black">Google Apps Script 網址</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <input 
              type="text" 
              value={gasUrl} 
              onChange={e => setGasUrl(e.target.value)} 
              className="flex-1 px-6 py-4 rounded-2xl border-4 border-black bg-white font-mono text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] outline-none text-black font-bold" 
              placeholder="https://script.google.com/..." 
            />
            <button 
              onClick={() => performFetch(gasUrl)} 
              disabled={loading || !gasUrl} 
              className="bg-black text-white px-10 py-4 rounded-2xl font-black uppercase hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? '同步中...' : '讀取資料'}
            </button>
          </div>
          {error && <div className="p-5 bg-red-100 border-4 border-red-900 text-red-900 rounded-2xl font-bold flex gap-3 items-center"><AlertCircle className="shrink-0" /> {error}</div>}
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-10">
        <button onClick={() => setAppState(AppState.SETUP)} className="text-black font-black hover:underline flex items-center gap-2 text-lg">← 返回設定</button>
        <div className="flex gap-4">
          <button onClick={() => setAppState(AppState.PRINT_PREVIEW)} className="bg-black text-white px-10 py-3 rounded-2xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-30" disabled={!report}><Printer className="w-5 h-5" /> 生成報表</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 text-center">
        <div className="bg-white p-10 rounded-3xl border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-black uppercase text-black mb-2 tracking-widest">本月實領工資</p>
          <p className="text-5xl font-black tracking-tight text-black">${report?.totalPay.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white p-10 rounded-3xl border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-black uppercase text-black mb-2 tracking-widest">總計工時 (HR)</p>
          <p className="text-5xl font-black tracking-tight text-black">{(report?.totalHours || 0).toFixed(2)}</p>
        </div>
        <div className="bg-white p-10 rounded-3xl border-4 border-black shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-black uppercase text-black mb-2 tracking-widest">結算月份</p>
          <p className="text-5xl font-black tracking-tight text-black">{report?.month || '--'}</p>
        </div>
      </div>

      {(!report || report.shifts.length === 0) ? (
        <div className="bg-white border-4 border-black p-12 rounded-[40px] text-center shadow-xl">
          <Search className="w-20 h-20 mx-auto text-black mb-6" />
          <h3 className="text-3xl font-black mb-4 uppercase tracking-tighter text-black">找不到「{userName}」的記錄</h3>
          <p className="text-black font-bold mb-8">雖然讀取成功，但過濾姓名後無資料。請檢查下方的欄位映射：</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-gray-100 p-8 rounded-3xl text-left border-2 border-black/20">
                <p className="text-sm font-black mb-4 flex items-center gap-2 text-black font-black uppercase">偵測到的員工清單：</p>
                <div className="flex flex-wrap gap-2">
                  {allDetectedNames.length > 0 ? allDetectedNames.map(name => (
                    <button 
                      key={name} 
                      onClick={() => { setUserName(name); }}
                      className="bg-white border-2 border-black px-4 py-2 rounded-xl text-sm font-black hover:bg-black hover:text-white transition-colors text-black"
                    >
                      {name}
                    </button>
                  )) : <p className="text-black font-bold opacity-60">（未偵測到姓名，請確認 D 欄是否有正確資料）</p>}
                </div>
            </div>

            <div className="bg-blue-50 p-8 rounded-3xl text-left border-2 border-black/20">
                <p className="text-sm font-black mb-4 flex items-center gap-2 text-black font-black uppercase">欄位對應資訊：</p>
                <div className="space-y-3 text-sm font-bold text-black font-black">
                  <div className="flex justify-between items-center border-b border-black/10 pb-1">
                    <span className="text-xs uppercase">姓名 (Name)</span>
                    <span className="bg-black text-white px-2 py-0.5 rounded">{mappedKeys?.name || '未找到'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-black/10 pb-1">
                    <span className="text-xs uppercase">日期 (Date)</span>
                    <span className="bg-black text-white px-2 py-0.5 rounded">{mappedKeys?.date || '未找到'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-black/10 pb-1">
                    <span className="text-xs uppercase">上班 (Start)</span>
                    <span className="bg-black text-white px-2 py-0.5 rounded">{mappedKeys?.start || '未找到'}</span>
                  </div>
                </div>
                <p className="text-[10px] text-black mt-6 font-black uppercase leading-tight bg-yellow-300 p-2 rounded border border-black">
                  💡 我們已將 D 欄鎖定為姓名，請檢查您的 Google Sheet D 欄是否包含「{userName}」。
                </p>
            </div>
          </div>
          
          <button onClick={() => setAppState(AppState.SETUP)} className="mt-12 bg-black text-white px-10 py-4 rounded-full font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">返回重新設定</button>
        </div>
      ) : (
        <div className="bg-white rounded-[40px] border-4 border-black overflow-hidden shadow-2xl">
          <div className="p-6 bg-gray-50 border-b-4 border-black flex justify-between items-center">
            <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2 text-black">
              <UserCheck className="w-6 h-6" /> 打卡明細：{userName}
            </h3>
            <span className="bg-black text-white px-4 py-1 rounded-full text-xs font-black uppercase">{report.shifts.length} 筆記錄</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-black text-white text-xs font-black uppercase tracking-widest">
                <tr>
                  <th className="px-8 py-6">日期</th>
                  <th className="px-8 py-6 text-center">上班</th>
                  <th className="px-8 py-6 text-center">下班</th>
                  <th className="px-8 py-6 text-right">工時 (HR)</th>
                  <th className="px-8 py-6">備註</th>
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-black">
                {report.shifts.map(shift => (
                  <tr key={shift.id} className="hover:bg-gray-100 transition-colors">
                    <td className="px-8 py-6 font-black whitespace-nowrap text-black">{shift.date}</td>
                    <td className="px-8 py-6 text-center font-mono font-black text-black">{shift.startTime}</td>
                    <td className="px-8 py-6 text-center font-mono font-black text-black">{shift.endTime}</td>
                    <td className="px-8 py-6 text-right font-black text-2xl text-black">
                      {(Number(shift.totalHours) || 0).toFixed(2)}
                    </td>
                    <td className="px-8 py-6 font-black text-black min-w-[200px]">{shift.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${appState === AppState.PRINT_PREVIEW ? 'bg-gray-900' : 'bg-[#FFF7ED]'}`}>
      {appState === AppState.SETUP && renderSetup()}
      {appState === AppState.DASHBOARD && renderDashboard()}
      {appState === AppState.PRINT_PREVIEW && report && (
        <div className="p-8 flex justify-center">
          <div className="fixed top-8 left-8 no-print z-50">
            <button onClick={() => setAppState(AppState.DASHBOARD)} className="bg-white border-4 border-black px-8 py-3 rounded-full font-black shadow-2xl hover:scale-105 transition-transform flex items-center gap-2 text-black">← 返回管理介面</button>
          </div>
          <PrintableReport report={report} userName={userName} />
        </div>
      )}
    </div>
  );
};

export default App;
