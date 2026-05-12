import { MoreHorizontal, CheckCircle2, LogIn, LogOut, MapPin, Calendar, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6 pb-8"
    >
      {/* Header Space */}
      <div className="header-bg -mx-5 px-5 pt-12 pb-20 mb-[-80px]">
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-primary-fixed/20 shadow-lg">
              <img 
                src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100&h=100" 
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-[12px] text-white/70 font-medium">Xin chào,</p>
              <h1 className="text-xl font-bold text-white tracking-tight">Nguyễn Văn An</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5">
            <div className="relative">
              <span className="block w-2 h-2 bg-secondary rounded-full absolute -top-0.5 -right-0.5 border border-primary-container" />
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </div>
          </button>
        </div>
      </div>

      {/* Today Status */}
      <div className="glass-card p-6 flex flex-col gap-4 relative z-10">
        <div className="flex justify-between items-center">
          <h2 className="text-[12px] font-bold text-on-surface-variant uppercase tracking-widest">TRẠNG THÁI HÔM NAY</h2>
          <button className="text-outline-variant hover:text-on-surface transition-colors p-1">
            <MoreHorizontal size={20} />
          </button>
        </div>
        
        <div className="flex flex-col items-center justify-center py-4 gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary-container text-[12px] font-bold shadow-sm">
            <CheckCircle2 size={14} className="fill-current" />
            Đã check-in
          </div>
          <div className="text-[64px] font-extrabold text-primary leading-none tracking-tighter mt-2">
            08:30
          </div>
          <div className="text-sm font-medium text-outline">
            Thứ Sáu, 24/05/2024
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <button className="bg-primary-container text-white py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-primary-container/10 hover:opacity-90 active:scale-95 transition-all">
            <LogIn size={18} />
            CHECK IN
          </button>
          <button className="bg-white border-[1.5px] border-secondary text-secondary py-4 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-secondary/5 active:scale-95 transition-all text-center leading-tight">
            <LogOut size={18} />
            CHECK-OUT
          </button>
        </div>
      </div>

      {/* Current Location */}
      <div className="glass-card p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 shadow-inner">
          <MapPin size={20} className="text-on-surface-variant" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-1">VỊ TRÍ HIỆN TẠI</p>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-low border border-outline-variant/30 text-[10px] font-bold text-outline uppercase tracking-wider">GPS</span>
          </div>
          <h3 className="font-bold text-on-surface text-lg leading-tight mb-1 truncate">Tòa nhà Jarviz Building</h3>
          <p className="text-[12px] text-on-surface-variant leading-relaxed">
            123 Nguyễn Văn Linh, Quận 7, TP.HCM
          </p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="glass-card p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Calendar size={18} />
            <h3 className="text-sm font-bold text-on-surface">Lịch làm việc</h3>
          </div>
          <p className="text-[12px] font-bold text-on-surface">24/05/2024</p>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-outline-variant/50">
            {['T2','T3','T4','T5','T6','T7','CN'].map((d, i) => (
              <div key={d} className={i < 5 ? 'text-outline-variant' : ''}>{d}</div>
            ))}
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className={`h-6 flex items-center justify-center ${i === 4 ? 'bg-primary text-white rounded-full' : 'text-outline'}`}>
                {13 + i}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-on-surface-variant">
            <Clock size={18} />
            <h3 className="text-sm font-bold text-on-surface">Tổng thời gian</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-2">
            <div className="text-[32px] font-bold text-on-surface leading-tight">8h 15m</div>
            <p className="text-[12px] font-semibold text-outline">Hôm nay</p>
          </div>
        </div>
      </div>

      {/* HR Stats */}
      <div className="glass-card p-5 flex flex-col gap-4 mb-4">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-on-surface">Tổng quan nhân sự</h3>
          <button className="text-[12px] font-bold text-on-surface flex items-center gap-1 hover:opacity-80 transition-opacity">
            Xem tất cả <ChevronRight size={14} />
          </button>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--color-surface-container-low)" strokeWidth="12" />
              <circle 
                cx="50" cy="50" r="40" fill="none" 
                stroke="var(--color-primary-container)" 
                strokeWidth="12" 
                strokeDasharray="251.2" 
                strokeDashoffset={251.2 * (1 - 0.76)} 
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-lg font-bold text-on-surface">128</span>
              <span className="text-[10px] font-bold text-outline uppercase">Tổng số</span>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary-container" />
                <span className="text-[12px] text-on-surface-variant font-medium">Đã check-in</span>
              </div>
              <span className="text-[12px] font-bold">98 <span className="text-outline font-normal text-[10px]">(76%)</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary-container" />
                <span className="text-[12px] text-on-surface-variant font-medium">Chưa check-in</span>
              </div>
              <span className="text-[12px] font-bold">25 <span className="text-outline font-normal text-[10px]">(20%)</span></span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[12px] text-on-surface-variant font-medium">Vắng mặt</span>
              </div>
              <span className="text-[12px] font-bold">5 <span className="text-outline font-normal text-[10px]">(4%)</span></span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
