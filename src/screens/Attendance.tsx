import { ArrowLeft, Bell, CheckCircle2, ChevronRight, LogIn, LogOut, MapPin, Clock, Timer } from 'lucide-react';
import { motion } from 'motion/react';

export default function Attendance() {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Top Header */}
      <div className="flex justify-between items-center py-4 bg-surface sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button className="p-2 -ml-2 hover:bg-surface-container rounded-full transition-colors active:scale-90">
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h1 className="text-xl font-bold text-primary tracking-tight">Chấm công</h1>
        </div>
        <button className="p-2 hover:bg-surface-container rounded-full transition-colors active:scale-90 relative">
          <Bell size={20} className="text-primary" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-secondary rounded-full border-2 border-surface" />
        </button>
      </div>

      {/* Hero Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-xl shadow-primary-container/5 border border-primary-fixed-dim/20 relative overflow-hidden flex flex-col gap-6">
        {/* Background Accent */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-fixed/30 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex justify-between items-center relative z-10">
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">CA LÀM HÔM NAY</p>
            <h2 className="text-lg font-bold text-on-surface leading-tight">Ca hành chính</h2>
            <p className="text-[12px] font-medium text-outline">08:00 - 17:30</p>
          </div>
          <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center justify-center">
            <span className="text-[10px] font-bold text-emerald-700 whitespace-nowrap">Đang làm việc</span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-4 z-10">
          <div className="flex items-center gap-2 mb-3 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-100/50">
            <CheckCircle2 size={16} className="text-emerald-600 fill-emerald-600/10" />
            <span className="text-[12px] font-bold text-emerald-600">Đã check-in</span>
          </div>
          <h1 className="text-[56px] font-extrabold text-primary tracking-tighter leading-none mb-1">08:30</h1>
          <p className="text-sm font-medium text-on-surface-variant">Thứ Sáu, 24/05/2024</p>
        </div>

        {/* Dynamic Location Area */}
        <div className="bg-surface-container-low rounded-xl p-4 flex items-center gap-4 z-10 border border-outline-variant/10">
          <div className="bg-surface-container-lowest rounded-full p-2.5 shadow-sm shrink-0 border border-outline-variant/10">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><path d="M12 7v5l3 3"/></svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-on-surface-variant leading-tight mb-0.5">Bạn đang trong vùng chấm công hợp lệ</p>
            <p className="text-[12px] font-bold text-primary truncate">Tòa nhà Jarviz Building</p>
          </div>
          <span className="bg-surface-container-high px-2 py-0.5 rounded text-[10px] font-bold text-outline">GPS</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <button className="bg-emerald-600 text-white rounded-xl py-4 flex justify-center items-center gap-2 font-bold text-sm shadow-lg shadow-emerald-600/10 active:scale-95 transition-all">
            <LogIn size={20} />
            CHECK-IN
          </button>
          <button className="bg-white border-1.5 border-amber-500 text-amber-600 rounded-xl py-4 flex justify-center items-center gap-2 font-bold text-sm hover:bg-amber-50 active:scale-95 transition-all">
            <LogOut size={20} />
            CHECK-OUT
          </button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Clock size={16} />
            <span className="text-[12px] font-bold uppercase tracking-wider">Thời gian</span>
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex justify-between items-center border-b border-surface-container-high pb-2">
              <span className="text-[12px] font-medium text-outline">Giờ vào</span>
              <span className="text-sm font-bold text-primary">08:30</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[12px] font-medium text-outline">Giờ ra</span>
              <span className="text-sm font-bold text-outline">--:--</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Timer size={16} />
            <span className="text-[12px] font-bold uppercase tracking-wider">Tổng thời gian</span>
          </div>
          <div className="flex flex-col items-start pt-4">
            <div className="text-[28px] font-bold text-primary leading-tight">0h <span className="text-lg opacity-60">00m</span></div>
            <div className="mt-2 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold text-amber-600 border border-amber-100">
              Đúng giờ
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
