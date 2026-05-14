import { Bell, User, History, MapPin, Megaphone, ShieldCheck, LogOut, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { currentEmployee, clearCurrentEmployee } from '../lib/attendanceService';

export default function Settings() {
  const handleLogout = () => {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
      clearCurrentEmployee();
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  const menuItems = [
    { icon: History, label: 'Ca làm việc' },
    { icon: MapPin, label: 'Địa điểm' },
    { icon: Megaphone, label: 'Thông báo' },
    { icon: ShieldCheck, label: 'Chính sách' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <div className="flex justify-between items-center py-6 bg-surface sticky top-0 z-40">
        <h1 className="text-[32px] font-extrabold text-primary tracking-tight">Cài đặt</h1>
        <button className="p-2 hover:bg-surface-container rounded-full transition-colors active:scale-90">
          <Bell size={24} className="text-on-surface-variant" />
        </button>
      </div>

      {/* Profile Card */}
      <div className="bg-white shadow-xl shadow-primary-container/5 rounded-3xl p-6 flex items-center gap-5 border border-surface-container-highest relative overflow-hidden group">
        {/* Subtle Decorative element */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-fixed/20 rounded-full blur-3xl -mr-12 -mt-12 transition-transform group-hover:scale-110" />
        
        <div className="w-20 h-20 rounded-full overflow-hidden shrink-0 border-4 border-surface-container shadow-inner">
          <img 
            alt="Profile" 
            className="w-full h-full object-cover" 
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150" 
          />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-xl font-bold text-primary truncate leading-tight">{currentEmployee.name}</h2>
          <p className="text-[13px] font-medium text-on-surface-variant/80 truncate">{currentEmployee.id}</p>
        </div>
      </div>

      {/* Menu List */}
      <div className="bg-white shadow-xl shadow-primary-container/5 rounded-3xl flex flex-col overflow-hidden border border-surface-container-highest">
        {menuItems.map((item, idx) => (
          <button 
            key={item.label}
            className={`flex items-center justify-between p-5 hover:bg-surface-container-low transition-all active:scale-[0.99] group ${
              idx !== menuItems.length - 1 ? 'border-b border-surface-container-highest' : ''
            }`}
          >
            <div className="flex items-center gap-4 text-on-surface">
              <div className="p-2 rounded-xl bg-surface-container-low group-hover:bg-primary-fixed/30 transition-colors">
                <item.icon size={20} className="text-surface-tint" />
              </div>
              <span className="text-[15px] font-bold tracking-tight">{item.label}</span>
            </div>
            <ChevronRight size={20} className="text-outline-variant group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="flex items-center justify-center w-full py-4.5 px-6 rounded-2xl border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 transition-all font-bold text-[15px] group active:scale-[0.98] mt-2 mb-10"
      >
        <div className="flex items-center gap-2">
          <LogOut size={20} className="group-hover:translate-x-[-2px] transition-transform" />
          <span>Đăng xuất</span>
        </div>
      </button>
    </motion.div>
  );
}
