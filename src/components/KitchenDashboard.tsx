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

  // Track checked state of individual items in portions for packaging safety
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  const toggleChecked = (orderId: string, portionIdx: number, itemKey: string) => {
    const key = `${orderId}-${portionIdx}-${itemKey}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyPortionLabelText = (order: Order, portionIdx: number, itemsStr: string) => {
    const label = `ĐƠN ${order.id} | KH: ${order.customerName} | SĐT: ${order.phone}\n[PHẦN ${portionIdx + 1}/${order.portionsCount}] Gồm: ${itemsStr}\n${order.notes ? `Ghi chú: ${order.notes}` : ''}`;
    navigator.clipboard.writeText(label);
    alert(`📋 Đã sao chép nhãn dán cho Phần ${portionIdx + 1}!`);
  };

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
      {subTab === 'orders' && (() => {
        const pendingCount = orders.filter(o => o.status === "Chờ xử lý").length;
        const activeAggregatedItems = (() => {
          const agg: { [name: string]: number } = {};
          activeOrders.forEach(o => {
            o.portions.forEach(portion => {
              portion.forEach(item => {
                agg[item.name] = (agg[item.name] || 0) + item.qty;
              });
            });
          });
          return Object.entries(agg).sort((a, b) => b[1] - a[1]);
        })();

        return (
          <div className="space-y-4">
            {/* System warning for pending admin orders */}
            {pendingCount > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl text-xs flex items-start gap-2 text-amber-950 font-medium leading-relaxed shadow-sm">
                <span className="text-lg shrink-0">⚠️</span>
                <div>
                  <span className="font-extrabold text-amber-900 block text-xs">THÔNG BÁO TỪ HỆ THỐNG:</span>
                  Hiện có <strong className="text-amber-800 font-extrabold">{pendingCount} đơn hàng mới</strong> vừa được khách đặt đang ở trạng thái <strong className="text-amber-800">Chờ xử lý</strong>. Hãy nhắc Quản trị viên duyệt đơn ở màn hình admin để chuyển trạng thái sang <strong className="text-[#00523b]">Đang chế biến</strong> thì bếp mới hiển thị nấu nướng nhé!
                </div>
              </div>
            )}

            {/* Aggregated Preparation list for active orders */}
            {activeOrders.length > 0 && activeAggregatedItems.length > 0 && (
              <div className="premium-card bg-white p-5 space-y-3.5 border-l-[6px] border-[#00523b] shadow-md">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div className="space-y-0.5">
                    <h5 className="font-black text-xs text-[#00523b] uppercase tracking-wider flex items-center gap-1.5">
                      🍳 TỔNG HỢP MÓN CẦN CHUẨN BỊ ({activeAggregatedItems.length} món nhỏ)
                    </h5>
                    <p className="text-[10px] text-gray-500 font-semibold">Tập hợp nguyên liệu để bếp chế biến gộp một lượt</p>
                  </div>
                  <span className="text-[9px] font-black text-white bg-[#00523b] px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                    Nấu số lượng lớn
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {activeAggregatedItems.map(([name, qty]) => (
                    <div key={name} className="flex justify-between items-center bg-[#00523b]/5 px-3 py-2.5 rounded-xl border border-[#00523b]/10">
                      <span className="font-extrabold text-[#394013] leading-tight">{name}</span>
                      <span className="font-black text-sm text-[#00523b] bg-white px-2.5 py-0.5 rounded-lg shadow-sm shrink-0 border border-[#00523b]/10">
                        x{qty}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="text-[9.5px] text-[#394013]/70 font-semibold italic bg-[#fcfef1] p-2 rounded-lg border border-[#00523b]/5">
                  💡 <strong>Nguyên tắc:</strong> Đầu bếp chuẩn bị toàn bộ số lượng gộp ở bảng trên trước. Sau đó xem danh sách từng đơn hàng chi tiết bên dưới để chia nhỏ đóng gói và dán đúng nhãn nhầm tránh sót!
                </div>
              </div>
            )}

            {activeOrders.length === 0 ? (
              <div className="bg-[#fcfef1] p-10 rounded-2xl border border-[#00523b]/10 text-center text-[#394013]/60 font-bold text-sm">
                🧑‍🍳 Bếp đã thảnh thơi! Hiện không có đơn hàng nào cần chế biến.
                <p className="text-xs font-medium text-[#394013]/40 mt-1">Các đơn hàng mới được admin phê duyệt sẽ tự động xuất hiện ở đây.</p>
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
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">MÃ ĐƠN HÀNG</span>
                        <h4 className="text-xl font-black text-[#00523b] tracking-tight">{order.id}</h4>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded block w-fit mt-1">
                          Đang chế biến ⏱️
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block">HẸN GIAO</span>
                        <h4 className="text-lg font-black text-amber-600">
                          ⏱️ {order.receiveTime}
                        </h4>
                        <span className="text-[10px] text-gray-400 block mt-1 font-bold">
                          {order.session} ({order.receiveDate.split('-').reverse().join('/')})
                        </span>
                      </div>
                    </div>

                    {/* General metadata */}
                    <div className="text-xs font-bold text-[#394013]/70 grid grid-cols-2 gap-2 bg-[#fffbd8]/20 p-2.5 rounded-xl border border-[#00523b]/5">
                      <div>👤 Khách hàng: <span className="text-[#00523b] font-black">{order.customerName}</span></div>
                      <div className="text-right">📞 SĐT: <span className="text-[#00523b] font-black">{order.phone}</span></div>
                      <div>🛵 Hình thức: <span className="text-[#00523b] font-black">{order.deliveryMethod}</span></div>
                      <div className="text-right">📦 Đóng gói: <span className="text-red-700 font-black">{order.portionsCount} Suất ăn riêng</span></div>
                      {order.address && (
                        <div className="col-span-2 border-t border-gray-200/40 pt-1 text-gray-600">
                          📍 Địa chỉ: <span className="font-semibold">{order.address}</span>
                        </div>
                      )}
                      {order.notes && (
                        <div className="col-span-2 border-t border-gray-200/40 pt-1 text-red-700 italic">
                          📝 Ghi chú: &ldquo;{order.notes}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Portions packaging detailed list */}
                    <div className="space-y-3">
                      <div className="text-xs font-black text-[#00523b]/80 uppercase tracking-wider block">
                        📦 CHI TIẾT ĐÓNG GÓI TỪNG SUẤT (Tích chọn để kiểm tra khi đóng hộp):
                      </div>
                      {order.portions.map((portionItems, pIdx) => {
                        const itemsStr = portionItems.map(it => `${it.name} (x${it.qty})`).join(", ");
                        return (
                          <div key={pIdx} className="bg-gray-50 p-4 rounded-xl border border-gray-200/70 space-y-2.5">
                            <div className="flex justify-between items-center border-b border-gray-200 pb-1.5">
                              <span className="text-xs font-black text-[#00523b] uppercase tracking-wider">
                                🍱 Suất Ăn {pIdx + 1} / {order.portionsCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyPortionLabelText(order, pIdx, itemsStr)}
                                className="px-2 py-1 bg-[#00523b]/10 text-[#00523b] hover:bg-[#00523b] hover:text-white rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Sao chép thông tin nhãn để viết dán lên nắp hộp"
                              >
                                Copy Nhãn dán 🏷️
                              </button>
                            </div>
                            <ul className="space-y-2 pl-1">
                              {portionItems.map((item, itemIdx) => {
                                const itemKey = `${item.id}-${itemIdx}`;
                                const isChecked = !!checkedItems[`${order.id}-${pIdx}-${itemKey}`];
                                return (
                                  <li 
                                    key={itemKey} 
                                    onClick={() => toggleChecked(order.id, pIdx, itemKey)}
                                    className={`text-sm font-extrabold flex justify-between items-center cursor-pointer p-1.5 rounded hover:bg-gray-200/50 transition select-none ${
                                      isChecked ? 'line-through text-gray-400 opacity-60' : 'text-[#394013]'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={() => {}} // handled by click of parent li
                                        className="w-4 h-4 rounded cursor-pointer accent-[#00523b] shrink-0 pointer-events-none" 
                                      />
                                      <span>{item.name}</span>
                                    </span>
                                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg shrink-0 ${
                                      isChecked ? 'bg-gray-200 text-gray-500' : 'bg-[#00523b]/10 text-[#00523b]'
                                    }`}>
                                      x{item.qty}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>

                    {/* Gigantic green [ĐÃ XONG] button */}
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-[10px] text-center text-[#394013]/60 font-semibold mb-2">
                        * Đảm bảo đã đóng đủ {order.portionsCount} suất ăn và dán ghi chú chính xác trước khi báo xong!
                      </p>
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleMarkDone(order.id)}
                        className="w-full py-4 bg-[#00523b] hover:bg-[#004230] text-[#fffbd8] font-black rounded-xl shadow-md transition duration-150 flex items-center justify-center gap-2 cursor-pointer text-base tracking-wider"
                      >
                        <CheckCircle size={20} strokeWidth={2.5} /> HOÀN TẤT &amp; GỬI GIAO 🛵
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

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
