import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChefHat, LogOut, CheckCircle, Calendar, ListTodo, Clipboard, ShieldCheck, Printer, Download, Tag, Copy, X } from "lucide-react";
import { Order, Product, PortionItem } from "../types";
import { 
  loadOrders, 
  saveOrders, 
  addStatusLog, 
  loadAccounts, 
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

  // Mode font size for elders: default to true (Big fonts)
  const [isBigFont, setIsBigFont] = useState(() => {
    return localStorage.getItem("papimeal_kitchen_bigfont") !== "false";
  });

  // Track checked state of consolidated ingredients for easy cooking checklist
  const [cookedItems, setCookedItems] = useState<{ [name: string]: boolean }>({});

  // Production Summary target date
  const [summaryDate, setSummaryDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Track checked state of individual items in portions for packaging safety
  const [checkedItems, setCheckedItems] = useState<{ [key: string]: boolean }>({});

  // Memoized product lookup map for finding product weight and unit
  const productsMap = React.useMemo(() => {
    try {
      const list = loadProducts();
      const map: { [id: string]: Product } = {};
      list.forEach(p => {
        map[p.id] = p;
      });
      return map;
    } catch (e) {
      console.error("Error loading products for map:", e);
      return {};
    }
  }, [orders]);

  const toggleChecked = (orderId: string, portionIdx: number, itemKey: string) => {
    const key = `${orderId}-${portionIdx}-${itemKey}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCookedItem = (name: string) => {
    setCookedItems(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const toggleBigFont = () => {
    const nextVal = !isBigFont;
    setIsBigFont(nextVal);
    localStorage.setItem("papimeal_kitchen_bigfont", String(nextVal));
  };

  // State for portion label printer / designer modal
  const [printingPortion, setPrintingPortion] = useState<{
    order: Order;
    portionIdx: number;
    items: PortionItem[];
  } | null>(null);

  // Print function matching exactly 10cm x 3cm format
  const printPortionLabel = (order: Order, portionIdx: number, items: PortionItem[]) => {
    const itemsStr = items.map(it => `${it.name} (x${it.qty})`).join(", ");
    
    const printContainer = document.createElement("div");
    printContainer.id = "print-label-area";
    
    printContainer.innerHTML = `
      <div style="width: 67%; display: flex; flex-direction: column; justify-content: space-between; height: 100%; overflow: hidden; text-align: left;">
        <div style="font-size: 8px; font-weight: 900; border-bottom: 0.5px solid black; padding-bottom: 2px; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; font-family: sans-serif;">
          PAPIMEAL - DINH DƯỠNG MỖI NGÀY 🍱
        </div>
        <div style="font-size: 8px; line-height: 1.1; margin-bottom: 2px; font-family: sans-serif;">
          <strong>KH:</strong> ${order.customerName} - ${order.phone}
          ${order.address ? `<div style="font-size: 7px; margin-top: 1px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;"><strong>ĐC:</strong> ${order.address}</div>` : ''}
        </div>
        <div style="font-size: 8px; font-weight: 700; flex-grow: 1; word-wrap: break-word; line-height: 1.2; font-family: sans-serif;">
          <strong>Món:</strong> ${itemsStr}
        </div>
        ${order.notes ? `
        <div style="font-size: 7px; font-weight: 900; background: black; color: white; padding: 1.5px 3px; border-radius: 2px; margin-top: 1.5px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-family: sans-serif;">
          ⚠️ CHÚ Ý: ${order.notes}
        </div>` : ''}
      </div>
      
      <div style="width: 0; border-left: 0.5px dashed black; height: 100%; margin: 0 4px;"></div>
      
      <div style="width: 28%; display: flex; flex-direction: column; justify-content: space-between; align-items: center; text-align: center; height: 100%;">
        <div style="background: black; color: white; font-size: 8px; font-weight: 900; padding: 1px 2px; width: 100%; box-sizing: border-box; border-radius: 2px; text-align: center; font-family: sans-serif;">
          ${order.id}
        </div>
        <div style="font-size: 10px; font-weight: 900; margin: 1px 0; border-bottom: 0.5px solid black; width: 100%; padding-bottom: 1px; font-family: sans-serif;">
          HỘP ${portionIdx + 1}/${order.portionsCount}
        </div>
        <div style="font-size: 8px; font-weight: 900; white-space: nowrap; font-family: sans-serif;">
          HẸN: ${order.receiveTime}
        </div>
        <div style="font-size: 6px; font-weight: 900; border: 0.5px solid black; padding: 1px; border-radius: 2px; width: 100%; box-sizing: border-box; background: white; text-transform: uppercase; font-family: sans-serif;">
          ${order.deliveryMethod === 'Giao hàng' ? '🛵 GIAO' : '🏪 LẤY'}
        </div>
      </div>
    `;
    
    const style = document.createElement("style");
    style.id = "print-label-style";
    style.innerHTML = `
      @media print {
        body * {
          display: none !important;
        }
        html, body {
          background: #fff !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100mm !important;
          height: 30mm !important;
        }
        #print-label-area, #print-label-area * {
          display: flex !important;
        }
        #print-label-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 100mm !important;
          height: 30mm !important;
          margin: 0 !important;
          padding: 1.5mm 3mm !important;
          box-sizing: border-box !important;
          background: white !important;
          color: black !important;
          border: none !important;
          font-family: Arial, Helvetica, sans-serif !important;
          justify-content: space-between !important;
          align-items: center !important;
        }
      }
    `;
    
    document.body.appendChild(printContainer);
    document.head.appendChild(style);
    
    window.print();
    
    setTimeout(() => {
      printContainer.remove();
      style.remove();
    }, 1000);
  };

  // Download high-res 1000x300 image function
  const downloadPortionLabelImage = (order: Order, portionIdx: number, items: PortionItem[]) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1000;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, 1000, 300);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 996, 296);

    ctx.fillStyle = "#000000";
    ctx.font = "900 28px sans-serif";
    ctx.fillText("PAPIMEAL - DINH DƯỠNG MỖI NGÀY 🍱", 25, 45);
    
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, 60);
    ctx.lineTo(670, 60);
    ctx.stroke();

    ctx.font = "bold 26px sans-serif";
    ctx.fillText(`KH: ${order.customerName} - ${order.phone}`, 25, 95);

    if (order.address) {
      ctx.font = "500 22px sans-serif";
      const addrText = `ĐC: ${order.address}`;
      const truncatedAddr = addrText.length > 55 ? addrText.substring(0, 52) + "..." : addrText;
      ctx.fillText(truncatedAddr, 25, 130);
    }

    ctx.font = "bold 24px sans-serif";
    const itemsStr = items.map(it => `${it.name} (x${it.qty})`).join(", ");
    const itemsText = `Món: ${itemsStr}`;
    const truncatedItems = itemsText.length > 55 ? itemsText.substring(0, 52) + "..." : itemsText;
    ctx.fillText(truncatedItems, 25, 175);

    if (order.notes) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(25, 215, 630, 50);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 22px sans-serif";
      const notesText = `⚠️ CHÚ Ý: ${order.notes}`;
      const truncatedNotes = notesText.length > 40 ? notesText.substring(0, 37) + "..." : notesText;
      ctx.fillText(truncatedNotes, 40, 248);
    }

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(685, 15);
    ctx.lineTo(685, 285);
    ctx.stroke();
    ctx.setLineDash([]); 

    const rightCenterX = 840;

    ctx.fillStyle = "#000000";
    ctx.fillRect(710, 15, 260, 55);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "900 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(order.id, rightCenterX, 50);

    ctx.fillStyle = "#000000";
    ctx.font = "900 36px sans-serif";
    ctx.fillText(`HỘP ${portionIdx + 1}/${order.portionsCount}`, rightCenterX, 125);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(720, 145);
    ctx.lineTo(960, 145);
    ctx.stroke();

    ctx.font = "900 28px sans-serif";
    ctx.fillText(`HẸN: ${order.receiveTime}`, rightCenterX, 195);

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.strokeRect(720, 225, 240, 50);

    ctx.font = "bold 22px sans-serif";
    const methodText = order.deliveryMethod === "Giao hàng" ? "🛵 GIAO TẬN NƠI" : "🏪 GHÉ LẤY";
    ctx.fillText(methodText, rightCenterX, 258);

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `PPM-NhanBox-${order.id}-Hop-${portionIdx + 1}.png`;
    link.href = dataUrl;
    link.click();
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
    const account = loadAccounts().find(a => a.phone === cleanPhone && a.password === password);
    
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

  // Calculate total packs (portions) to cook and package
  const totalActivePacks = activeOrders.reduce((sum, o) => sum + o.portionsCount, 0);

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

    let totalIngredientCost = 0;

    // Group sums by category
    const groupedSummary = allCats.map(cat => {
      const catProducts = allProds.filter(p => p.category === cat.id);
      const items = catProducts
        .map(p => {
          const totalQty = summaryMap[p.id] || 0;
          const totalWeight = totalQty * p.weight;
          const itemCost = totalQty * (p.cost || 0);
          totalIngredientCost += itemCost;
          return {
            productId: p.id,
            name: p.name,
            totalQty,
            totalWeight,
            unit: p.unit,
            cost: itemCost
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
      totalPortionsCount,
      totalIngredientCost
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

        {/* Account info hidden for security */}

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
    <div className={`space-y-4 ${isBigFont ? 'text-lg' : 'text-sm'}`}>
      {/* Mini control panel */}
      <div className="flex justify-between items-center bg-[#00523b] text-[#fffbd8] p-3 px-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <ChefHat size={20} />
          <span className="font-extrabold text-sm font-sans tracking-tight">HỆ THỐNG BẾP PAPI 👨‍🍳</span>
        </div>
        <div className="flex items-center gap-2">
          {/* FontSize Toggle specially designed for Mother (extremely big, bright, visible) */}
          <button
            onClick={toggleBigFont}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1 text-[11px] uppercase tracking-wide border cursor-pointer ${
              isBigFont 
                ? "bg-amber-400 text-amber-950 border-amber-300 shadow-md scale-105" 
                : "bg-white/10 hover:bg-white/20 text-white border-transparent"
            }`}
            title="Nhấn để đổi giữa Chữ To và Chữ Nhỏ"
          >
            👓 {isBigFont ? "CHỮ CỰC TO 🌟" : "CHỮ THƯỜNG"}
          </button>
          
          <button
            onClick={handleLogout}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold cursor-pointer"
          >
            Thoát <LogOut size={12} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 bg-[#00523b]/5 p-1 rounded-xl">
        <button
          onClick={() => setSubTab('orders')}
          className={`py-3 rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-2 font-black ${
            isBigFont ? 'text-base' : 'text-xs font-bold'
          } ${
            subTab === 'orders' 
              ? "bg-[#00523b] text-[#fffbd8] shadow-md" 
              : "text-[#394013]/70 hover:text-[#394013]"
          }`}
        >
          <ListTodo size={isBigFont ? 18 : 14} /> 👩‍🍳 ĐƠN CẦN CHẾ BIẾN ({activeOrders.length})
        </button>
        <button
          onClick={() => setSubTab('summary')}
          className={`py-3 rounded-lg transition duration-200 cursor-pointer flex items-center justify-center gap-2 font-black ${
            isBigFont ? 'text-base' : 'text-xs font-bold'
          } ${
            subTab === 'summary' 
              ? "bg-[#00523b] text-[#fffbd8] shadow-md" 
              : "text-[#394013]/70 hover:text-[#394013]"
          }`}
        >
          <Clipboard size={isBigFont ? 18 : 14} /> 🛍️ TỔNG HỢP NGUYÊN LIỆU
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
                  <span className="font-extrabold text-amber-900 block text-xs">CÓ ĐƠN MỚI CHỜ DUYỆT:</span>
                  Hiện có <strong className="text-amber-800 font-extrabold">{pendingCount} đơn hàng mới</strong> vừa được khách đặt đang ở trạng thái <strong className="text-amber-800">Chờ xử lý</strong>. Hãy nhắc con duyệt đơn ở màn hình admin để chuyển trạng thái sang <strong className="text-[#00523b]">Đang chế biến</strong> thì bếp mới hiển thị nấu nướng nhé!
                </div>
              </div>
            )}

            {/* BẢNG CHỈ SỐ GIAO DIỆN BẾP - SIÊU TO KHỔNG LỒ DÀNH CHO MẸ */}
            {activeOrders.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-2xl shadow-sm text-center flex flex-col justify-center items-center">
                  <span className={`font-extrabold text-amber-900 block ${isBigFont ? 'text-sm' : 'text-[11px]'}`}>
                    📋 TỔNG SỐ ĐƠN HÀNG
                  </span>
                  <span className={`font-black text-amber-700 block mt-1 ${isBigFont ? 'text-4xl' : 'text-2xl'}`}>
                    {activeOrders.length} <span className="text-sm font-bold">đơn</span>
                  </span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200/60 p-4 rounded-2xl shadow-sm text-center flex flex-col justify-center items-center">
                  <span className={`font-extrabold text-emerald-900 block ${isBigFont ? 'text-sm' : 'text-[11px]'}`}>
                    📦 TỔNG SỐ HỘP (PACK) CẦN ĐÓNG
                  </span>
                  <span className={`font-black text-emerald-700 block mt-1 ${isBigFont ? 'text-4xl' : 'text-2xl'}`}>
                    {totalActivePacks} <span className="text-sm font-bold">hộp</span>
                  </span>
                </div>
              </div>
            )}

            {/* Aggregated Preparation list for active orders with check-to-cross-out */}
            {activeOrders.length > 0 && activeAggregatedItems.length > 0 && (
              <div className="premium-card bg-white p-5 space-y-4 border-l-[6px] border-[#00523b] shadow-md">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <div className="space-y-0.5">
                    <h5 className={`font-black text-[#00523b] uppercase tracking-wider flex items-center gap-1.5 ${isBigFont ? 'text-lg' : 'text-xs'}`}>
                      🍳 TỔNG SỐ LƯỢNG MÓN CẦN NẤU ({activeAggregatedItems.length} món)
                    </h5>
                    <p className={`text-gray-500 font-bold ${isBigFont ? 'text-xs' : 'text-[10px]'}`}>
                      * Mẹ nấu gộp toàn bộ số lượng này một lần cho nhanh nhé! Nhấn để gạch bỏ món đã làm xong.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {activeAggregatedItems.map(([name, qty]) => {
                    const isCooked = !!cookedItems[name];
                    return (
                      <div 
                        key={name} 
                        onClick={() => toggleCookedItem(name)}
                        className={`flex justify-between items-center px-4 py-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                          isCooked 
                            ? "bg-gray-100 border-gray-300 opacity-50 line-through text-gray-400" 
                            : "bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                            isCooked ? 'bg-gray-300 border-gray-400 text-white' : 'border-[#00523b] bg-white'
                          }`}>
                            {isCooked && "✓"}
                          </div>
                          <span className={`font-black tracking-tight ${isBigFont ? 'text-base' : 'text-xs'} ${isCooked ? 'text-gray-400' : 'text-[#394013]'}`}>
                            {name}
                          </span>
                        </div>
                        <span className={`font-black rounded-lg shadow-sm shrink-0 border px-3 py-1 ${
                          isCooked 
                            ? 'bg-gray-200 text-gray-500 border-gray-300' 
                            : 'bg-white text-[#00523b] border-[#00523b]/20 ' + (isBigFont ? 'text-base' : 'text-xs')
                        }`}>
                          SỐ LƯỢNG: {qty}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className={`text-[#394013]/80 font-bold italic bg-[#fcfef1] p-3 rounded-xl border border-[#00523b]/10 leading-relaxed ${isBigFont ? 'text-xs' : 'text-[9.5px]'}`}>
                  💡 <strong>Cách làm tiện nhất cho Mẹ:</strong> Mẹ nấu chín hết toàn bộ số lượng ở bảng trên trước. Sau đó xem danh sách từng đơn hàng chi tiết bên dưới để chia nhỏ thức ăn vào từng hộp và dán nhãn là hoàn thành!
                </div>
              </div>
            )}

            {activeOrders.length === 0 ? (
              <div className="bg-[#fcfef1] p-10 rounded-2xl border border-[#00523b]/10 text-center text-[#394013]/60 font-bold text-sm">
                🧑‍🍳 Bếp đã thảnh thơi! Hiện không có đơn hàng nào cần chế biến.
                <p className="text-xs font-medium text-[#394013]/40 mt-1">Các đơn hàng mới được phê duyệt sẽ tự động xuất hiện ở đây.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="border-t border-gray-200/50 pt-4 pb-2">
                  <h4 className={`font-black text-[#00523b] uppercase tracking-wider text-center ${isBigFont ? 'text-lg' : 'text-sm'}`}>
                    👇 DANH SÁCH CHIA HỘP THEO TỪNG ĐƠN 👇
                  </h4>
                </div>

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
                        <span className={`font-black text-gray-400 uppercase tracking-widest block ${isBigFont ? 'text-xs' : 'text-[10px]'}`}>MÃ ĐƠN HÀNG</span>
                        <h4 className={`font-black text-[#00523b] tracking-tight ${isBigFont ? 'text-2xl' : 'text-xl'}`}>{order.id}</h4>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded block w-fit mt-1">
                          Đang chế biến ⏱️
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`font-black text-gray-400 uppercase tracking-widest block ${isBigFont ? 'text-xs' : 'text-[10px]'}`}>HẸN GIAO MÓN</span>
                        <h4 className={`font-black text-amber-600 ${isBigFont ? 'text-2xl' : 'text-lg'}`}>
                          ⏱️ {order.receiveTime}
                        </h4>
                        <span className="text-[10px] text-gray-400 block mt-1 font-bold">
                          {order.session} ({order.receiveDate.split('-').reverse().join('/')})
                        </span>
                      </div>
                    </div>

                    {/* General metadata */}
                    <div className={`font-bold text-[#394013]/80 grid grid-cols-2 gap-2 bg-[#fffbd8]/20 p-3 rounded-xl border border-[#00523b]/10 ${isBigFont ? 'text-sm' : 'text-xs'}`}>
                      <div>👤 Khách hàng: <span className="text-[#00523b] font-black">{order.customerName}</span></div>
                      <div className="text-right">📞 SĐT: <span className="text-[#00523b] font-black">{order.phone}</span></div>
                      <div>🛵 Hình thức: <span className="text-[#00523b] font-black">{order.deliveryMethod}</span></div>
                      <div className="text-right">📦 Đóng gói: <span className="text-red-700 font-black">{order.portionsCount} Suất ăn riêng</span></div>
                      {order.address && (
                        <div className="col-span-2 border-t border-gray-200/40 pt-1 text-gray-600">
                          📍 Địa chỉ giao hàng: <span className="font-semibold text-gray-900">{order.address}</span>
                        </div>
                      )}
                      {order.notes && (
                        <div className="col-span-2 border-t border-red-200 pt-2 text-red-700 font-extrabold bg-red-50 p-2 rounded-lg border">
                          ⚠️ GHI CHÚ CỦA KHÁCH: &ldquo;{order.notes}&rdquo;
                        </div>
                      )}
                    </div>

                    {/* Portions packaging detailed list */}
                    <div className="space-y-3">
                      <div className={`font-black text-[#00523b] uppercase tracking-wider block ${isBigFont ? 'text-sm' : 'text-xs'}`}>
                        📦 MẸ CHIA THỨC ĂN VÀO HỘP NHƯ DƯỚI ĐÂY:
                      </div>
                      
                      {order.portions.map((portionItems, pIdx) => {
                        const itemsStr = portionItems.map(it => `${it.name} (x${it.qty})`).join(", ");
                        return (
                          <div key={pIdx} className="bg-gray-50 p-4 rounded-xl border border-gray-200/70 space-y-2.5">
                            <div className="flex justify-between items-center border-b border-gray-200 pb-1.5">
                              <span className={`font-black text-[#00523b] uppercase tracking-wider ${isBigFont ? 'text-sm' : 'text-xs'}`}>
                                🍱 Hộp Thứ {pIdx + 1} / {order.portionsCount}
                              </span>
                              <div className="flex gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setPrintingPortion({ order, portionIdx: pIdx, items: portionItems })}
                                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-extrabold transition flex items-center gap-1 cursor-pointer shadow-sm"
                                  title="Xem và In nhãn dán chuyên dụng"
                                >
                                  <Printer size={12} /> IN & TẢI TEM 🏷️
                                </button>
                                <button
                                  type="button"
                                  onClick={() => copyPortionLabelText(order, pIdx, itemsStr)}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                                  title="Sao chép văn bản nhãn dán"
                                >
                                  <Copy size={11} /> Copy
                                </button>
                              </div>
                            </div>
                            
                            <ul className="space-y-2 pl-1">
                              {portionItems.map((item, itemIdx) => {
                                const itemKey = `${item.id}-${itemIdx}`;
                                const isChecked = !!checkedItems[`${order.id}-${pIdx}-${itemKey}`];
                                const product = productsMap[item.id];
                                const weightVal = product ? product.weight : 0;
                                const unitStr = product ? (product.unit === "phần" ? "g" : product.unit) : "g";
                                const totalWeight = item.qty * weightVal;

                                return (
                                  <li 
                                    key={itemKey} 
                                    onClick={() => toggleChecked(order.id, pIdx, itemKey)}
                                    className={`font-black flex justify-between items-center cursor-pointer p-2.5 rounded-xl border transition select-none active:scale-95 gap-3 ${
                                      isChecked 
                                        ? 'line-through text-gray-400 opacity-60 bg-gray-100 border-gray-200' 
                                        : 'text-[#394013] bg-white border-gray-200 hover:bg-gray-100/80 hover:border-gray-300 shadow-sm'
                                    } ${isBigFont ? 'text-base' : 'text-xs'}`}
                                  >
                                    <span className="flex items-center gap-2.5 min-w-0">
                                      <input 
                                        type="checkbox" 
                                        checked={isChecked}
                                        onChange={() => {}} // handled by click of parent li
                                        className="w-5 h-5 rounded cursor-pointer accent-[#00523b] shrink-0 pointer-events-none" 
                                      />
                                      <span className="truncate">{item.name}</span>
                                    </span>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`font-extrabold px-2 py-1 rounded-lg border text-[11px] uppercase tracking-wider ${
                                        isChecked 
                                          ? 'bg-gray-200 text-gray-400 border-gray-300' 
                                          : 'bg-emerald-50 text-[#00523b] border-emerald-200'
                                      }`}>
                                        {item.qty} SUẤT
                                      </span>
                                      {totalWeight > 0 && (
                                        <span className={`font-black px-2.5 py-1 rounded-lg border text-[11px] shadow-sm tracking-wide ${
                                          isChecked
                                            ? 'bg-gray-100 text-gray-400 border-gray-200'
                                            : 'bg-amber-400 text-amber-950 border-amber-500'
                                        }`}>
                                          TỔNG: {totalWeight}{unitStr}
                                        </span>
                                      )}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>

                    {/* Gigantic green [ĐÃ XONG] button */}
                    <div className="pt-3 border-t border-gray-100">
                      <p className={`text-center text-red-700 font-extrabold mb-2.5 ${isBigFont ? 'text-xs' : 'text-[10px]'}`}>
                        ⚠️ Mẹ lưu ý: Đảm bảo đã đóng đủ {order.portionsCount} hộp thức ăn và dán đúng nhãn trước khi bấm nút đỏ nhé!
                      </p>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMarkDone(order.id)}
                        className={`w-full py-4.5 bg-red-600 hover:bg-red-700 text-[#fffbd8] font-black rounded-2xl shadow-lg transition duration-150 flex items-center justify-center gap-2 cursor-pointer border-b-4 border-red-800 ${
                          isBigFont ? 'text-lg tracking-wider' : 'text-sm'
                        }`}
                      >
                        <CheckCircle size={22} strokeWidth={3} /> MẸ ĐÃ CHUẨN BỊ XONG ĐƠN NÀY ✓ GIAO HÀNG 🛵
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
            <label className={`block font-bold mb-1.5 flex items-center gap-1 ${isBigFont ? 'text-sm' : 'text-xs'}`}>
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
              <h4 className={`font-black text-[#00523b] uppercase tracking-wider ${isBigFont ? 'text-base' : 'text-xs'}`}>
                🛍️ Dự Tính Đi Chợ &amp; Chuẩn Bị
              </h4>
              <span className={`font-bold bg-[#00523b]/10 text-[#00523b] px-2.5 py-0.5 rounded-full ${isBigFont ? 'text-xs' : 'text-[10px]'}`}>
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
                <div className="bg-teal-50 border-l-4 border-teal-600 p-4 rounded-r-xl text-xs space-y-1.5">
                  <span className="font-extrabold text-teal-800 flex items-center gap-1.5 text-sm">
                    📦 Bao bì &amp; Hộp giấy đóng gói:
                  </span>
                  <div className="flex justify-between font-extrabold text-[#394013] text-sm">
                    <span>Hộp giấy PaPi(ml) đóng cơm:</span>
                    <span className="text-teal-900 text-base font-black">{summaryData.totalPortionsCount} chiếc</span>
                  </div>
                  <p className="text-[10px] text-teal-700/80 font-medium">
                    * Bếp tự động ước lượng 1 hộp giấy chuyên dụng cho mỗi khẩu phần đặt mua.
                  </p>
                </div>

                {/* Total Ingredient Money for going to market */}
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl text-xs space-y-1.5">
                  <span className="font-extrabold text-amber-800 flex items-center gap-1.5 text-sm">
                    💰 Tổng tiền nguyên liệu đi chợ:
                  </span>
                  <div className="flex justify-between font-extrabold text-[#394013] text-sm">
                    <span>Ước tính ngân sách mua hàng:</span>
                    <span className="text-amber-700 text-base font-black">
                      {(summaryData.totalIngredientCost || 0).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-600/80 font-medium">
                    * Tính bằng tổng số lượng suất cơm nhân với giá nhập nguyên liệu của từng món ăn.
                  </p>
                </div>

                {/* Groups */}
                {summaryData.groups.map(group => (
                  <div key={group.categoryId} className="space-y-2">
                    <h5 className={`font-black text-[#00523b] border-b border-[#00523b]/10 pb-1 uppercase tracking-wider ${isBigFont ? 'text-sm' : 'text-xs'}`}>
                      {group.categoryName}
                    </h5>
                    <div className="space-y-2">
                      {group.items.map(item => {
                        return (
                          <div key={item.productId} className={`flex justify-between items-center border-b border-gray-100 pb-1.5 ${isBigFont ? 'text-base' : 'text-xs'}`}>
                            <span className="font-bold text-[#394013]">{item.name}</span>
                            <div className="text-right font-black text-[#00523b] shrink-0">
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

      {/* Label Printer Modal */}
      <AnimatePresence>
        {printingPortion && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-gray-100 text-left"
            >
              {/* Header */}
              <div className="bg-[#00523b] text-[#fffbd8] px-5 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Printer size={20} />
                  <span className="font-extrabold text-base">XEM &amp; IN TEM DÁN HỘP 🏷️</span>
                </div>
                <button
                  onClick={() => setPrintingPortion(null)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white transition cursor-pointer animate-none"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 space-y-5">
                <div className="bg-amber-50 border-l-4 border-amber-500 p-3.5 rounded-r-xl text-xs text-amber-950 font-bold leading-relaxed space-y-1">
                  <div>📏 Kích thước tem: <strong className="text-amber-900">10cm x 3cm (100mm x 30mm)</strong></div>
                  <div>🖨️ Thiết kế chuyên dụng độ tương phản cao cho máy in nhiệt mini đen trắng của Mẹ!</div>
                </div>

                {/* Simulated 10x3 cm Label Preview on Screen */}
                <div className="space-y-1.5">
                  <span className="text-xs font-black text-gray-500 block uppercase tracking-wider">
                    👁️ XEM TRƯỚC MẪU TEM THỰC TẾ (10cm x 3cm):
                  </span>
                  
                  {/* Outer container mimicking the scale ratio 10:3 */}
                  <div className="border-2 border-dashed border-gray-400 p-2 bg-gray-100 rounded-xl flex items-center justify-center">
                    <div className="bg-white border border-black text-black w-full max-w-[500px] aspect-[10/3] p-2.5 flex justify-between items-center select-none shadow-sm relative overflow-hidden">
                      {/* Left Side (70%) */}
                      <div className="w-[68%] h-full flex flex-col justify-between text-[11px] leading-tight text-left">
                        <div className="font-black border-b border-black pb-0.5 mb-1 uppercase tracking-tight text-[10px] truncate text-emerald-900">
                          PAPIMEAL - DINH DƯỠNG MỖI NGÀY 🍱
                        </div>
                        <div className="font-bold text-[10px]">
                          <strong>KH:</strong> {printingPortion.order.customerName} - {printingPortion.order.phone}
                        </div>
                        {printingPortion.order.address && (
                          <div className="text-[9px] text-gray-700 truncate" title={printingPortion.order.address}>
                            <strong>ĐC:</strong> {printingPortion.order.address}
                          </div>
                        )}
                        <div className="font-semibold text-[9.5px] line-clamp-1 text-gray-800">
                          <strong>Món:</strong> {printingPortion.items.map(it => `${it.name} (x${it.qty})`).join(", ")}
                        </div>
                        {printingPortion.order.notes && (
                          <div className="bg-black text-white text-[8.5px] font-black px-1 py-0.5 rounded uppercase tracking-wide truncate">
                            ⚠️ CHÚ Ý: {printingPortion.order.notes}
                          </div>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="w-0 border-l border-dashed border-black h-full mx-1"></div>

                      {/* Right Side (30%) */}
                      <div className="w-[28%] h-full flex flex-col justify-between items-center text-center">
                        <div className="bg-black text-white text-[9px] font-black px-1.5 py-0.5 rounded w-full truncate text-center">
                          {printingPortion.order.id}
                        </div>
                        <div className="font-black text-[13px] border-b border-black pb-0.5 w-full text-center">
                          HỘP {printingPortion.portionIdx + 1}/{printingPortion.order.portionsCount}
                        </div>
                        <div className="font-black text-[10px] text-red-600 truncate">
                          HẸN: {printingPortion.order.receiveTime}
                        </div>
                        <div className="text-[8px] font-black border border-black px-1 rounded w-full truncate text-center uppercase">
                          {printingPortion.order.deliveryMethod === 'Giao hàng' ? '🛵 GIAO' : '🏪 LẤY'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instructions / Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => printPortionLabel(printingPortion.order, printingPortion.portionIdx, printingPortion.items)}
                    className="py-3.5 px-4 bg-[#00523b] hover:bg-[#004230] text-[#fffbd8] font-black rounded-xl shadow transition duration-150 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Printer size={18} /> IN TRỰC TIẾP LÊN MÁY 🖨️
                  </button>

                  <button
                    onClick={() => downloadPortionLabelImage(printingPortion.order, printingPortion.portionIdx, printingPortion.items)}
                    className="py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow transition duration-150 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Download size={18} /> TẢI ẢNH TEM ĐỂ IN 💾
                  </button>
                </div>

                <div className="text-[11px] text-gray-500 leading-relaxed font-semibold bg-gray-50 p-3 rounded-xl border border-gray-100">
                  💡 <strong>Hướng dẫn cho Mẹ:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    <li>Bấm <strong className="text-[#00523b]">IN TRỰC TIẾP</strong> để mở bảng in của điện thoại và nhấn in ngay.</li>
                    <li>Hoặc bấm <strong className="text-amber-600">TẢI ẢNH TEM</strong> để lưu ảnh sắc nét vào máy, sau đó dùng ứng dụng máy in tem (như Xprinter, dymo, bluetooth print...) mở ảnh này lên và bấm in là đẹp nhất!</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-5 py-3.5 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setPrintingPortion(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-extrabold rounded-xl text-xs transition cursor-pointer animate-none"
                >
                  ĐÓNG LẠI
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
