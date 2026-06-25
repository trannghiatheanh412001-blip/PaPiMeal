import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  MapPin, 
  ShoppingBag, 
  FileText, 
  Plus, 
  Minus, 
  ArrowRight, 
  ChevronRight, 
  Check, 
  Info, 
  ArrowLeft,
  X,
  Sparkles,
  ChevronUp
} from "lucide-react";
import { Product, Category, PortionItem, Order } from "../types";
import { 
  loadProducts, 
  loadCategories, 
  getEarliestOrderDate, 
  generateOrderCode, 
  addStatusLog, 
  loadOrders, 
  saveOrders
} from "../utils/storage";
import { sendToGoogleSheets } from "../utils/googleSheets";
import { loadTextConfig } from "../utils/textConfig";

interface CustomerFlowProps {
  onBackToHome: () => void;
  onOrderSuccess: (orderId: string) => void;
  triggerRefresh: () => void;
}

export default function CustomerFlow({ onBackToHome, onOrderSuccess, triggerRefresh }: CustomerFlowProps) {
  // Products & Categories
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cutoffInfo, setCutoffInfo] = useState(() => getEarliestOrderDate());
  const [textConfig, setTextConfig] = useState(() => loadTextConfig());

  // Step state: 'init' | 'form' | 'menu' | 'confirm' | 'success'
  const [step, setStep] = useState<'init' | 'form' | 'menu' | 'confirm'>('init');

  // Customer Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [receiveDate, setReceiveDate] = useState("");
  const [receiveTime, setReceiveTime] = useState("11:30");
  const [deliveryMethod, setDeliveryMethod] = useState<"Ghé lấy" | "Giao hàng">("Ghé lấy");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [portionsCount, setPortionsCount] = useState(1);

  // Warning & Animation state for Cutoff Rule
  const [dateWarning, setDateWarning] = useState("");
  const [shouldVibrate, setShouldVibrate] = useState(false);

  // Selection menu state
  const [currentPortionIndex, setCurrentPortionIndex] = useState(0);
  // portions[portionIndex] = list of PortionItems selected
  const [portionsSelections, setPortionsSelections] = useState<PortionItem[][]>([]);
  const [applyPortion1ToAll, setApplyPortion1ToAll] = useState(false);
  const [showCartPreview, setShowCartPreview] = useState(false);

  // Success state
  const [createdOrderId, setCreatedOrderId] = useState("");

  // Load initial data
  useEffect(() => {
    setProducts(loadProducts().filter(p => p.status === "Đang bán"));
    setCategories(loadCategories());
    const info = getEarliestOrderDate();
    setCutoffInfo(info);
    setReceiveDate(info.minDate);
    setTextConfig(loadTextConfig());
  }, []);

  // Handle Delivery Date validation (Micro-interaction)
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.value;
    setReceiveDate(selected);

    // Get today's and tomorrow's date strings
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // If selected is tomorrow, check if current hour >= 14:00 (cutoff passed)
    if (selected === tomorrowStr && today.getHours() >= 14) {
      setShouldVibrate(true);
      setDateWarning(`⚠️ Đã sau 14:00 chiều hôm nay, bếp đã khóa sổ ngày mai để đi chợ. Vui lòng chọn từ ngày ${cutoffInfo.minDate} nhé ạ!`);
      // Vibrate phone using navigator if available
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }
      setTimeout(() => setShouldVibrate(false), 500);
    } else if (selected < cutoffInfo.minDate) {
      setShouldVibrate(true);
      setDateWarning(`⚠️ Ngày nhận sớm nhất có thể đặt là ngày ${cutoffInfo.minDate}.`);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(200);
      }
      setTimeout(() => setShouldVibrate(false), 500);
    } else {
      setDateWarning("");
    }
  };

  // Stepper helper
  const updatePortionsCount = (delta: number) => {
    setPortionsCount(prev => Math.max(1, prev + delta));
  };

  const handleStartOrder = () => {
    setStep('form');
  };

  const handleProceedToMenu = () => {
    if (!name.trim()) {
      alert("Vui lòng điền họ và tên của bạn!");
      return;
    }
    if (!phone.trim()) {
      alert("Vui lòng nhập số điện thoại liên hệ!");
      return;
    }
    if (deliveryMethod === "Giao hàng" && !address.trim()) {
      alert("Vui lòng nhập địa chỉ giao hàng!");
      return;
    }
    if (dateWarning) {
      alert("Vui lòng chọn ngày giao hợp lệ trước khi tiếp tục!");
      return;
    }

    // Initialize portions selections array with empty arrays
    setPortionsSelections(Array.from({ length: portionsCount }, () => []));
    setCurrentPortionIndex(0);
    setApplyPortion1ToAll(false);
    setStep('menu');
  };

  // Change quantity of a product in the current portion
  const handleQuantityChange = (productId: string, productName: string, price: number, delta: number) => {
    setPortionsSelections(prev => {
      const updated = [...prev];
      const currentPortion = [...updated[currentPortionIndex]];
      const existingItemIndex = currentPortion.findIndex(item => item.id === productId);

      if (existingItemIndex > -1) {
        const item = currentPortion[existingItemIndex];
        const newQty = Math.max(0, item.qty + delta);
        if (newQty === 0) {
          currentPortion.splice(existingItemIndex, 1);
        } else {
          currentPortion[existingItemIndex] = { ...item, qty: newQty };
        }
      } else if (delta > 0) {
        currentPortion.push({ id: productId, name: productName, price, qty: 1 });
      }

      updated[currentPortionIndex] = currentPortion;
      return updated;
    });
  };

  // Get current quantity of a product in current portion
  const getProductQty = (productId: string) => {
    const currentPortion = portionsSelections[currentPortionIndex] || [];
    const item = currentPortion.find(it => it.id === productId);
    return item ? item.qty : 0;
  };

  // Calculate current portion totals
  const getCurrentPortionStats = () => {
    const currentPortion = portionsSelections[currentPortionIndex] || [];
    const totalItems = currentPortion.reduce((acc, item) => acc + item.qty, 0);
    const totalAmount = currentPortion.reduce((acc, item) => acc + item.qty * item.price, 0);
    return { totalItems, totalAmount };
  };

  // Navigate portion pages
  const handleNextPortion = () => {
    const currentPortion = portionsSelections[currentPortionIndex] || [];
    if (currentPortion.length === 0) {
      alert(`Khẩu phần ${currentPortionIndex + 1} chưa có món ăn nào. Vui lòng chọn ít nhất 1 món!`);
      return;
    }

    // "Lazy copy" feature - copy portion 1 to all if checked
    if (currentPortionIndex === 0 && portionsCount > 1 && applyPortion1ToAll) {
      const firstPortionCopy = JSON.parse(JSON.stringify(portionsSelections[0]));
      const updated = Array.from({ length: portionsCount }, () => JSON.parse(JSON.stringify(firstPortionCopy)));
      setPortionsSelections(updated);
      setStep('confirm');
      return;
    }

    if (currentPortionIndex < portionsCount - 1) {
      setCurrentPortionIndex(prev => prev + 1);
    } else {
      setStep('confirm');
    }
  };

  const handlePrevPortion = () => {
    if (currentPortionIndex > 0) {
      setCurrentPortionIndex(prev => prev - 1);
    } else {
      setStep('form');
    }
  };

  // Submit Final Order
  const handlePlaceOrder = () => {
    const grandTotal = portionsSelections.reduce((sum, portion) => {
      return sum + portion.reduce((portionSum, item) => portionSum + item.qty * item.price, 0);
    }, 0);

    const orderId = generateOrderCode(phone);
    const orderTime = new Date().toLocaleTimeString("vi-VN", { hour12: false });
    const orderDate = new Date().toISOString().split('T')[0];

    const hourStr = receiveTime.split(":")[0];
    const hourVal = parseInt(hourStr) || 12;
    const session: "Sáng" | "Trưa" | "Chiều" = hourVal < 11 ? "Sáng" : (hourVal < 13 ? "Trưa" : "Chiều");

    const newOrder: Order = {
      id: orderId,
      createdAt: orderDate,
      createdTime: orderTime,
      customerName: name,
      phone,
      receiveDate,
      receiveTime,
      session,
      deliveryMethod,
      address: deliveryMethod === "Giao hàng" ? address : "",
      notes,
      status: "Chờ xử lý",
      portionsCount,
      portions: portionsSelections,
      totalAmount: grandTotal
    };

    // Save order
    const orders = loadOrders();
    orders.push(newOrder);
    saveOrders(orders);

    // Send order to Google Sheets
    sendToGoogleSheets("NEW_ORDER", newOrder);

    // Save status log
    addStatusLog(orderId, "", "Chờ xử lý", "Khách hàng");
    triggerRefresh();

    // Call success
    onOrderSuccess(orderId);
  };

  const editPortion = (idx: number) => {
    setCurrentPortionIndex(idx);
    setStep('menu');
  };

  const currentPortionStats = getCurrentPortionStats();
  const grandTotal = portionsSelections.reduce((sum, portion) => {
    return sum + portion.reduce((portionSum, item) => portionSum + item.qty * item.price, 0);
  }, 0);

  return (
    <div className="w-full">
      {/* Intro Landing View */}
      {step === 'init' && (
        <div className="text-center py-6 px-4">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mb-8 flex flex-col items-center"
          >
            <div className="w-24 h-24 bg-[#00523b] rounded-full flex items-center justify-center mb-4 shadow-md text-[#fffbd8] font-bold text-4xl overflow-hidden shrink-0">
              {(textConfig.homeRoundLogo.startsWith("http") || textConfig.homeRoundLogo.startsWith("/") || textConfig.homeRoundLogo.startsWith("data:")) ? (
                <img 
                  src={textConfig.homeRoundLogo} 
                  alt="App Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{textConfig.homeRoundLogo}</span>
              )}
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-[#00523b] mb-2 font-sans">
              {textConfig.appName}
            </h2>
            <p className="text-sm text-[#394013]/80 italic font-medium max-w-sm">
              &ldquo;{textConfig.slogan}&rdquo;
            </p>
          </motion.div>

          {/* Value Props Grid */}
          <div className="grid grid-cols-1 gap-4 mb-8 text-left">
            <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm flex gap-3">
              <div className="text-2xl mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden">
                {(textConfig.valueProp1Icon.startsWith("http") || textConfig.valueProp1Icon.startsWith("/") || textConfig.valueProp1Icon.startsWith("data:")) ? (
                  <img src={textConfig.valueProp1Icon} className="w-full h-full object-contain" referrerPolicy="no-referrer" alt="icon" />
                ) : (
                  <span>{textConfig.valueProp1Icon}</span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-[#394013] text-sm">{textConfig.valueProp1Title}</h4>
                <p className="text-xs text-[#394013]/75 mt-0.5">{textConfig.valueProp1Desc}</p>
              </div>
            </div>
            <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm flex gap-3">
              <div className="text-2xl mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden">
                {(textConfig.valueProp2Icon.startsWith("http") || textConfig.valueProp2Icon.startsWith("/") || textConfig.valueProp2Icon.startsWith("data:")) ? (
                  <img src={textConfig.valueProp2Icon} className="w-full h-full object-contain" referrerPolicy="no-referrer" alt="icon" />
                ) : (
                  <span>{textConfig.valueProp2Icon}</span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-[#394013] text-sm">{textConfig.valueProp2Title}</h4>
                <p className="text-xs text-[#394013]/75 mt-0.5">{textConfig.valueProp2Desc}</p>
              </div>
            </div>
            <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm flex gap-3">
              <div className="text-2xl mt-0.5 shrink-0 w-8 h-8 flex items-center justify-center overflow-hidden">
                {(textConfig.valueProp3Icon.startsWith("http") || textConfig.valueProp3Icon.startsWith("/") || textConfig.valueProp3Icon.startsWith("data:")) ? (
                  <img src={textConfig.valueProp3Icon} className="w-full h-full object-contain" referrerPolicy="no-referrer" alt="icon" />
                ) : (
                  <span>{textConfig.valueProp3Icon}</span>
                )}
              </div>
              <div>
                <h4 className="font-bold text-[#394013] text-sm">{textConfig.valueProp3Title}</h4>
                <p className="text-xs text-[#394013]/75 mt-0.5">{textConfig.valueProp3Desc}</p>
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleStartOrder}
            className="w-full py-4 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer text-base"
          >
            {textConfig.startOrderBtn} <ArrowRight size={20} />
          </motion.button>

          <button
            onClick={onBackToHome}
            className="mt-4 text-xs font-semibold text-[#00523b] hover:underline cursor-pointer"
          >
            {textConfig.homeBackBtn}
          </button>
        </div>
      )}

      {/* Customer Form Info */}
      {step === 'form' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <button 
              onClick={() => setStep('init')}
              className="p-1 hover:bg-[#00523b]/10 rounded-full transition text-[#00523b] cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h3 className="text-base font-black text-[#00523b] font-sans leading-tight">{textConfig.step1Title}</h3>
              <p className="text-[10px] text-[#394013]/60 font-medium leading-normal mt-0.5">{textConfig.step1Sub}</p>
            </div>
          </div>

          <AnimatePresence>
            {dateWarning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#fcfef1] border border-red-200 text-red-700 p-3 rounded-xl text-xs flex gap-2 font-medium"
                style={{
                  animation: shouldVibrate ? 'vibrate 0.1s linear infinite' : 'none'
                }}
              >
                <Info size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span>{dateWarning}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3 bg-[#fcfef1] p-5 rounded-2xl border border-[#00523b]/10 shadow-sm">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold mb-1 flex items-center gap-1">
                <User size={14} className="text-[#00523b]" /> Họ tên người đặt <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                placeholder="Ví dụ: Nguyễn Văn A"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold mb-1 flex items-center gap-1">
                <Phone size={14} className="text-[#00523b]" /> Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input 
                type="tel" 
                placeholder="Ví dụ: 0901234567"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium"
              />
            </div>

            {/* Date & Time Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1 flex items-center gap-1">
                  <Calendar size={14} className="text-[#00523b]" /> Ngày nhận món <span className="text-red-500">*</span>
                </label>
                <input 
                  type="date" 
                  value={receiveDate}
                  onChange={handleDateChange}
                  className="w-full px-3 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 flex items-center gap-1">
                  <Clock size={14} className="text-[#00523b]" /> Giờ nhận món <span className="text-red-500">*</span>
                </label>
                <input 
                  type="time" 
                  value={receiveTime}
                  onChange={e => setReceiveTime(e.target.value)}
                  className="w-full px-3 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium cursor-pointer"
                />
              </div>
            </div>

            {/* Delivery Method Selector */}
            <div>
              <label className="block text-xs font-bold mb-1 flex items-center gap-1">
                <MapPin size={14} className="text-[#00523b]" /> Hình thức nhận món
              </label>
              <div className="grid grid-cols-2 gap-2 bg-[#00523b]/5 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("Ghé lấy")}
                  className={`py-2 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
                    deliveryMethod === "Ghé lấy" 
                      ? "bg-[#00523b] text-[#fffbd8] shadow" 
                      : "text-[#394013]/70 hover:text-[#394013]"
                  }`}
                >
                  🏫 Ghé lấy tại quán
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMethod("Giao hàng")}
                  className={`py-2 text-xs font-bold rounded-lg transition duration-200 cursor-pointer ${
                    deliveryMethod === "Giao hàng" 
                      ? "bg-[#00523b] text-[#fffbd8] shadow" 
                      : "text-[#394013]/70 hover:text-[#394013]"
                  }`}
                >
                  🛵 Giao tận nơi
                </button>
              </div>
            </div>

            {/* Shop Address Info Box (Slide down) */}
            <AnimatePresence>
              {deliveryMethod === "Ghé lấy" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#00523b]/5 border-l-3 border-[#00523b] p-3 rounded-r-xl text-xs overflow-hidden"
                >
                  <span className="font-bold text-[#00523b] block mb-0.5">📍 Địa chỉ bếp PaPiMeal:</span>
                  <p className="text-[#394013]/80 leading-relaxed font-medium">
                    {textConfig.shopAddress} <br />
                    📞 Điện thoại: <a href={`tel:${textConfig.shopPhone.replace(/\s/g, '')}`} className="font-bold underline hover:text-[#00523b]">{textConfig.shopPhone}</a>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Delivery Address Field (Slide down) */}
            <AnimatePresence>
              {deliveryMethod === "Giao hàng" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs font-bold mb-1 flex items-center gap-1 text-amber-800">
                    🏠 Địa chỉ giao hàng <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    placeholder="Số nhà, tên đường, tên tòa nhà văn phòng, số tầng..."
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium"
                  />
                  <p className="text-[10px] text-amber-700 font-medium mt-1">
                    * Bếp nhận giao hàng miễn phí trong bán kính 3km quanh khu vực Quận 8.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* General notes */}
            <div>
              <label className="block text-xs font-bold mb-1 flex items-center gap-1">
                <FileText size={14} className="text-[#00523b]" /> Ghi chú cho bếp
              </label>
              <textarea 
                placeholder="Ví dụ: Đồ ăn ít cay, mang cho mình trước 11h45..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium"
              />
            </div>

            {/* Stepper for portions */}
            <div className="pt-2 border-t border-dashed border-[#00523b]/10 flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold flex items-center gap-1">
                  <ShoppingBag size={14} className="text-[#00523b]" /> Đặt cho mấy người?
                </label>
                <span className="text-[10px] text-[#394013]/60 font-medium">Bóc tách riêng từng hộp cơm</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => updatePortionsCount(-1)}
                  disabled={portionsCount <= 1}
                  className="w-9 h-9 bg-white border border-[#00523b]/25 rounded-lg flex items-center justify-center font-bold text-lg hover:bg-gray-50 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Minus size={16} className="text-[#00523b]" />
                </button>
                <span className="font-bold text-lg text-[#00523b] w-4 text-center">{portionsCount}</span>
                <button
                  type="button"
                  onClick={() => updatePortionsCount(1)}
                  className="w-9 h-9 bg-white border border-[#00523b]/25 rounded-lg flex items-center justify-center font-bold text-lg hover:bg-gray-50 transition cursor-pointer"
                >
                  <Plus size={16} className="text-[#00523b]" />
                </button>
              </div>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleProceedToMenu}
            className="w-full py-4 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer text-base"
          >
            Tiếp tục chọn món 🍽️ <ArrowRight size={20} />
          </motion.button>
        </motion.div>
      )}

      {/* Choose Dishes Page */}
      {step === 'menu' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4 pb-20"
        >
          <div>
            <h3 className="text-base font-black text-[#00523b] font-sans leading-tight">{textConfig.step2Title}</h3>
            <p className="text-[10px] text-[#394013]/60 font-medium leading-normal mt-0.5">{textConfig.step2Sub}</p>
          </div>

          {/* Progress Header */}
          <div className="bg-[#00523b] text-[#fffbd8] px-4 py-3 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider opacity-80 font-bold">Thanh Tiến Trình Đặt Món</span>
              <span className="text-sm font-bold">
                Đang chọn món cho: Khẩu phần số {currentPortionIndex + 1} / {portionsCount}
              </span>
            </div>
            <span className="text-xs font-bold bg-[#fffbd8] text-[#00523b] px-2.5 py-1 rounded-full shadow-inner">
              Phần {currentPortionIndex + 1}/{portionsCount}
            </span>
          </div>

          {/* Lazy Copy Checkbox (Shown only on first portion if portions count > 1) */}
          {currentPortionIndex === 0 && portionsCount > 1 && (
            <div className="bg-[#fcfef1] p-3.5 rounded-xl border border-dashed border-[#00523b]/30 flex items-center gap-3">
              <input 
                type="checkbox" 
                id="copy-portion"
                checked={applyPortion1ToAll}
                onChange={e => setApplyPortion1ToAll(e.target.checked)}
                className="w-4 h-4 accent-[#00523b] cursor-pointer"
              />
              <label htmlFor="copy-portion" className="text-xs font-bold text-[#394013] cursor-pointer select-none">
                🚀 Áp dụng giống Khẩu phần 1 cho tất cả phần còn lại
              </label>
            </div>
          )}

          {/* List of Products */}
          <div className="space-y-6">
            {categories.map(cat => {
              const catProducts = products.filter(p => p.category === cat.id);
              if (catProducts.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-2.5">
                  <h4 className="text-xs font-bold text-[#00523b] uppercase tracking-wider border-b border-[#00523b]/10 pb-1 flex items-center gap-1.5">
                    <span>{cat.name}</span>
                  </h4>
                  <div className="space-y-3">
                    {catProducts.map(product => {
                      const qtySelected = getProductQty(product.id);
                      
                      return (
                        <motion.div 
                          key={product.id}
                          className="bg-[#fcfef1] p-3 rounded-xl border border-[#00523b]/5 shadow-sm flex gap-3 items-center justify-between relative"
                        >
                          {/* Image Box */}
                          <div className="relative shrink-0">
                            {product.image ? (
                              <img 
                                src={product.image} 
                                alt={product.name}
                                className="w-16 h-16 rounded-xl object-cover border border-[#00523b]/10 bg-[#00523b]/5"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-[#00523b]/5 border border-[#00523b]/10 flex items-center justify-center text-2xl">
                                🍱
                              </div>
                            )}
                          </div>

                          {/* Info Box */}
                          <div className="flex-1 min-w-0 pr-2">
                            <h5 className="font-bold text-sm text-[#394013] truncate" title={product.name}>
                              {product.name}
                            </h5>
                            <p className="text-[10px] text-[#394013]/60 font-medium truncate mt-0.5">
                              {product.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs font-bold text-[#00523b]">
                                {product.price.toLocaleString("vi-VN")}đ
                              </span>
                              {product.oldPrice > 0 && (
                                <span className="text-[10px] text-[#394013]/50 line-through">
                                  {product.oldPrice.toLocaleString("vi-VN")}đ
                                </span>
                              )}
                              <span className="text-[9px] bg-[#00523b]/10 text-[#00523b] px-1.5 py-0.5 rounded font-bold">
                                {product.weight}{product.unit}
                              </span>
                            </div>
                          </div>

                          {/* Quantity Selector with animation on click */}
                          <div className="flex items-center gap-2 shadow-sm border border-[#00523b]/10 p-1 bg-white rounded-lg self-center">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(product.id, product.name, product.price, -1)}
                              disabled={qtySelected === 0}
                              className="w-7 h-7 bg-[#fffbd8]/10 disabled:opacity-30 flex items-center justify-center rounded transition hover:bg-gray-100 cursor-pointer text-[#00523b]"
                            >
                              <Minus size={13} strokeWidth={2.5} />
                            </button>
                            
                            <AnimatePresence mode="wait">
                              <motion.span 
                                key={qtySelected}
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.1 }}
                                className="font-bold text-sm text-[#00523b] min-w-[14px] text-center"
                              >
                                {qtySelected}
                              </motion.span>
                            </AnimatePresence>

                            <button
                              type="button"
                              onClick={() => handleQuantityChange(product.id, product.name, product.price, 1)}
                              className="w-7 h-7 bg-[#00523b]/5 hover:bg-[#00523b]/15 flex items-center justify-center rounded transition cursor-pointer text-[#00523b]"
                            >
                              <Plus size={13} strokeWidth={2.5} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Cart & Action controls */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#fffbd8] via-[#fffbd8] to-[#fffbd8]/0 border-t-0 z-50">
            <div className="max-w-md mx-auto space-y-2">
              {/* Bottom bar inside sticky */}
              <div className="flex gap-2">
                <button
                  onClick={handlePrevPortion}
                  className="px-4 bg-white border border-[#00523b]/30 text-[#00523b] rounded-xl flex items-center justify-center hover:bg-gray-50 transition cursor-pointer font-bold text-sm"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleNextPortion}
                  className="flex-1 py-3.5 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer text-sm"
                >
                  {currentPortionIndex === portionsCount - 1 ? (
                    <>Xác nhận đơn hàng <Check size={18} /></>
                  ) : (
                    <>Khẩu phần tiếp theo <ChevronRight size={18} /></>
                  )}
                </button>
              </div>

              {/* FLOATING CART BAR */}
              <motion.div
                whileHover={{ y: -2 }}
                onClick={() => setShowCartPreview(true)}
                className="bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] p-3 px-4 rounded-xl flex items-center justify-between shadow-lg cursor-pointer transition text-xs font-bold"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag size={15} />
                  <span>
                    Khẩu phần {currentPortionIndex + 1}: {currentPortionStats.totalItems} món - {currentPortionStats.totalAmount.toLocaleString("vi-VN")}đ
                  </span>
                </div>
                <span className="flex items-center gap-0.5 text-[10px] uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">
                  Chi tiết <ChevronUp size={12} />
                </span>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Confirmation invoice receipt */}
      {step === 'confirm' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="border-b border-[#00523b]/10 pb-2">
            <h3 className="text-lg font-black text-[#00523b] font-sans leading-tight">
              {textConfig.confirmTitle}
            </h3>
            <p className="text-[10px] text-[#394013]/60 font-medium mt-0.5">
              {textConfig.confirmSub}
            </p>
          </div>

          <div className="bg-[#fcfef1] p-4 rounded-2xl border border-[#00523b]/15 shadow-sm space-y-3">
            {/* General Order Info summary */}
            <div className="grid grid-cols-2 gap-2 text-xs border-b border-dashed border-[#00523b]/15 pb-3">
              <div>
                <span className="text-[#394013]/60">Khách hàng:</span>
                <p className="font-bold text-[#394013]">{name}</p>
              </div>
              <div>
                <span className="text-[#394013]/60">Số điện thoại:</span>
                <p className="font-bold text-[#394013]">{phone}</p>
              </div>
              <div>
                <span className="text-[#394013]/60">Ngày nhận món:</span>
                <p className="font-bold text-[#394013]">{receiveDate.split('-').reverse().join('/')}</p>
              </div>
              <div>
                <span className="text-[#394013]/60">Giờ &amp; Hình thức:</span>
                <p className="font-bold text-[#394013]">{receiveTime} - {deliveryMethod}</p>
              </div>
              {deliveryMethod === "Giao hàng" && (
                <div className="col-span-2 mt-1 bg-amber-50 p-2 rounded-lg text-[11px]">
                  <span className="text-amber-800 font-bold">🏠 Địa chỉ giao hàng:</span>
                  <p className="text-amber-900 font-medium">{address}</p>
                </div>
              )}
              {notes && (
                <div className="col-span-2 mt-1">
                  <span className="text-[#394013]/60">Ghi chú:</span>
                  <p className="text-[#394013]/80 italic font-medium">&ldquo;{notes}&rdquo;</p>
                </div>
              )}
            </div>

            {/* List of portions - Dashed border for group splitting */}
            <div className="space-y-3.5">
              {portionsSelections.map((portionItems, idx) => {
                const portionTotal = portionItems.reduce((acc, item) => acc + item.qty * item.price, 0);

                return (
                  <div 
                    key={idx}
                    className="border-2 border-dashed border-[#00523b]/20 p-3.5 rounded-xl bg-white space-y-2 relative"
                  >
                    <div className="flex justify-between items-center pb-1.5 border-b border-[#00523b]/5">
                      <span className="font-bold text-xs text-[#00523b] flex items-center gap-1">
                        📦 Khẩu phần {idx + 1}
                      </span>
                      <button
                        onClick={() => editPortion(idx)}
                        className="text-[10px] font-bold text-[#00523b] hover:underline flex items-center gap-0.5 bg-[#00523b]/5 px-2 py-0.5 rounded-md cursor-pointer"
                      >
                        Sửa món ✏️
                      </button>
                    </div>

                    <div className="space-y-1">
                      {portionItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="text-[#394013]/85 font-medium">
                            {item.name} <span className="font-bold text-[#00523b]">x{item.qty}</span>
                          </span>
                          <span className="font-bold text-[#394013]">
                            {(item.qty * item.price).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-dotted border-[#00523b]/10 flex justify-between text-xs font-bold text-[#00523b]">
                      <span>Cộng phần này:</span>
                      <span>{portionTotal.toLocaleString("vi-VN")}đ</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total summary info */}
            <div className="pt-3 border-t border-[#00523b]/20 flex justify-between items-center text-base font-extrabold text-[#00523b]">
              <span>TỔNG ĐƠN HÀNG ({portionsCount} phần):</span>
              <span className="text-xl">{grandTotal.toLocaleString("vi-VN")}đ</span>
            </div>
          </div>

          <div className="space-y-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handlePlaceOrder}
              className="w-full py-4 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-xl shadow-md transition duration-200 flex items-center justify-center gap-2 cursor-pointer text-base"
            >
              Gửi Đơn Đặt Hàng 🚀
            </motion.button>
            <button
              onClick={() => setStep('menu')}
              className="w-full py-3 bg-white border border-[#00523b]/30 text-[#00523b] font-bold rounded-xl hover:bg-gray-50 transition cursor-pointer text-sm"
            >
              ⬅ Quay lại chọn món
            </button>
          </div>
        </motion.div>
      )}

      {/* CART DETAIL PREVIEW MODAL */}
      <AnimatePresence>
        {showCartPreview && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-0">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-white rounded-t-3xl max-h-[70vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 bg-[#00523b] text-[#fffbd8] flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-2">
                  <ShoppingBag size={18} /> Chi tiết Khẩu phần {currentPortionIndex + 1}
                </span>
                <button
                  onClick={() => setShowCartPreview(false)}
                  className="p-1 hover:bg-white/10 rounded-full transition text-[#fffbd8] cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fffbd8]/10">
                {(portionsSelections[currentPortionIndex] || []).length === 0 ? (
                  <p className="text-center text-xs text-[#394013]/60 py-10 font-medium">
                    Bạn chưa chọn món nào cho phần ăn này.
                  </p>
                ) : (
                  (portionsSelections[currentPortionIndex] || []).map(item => (
                    <div 
                      key={item.id} 
                      className="bg-white p-3 rounded-xl border border-[#00523b]/5 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold text-sm text-[#394013] block">{item.name}</span>
                        <span className="text-xs text-[#394013]/70 font-semibold mt-1 block">
                          Số lượng: <span className="text-[#00523b] font-bold">{item.qty}</span> x {item.price.toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                      <span className="font-extrabold text-sm text-[#00523b]">
                        {(item.qty * item.price).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs font-bold text-[#394013]">Tổng phần {currentPortionIndex + 1}:</span>
                <span className="text-base font-extrabold text-[#00523b]">
                  {currentPortionStats.totalAmount.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
