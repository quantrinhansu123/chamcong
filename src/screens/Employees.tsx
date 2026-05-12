import { Bell, Search, SlidersHorizontal, Briefcase, Megaphone, Code } from 'lucide-react';
import { motion } from 'motion/react';
import type { Employee } from '../types';

export default function Employees() {
  const employees: Employee[] = [
    {
      id: '1',
      name: 'Nguyễn Văn An',
      role: 'Trưởng nhóm Sale',
      department: 'Phòng Sale',
      status: 'online',
      checkInTime: '08:30 AM',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=100&h=100'
    },
    {
      id: '2',
      name: 'Trần Thị Mai',
      role: 'Chuyên viên Marketing',
      department: 'Phòng Marketing',
      status: 'offline',
      avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=100&h=100'
    },
    {
      id: '3',
      name: 'Lê Minh Hoàng',
      role: 'Kỹ sư Phần mềm',
      department: 'Phòng Kỹ thuật',
      status: 'absent',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=100&h=100'
    }
  ];

  const filters = ['Tất cả', 'Sale', 'Marketing', 'Kỹ thuật'];

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col gap-6"
    >
      {/* Top App Bar */}
      <div className="flex justify-between items-center py-4 bg-surface sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <img 
            alt="Jarviz" 
            className="w-10 h-10 rounded-full object-cover border border-outline-variant/30 shadow-sm" 
            src="https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&q=80&w=100&h=100" 
          />
          <div>
            <p className="text-[10px] font-bold text-on-surface-variant leading-none">Xin chào,</p>
            <h1 className="text-xl font-bold text-primary dark:text-primary-fixed-dim leading-tight">Jarviz</h1>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary hover:opacity-80 transition-all border border-outline-variant/10 shadow-sm active:scale-95">
          <Bell size={20} />
        </button>
      </div>

      {/* Header & Search */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-primary tracking-tight">Nhân sự</h2>
        <div className="flex gap-3">
          <div className="relative flex-grow">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" />
            <input 
              className="w-full bg-white border-0 shadow-sm rounded-full py-3.5 pl-12 pr-4 text-sm text-on-surface focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all placeholder:text-outline/60" 
              placeholder="Tìm kiếm nhân viên..." 
              type="text" 
            />
          </div>
          <button className="w-12 h-12 bg-white shadow-sm rounded-full flex items-center justify-center text-primary border border-outline-variant/20 hover:bg-surface-container transition-all active:scale-90 shrink-0">
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Quick Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-5 px-5">
          {filters.map((filter, idx) => (
            <button 
              key={filter} 
              className={`px-5 py-2.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all shadow-sm ${
                idx === 0 
                ? 'bg-emerald-600 text-white' 
                : 'bg-white text-on-surface-variant border border-outline-variant/30 hover:border-emerald-500/50'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Employee List */}
      <section className="flex flex-col gap-4 mb-4">
        {employees.map((emp) => (
          <div 
            key={emp.id} 
            className="bg-white shadow-sm ambient-shadow rounded-2xl p-5 flex flex-col gap-4 border border-outline-variant/10 hover:border-emerald-500/10 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-outline-variant/10 shadow-sm p-0.5 bg-surface-container-low group-hover:scale-105 transition-transform">
                  <img 
                    alt={emp.name} 
                    className="w-full h-full rounded-full object-cover" 
                    src={emp.avatar} 
                  />
                </div>
                <div>
                  <h3 className="text-md font-bold text-primary group-hover:text-emerald-800 transition-colors">{emp.name}</h3>
                  <p className="text-[12px] font-medium text-on-surface-variant mt-0.5">{emp.role}</p>
                </div>
              </div>

              <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border ${
                emp.status === 'online' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50' 
                : emp.status === 'offline' 
                ? 'bg-amber-50 text-amber-600 border-amber-100/50' 
                : 'bg-red-50 text-red-600 border-red-100/50'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  emp.status === 'online' ? 'bg-emerald-500' : emp.status === 'offline' ? 'bg-amber-400' : 'bg-red-500'
                } block`} />
                {emp.status === 'online' ? 'Đã check-in' : emp.status === 'offline' ? 'Chưa check-in' : 'Vắng mặt'}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-surface-container-high pt-4 mt-1">
              <div className="flex items-center gap-2 text-on-surface-variant">
                {emp.department.includes('Sale') && <Briefcase size={16} className="opacity-70" />}
                {emp.department.includes('Marketing') && <Megaphone size={16} className="opacity-70" />}
                {emp.department.includes('Kỹ thuật') && <Code size={16} className="opacity-70" />}
                <span className="text-[12px] font-semibold">{emp.department}</span>
              </div>
              <span className={`text-[12px] font-bold ${emp.status === 'online' ? 'text-emerald-600' : emp.status === 'absent' ? 'text-red-500' : 'text-outline/60'}`}>
                {emp.status === 'online' ? emp.checkInTime : emp.status === 'absent' ? 'Nghỉ phép' : '-'}
              </span>
            </div>
          </div>
        ))}
      </section>
    </motion.div>
  );
}
