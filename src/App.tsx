import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShoppingBag, 
  Search, 
  ChefHat, 
  ShieldAlert, 
  Home, 
  RefreshCw, 
  Users,
  Utensils,
  Sparkles,
  Info,
  X,
  BookOpen
} from "lucide-react";
import { Order } from "./types";
import { loadOrders, saveOrders, getEarliestOrderDate } from "./utils/storage";
import { loadTextConfig } from "./utils/textConfig";
import { initFirebaseSync, deleteAllOrdersFromFirestore, deleteAllLogsFromFirestore } from "./utils/firebaseSync";
import CustomerFlow from "./components/CustomerFlow";
import OrderTracking from "./components/OrderTracking";
import KitchenDashboard from "./components/KitchenDashboard";
import AdminDashboard from "./components/AdminDashboard";

export default function App() {
  // Current view: 'home' | 'customer' | 'tracking' | 'kitchen' | 'admin' | 'success'
  const [view, setView] = useState<'home' | 'customer' | 'tracking' | 'kitchen' | 'admin' | 'success'>('home');
  const [refreshToggle, setRefreshToggle] = useState(false);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [latestOrderId, setLatestOrderId] = useState("");
  const [textConfig, setTextConfig] = useState(() => loadTextConfig());
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState<'customer' | 'admin' | 'kitchen'>('customer');
  const [portal, setPortal] = useState<'customer' | 'staff'>(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get("mode") || params.get("portal") || params.get("view");
    if (modeParam === "staff" || modeParam === "kitchen" || modeParam === "admin" || modeParam === "nhanvien") {
      return "staff";
    }
    const saved = localStorage.getItem("papimeal_portal");
    return (saved === "staff") ? "staff" : "customer";
  });

  useEffect(() => {
    localStorage.setItem("papimeal_portal", portal);
  }, [portal]);

  // Subscribe to real-time Firebase syncing on mount
  useEffect(() => {
    initFirebaseSync(() => {
      setRefreshToggle(prev => !prev);
    });
  }, []);

  // Load orders on load & refresh
  useEffect(() => {
    setAllOrders(loadOrders());
    setTextConfig(loadTextConfig());
  }, [refreshToggle]);

  const triggerRefresh = () => {
    setRefreshToggle(prev => !prev);
  };

  const handleOrderSuccess = (orderId: string) => {
    setLatestOrderId(orderId);
    setView('success');
  };

  const handleResetDemoData = async () => {
    if (window.confirm("Bạn có chắc muốn Reset toàn bộ đơn hàng hiện có để demo lại từ đầu không?")) {
      localStorage.removeItem("papimeal_orders");
      localStorage.removeItem("papimeal_logs");
      
      try {
        await deleteAllOrdersFromFirestore();
        await deleteAllLogsFromFirestore();
      } catch (err) {
        console.error("Error resetting Firestore collections:", err);
      }
      
      // Keep products & categories but reset orders
      triggerRefresh();
      alert("Đã reset dữ liệu đơn hàng thành công!");
      setView('home');
    }
  };

  return (
    <div className="min-h-screen bg-[#fffbd8] text-[#394013] font-sans flex flex-col items-center p-3 sm:p-6 select-none pb-12">
      {/* Visual background decorations to make it organic and high-end */}
      <div className="absolute top-0 left-0 w-full h-40 bg-[#00523b] rounded-b-[40px] -z-1 opacity-15" />

      {/* Main Responsive Layout Frame (Tối ưu tuyệt đối cho điện thoại di động) */}
      <div className="w-full max-w-md bg-transparent flex flex-col min-h-[85vh] relative z-10">
        
        {/* App Title Header - Styled with Professional Polish Theme */}
        <header className="h-16 flex items-center justify-between px-4 bg-white border border-[#394013]/12 shadow-sm rounded-2xl mb-4">
          <div 
            onClick={() => {
              if (view === 'home') {
                setPortal('staff');
                setView('admin');
              } else {
                setView('home');
                setPortal('customer');
              }
            }} 
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 bg-[#00523b] rounded-xl flex items-center justify-center text-white font-extrabold text-lg shadow-sm transition-transform group-hover:scale-105 duration-200 overflow-hidden shrink-0">
              {(textConfig.headerLogo.startsWith("http") || textConfig.headerLogo.startsWith("/") || textConfig.headerLogo.startsWith("data:")) ? (
                <img 
                  src={textConfig.headerLogo} 
                  alt="Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{textConfig.headerLogo}</span>
              )}
            </div>
            <div>
              <h1 className="text-lg font-black text-[#00523b] tracking-tight font-sans leading-none">
                {textConfig.appName}
              </h1>
              <span className="text-[9px] tracking-wide text-[#394013]/60 font-black block mt-0.5 leading-none">
                {textConfig.slogan}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setGuideTab('customer');
                setShowGuideModal(true);
              }}
              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/20 rounded-xl text-[10px] font-black transition cursor-pointer flex items-center gap-1"
              title="Cẩm nang vận hành chi tiết"
            >
              {textConfig.guideBtnText || "📖 Hướng Dẫn"}
            </button>
            <button
              onClick={triggerRefresh}
              className="p-2 bg-[#00523b]/10 hover:bg-[#00523b]/15 rounded-xl text-[#00523b] transition cursor-pointer"
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={14} className="animate-spin-slow" />
            </button>
            <button
              onClick={handleResetDemoData}
              className="px-2.5 py-1.5 bg-red-600/10 hover:bg-red-600/15 rounded-xl text-red-700 transition text-[10px] font-bold cursor-pointer"
              title="Reset dữ liệu demo"
            >
              Reset 🔄
            </button>
          </div>
        </header>

        {/* Dynamic Inner Component Render */}
        <main className="flex-1">
          <AnimatePresence mode="wait">
            {view === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-5 py-4"
              >
                {/* Visual Banner */}
                <div className="bg-[#00523b] text-[#fffbd8] p-6 rounded-3xl shadow-md text-center space-y-2.5 relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 text-9xl opacity-15 w-32 h-32 flex items-center justify-center pointer-events-none select-none">
                    {(textConfig.homeBannerImage.startsWith("http") || textConfig.homeBannerImage.startsWith("/") || textConfig.homeBannerImage.startsWith("data:")) ? (
                      <img 
                        src={textConfig.homeBannerImage} 
                        alt="Banner decorative" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      textConfig.homeBannerImage
                    )}
                  </div>
                  <span className="text-[11px] bg-[#fffbd8]/10 text-[#fffbd8] px-2.5 py-1 rounded-full font-extrabold tracking-wide">
                    {textConfig.bannerSlogan}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold font-sans tracking-tight leading-tight whitespace-pre-line">
                    {textConfig.homeBannerTitle}
                  </h2>
                  <p className="text-xs text-[#fffbd8]/85 font-medium max-w-xs mx-auto leading-relaxed">
                    {textConfig.homeBannerSubtitle}
                  </p>
                </div>

                {/* Grid Roles Selector */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Customer Card */}
                  <motion.div
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setView('customer')}
                    className="premium-card p-5 flex flex-col justify-between h-40 cursor-pointer text-left transition-all duration-300 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#00523b]/5 rounded-bl-[40px] flex items-center justify-center transition-all group-hover:bg-[#00523b]/10">
                      <span className="text-2xl">🍛</span>
                    </div>
                    <div className="mt-8">
                      <h3 className="font-extrabold text-sm text-[#00523b] tracking-tight">{textConfig.roleCustomerTitle || "Khách Hàng"}</h3>
                      <p className="text-[10px] text-[#394013]/60 font-semibold mt-1">{textConfig.roleCustomerSub || "Đặt món theo khẩu phần"}</p>
                    </div>
                    <div className="w-1.5 h-1/2 bg-[#00523b] absolute left-0 top-1/4 rounded-r-md transition-all group-hover:h-2/3" />
                  </motion.div>
 
                  {/* Tracking Card */}
                  <motion.div
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setView('tracking')}
                    className="premium-card p-5 flex flex-col justify-between h-40 cursor-pointer text-left transition-all duration-300 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-[#00523b]/5 rounded-bl-[40px] flex items-center justify-center transition-all group-hover:bg-[#00523b]/10">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <div className="mt-8">
                      <h3 className="font-extrabold text-sm text-[#00523b] tracking-tight">{textConfig.roleTrackingTitle || "Tra Cứu Đơn"}</h3>
                      <p className="text-[10px] text-[#394013]/60 font-semibold mt-1">{textConfig.roleTrackingSub || "Theo dõi thời gian thực"}</p>
                    </div>
                    <div className="w-1.5 h-1/2 bg-[#394013] absolute left-0 top-1/4 rounded-r-md transition-all group-hover:h-2/3" />
                  </motion.div>
                </div>
 
                {/* Bottom Guide */}
                {textConfig.demoGuideText && textConfig.demoGuideText.trim() !== "" && (
                  <div className="premium-card p-5 bg-white border-l-[6px] border-[#00523b] shadow-sm flex gap-3 text-xs">
                    <span className="text-2xl shrink-0">💡</span>
                    <div className="space-y-1.5 w-full">
                      <p className="font-extrabold text-sm text-[#00523b] tracking-tight">{textConfig.demoGuideTitle || "Mách nhỏ cách trải nghiệm Demo:"}</p>
                      <div className="text-[#394013]/85 font-medium leading-relaxed space-y-1 whitespace-pre-line">
                        {textConfig.demoGuideText}
                      </div>
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setGuideTab('customer');
                            setShowGuideModal(true);
                          }}
                          className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-amber-950 font-black rounded-xl shadow-sm transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                        >
                          {textConfig.guideBannerBtnText || "📖 Xem Cẩm Nang Vận Hành Chi Tiết 🚀"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {view === 'customer' && (
              <motion.div key="customer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CustomerFlow 
                  onBackToHome={() => setView('home')} 
                  onOrderSuccess={handleOrderSuccess} 
                  triggerRefresh={triggerRefresh}
                />
              </motion.div>
            )}

            {view === 'tracking' && (
              <motion.div key="tracking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <OrderTracking onBackToHome={() => setView('home')} />
              </motion.div>
            )}

            {view === 'kitchen' && (
              <motion.div key="kitchen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <KitchenDashboard 
                  onBackToHome={() => setView('home')} 
                  orders={allOrders} 
                  triggerRefresh={triggerRefresh}
                />
              </motion.div>
            )}

            {view === 'admin' && (
              <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AdminDashboard 
                  onBackToHome={() => setView('home')} 
                  orders={allOrders} 
                  triggerRefresh={triggerRefresh}
                />
              </motion.div>
            )}

            {/* Success Celebration Screen */}
            {view === 'success' && (
              <motion.div 
                key="success"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-10 px-4 space-y-6"
              >
                {/* Firework Celebration Animation in pure CSS */}
                <div className="relative py-4 flex justify-center">
                  <div className="absolute w-24 h-24 bg-green-400 rounded-full blur-xl opacity-30 animate-pulse" />
                  <motion.div 
                    initial={{ rotate: -15, scale: 0.8 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                    className="text-7xl relative z-10"
                  >
                    🎉
                  </motion.div>
                  {/* Subtle decorative circles */}
                  <span className="absolute top-0 left-12 text-sm animate-bounce">✨</span>
                  <span className="absolute bottom-4 right-16 text-lg animate-bounce delay-100">🌸</span>
                  <span className="absolute top-10 right-10 text-xs animate-bounce delay-200">🚀</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-[#00523b] font-sans tracking-tight">
                    Đặt Món Thành Công!
                  </h3>
                  <p className="text-xs text-[#394013]/70 font-semibold px-2">
                    {textConfig.successMessage}
                  </p>
                </div>

                <div className="bg-[#fcfef1] p-5 rounded-2xl border-2 border-dashed border-[#00523b]/20 shadow-sm max-w-xs mx-auto space-y-2.5">
                  <span className="text-[10px] text-[#394013]/60 uppercase tracking-widest font-black block">Mã Đơn Độc Quyền Của Bạn:</span>
                  <p className="text-2xl font-black tracking-wider text-[#00523b] uppercase bg-[#00523b]/5 py-2.5 rounded-xl border border-[#00523b]/10">
                    {latestOrderId}
                  </p>
                  <p className="text-[10px] text-[#394013]/60 italic font-medium leading-relaxed pt-1 border-t border-gray-100">
                    &ldquo;Tụi mình sẽ sớm liên hệ xác nhận cho bạn liền nhé!&rdquo;
                  </p>
                </div>

                <div className="space-y-2 max-w-xs mx-auto pt-2">
                  <button
                    onClick={() => setView('tracking')}
                    className="w-full py-3.5 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-xl shadow cursor-pointer text-sm"
                  >
                    Theo Dõi Tiến Độ Đơn 🔍
                  </button>
                  <button
                    onClick={() => setView('home')}
                    className="w-full py-3 bg-white border border-[#00523b]/30 text-[#00523b] font-bold rounded-xl hover:bg-gray-50 transition cursor-pointer text-xs"
                  >
                    Quay lại trang chủ
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Quick Demo Switcher Sticky Footer - Extremely helpful for presentations */}
        {view !== 'home' && portal === 'staff' && (
          <footer className="mt-8 border-t border-[#00523b]/10 pt-4 pb-2">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#394013]/50 block mb-2">
                🔄 Chuyển Đổi Vai Trò Nhanh (Demo)
              </span>
              <div className="flex gap-1.5 justify-center">
                <button
                  onClick={() => setView('home')}
                  className={`px-2.5 py-1.5 text-[10px] font-extrabold rounded-lg border transition cursor-pointer ${
                    view === 'home' ? "bg-[#00523b] text-[#fffbd8] border-[#00523b]" : "bg-white text-[#00523b] border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  🏠 Home
                </button>
                <button
                  onClick={() => setView('customer')}
                  className={`px-2.5 py-1.5 text-[10px] font-extrabold rounded-lg border transition cursor-pointer ${
                    view === 'customer' ? "bg-[#00523b] text-[#fffbd8] border-[#00523b]" : "bg-white text-[#00523b] border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  🍛 Khách
                </button>
                <button
                  onClick={() => setView('tracking')}
                  className={`px-2.5 py-1.5 text-[10px] font-extrabold rounded-lg border transition cursor-pointer ${
                    view === 'tracking' ? "bg-[#00523b] text-[#fffbd8] border-[#00523b]" : "bg-white text-[#00523b] border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  🔍 Tra cứu
                </button>
                <button
                  onClick={() => setView('kitchen')}
                  className={`px-2.5 py-1.5 text-[10px] font-extrabold rounded-lg border transition cursor-pointer ${
                    view === 'kitchen' ? "bg-[#00523b] text-[#fffbd8] border-[#00523b]" : "bg-white text-[#00523b] border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  👨‍🍳 Bếp
                </button>
                <button
                  onClick={() => setView('admin')}
                  className={`px-2.5 py-1.5 text-[10px] font-extrabold rounded-lg border transition cursor-pointer ${
                    view === 'admin' ? "bg-[#00523b] text-[#fffbd8] border-[#00523b]" : "bg-white text-[#00523b] border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  ⚙️ Admin
                </button>
              </div>
            </div>
          </footer>
        )}
      </div>

      {/* GUIDE MODAL */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col relative"
            >
              {/* Header */}
              <div className="p-4 bg-[#00523b] text-[#fffbd8] flex items-center justify-between shrink-0">
                <span className="font-extrabold text-sm flex items-center gap-1.5 uppercase">
                  <BookOpen size={18} /> {textConfig.guideModalTitle || "CẨM NANG VẬN HÀNH CHI TIẾT"}
                </span>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition text-[#fffbd8] cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Tab selector - Only show for staff so customers don't see other roles */}
              {portal === 'staff' && (
                <div className="flex bg-[#00523b]/5 p-1 border-b border-gray-100 shrink-0">
                  <button
                    onClick={() => setGuideTab('customer')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      guideTab === 'customer' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:text-[#394013]"
                    }`}
                  >
                    🍛 Khách Hàng
                  </button>
                  <button
                    onClick={() => setGuideTab('admin')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      guideTab === 'admin' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:text-[#394013]"
                    }`}
                  >
                    ⚙️ Admin
                  </button>
                  <button
                    onClick={() => setGuideTab('kitchen')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      guideTab === 'kitchen' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:text-[#394013]"
                    }`}
                  >
                    👨‍🍳 Tổ Bếp
                  </button>
                </div>
              )}

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed text-gray-700">
                {guideTab === 'customer' && (
                  <div className="space-y-4">
                    <div className="bg-[#fcfef1] p-3.5 rounded-xl border border-[#00523b]/10">
                      <span className="font-extrabold text-[#00523b] block text-sm mb-1">
                        {textConfig.guideCustTitle || "🍱 Concept: Tự Chọn Món Ăn Theo Gram/ml"}
                      </span>
                      <p className="text-gray-600 whitespace-pre-line">
                        {textConfig.guideCustDesc || "Khác với cơm hộp truyền thống đóng sẵn, tại **PaPi(ml)**, mỗi suất ăn giống như một khay cơm trống được phát riêng. Khách hàng tự do gắp những món yêu thích bỏ vào khay của mình, tính tiền dựa trên trọng lượng chính xác (Gram/ml) được định giá sẵn."}
                      </p>
                    </div>

                    <div className="bg-[#00523b]/5 p-3.5 rounded-xl border border-[#00523b]/10 whitespace-pre-line text-gray-600 font-medium leading-relaxed space-y-2">
                      {textConfig.guideCustSteps || `1. Nhập Thông Tin & Số Lượng Khay trước\nBước đầu tiên, khách hàng sẽ khai báo họ tên, SĐT, ngày và giờ muốn nhận món, chọn hình thức giao hàng/nhận tại quán, ghi chú lưu ý và quan trọng nhất là chọn số lượng khay cơm muốn đặt (Số suất ăn).\n\n2. Lựa Chọn Món Vào Từng Khay Ăn Lẻ\nKhách hàng sẽ tự do định lượng món ăn (tôm rim, khoai tây, cơm trắng, thịt bò...) vào khay đầu tiên. Nếu đi nhóm đông muốn ăn giống hệt nhau: Chỉ cần chọn khay 1, rồi tích chọn "Áp dụng giống Khẩu phần 1" để đặt nhanh. Nếu muốn cá nhân hoá: Bấm "Khẩu phần tiếp theo" để tự gắp đồ ăn khác nhau cho khay số 2, khay số 3...\n\n3. Xác Nhận Hóa Đơn & Gửi Đơn\nHệ thống tổng hợp và bóc tách chi tiết giá tiền của từng khay cơm riêng biệt để khách dễ dàng cược/chia tiền. Khách bấm gửi đơn và nhận Mã Đơn Hàng duy nhất.\n\n4. Tra Cứu Realtime Live\nNhập SĐT để xem trực quan tiến trình bếp nấu: Chờ xử lý → Đang chuẩn bị → Đang nấu → Đã giao hoàn toàn trực quan!`}
                    </div>
                  </div>
                )}

                {guideTab === 'admin' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200 text-amber-900">
                      <span className="font-extrabold text-amber-800 block text-sm mb-1">
                        {textConfig.guideAdminTitle || "💰 Doanh Thu Thực Tế (Hoàn tất)"}
                      </span>
                      <p className="text-amber-950/80 whitespace-pre-line">
                        {textConfig.guideAdminDesc || "Để tránh lạm phát báo cáo khống, Doanh thu và Lợi nhuận chỉ được cộng dồn khi đơn hàng đạt trạng thái \"Hoàn tất\" (đã giao thành công và nhận tiền). Các đơn mới đặt hoặc đang giao sẽ không được tính làm doanh thu."}
                      </p>
                    </div>

                    <div className="bg-amber-50/20 p-3.5 rounded-xl border border-amber-200/50 whitespace-pre-line text-gray-600 font-medium leading-relaxed">
                      {textConfig.guideAdminSteps || `• 1. Phê duyệt & Cập nhật đơn hàng: Tiếp nhận đơn mới từ khách hàng, duyệt đơn sang "Đã xác nhận", giao cho Shipper đổi thành "Đang giao" và cập nhật thành "Hoàn tất" khi thu tiền thành công.\n\n• 2. Thống kê đi chợ & Chuẩn bị nguyên liệu: Hệ thống tổng hợp sản lượng của tất cả đơn hàng hôm nay (loại trừ đơn hủy), tự động tính ra Trọng lượng nguyên liệu cần mua và Tổng tiền nguyên liệu đi chợ để Admin xuất quỹ ứng tiền mua sắm kịp thời.\n\n• 3. Đồng bộ 8 Báo Cáo Google Sheets: Mọi đơn hàng mới hoặc thay đổi trạng thái đều được tự động gửi và ghi nhận trên 8 Sheet báo cáo tự động sang Google Sheets của quán để lưu trữ vĩnh viễn.`}
                    </div>
                  </div>
                )}

                {guideTab === 'kitchen' && (
                  <div className="space-y-4">
                    <div className="bg-teal-50 p-3.5 rounded-xl border border-teal-200 text-teal-900">
                      <span className="font-extrabold text-teal-800 block text-sm mb-1">
                        {textConfig.guideKitchenTitle || "👨‍🍳 Tổ Bếp: Tiền Đi Chợ & Trạng Thái Live"}
                      </span>
                      <p className="text-teal-950/80 whitespace-pre-line">
                        {textConfig.guideKitchenDesc || "Bếp không cần phải tự cộng sổ thủ công hay cộng tay trọng lượng nguyên liệu nữa. Chỉ cần nhìn vào góc bếp:"}
                      </p>
                    </div>

                    <div className="bg-teal-50/20 p-3.5 rounded-xl border border-teal-200/50 whitespace-pre-line text-gray-600 font-medium leading-relaxed">
                      {textConfig.guideKitchenSteps || `• Thống kê ngân sách đi chợ: Bếp nhìn thấy ngay mục Tổng tiền nguyên liệu đi chợ ước tính ở ngay đầu để nắm trước ngân sách cần chuẩn bị đi mua sắm thực phẩm tươi ngon.\n\n• Chuẩn bị đúng định lượng: Danh sách nguyên liệu phân rã theo nhóm thịt, cá, rau củ để bếp thái, tẩm ướp và xào nấu đúng số lượng suất ăn, không sợ dư thừa lãng phí hao hụt.\n\n• Báo cáo tiến trình cho khách: Khi sơ chế xong, đang nấu, hay đã nấu xong, Bếp chỉ cần bấm đổi trạng thái trực quan ngay tại màn hình để khách hàng ở văn phòng yên tâm theo dõi.`}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end shrink-0">
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="px-4 py-2 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-xl shadow cursor-pointer text-xs"
                >
                  Đã hiểu, đóng cẩm nang 👍
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
