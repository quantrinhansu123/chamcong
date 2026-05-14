import { ArrowLeft, Download, Calendar, Filter, Briefcase, Clock, UserX, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';
import type { AttendanceRecord } from '../types';

export default function History() {
  const records: AttendanceRecord[] = [
    {
      date: '24/05/2024',
      day: 'Thứ Sáu',
      shift: 'Ca Hành chính',
      checkIn: '08:25',
      checkOut: '17:40',
      duration: '8h 15m',
      status: 'on-time'
    },
    {
      date: '23/05/2024',
      day: 'Thứ Năm',
      shift: 'Ca Hành chính',
      checkIn: '08:45',
      checkOut: '17:30',
      duration: '7h 45m',
      status: 'late',
      lateMinutes: 15
    },
    {
      date: '22/05/2024',
      day: 'Thứ Tư',
      shift: 'Ca Hành chính',
      checkIn: '--:--',
      checkOut: '--:--',
      duration: '0h 0m',
      status: 'absent'
    },
    {
      date: '21/05/2024',
      day: 'Thứ Ba',
      shift: 'Ca Hành chính',
      checkIn: '08:20',
      checkOut: '17:40',
      duration: '8h 20m',
      status: 'on-time'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center py-4 bg-surface sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 hover:bg-surface-container rounded-full transition-colors active:scale-90">
            <ArrowLeft size={20} className="text-on-surface-variant" />
          </button>
          <h1 className="text-xl font-bold text-primary tracking-tight">Lịch sử chấm công</h1>
        </div>
        <button className="p-2 hover:bg-surface-container rounded-full transition-colors active:scale-90">
          <Download size={20} className="text-on-surface-variant" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/30 rounded-full shrink-0 ambient-shadow font-bold text-sm text-on-surface hover:border-primary/30 transition-all">
          Tháng 05/2024
          <Calendar size={18} className="text-on-surface-variant" />
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/30 rounded-full shrink-0 ambient-shadow font-bold text-sm text-on-surface hover:border-primary/30 transition-all">
          Trạng thái
          <Filter size={18} className="text-on-surface-variant" />
        </button>
      </div>

      {/* Summary Chips */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 bg-primary-container text-white rounded-2xl p-5 flex justify-between items-center ambient-shadow relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
            <Calendar size={100} strokeWidth={1} />
          </div>
          <div className="z-10 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-primary-fixed-dim uppercase tracking-widest">TỔNG NGÀY CÔNG</span>
            <span className="text-[36px] font-bold leading-none">22</span>
          </div>
          <div className="z-10 bg-primary/20 p-4 rounded-3xl border border-white/5">
            <Briefcase size={28} className="fill-primary-fixed-dim text-primary-fixed-dim" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 ambient-shadow border border-outline-variant/20 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-600">
            <Clock size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Đi muộn</span>
          </div>
          <span className="text-2xl font-bold text-on-surface">2</span>
        </div>

        <div className="bg-white rounded-2xl p-4 ambient-shadow border border-outline-variant/20 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-red-500">
            <UserX size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Vắng mặt</span>
          </div>
          <span className="text-2xl font-bold text-on-surface">1</span>
        </div>
      </div>

      {/* Records List */}
      <div className="flex flex-col gap-4 mb-4">
        <h2 className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 px-1">CHI TIẾT THÁNG 05</h2>
        
        {records.map((record, index) => (
          <div 
            key={index} 
            className={`bg-white rounded-2xl p-5 ambient-shadow border border-outline-variant/10 flex flex-col gap-4 ${
              record.status === 'absent' ? 'opacity-70 grayscale-[0.3]' : ''
            } ${record.status === 'late' ? 'border-l-4 border-l-amber-400' : ''} ${record.status === 'absent' ? 'border-l-4 border-l-red-400' : ''}`}
          >
            <div className="flex justify-between items-start border-b border-surface-container pb-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-bold text-on-surface">{record.day}, {record.date}</span>
                <span className="text-[11px] font-medium text-on-surface-variant">{record.shift} (08:30 - 17:30)</span>
              </div>
              
              <div className={`px-2.5 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 ${
                record.status === 'on-time' ? 'bg-emerald-50 text-emerald-700' : 
                record.status === 'late' ? 'bg-amber-50 text-amber-700' : 
                'bg-red-50 text-red-700'
              }`}>
                {record.status === 'on-time' && <CheckCircle2 size={12} className="fill-current" />}
                {record.status === 'late' && <AlertTriangle size={12} className="fill-current" />}
                {record.status === 'absent' && <XCircle size={12} className="fill-current" />}
                {record.status === 'on-time' ? 'Đúng giờ' : 
                 record.status === 'late' ? `Đi muộn ${record.lateMinutes}m` : 
                 'Vắng mặt'}
              </div>
            </div>

            <div className="flex justify-around items-center px-2 py-1">
              {record.status === 'absent' ? (
                <span className="text-[12px] font-medium text-on-surface-variant italic py-2">Không có dữ liệu chấm công</span>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold text-outline-variant uppercase">Check-in</span>
                    <span className={`text-lg font-bold ${record.status === 'late' ? 'text-amber-600' : 'text-on-surface'}`}>
                      {record.checkIn}
                    </span>
                  </div>
                  
                  <div className="flex-1 px-4 relative flex items-center h-px bg-outline-variant/30">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] font-bold text-on-surface-variant whitespace-nowrap">
                      {record.duration}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-semibold text-outline-variant uppercase">Check-out</span>
                    <span className="text-lg font-bold text-on-surface">{record.checkOut}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
