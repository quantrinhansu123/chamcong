import { Bell, MoreHorizontal, Calendar, Briefcase, Clock, Timer, Users, UserMinus, ChevronRight, Download, Store, Hammer, Megaphone } from 'lucide-react';
import { motion } from 'motion/react';

export default function Reports() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      {/* Top Header */}
      <div className="flex justify-between items-center py-4 bg-surface sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img 
            alt="User" 
            className="w-10 h-10 rounded-full object-cover border border-outline-variant/30 active:scale-95 transition-all" 
            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100&h=100" 
          />
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant leading-none">Xin chào,</p>
            <h1 className="text-xl font-bold text-primary tracking-tight">Jarviz</h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:opacity-80 transition-all border border-outline-variant/10 shadow-sm active:scale-95">
          <Bell size={20} />
        </button>
      </div>

      {/* Main Header & Period Filter */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-primary tracking-tight">Báo cáo</h2>
        <div className="flex items-center gap-2 bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/20 shadow-sm">
          <button className="flex-1 px-4 py-2.5 rounded-xl bg-white shadow-md text-sm font-bold text-primary transition-all">Tháng này</button>
          <button className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-on-surface-variant/70 hover:text-primary transition-all">Tháng trước</button>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-white transition-all group">
            <Calendar size={18} className="group-hover:text-primary" />
          </button>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4">
        {[
          { icon: Briefcase, label: 'Ngày công', val: '22.5', sub: '+2.4%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Clock, label: 'Giờ làm', val: '184', unit: 'h', sub: '-1h', color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: Timer, label: 'Đi muộn', val: '3', color: 'text-on-tertiary-container', bg: 'bg-surface-container-high' },
          { icon: UserMinus, label: 'Vắng mặt', val: '1', color: 'text-red-500', bg: 'bg-red-50' }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-4 ambient-shadow flex flex-col gap-4 relative overflow-hidden group border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <stat.icon size={20} className={stat.color} />
              {stat.sub && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${stat.color} ${stat.bg} active:scale-95 transition-all`}>
                  {stat.sub}
                </span>
              )}
            </div>
            <div>
              <p className="text-[12px] font-bold text-on-surface-variant/80 mb-0.5">{stat.label}</p>
              <p className="text-3xl font-extrabold text-primary">
                {stat.val}{stat.unit && <span className="text-sm font-bold text-on-surface-variant ml-1">{stat.unit}</span>}
              </p>
            </div>
            <div className={`absolute -bottom-6 -right-6 w-20 h-20 ${stat.bg} opacity-20 rounded-full blur-2xl group-hover:scale-125 transition-transform`} />
          </div>
        ))}
      </section>

      {/* Weekly Hours Chart */}
      <section className="bg-white rounded-2xl p-6 ambient-shadow border border-outline-variant/10 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Biểu đồ giờ làm theo tuần</h3>
          <button className="text-on-surface-variant hover:text-primary transition-all p-1">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="h-40 flex items-end justify-between gap-4 px-2 relative pt-2">
          {/* Horizontal lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 opacity-40">
            {[1,2,3,4].map(i => <div key={i} className="border-b border-outline-variant/30 w-full" />)}
          </div>
          {/* Bars */}
          {[
            { h: '60%', val: '32h', label: 'Tuần 1' },
            { h: '85%', val: '40h', label: 'Tuần 2' },
            { h: '95%', val: '45h', label: 'Tuần 3', active: true },
            { h: '70%', val: '36h', label: 'Tuần 4' }
          ].map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 relative z-10 group cursor-pointer">
              <div 
                className={`w-full max-w-[32px] rounded-t-lg transition-all duration-500 overflow-visible relative ${
                  bar.active ? 'bg-primary-container shadow-lg' : 'bg-primary-fixed-dim/40 group-hover:bg-primary-container/30'
                }`} 
                style={{ height: bar.h }}
              >
                <div className={`absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  bar.active ? 'bg-primary text-white opacity-100 scale-100' : 'bg-on-surface text-white opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100'
                }`}>
                  {bar.val}
                </div>
              </div>
              <span className={`text-[11px] font-bold transition-all ${bar.active ? 'text-primary' : 'text-on-surface-variant/60'}`}>
                {bar.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Breakdown Chart */}
      <section className="bg-white rounded-2xl p-6 ambient-shadow border border-outline-variant/10 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">Phân bổ trạng thái</h3>
          <button className="text-on-surface-variant hover:text-primary transition-all">
            <MoreHorizontal size={20} />
          </button>
        </div>
        <div className="flex items-center justify-center py-4">
          <div className="w-40 h-40 rounded-full relative flex items-center justify-center shadow-lg" style={{ background: 'conic-gradient(from 0deg, var(--color-primary-fixed) 0% 60%, var(--color-secondary-container) 60% 85%, #ffdad6 85% 100%)' }}>
            <div className="w-24 h-24 bg-white rounded-full absolute shadow-inner border border-outline-variant/5" />
            <div className="z-10 text-center flex flex-col items-center">
              <span className="text-[28px] font-extrabold text-primary leading-tight">100%</span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Tháng này</span>
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4 flex-wrap pb-2">
          {[
            { c: 'bg-primary-fixed', l: 'Đúng giờ', p: '60%' },
            { c: 'bg-secondary-container', l: 'Đi muộn', p: '25%' },
            { c: 'bg-red-100', l: 'Vắng', p: '15%' }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 bg-surface-container-low/50 px-3 py-1.5 rounded-full border border-outline-variant/10">
              <div className={`w-2.5 h-2.5 rounded-full ${item.c}`} />
              <span className="text-[11px] font-bold text-on-surface-variant">{item.l} <span className="opacity-50">({item.p})</span></span>
            </div>
          ))}
        </div>
      </section>

      {/* Departments */}
      <section className="bg-white rounded-2xl p-6 ambient-shadow border border-outline-variant/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-primary">Phòng ban</h3>
          <button className="text-[12px] font-bold text-secondary hover:underline transition-all">Xem tất cả</button>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Sale', count: '35 NV', icon: Store, bg: 'bg-primary-fixed/20', ic: 'text-primary' },
            { label: 'Kỹ thuật', count: '20 NV', icon: Hammer, bg: 'bg-secondary-fixed/20', ic: 'text-secondary' },
            { label: 'Marketing', count: '15 NV', icon: Megaphone, bg: 'bg-red-50', ic: 'text-red-500' }
          ].map((dept, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-all group cursor-pointer border border-transparent hover:border-outline-variant/20 active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-full ${dept.bg} flex items-center justify-center ${dept.ic} shadow-sm group-hover:scale-110 transition-transform`}>
                  <dept.icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary">{dept.label}</p>
                  <p className="text-[12px] font-medium text-on-surface-variant/80">{dept.count}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      </section>

      {/* Export Action */}
      <section className="pt-4 pb-12 flex flex-col gap-4">
        <button className="bg-emerald-600 text-white w-full px-6 py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-95 transition-all overflow-hidden relative group">
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          <Download size={20} />
          Xuất báo cáo
        </button>
      </section>
    </motion.div>
  );
}
