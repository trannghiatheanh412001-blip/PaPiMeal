import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChefHat, LogOut, CheckCircle, Calendar, ListTodo, Clipboard, ShieldCheck } from "lucide-react";
import { Order, Product } from "../types";
import { 
  loadOrders, 
  saveOrders, 
  addStatusLog, 
  ACCOUNTS, 
  loadProducts, 
  loadCategories 
} from "../utils/storage";
import { sendToGoogleSheets } from "../utils/googleSheets";

interface KitchenDashboardProps {
  onBackToHome: () => void;
  orders: Order[];
  triggerRefresh: () => void;
}

export default function KitchenDashboard({ onBackToHome, orders, triggerRefresh }: KitchenDashboardProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Subtab state: 'orders' | 'summary'
  const [subTab, setSubTab] = useState<'orders' | 'summary'>('orders');

  // Production Summary target date
  const [summaryDate, setSummaryDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Load login state from session storage
  useEffect(() => {
    const saved = sessionStorage.getItem("papimeal_kitchen_logged");
    if (saved === "true") {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    const account = ACCOUNTS.find(a => a.phone === cleanPhone && a.password === password);
    
    if (account && (account.role === "KITCHEN" || account.role === "ADMIN")) {
      setIsLoggedIn(true);
      sessionStorage.setItem("papimeal_kitchen_logged", "true");
      setLoginError("");
    } else {
      setLoginError("❌ Sai số điện thoại hoặc mật khẩu bếp!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("papimeal_kitchen_logged");
    setPhone("");
    setPassword("");
  };

  // Get active kitchen cooking orders (status: 'Đang chế biến')
  // Sorted chronologically by delivery date & time (earliest first)
  const activeOrders = orders
    .filter(o => o.status === "Đang chế biến")
    .sort((a, b) => {
      const datetimeA = `${a.receiveDate} ${a.receiveTime}`;
      const datetimeB = `${b.receiveDate} ${b.receiveTime}`;
      return datetimeA.localeCompare(datetimeB);
    });

  // Mark an order as cooked (change status from "Đang chế biến" to "Bếp đã chuẩn bị xong")
  const handleMarkDone = (orderId: string) => {
    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        addStatusLog(orderId, "Đang chế biến", "Bếp đã chuẩn bị xong", "Nhân viên Bếp");
        const updated = { ...o, status: "Bếp đã chuẩn bị xong" as const };
        sendToGoogleSheets("UPDATE_STATUS", updated);
        return updated;
      }
      return o;
    });
    saveOrders(updatedOrders);
    triggerRefresh();
  };

  // Tab 2: Aggregated production planning calculations ("Kế hoạch đi chợ")
  const calculateProductionSummary = () => {
    // Filter non-canceled orders for summary date
    const dayOrders = orders.filter(o => o.receiveDate === summaryDate && o.status !== "Đã Hủy");
    
    const allProds = loadProducts();
    const allCats = loadCategories();

    // Sum quantities per product
    const summaryMap: { [productId: string]: number } = {};
    let totalPortionsCount = 0;

    dayOrders.forEach(order => {
      totalPortionsCount += order.portionsCount;
      order.portions.forEach(portion => {
        portion.forEach(item => {
          summaryMap[item.id] = (summaryMap[item.id] || 0) + item.qty;
        });
      });
    });

    // Group sums by category
    const groupedSummary = allCats.map(cat => {
      const catProducts = allProds.filter(p => p.category === cat.id);
      const items = catProducts
        .map(p => {
          const totalQty = summaryMap[p.id] || 0;
          const totalWeight = totalQty * p.weight;
          return {
            productId: p.id,
            name: p.name,
            totalQty,
            totalWeight,
            unit: p.unit
          };
        })
        .filter(it => it.totalQty > 0);

      const categoryWeightSum = items.reduce((acc, it) => acc + it.totalWeight, 0);

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        items,
        categoryWeightSum
      };
    }).filter(group => group.items.length > 0);

    return {
      groups: groupedSummary,
      totalPortionsCount
    };
  };

  const summaryData = calculateProductionSummary();

  if (!isLoggedIn) {
    return (
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center py-4">
          <ChefHat size={48} className="mx-auto text-[#00523b] mb-2" />
          <h3 className="text-xl font-extrabold text-[#00523b] font-sans">Màn Hình Đầu Bếp PaPi</h3>
          <p className="text-xs text-[#394013]/70 font-medium mt-1">
            Đăng nhập hệ thống chế biến dành riêng cho tổ bếp
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#fcfef1] p-5 rounded-2xl border border-[#00523b]/10 shadow-sm space-y-4">
          {loginError && (
            <div className="bg-red-50 text-red-700 p-2.5 rounded-xl text-xs font-semibold text-center border border-red-100">
              {loginError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">Số điện thoại bếp</label>
            <input 
              type="text" 
              placeholder="0917..."
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Mật khẩu bếp</label>
            <input 
              type="password" 
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-xl shadow transition cursor-pointer text-sm"
          >
            Vào Màn Hình Bếp 🔐
          </button>
        </form>

        <p className="text-[10px] text-center text-[#394013]/60 italic font-medium">
          * Thông tin tài khoản mặc định được cấu hình sẵn trong mã nguồn.
        </p>

        <div className="text-center pt-2">
          <button
            onClick={onBackToHome}
            className="text-xs font-bold text-[#00523b] hover:underline cursor-pointer"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mini control panel */}
      <div className="flex justify-between items-center bg-[#00523b] text-[#fffbd8] p-3 px-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <ChefHat size={18} />
          <span className="font-extrabold text-sm font-sans tracking-tight">MÀN HÌNH BẾP 👨‍🍳</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold cursor-pointer"
        >
          Đăng xuất <LogOut size={12} />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-[#00523b]/5 p-1 rounded-xl">
        <button
          onClick={() => setSubTab('orders')}
          className={`py-2 text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === 'orders' 
              ? "bg-[#00523b] text-[#fffbd8] shadow" 
              : "text-[#394013]/70 hover:text-[#394013]"
          }`}
        >
          <ListTodo size={14} /> 🔥 Đơn Cần Làm ({activeOrders.length})
        </button>
        <button
          onClick={() => setSubTab('summary')}
          className={`py-2 text-xs font-bold rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
            subTab === 'summary' 
              ? "bg-[#00523b] text-[#fffbd8] shadow" 
              : "text-[#394013]/70 hover:text-[#394013]"
          }`}
        >
          <Clipboard size={14} /> 📦 Tổng Hợp Chuẩn Bị
        </button>
      </div>

      {/* Tab 1: Orders list designed super big for dirty hands / fast cooking */}
      {subTab === 'orders' && (
        <div className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="bg-[#fcfef1] p-10 rounded-2xl border border-[#00523b]/10 text-center text-[#394013]/60 font-bold text-sm">
              🧑‍🍳 Bếp đã thảnh thơi! Hiện không có đơn hàng nào cần chế biến.
              <p className="text-xs font-medium text-[#394013]/40 mt-1">Các đơn hàng mới sẽ tự động xuất hiện ở đây.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeOrders.map(order => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border-l-8 border-[#00523b] shadow-md p-5 space-y-4"
                >
                  {/* Big Headings */}
                  <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">MÃ ĐƠN HÀNG</span>
                      <h4 className="text-xl font-black text-[#00523b] tracking-tight">{order.id}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">HẸN GIAO</span>
                      <h4 className="text-lg font-black text-amber-600 flex items-center justify-end gap-1">
                        ⏱️ {order.receiveTime}
                      </h4>
                    </div>
                  </div>

                  {/* General metadata (No prices or finances, strictly security / focus) */}
                  <div className="text-xs font-bold text-[#394013]/70 grid grid-cols-2 gap-2 bg-[#fffbd8]/20 p-2.5 rounded-xl">
                    <div>📅 Ngày nhận: <span className="text-[#00523b]">{order.receiveDate.split('-').reverse().join('/')}</span></div>
                    <div className="text-right">📦 Quy cách: <span className="text-[#00523b]">{order.portionsCount} hộp riêng</span></div>
                    <div>🛵 Hình thức: <span className="text-[#00523b]">{order.deliveryMethod}</span></div>
                    {order.notes && (
                      <div className="col-span-2 border-t border-gray-100 pt-1.5 text-red-700 italic text-xs mt-1">
                        📝 Ghi chú: &ldquo;{order.notes}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* List of portions and meals (Big and legible) */}
                  <div className="space-y-3">
                    {order.portions.map((portionItems, pIdx) => (
                      <div key={pIdx} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                        <span className="text-xs font-black text-[#00523b] uppercase tracking-wider block border-b border-gray-200/50 pb-1">
                          🍱 Hộp Số {pIdx + 1}
                        </span>
                        <ul className="space-y-2 pl-1">
                          {portionItems.map(item => (
                            <li key={item.id} className="text-base font-extrabold text-[#394013] flex justify-between">
                              <span>• {item.name}</span>
                              <span className="text-xl font-black text-[#00523b] bg-[#00523b]/10 px-2.5 py-0.5 rounded-lg shrink-0">
                                x{item.qty}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Gigantic green [ĐÃ XONG] button */}
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleMarkDone(order.id)}
                    className="w-full py-4.5 bg-[#00523b] hover:bg-[#004230] text-[#fffbd8] font-black rounded-xl shadow-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer text-lg tracking-wider"
                  >
                    <CheckCircle size={22} strokeWidth={2.5} /> ĐỒNG Ý ĐÃ XONG
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Aggregate production summary / shopping plan */}
      {subTab === 'summary' && (
        <div className="space-y-4">
          <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm">
            <label className="block text-xs font-bold mb-1.5 flex items-center gap-1">
              <Calendar size={14} className="text-[#00523b]" /> Chọn ngày tổng hợp sản xuất
            </label>
            <input 
              type="date"
              value={summaryDate}
              onChange={e => setSummaryDate(e.target.value)}
              className="w-full px-4 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium cursor-pointer"
            />
          </div>

          <div className="bg-[#fcfef1] p-5 rounded-2xl border border-[#00523b]/15 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#00523b]/10 pb-2">
              <h4 className="font-extrabold text-sm text-[#00523b] uppercase tracking-wider">
                🛍️ Dự Tính Đi Chợ &amp; Chuẩn Bị
              </h4>
              <span className="text-xs font-bold bg-[#00523b]/10 text-[#00523b] px-2 py-0.5 rounded-full">
                {summaryDate.split('-').reverse().join('/')}
              </span>
            </div>

            {summaryData.groups.length === 0 ? (
              <p className="text-center text-xs text-[#394013]/60 py-10 font-semibold">
                Chưa có đơn hàng nào cần chuẩn bị cho ngày này.
              </p>
            ) : (
              <div className="space-y-5">
                {/* Auto packaging counter (Smart automatic calculation) */}
                <div className="bg-teal-50 border-l-4 border-teal-600 p-3 rounded-r-xl text-xs space-y-1">
                  <span className="font-bold text-teal-800 flex items-center gap-1.5">
                    📦 Bao bì &amp; Hộp giấy đóng gói:
                  </span>
                  <div className="flex justify-between font-bold text-[#394013]">
                    <span>Hộp giấy PaPiMeal đóng cơm:</span>
                    <span className="text-teal-900 text-sm font-black">{summaryData.totalPortionsCount} chiếc</span>
                  </div>
                  <p className="text-[10px] text-teal-700/80 font-medium">
                    * Bếp tự động ước lượng 1 hộp giấy chuyên dụng cho mỗi khẩu phần đặt mua.
                  </p>
                </div>

                {/* Groups */}
                {summaryData.groups.map(group => (
                  <div key={group.categoryId} className="space-y-2">
                    <h5 className="text-xs font-black text-[#00523b] border-b border-[#00523b]/10 pb-1 uppercase tracking-wider">
                      {group.categoryName}
                    </h5>
                    <div className="space-y-1.5">
                      {group.items.map(item => {
                        return (
                          <div key={item.productId} className="flex justify-between items-center text-xs border-b border-gray-100 pb-1.5">
                            <span className="font-semibold text-[#394013]">{item.name}</span>
                            <div className="text-right font-bold text-[#00523b] shrink-0">
                              <span>{item.totalQty} suất </span>
                              <span className="text-gray-400 font-medium">({item.totalWeight >= 1000 ? `${(item.totalWeight / 1000).toFixed(1)}kg` : `${item.totalWeight}${item.unit === 'g' || item.unit === 'gram' ? 'g' : item.unit}`})</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="text-center pt-2">
        <button
          onClick={onBackToHome}
          className="text-xs font-bold text-[#00523b] hover:underline cursor-pointer"
        >
          Quay lại trang chủ
        </button>
      </div>
    </div>
  );
}
