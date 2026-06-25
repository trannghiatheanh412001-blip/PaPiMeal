import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, MapPin, Phone, Calendar, Clock, ShoppingBag, ChevronDown, ChevronUp } from "lucide-react";
import { Order, PortionItem } from "../types";
import { loadOrders, SHOP_ADDRESS, SHOP_PHONE, STATUS_FLOW, STATUS_CANCEL } from "../utils/storage";

interface OrderTrackingProps {
  onBackToHome: () => void;
}

export default function OrderTracking({ onBackToHome }: OrderTrackingProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [foundOrders, setFoundOrders] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    const allOrders = loadOrders();
    
    // Search by exact phone number or exact order code (case insensitive)
    const matches = allOrders.filter(o => 
      o.phone.includes(query) || 
      o.id.toLowerCase().includes(query) ||
      o.customerName.toLowerCase().includes(query)
    );

    // Sort: Canceled and Completed last, others first (newest created first)
    const sorted = [...matches].sort((a, b) => {
      const aDone = ["Hoàn tất", STATUS_CANCEL].includes(a.status);
      const bDone = ["Hoàn tất", STATUS_CANCEL].includes(b.status);
      if (aDone !== bDone) return aDone ? 1 : -1; // non-finished first

      // Sort by creation datetime
      const datetimeA = `${a.createdAt} ${a.createdTime}`;
      const datetimeB = `${b.createdAt} ${b.createdTime}`;
      return datetimeB.localeCompare(datetimeA);
    });

    setFoundOrders(sorted);
    setHasSearched(true);
    setExpandedOrderId(null);
  };

  const toggleOrderExpand = (id: string) => {
    setExpandedOrderId(prev => (prev === id ? null : id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Hoàn tất": return "bg-[#00523b] text-white";
      case "Đã Hủy": return "bg-red-600 text-white";
      case "Chờ xử lý": return "bg-gray-400 text-white";
      case "Đang chế biến": return "bg-amber-500 text-white animate-pulse";
      case "Bếp đã chuẩn bị xong": return "bg-teal-500 text-white";
      case "Chờ nhận hàng/giao hàng": return "bg-blue-500 text-white";
      default: return "bg-[#00523b]/20 text-[#394013]";
    }
  };

  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <h3 className="text-xl font-bold text-[#00523b] font-sans">🔍 Tra Cứu Tiến Độ Đơn Hàng</h3>
        <p className="text-xs text-[#394013]/70 font-medium mt-1">
          Nhập số điện thoại hoặc mã đơn hàng của bạn để kiểm tra trực quan
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input 
            type="text"
            placeholder="Số điện thoại hoặc Mã đơn (PPM...)"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium shadow-sm"
          />
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#394013]/45" />
        </div>
        <button
          type="submit"
          className="px-5 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-xl shadow transition duration-200 cursor-pointer text-sm"
        >
          Tra Cứu
        </button>
      </form>

      {/* Results Section */}
      <div className="space-y-4">
        {hasSearched ? (
          foundOrders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#fcfef1] p-8 rounded-2xl border border-amber-200 text-center text-sm text-[#394013]/60 font-medium"
            >
              😞 Không tìm thấy đơn hàng nào khớp với thông tin của bạn.
              <p className="text-xs text-[#394013]/40 mt-1">Vui lòng thử lại với số điện thoại đặt món.</p>
            </motion.div>
          ) : (
            foundOrders.map(order => {
              const currentStatusIndex = STATUS_FLOW.indexOf(order.status);
              const isCanceled = order.status === STATUS_CANCEL;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#fcfef1] p-5 rounded-2xl border border-[#00523b]/10 shadow-sm space-y-4"
                >
                  {/* Header: Order ID and Status badge */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] bg-[#00523b]/10 text-[#00523b] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Mã đơn hàng
                      </span>
                      <h4 className="text-base font-extrabold text-[#00523b] mt-0.5">{order.id}</h4>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow-sm ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Customer summary */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-b border-dashed border-[#00523b]/10 pb-3">
                    <div className="flex items-center gap-1.5 text-[#394013]/70 font-medium">
                      <ShoppingBag size={14} className="text-[#00523b]" />
                      <span>{order.customerName} - {order.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#394013]/70 font-medium justify-end">
                      <span className="font-extrabold text-[#00523b]">{order.totalAmount.toLocaleString("vi-VN")}đ</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#394013]/70 font-medium">
                      <Calendar size={14} className="text-[#00523b]" />
                      <span>{order.receiveDate.split('-').reverse().join('/')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#394013]/70 font-medium justify-end">
                      <Clock size={14} className="text-[#00523b]" />
                      <span>{order.receiveTime} ({order.deliveryMethod})</span>
                    </div>
                  </div>

                  {/* Pickup address notice */}
                  {order.deliveryMethod === "Ghé lấy" && (
                    <div className="bg-[#00523b]/5 border-l-3 border-[#00523b] p-3 rounded-r-xl text-xs space-y-0.5">
                      <span className="font-bold text-[#00523b] flex items-center gap-1">📍 Địa chỉ nhận món:</span>
                      <p className="text-[#394013]/85 font-medium">{SHOP_ADDRESS}</p>
                      <span className="text-[10px] text-[#394013]/60 font-semibold block pt-0.5">
                        Hotline Bếp: <a href={`tel:${SHOP_PHONE.replace(/\s/g, '')}`} className="font-bold underline text-[#00523b]">{SHOP_PHONE}</a>
                      </span>
                    </div>
                  )}

                  {/* Delivery address notice */}
                  {order.deliveryMethod === "Giao hàng" && order.address && (
                    <div className="bg-amber-50 border-l-3 border-amber-600 p-3 rounded-r-xl text-xs space-y-0.5">
                      <span className="font-bold text-amber-800 flex items-center gap-1">🛵 Địa chỉ giao hàng:</span>
                      <p className="text-amber-900 font-medium leading-relaxed">{order.address}</p>
                    </div>
                  )}

                  {/* Progress Timeline Graphic */}
                  {!isCanceled ? (
                    <div className="py-2">
                      <span className="text-[10px] text-[#394013]/50 font-bold uppercase tracking-wider block mb-3">
                        Tiến trình thực hiện (Realtime)
                      </span>
                      <div className="relative flex justify-between items-start pl-2 pr-2">
                        {/* Connecting Line */}
                        <div className="absolute left-6 right-6 top-3 h-0.5 bg-gray-200 -z-1" />
                        
                        {/* Completed progress line overlay */}
                        {currentStatusIndex > 0 && (
                          <div 
                            className="absolute left-6 top-3 h-0.5 bg-[#00523b] transition-all duration-500 -z-1" 
                            style={{ 
                              width: `${(currentStatusIndex / (STATUS_FLOW.length - 1)) * 90}%` 
                            }}
                          />
                        )}

                        {STATUS_FLOW.map((stepName, sIdx) => {
                          const isCompleted = sIdx < currentStatusIndex;
                          const isCurrent = sIdx === currentStatusIndex;
                          const isFuture = sIdx > currentStatusIndex;

                          return (
                            <div key={stepName} className="flex flex-col items-center flex-1 text-center relative z-10">
                              {/* Step circle */}
                              <motion.div 
                                animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                                transition={isCurrent ? { repeat: Infinity, duration: 2 } : {}}
                                className={`w-6.5 h-6.5 rounded-full flex items-center justify-center border-2 text-[10px] font-bold transition duration-300 ${
                                  isCompleted 
                                    ? "bg-[#00523b] border-[#00523b] text-[#fffbd8]" 
                                    : isCurrent 
                                      ? "bg-[#00523b] border-[#00523b] text-[#fffbd8] ring-4 ring-[#00523b]/20 shadow" 
                                      : "bg-white border-gray-300 text-gray-400"
                                }`}
                              >
                                {isCompleted ? "✓" : sIdx + 1}
                              </motion.div>
                              <span className={`text-[8.5px] font-bold leading-tight mt-1.5 max-w-[65px] mx-auto block ${
                                isCurrent 
                                  ? "text-[#00523b] font-extrabold" 
                                  : isCompleted 
                                    ? "text-[#394013]/80" 
                                    : "text-gray-400"
                              }`}>
                                {stepName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-xs font-semibold text-red-700">
                      🔴 Đơn hàng này đã bị hủy. Vui lòng liên hệ hotline {SHOP_PHONE} để được hỗ trợ chi tiết.
                    </div>
                  )}

                  {/* Portions Expand details toggle button */}
                  <div>
                    <button
                      onClick={() => toggleOrderExpand(order.id)}
                      className="w-full py-2 bg-[#00523b]/5 hover:bg-[#00523b]/10 rounded-xl flex items-center justify-center gap-1 text-xs font-bold text-[#00523b] transition cursor-pointer"
                    >
                      {expandedOrderId === order.id ? (
                        <>Ẩn chi tiết khẩu phần <ChevronUp size={14} /></>
                      ) : (
                        <>Xem chi tiết khẩu phần ăn ({order.portionsCount}) <ChevronDown size={14} /></>
                      )}
                    </button>

                    {/* Detailed portions content drawer */}
                    <AnimatePresence>
                      {expandedOrderId === order.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden mt-3 space-y-3 pt-1 border-t border-[#00523b]/5"
                        >
                          {order.portions.map((portion, pIdx) => {
                            const portTotal = portion.reduce((s, it) => s + it.qty * it.price, 0);
                            return (
                              <div key={pIdx} className="bg-white p-3 rounded-xl border border-[#00523b]/10 space-y-1.5">
                                <span className="font-extrabold text-xs text-[#00523b] block">
                                  📦 Khẩu phần {pIdx + 1}
                                </span>
                                <div className="space-y-1">
                                  {portion.map(item => (
                                    <div key={item.id} className="flex justify-between text-xs">
                                      <span className="text-[#394013]/80 font-medium">
                                        {item.name} <span className="font-bold text-[#00523b]">x{item.qty}</span>
                                      </span>
                                      <span className="font-bold text-[#394013]">
                                        {(item.qty * item.price).toLocaleString("vi-VN")}đ
                                      </span>
                                    </div>
                                  ))}
                                </div>
                                <div className="pt-1.5 border-t border-dotted border-[#00523b]/10 flex justify-between text-xs font-bold text-[#00523b]">
                                  <span>Cộng phần này:</span>
                                  <span>{portTotal.toLocaleString("vi-VN")}đ</span>
                                </div>
                              </div>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )
        ) : (
          <div className="text-center py-6 text-xs text-[#394013]/55 font-medium">
            💡 Gợi ý: Hãy thử tìm kiếm số điện thoại của bạn để xem tất cả các đơn hàng đã đặt!
          </div>
        )}
      </div>

      <div className="pt-4 text-center">
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
