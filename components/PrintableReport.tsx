import React from 'react';
import { MonthlyReport } from '../types';

interface PrintableReportProps {
  report: MonthlyReport;
  userName: string;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({ report, userName }) => {
  const currentDate = new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="bg-white text-black p-10 max-w-[210mm] mx-auto min-h-[297mm] shadow-none border-[3px] border-black print:border-none print:w-full print:max-w-none print:p-0">
      <div className="border-b-[6px] border-black pb-6 mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-5xl font-black text-black uppercase tracking-tighter">工作月報表</h1>
          <p className="text-black font-black text-base mt-2 uppercase tracking-widest">Monthly Attendance & Salary Report</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-black">{userName}</p>
          <p className="text-sm font-black text-black mt-1">報表日期: {currentDate}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-10">
        <div className="border-2 border-black p-4 rounded-lg bg-gray-50">
            <p className="text-[10px] font-black uppercase text-black mb-1">結算月份</p>
            <p className="text-2xl font-black text-black">{report.month}</p>
        </div>
        <div className="border-2 border-black p-4 rounded-lg bg-gray-50">
            <p className="text-[10px] font-black uppercase text-black mb-1">當月總工時</p>
            <p className="text-2xl font-black text-black">{report.totalHours} HR</p>
        </div>
        <div className="border-2 border-black p-4 rounded-lg bg-gray-50">
            <p className="text-[10px] font-black uppercase text-black mb-1">核定時薪</p>
            <p className="text-2xl font-black text-black">${report.hourlyRate}</p>
        </div>
        <div className="bg-black text-white p-4 rounded-lg flex flex-col justify-center items-center">
            <p className="text-[10px] font-bold uppercase opacity-80 mb-1 text-white">應付實發工資</p>
            <p className="text-3xl font-black text-white">${Math.round(report.totalPay).toLocaleString()}</p>
        </div>
      </div>

      <div className="border-[3px] border-black rounded-xl overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead className="bg-black text-white">
            <tr>
              <th className="px-4 py-4 text-left font-black uppercase border-r border-gray-800 text-white">日期</th>
              <th className="px-4 py-4 text-center font-black uppercase border-r border-gray-800 text-white">上班打卡</th>
              <th className="px-4 py-4 text-center font-black uppercase border-r border-gray-800 text-white">下班打卡</th>
              <th className="px-4 py-4 text-right font-black uppercase border-r border-gray-800 text-white">當日工時</th>
              <th className="px-4 py-4 text-left font-black uppercase text-white">工作備註</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black">
            {report.shifts.map((shift) => (
              <tr key={shift.id} className="hover:bg-gray-100">
                <td className="px-4 py-4 font-black text-black border-r-2 border-black">{shift.date}</td>
                <td className="px-4 py-4 text-center font-mono font-black text-black border-r-2 border-black">{shift.startTime}</td>
                <td className="px-4 py-4 text-center font-mono font-black text-black border-r-2 border-black">{shift.endTime}</td>
                <td className="px-4 py-4 text-right font-black text-black border-r-2 border-black text-base">
                  {shift.totalHours}
                </td>
                <td className="px-4 py-4 text-black font-black text-xs italic">{shift.notes}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-black border-t-[3px] border-black">
            <tr>
              <td colSpan={3} className="px-4 py-5 text-right text-black uppercase text-base font-black">月總計 (Total Monthly Hours)</td>
              <td className="px-4 py-5 text-right text-black text-2xl border-r-2 border-black font-black">
                {report.totalHours}
              </td>
              <td className="bg-white"></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-20 grid grid-cols-2 gap-20 px-10">
        <div className="border-t-[3px] border-black pt-4 text-center">
            <p className="font-black uppercase text-sm mb-1 text-black">員工姓名</p>
            <p className="text-[10px] font-black text-black">Employee Name</p>
        </div>
        <div className="border-t-[3px] border-black pt-4 text-center">
            <p className="font-black uppercase text-sm mb-1 text-black">主管審核簽章</p>
            <p className="text-[10px] font-black text-black">Manager Approval</p>
        </div>
      </div>
      
      <div className="mt-16 text-center text-[10px] font-black text-black uppercase tracking-[0.4em]">
        Validated via ALEX SYSTEM Automated Reporting System
      </div>
    </div>
  );
};