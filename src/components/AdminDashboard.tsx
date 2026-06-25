import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ShieldCheck, 
  LogOut, 
  Plus, 
  ListOrdered, 
  ShoppingBag, 
  Trash2, 
  Check, 
  X, 
  Edit2, 
  Search, 
  Filter, 
  TrendingUp, 
  User, 
  Phone, 
  Calendar, 
  Clock, 
  MapPin, 
  DollarSign, 
  Package,
  ArrowRight,
  ChevronDown,
  Info
} from "lucide-react";
import { Product, Category, Order } from "../types";
import { 
  loadProducts, 
  saveProducts, 
  loadCategories, 
  saveCategories, 
  loadOrders, 
  saveOrders, 
  addStatusLog, 
  ACCOUNTS, 
  SHOP_ADDRESS, 
  STATUS_FLOW, 
  STATUS_CANCEL 
} from "../utils/storage";
import { sendToGoogleSheets, getGoogleSheetsUrl, saveGoogleSheetsUrl, APPS_SCRIPT_TEMPLATE } from "../utils/googleSheets";

interface AdminDashboardProps {
  onBackToHome: () => void;
  orders: Order[];
  triggerRefresh: () => void;
}

export default function AdminDashboard({ onBackToHome, orders, triggerRefresh }: AdminDashboardProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Subtab navigation: 'products' | 'add' | 'orders' | 'production' | 'sheets'
  const [activeTab, setActiveTab] = useState<'products' | 'add' | 'orders' | 'production' | 'sheets'>('products');

  // Google Sheets state
  const [sheetUrl, setSheetUrl] = useState(() => getGoogleSheetsUrl());
  const [copied, setCopied] = useState(false);

  // Product List states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Add Product Form State
  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCost, setNewCost] = useState(0);
  const [newFee, setNewFee] = useState(0);
  const [newPrice, setNewPrice] = useState(0);
  const [newOldPrice, setNewOldPrice] = useState(0);
  const [newWeight, setNewWeight] = useState(0);
  const [newUnit, setNewUnit] = useState("phần");
  const [newImg, setNewImg] = useState("");
  const [newNote, setNewNote] = useState("");

  // Edit Product Form State
  const [editName, setEditName] = useState("");
  const [editCat, setEditCat] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCost, setEditCost] = useState(0);
  const [editFee, setEditFee] = useState(0);
  const [editPrice, setEditPrice] = useState(0);
  const [editOldPrice, setEditOldPrice] = useState(0);
  const [editWeight, setEditWeight] = useState(0);
  const [editUnit, setEditUnit] = useState("phần");
  const [editImg, setEditImg] = useState("");
  const [editNote, setEditNote] = useState("");

  // Orders List filtering states
  const [orderFilterDate, setOrderFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>("");
  const [selectedOrderDetailId, setSelectedOrderDetailId] = useState<string | null>(null);

  // Production plan states
  const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const saved = sessionStorage.getItem("papimeal_admin_logged");
    if (saved === "true") {
      setIsLoggedIn(true);
    }
    setProducts(loadProducts());
    setCategories(loadCategories());
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    const account = ACCOUNTS.find(a => a.phone === cleanPhone && a.password === password);
    
    if (account && account.role === "ADMIN") {
      setIsLoggedIn(true);
      sessionStorage.setItem("papimeal_admin_logged", "true");
      setLoginError("");
    } else {
      setLoginError("❌ Sai thông tin đăng nhập Quản trị viên!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("papimeal_admin_logged");
    setPhone("");
    setPassword("");
  };

  // Toggle status of a product (Active/Inactive)
  const handleToggleProductStatus = (productId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "Đang bán" ? "Ngừng bán" : "Đang bán";
    const updated = products.map(p => {
      if (p.id === productId) {
        return { ...p, status: nextStatus as "Đang bán" | "Ngừng bán" };
      }
      return p;
    });
    setProducts(updated);
    saveProducts(updated);
    triggerRefresh();
  };

  // Submit new product
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId.trim() || !newName.trim() || !newCat || newPrice <= 0 || newWeight <= 0) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    // Check duplicate ID
    if (products.some(p => p.id.toUpperCase() === newId.trim().toUpperCase())) {
      alert("Mã món ăn này đã tồn tại!");
      return;
    }

    const prod: Product = {
      id: newId.trim().toUpperCase(),
      name: newName.trim(),
      category: newCat,
      description: newDesc.trim(),
      cost: Number(newCost) || 0,
      fee: Number(newFee) || 0,
      price: Number(newPrice),
      oldPrice: Number(newOldPrice) || 0,
      weight: Number(newWeight),
      unit: newUnit,
      image: newImg.trim() || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80",
      status: "Đang bán",
      note: newNote.trim()
    };

    const updated = [...products, prod];
    setProducts(updated);
    saveProducts(updated);

    // Reset Form
    setNewId("");
    setNewName("");
    setNewCat("");
    setNewDesc("");
    setNewCost(0);
    setNewFee(0);
    setNewPrice(0);
    setNewOldPrice(0);
    setNewWeight(0);
    setNewUnit("phần");
    setNewImg("");
    setNewNote("");

    alert("🎉 Thêm món ăn mới thành công!");
    setActiveTab("products");
    triggerRefresh();
  };

  // Open Edit modal
  const startEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setEditName(prod.name);
    setEditCat(prod.category);
    setEditDesc(prod.description);
    setEditCost(prod.cost);
    setEditFee(prod.fee);
    setEditPrice(prod.price);
    setEditOldPrice(prod.oldPrice);
    setEditWeight(prod.weight);
    setEditUnit(prod.unit);
    setEditImg(prod.image);
    setEditNote(prod.note);
  };

  // Save edit changes
  const handleSaveEdit = () => {
    if (!editingProduct) return;
    if (!editName.trim() || !editCat || editPrice <= 0 || editWeight <= 0) {
      alert("Vui lòng điền đầy đủ các thông tin bắt buộc!");
      return;
    }

    const updated = products.map(p => {
      if (p.id === editingProduct.id) {
        // If price is changing, archive current price into oldPrice
        const currentPriceArchived = p.price !== Number(editPrice) ? p.price : Number(editOldPrice);
        
        return {
          ...p,
          name: editName.trim(),
          category: editCat,
          description: editDesc.trim(),
          cost: Number(editCost) || 0,
          fee: Number(editFee) || 0,
          price: Number(editPrice),
          oldPrice: currentPriceArchived,
          weight: Number(editWeight),
          unit: editUnit,
          image: editImg.trim(),
          note: editNote.trim()
        };
      }
      return p;
    });

    setProducts(updated);
    saveProducts(updated);
    setEditingProduct(null);
    alert("🎉 Cập nhật thông tin món ăn thành công!");
    triggerRefresh();
  };

  // Orders workflow progression
  const handleProgressOrderStatus = (orderId: string, currentStatus: string) => {
    let nextStatus = "";
    if (currentStatus === "Chờ xử lý") nextStatus = "Đang chế biến";
    else if (currentStatus === "Đang chế biến") nextStatus = "Bếp đã chuẩn bị xong";
    else if (currentStatus === "Bếp đã chuẩn bị xong") nextStatus = "Chờ nhận hàng/giao hàng";
    else if (currentStatus === "Chờ nhận hàng/giao hàng") nextStatus = "Hoàn tất";

    if (!nextStatus) return;

    const updated = orders.map(o => {
      if (o.id === orderId) {
        addStatusLog(orderId, currentStatus, nextStatus, "Quản trị viên");
        const updatedOrder = { ...o, status: nextStatus as any };
        sendToGoogleSheets("UPDATE_STATUS", updatedOrder);
        return updatedOrder;
      }
      return o;
    });

    saveOrders(updated);
    triggerRefresh();
  };

  // Cancel order
  const handleCancelOrder = (orderId: string, currentStatus: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn HỦY đơn hàng ${orderId} này không?`)) {
      return;
    }

    const updated = orders.map(o => {
      if (o.id === orderId) {
        addStatusLog(orderId, currentStatus, STATUS_CANCEL, "Quản trị viên");
        const updatedOrder = { ...o, status: STATUS_CANCEL as any };
        sendToGoogleSheets("UPDATE_STATUS", updatedOrder);
        return updatedOrder;
      }
      return o;
    });

    saveOrders(updated);
    triggerRefresh();
  };

  // Filtered orders list for the tabular date-status view
  const filteredOrders = orders.filter(o => {
    const matchesDate = o.receiveDate === orderFilterDate;
    const matchesStatus = orderFilterStatus ? o.status === orderFilterStatus : true;
    return matchesDate && matchesStatus;
  });

  // Calculate matching stats
  const totalOrdersCount = filteredOrders.length;
  const totalRevenueSum = filteredOrders.reduce((sum, o) => sum + (o.status !== STATUS_CANCEL ? o.totalAmount : 0), 0);

  // Tab 4: Detailed Production & Profit analysis for Admin
  const getProductionStats = () => {
    const dayOrders = orders.filter(o => o.receiveDate === productionDate && o.status !== STATUS_CANCEL);
    
    // Sum product quantities
    const qtyMap: { [prodId: string]: number } = {};
    let totalPortionsCount = 0;
    
    dayOrders.forEach(o => {
      totalPortionsCount += o.portionsCount;
      o.portions.forEach(p => {
        p.forEach(it => {
          qtyMap[it.id] = (qtyMap[it.id] || 0) + it.qty;
        });
      });
    });

    // Detailed lists with costs & profits
    let totalProfit = 0;
    let totalSellingSum = 0;
    let totalCostSum = 0;

    const itemsSummary = products.map(p => {
      const totalQty = qtyMap[p.id] || 0;
      const singleCost = p.cost + p.fee;
      const totalCost = totalQty * singleCost;
      const totalRevenue = totalQty * p.price;
      const itemProfit = totalRevenue - totalCost;

      if (totalQty > 0) {
        totalProfit += itemProfit;
        totalSellingSum += totalRevenue;
        totalCostSum += totalCost;
      }

      return {
        product: p,
        totalQty,
        totalWeight: totalQty * p.weight,
        totalCost,
        totalRevenue,
        itemProfit
      };
    }).filter(it => it.totalQty > 0);

    return {
      items: itemsSummary,
      totalPortionsCount,
      totalSellingSum,
      totalCostSum,
      totalProfit
    };
  };

  const prodStats = getProductionStats();
  const selectedOrderDetails = orders.find(o => o.id === selectedOrderDetailId);

  if (!isLoggedIn) {
    return (
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center py-4">
          <ShieldCheck size={48} className="mx-auto text-[#00523b] mb-2" />
          <h3 className="text-xl font-extrabold text-[#00523b] font-sans">Bảng Quản Trị PaPiMeal</h3>
          <p className="text-xs text-[#394013]/70 font-medium mt-1">
            Xác thực tài khoản người quản lý hệ thống
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#fcfef1] p-5 rounded-2xl border border-[#00523b]/10 shadow-sm space-y-4">
          {loginError && (
            <div className="bg-red-50 text-red-700 p-2.5 rounded-xl text-xs font-semibold text-center border border-red-100">
              {loginError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1">Số điện thoại Admin</label>
            <input 
              type="text" 
              placeholder="0901..."
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-4 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Mật khẩu xác thực</label>
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
            Vào Trang Quản Trị ⚙️
          </button>
        </form>

        <p className="text-[10px] text-center text-[#394013]/60 italic font-medium">
          * Admin: <span className="font-bold">0901464021</span> / Pass: <span className="font-bold">KHOINGHIEP</span>
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
      {/* Admin header */}
      <div className="flex justify-between items-center bg-[#00523b] text-[#fffbd8] p-3 px-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} />
          <span className="font-extrabold text-sm font-sans tracking-tight">HỆ THỐNG QUẢN TRỊ ⚙️</span>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold cursor-pointer"
        >
          Đăng xuất <LogOut size={12} />
        </button>
      </div>

      {/* Admin Nav Tabs */}
      <div className="grid grid-cols-5 gap-0.5 bg-[#00523b]/5 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('products')}
          className={`py-2 text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
            activeTab === 'products' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70"
          }`}
        >
          📋 Menu
        </button>
        <button
          onClick={() => setActiveTab('add')}
          className={`py-2 text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
            activeTab === 'add' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70"
          }`}
        >
          ➕ Thêm
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-2 text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
            activeTab === 'orders' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70"
          }`}
        >
          🛒 Đơn
        </button>
        <button
          onClick={() => setActiveTab('production')}
          className={`py-2 text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
            activeTab === 'production' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70"
          }`}
        >
          💰 Báo Cáo
        </button>
        <button
          onClick={() => setActiveTab('sheets')}
          className={`py-2 text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
            activeTab === 'sheets' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70"
          }`}
        >
          📊 Sheets
        </button>
      </div>

      {/* ======================= TAB 1: PRODUCT LIST ======================= */}
      {activeTab === 'products' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center pb-1">
            <h4 className="text-xs font-bold text-[#00523b] uppercase tracking-wider">
              Thực đơn vận hành ({products.length} món)
            </h4>
            <span className="text-[10px] text-[#394013]/50 font-bold">* Gạt công tắc để ẩn/hiện sản phẩm</span>
          </div>

          <div className="space-y-2.5">
            {products.map(p => (
              <div 
                key={p.id}
                className="bg-[#fcfef1] p-3 rounded-xl border border-[#00523b]/10 shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-[#00523b]/10 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#00523b]/5 flex items-center justify-center text-xl shrink-0">🍱</div>
                    )}
                    <div>
                      <h5 className="font-bold text-xs text-[#394013]">{p.name}</h5>
                      <span className="text-[9px] bg-[#00523b]/10 text-[#00523b] px-1.5 py-0.5 rounded font-extrabold block w-fit mt-0.5">
                        {p.weight} {p.unit}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-extrabold text-[#00523b] block">{p.price.toLocaleString("vi-VN")}đ</span>
                    <button
                      onClick={() => startEditProduct(p)}
                      className="text-[10px] font-bold text-[#00523b] hover:underline flex items-center justify-end gap-0.5 mt-1 cursor-pointer ml-auto"
                    >
                      Sửa giá/info ✏️
                    </button>
                  </div>
                </div>

                {/* Toggle switch row */}
                <div className="bg-[#00523b]/5 p-2 rounded-lg flex justify-between items-center text-xs font-bold">
                  <span className="text-[#394013]/80">Trạng thái thực tế:</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] ${p.status === "Đang bán" ? "text-green-700" : "text-gray-400"}`}>
                      {p.status === "Đang bán" ? "🟢 Đang bán" : "🔴 Tạm ẩn"}
                    </span>
                    
                    {/* CUSTOM SWITCH */}
                    <button
                      onClick={() => handleToggleProductStatus(p.id, p.status)}
                      className={`w-10 h-5.5 rounded-full p-0.5 transition duration-200 cursor-pointer relative flex items-center ${
                        p.status === "Đang bán" ? "bg-[#00523b]" : "bg-gray-300"
                      }`}
                    >
                      <motion.div 
                        layout
                        className="w-4.5 h-4.5 bg-white rounded-full shadow" 
                        style={{ marginLeft: p.status === "Đang bán" ? "auto" : "0" }}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================= TAB 2: ADD PRODUCT ======================= */}
      {activeTab === 'add' && (
        <form onSubmit={handleAddProduct} className="bg-[#fcfef1] p-5 rounded-2xl border border-[#00523b]/10 shadow-sm space-y-4">
          <h4 className="font-extrabold text-sm text-[#00523b] border-b border-[#00523b]/10 pb-2 uppercase tracking-wider flex items-center gap-1">
            <span>➕ Thêm món ăn mới vào thực đơn</span>
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#394013] mb-0.5">Mã món ăn (VIẾT HOA) *</label>
              <input 
                type="text" 
                placeholder="Ví dụ: COM_BO"
                value={newId}
                onChange={e => setNewId(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#394013] mb-0.5">Tên món ăn *</label>
              <input 
                type="text" 
                placeholder="Ví dụ: Cơm Bò Né"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#394013] mb-0.5">Danh mục món *</label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium cursor-pointer"
                required
              >
                <option value="">-- Chọn --</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#394013] mb-0.5">Định lượng (chỉ gõ số) *</label>
              <input 
                type="number" 
                placeholder="Ví dụ: 350"
                value={newWeight || ""}
                onChange={e => setNewWeight(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#394013] mb-0.5">Đơn vị định lượng *</label>
              <select
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium cursor-pointer"
              >
                <option value="g">gram (g)</option>
                <option value="ml">mililit (ml)</option>
                <option value="phần">phần</option>
                <option value="con">con</option>
                <option value="hộp">hộp</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#394013] mb-0.5">Giá bán niêm yết *</label>
              <input 
                type="number" 
                placeholder="VNĐ"
                value={newPrice || ""}
                onChange={e => setNewPrice(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[9px] font-bold text-[#394013] mb-0.5">Giá nhập nguyên liệu</label>
              <input 
                type="number" 
                value={newCost || ""}
                onChange={e => setNewCost(Number(e.target.value))}
                className="w-full px-2.5 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#394013] mb-0.5">Phí chế biến &amp; hao hụt</label>
              <input 
                type="number" 
                value={newFee || ""}
                onChange={e => setNewFee(Number(e.target.value))}
                className="w-full px-2.5 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-[#394013] mb-0.5">Giá cũ (gạch ngang)</label>
              <input 
                type="number" 
                value={newOldPrice || ""}
                onChange={e => setNewOldPrice(Number(e.target.value))}
                className="w-full px-2.5 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#394013] mb-0.5">Mô tả tóm tắt món ăn</label>
            <textarea 
              placeholder="Ghi vài lời mô tả ngon miệng kích thích vị giác..."
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#394013] mb-0.5">URL hình ảnh chi tiết</label>
            <input 
              type="url" 
              placeholder="https://..."
              value={newImg}
              onChange={e => setNewImg(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#394013] mb-0.5">Ghi chú nội bộ</label>
            <input 
              type="text" 
              placeholder="Nhập ghi chú nguồn lấy sỉ, lưu ý chế biến..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-xl shadow transition cursor-pointer text-xs"
          >
            Lưu món ăn lên hệ thống 💾
          </button>
        </form>
      )}

      {/* ======================= TAB 3: ADMIN ORDERS ======================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filtering Controls */}
          <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-[#394013] mb-1">📅 Chọn ngày nhận</label>
              <input 
                type="date"
                value={orderFilterDate}
                onChange={e => setOrderFilterDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-bold cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-[#394013] mb-1">⚙️ Lọc trạng thái</label>
              <select
                value={orderFilterStatus}
                onChange={e => setOrderFilterStatus(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-bold cursor-pointer"
              >
                <option value="">-- Tất cả --</option>
                {STATUS_FLOW.map(status => <option key={status} value={status}>{status}</option>)}
                <option value={STATUS_CANCEL}>{STATUS_CANCEL}</option>
              </select>
            </div>
          </div>

          {/* Quick Stats Banner */}
          <div className="bg-[#00523b]/5 p-3 rounded-xl border border-[#00523b]/10 flex justify-between items-center text-xs font-bold">
            <span>📊 Đơn ngày này: <span className="text-[#00523b]">{totalOrdersCount} đơn</span></span>
            <span>Doanh thu: <span className="text-amber-700 text-sm font-black">{totalRevenueSum.toLocaleString("vi-VN")}đ</span></span>
          </div>

          {/* Orders matching list */}
          <div className="space-y-3">
            {filteredOrders.length === 0 ? (
              <p className="text-center text-xs text-[#394013]/55 py-8 font-semibold">
                Không có đơn hàng nào khớp với bộ lọc ngày hôm nay.
              </p>
            ) : (
              filteredOrders.map(order => {
                const canProgress = ["Chờ xử lý", "Đang chế biến", "Bếp đã chuẩn bị xong", "Chờ nhận hàng/giao hàng"].includes(order.status);
                const canCancel = order.status !== "Hoàn tất" && order.status !== STATUS_CANCEL;

                let nextStatusLabel = "";
                if (order.status === "Chờ xử lý") nextStatusLabel = "Duyệt & Nấu";
                else if (order.status === "Đang chế biến") nextStatusLabel = "Báo bếp nấu xong";
                else if (order.status === "Bếp đã chuẩn bị xong") nextStatusLabel = "Vận chuyển 🚚";
                else if (order.status === "Chờ nhận hàng/giao hàng") nextStatusLabel = "Hoàn tất đơn 🟢";

                return (
                  <div key={order.id} className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-extrabold text-sm text-[#00523b]">{order.id}</h5>
                        <p className="text-xs font-black text-[#394013] mt-0.5">{order.customerName} - {order.phone}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold ${
                        order.status === "Hoàn tất" 
                          ? "bg-green-100 text-green-800" 
                          : order.status === STATUS_CANCEL 
                            ? "bg-red-100 text-red-800" 
                            : "bg-amber-100 text-amber-800"
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#394013]/70 grid grid-cols-2 gap-x-3 gap-y-1 bg-white p-2 rounded-lg border border-gray-50 font-medium">
                      <div>⏰ Giờ hẹn: <span className="font-bold text-[#00523b]">{order.receiveTime}</span></div>
                      <div>🛵 Giao: <span className="font-bold text-[#00523b]">{order.deliveryMethod}</span></div>
                      <div className="col-span-2">🧾 Tiền hàng: <span className="font-black text-amber-700">{order.totalAmount.toLocaleString("vi-VN")}đ</span> ({order.portionsCount} phần)</div>
                      {order.address && <div className="col-span-2 text-amber-800 leading-tight">🏠 Địa chỉ: {order.address}</div>}
                      {order.notes && <div className="col-span-2 text-red-600 italic">📝 Ghi chú: &ldquo;{order.notes}&rdquo;</div>}
                    </div>

                    {/* Controls row */}
                    <div className="flex gap-2 flex-wrap pt-1 border-t border-gray-100">
                      <button
                        onClick={() => setSelectedOrderDetailId(order.id)}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-xs font-bold text-[#394013] rounded-lg hover:bg-gray-50 transition cursor-pointer"
                      >
                        👁️ Chi tiết món
                      </button>

                      {canProgress && (
                        <button
                          onClick={() => handleProgressOrderStatus(order.id, order.status)}
                          className="flex-1 px-3 py-1.5 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] text-xs font-extrabold rounded-lg shadow transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          {nextStatusLabel} <ArrowRight size={12} />
                        </button>
                      )}

                      {canCancel && (
                        <button
                          onClick={() => handleCancelOrder(order.id, order.status)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-0.5"
                        >
                          Hủy đơn ✖
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 4: PRODUCTION SUMMARY & BUSINESS REPORT ======================= */}
      {activeTab === 'production' && (
        <div className="space-y-4">
          <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm">
            <label className="block text-xs font-bold mb-1 flex items-center gap-1">
              <Calendar size={14} className="text-[#00523b]" /> Chọn ngày phân tích chi tiết kinh doanh
            </label>
            <input 
              type="date"
              value={productionDate}
              onChange={e => setProductionDate(e.target.value)}
              className="w-full px-4 py-3 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-sm outline-none bg-white font-bold cursor-pointer"
            />
          </div>

          <div className="bg-[#fcfef1] p-5 rounded-2xl border border-[#00523b]/15 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#00523b]/10 pb-2">
              <h4 className="font-extrabold text-sm text-[#00523b] uppercase tracking-wider">
                💰 Báo cáo Doanh Thu &amp; Chi Phí
              </h4>
              <span className="text-xs font-bold bg-[#00523b]/10 text-[#00523b] px-2.5 py-0.5 rounded-full">
                {productionDate.split('-').reverse().join('/')}
              </span>
            </div>

            {prodStats.items.length === 0 ? (
              <p className="text-center text-xs text-[#394013]/60 py-10 font-bold">
                Chưa có đơn hàng nào hợp lệ cho ngày này.
              </p>
            ) : (
              <div className="space-y-5">
                {/* Financial KPI Summary Cards */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-green-50 border border-green-200/50 p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-green-700 block uppercase tracking-wider">Doanh Thu</span>
                    <span className="text-xs font-black text-green-800 block mt-0.5">
                      {prodStats.totalSellingSum.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="bg-red-50 border border-red-200/50 p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-red-700 block uppercase tracking-wider">Chi Phí (Gốc)</span>
                    <span className="text-xs font-black text-red-800 block mt-0.5">
                      {prodStats.totalCostSum.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="bg-[#00523b]/10 border border-[#00523b]/20 p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-[#00523b] block uppercase tracking-wider">Lợi Nhuận</span>
                    <span className="text-xs font-black text-[#00523b] block mt-0.5">
                      {prodStats.totalProfit.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>

                {/* Packaging count */}
                <div className="bg-teal-50 border-l-3 border-teal-600 p-2.5 rounded-r-xl text-[11px] flex justify-between font-bold text-[#394013]">
                  <span>Tổng số hộp đóng cơm:</span>
                  <span className="text-teal-900">{prodStats.totalPortionsCount} chiếc</span>
                </div>

                {/* Detailed Products Margin Table */}
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Bảng định lượng chi tiết sản lượng</span>
                  <div className="space-y-1.5">
                    {prodStats.items.map(it => (
                      <div key={it.product.id} className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col gap-1 text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#394013]">{it.product.name}</span>
                          <span className="text-[#00523b] bg-[#00523b]/10 px-2 py-0.5 rounded text-[10px]">x{it.totalQty} phần</span>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 font-semibold pt-1">
                          <span>Định lượng: {it.totalWeight} {it.product.unit === 'g' || it.product.unit === 'gram' ? 'g' : it.product.unit}</span>
                          <span>Doanh thu: {it.totalRevenue.toLocaleString("vi-VN")}đ</span>
                          <span className="text-green-700">Lãi: +{it.itemProfit.toLocaleString("vi-VN")}đ</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= TAB 5: GOOGLE SHEETS SETTINGS ======================= */}
      {activeTab === 'sheets' && (
        <div className="space-y-4">
          <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm space-y-3">
            <h4 className="font-extrabold text-sm text-[#00523b] flex items-center gap-1.5 uppercase tracking-wider">
              📊 Kết nối Google Sheets
            </h4>
            <p className="text-xs text-[#394013]/80 leading-relaxed font-medium">
              Đồng bộ hóa đơn hàng, tiến trình nấu ăn và lịch trình đi chợ trực tiếp lên file Google Sheets của riêng bạn theo thời gian thực!
            </p>

            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold text-[#394013]">URL Web App (Google Apps Script):</label>
              <input 
                type="text" 
                placeholder="https://script.google.com/macros/s/.../exec"
                value={sheetUrl}
                onChange={e => setSheetUrl(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium animate-none"
              />
              
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    saveGoogleSheetsUrl(sheetUrl);
                    alert("🎉 Đã lưu đường dẫn Google Sheets Web App thành công!");
                  }}
                  className="flex-1 py-2 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-lg text-xs shadow-sm transition cursor-pointer"
                >
                  Lưu đường dẫn 💾
                </button>
                
                {sheetUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      const testOrder: any = {
                        id: "TEST-ORDER-" + Math.floor(Math.random() * 1000),
                        customerName: "Khách hàng Thử nghiệm (Test)",
                        phone: "0999999999",
                        receiveDate: new Date().toISOString().split('T')[0],
                        receiveTime: "11:30",
                        session: "Trưa",
                        deliveryMethod: "Giao hàng",
                        address: "Địa chỉ Thử nghiệm PaPiMeal",
                        notes: "Đây là đơn thử nghiệm kiểm tra kết nối Google Sheet",
                        status: "Chờ xử lý",
                        portionsCount: 1,
                        totalAmount: 35000,
                        portions: [[{ id: "TEST", name: "Cơm Gà Thử Nghiệm", qty: 1, price: 35000 }]]
                      };
                      await sendToGoogleSheets("NEW_ORDER", testOrder);
                      alert("✉️ Đã gửi tín hiệu thử nghiệm! Hãy kiểm tra Google Sheet của bạn để xem dòng dữ liệu mới nhé!");
                    }}
                    className="py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    Gửi Thử Nghiệm ⚡
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Guide section */}
          <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm space-y-3">
            <h5 className="font-extrabold text-xs text-[#00523b] flex items-center gap-1">
              💡 Hướng dẫn cài đặt Google Sheets trong 2 phút:
            </h5>
            <ol className="text-[11px] text-[#394013]/90 space-y-2 list-decimal list-inside font-medium leading-relaxed">
              <li>Mở file Google Sheets mới hoặc có sẵn của bạn.</li>
              <li>Nhấp vào <strong className="text-[#00523b]">Tiện ích mở rộng (Extensions)</strong> &gt; <strong className="text-[#00523b]">Apps Script</strong>.</li>
              <li>Xóa sạch mã cũ và dán toàn bộ đoạn mã bên dưới vào.</li>
              <li>Nhấp nút <strong className="text-[#00523b]">Triển khai (Deploy)</strong> ở góc trên bên phải &gt; <strong className="text-[#00523b]">Tải triển khai mới (New deployment)</strong>.</li>
              <li>Chọn loại là <strong className="text-[#00523b]">Ứng dụng web (Web app)</strong>. Ở phần &quot;Ai có quyền truy cập&quot; (Who has access), chọn <strong className="text-[#00523b]">Mọi người (Anyone)</strong>.</li>
              <li>Nhấp Deploy, cấp quyền cho script nếu được hỏi, rồi sao chép <strong className="text-[#00523b]">Web app URL</strong> dán vào ô bên trên và bấm Lưu!</li>
            </ol>

            <div className="pt-2">
              <div className="flex justify-between items-center bg-[#00523b]/5 p-2 rounded-t-lg border border-b-0 border-[#00523b]/15">
                <span className="text-[10px] font-black text-[#00523b] uppercase">Mã nguồn Google Apps Script:</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-[#00523b] text-[#fffbd8] rounded text-[9px] font-bold hover:bg-[#003d2b] transition cursor-pointer"
                >
                  {copied ? "Đã sao chép! ✓" : "Sao chép mã 📋"}
                </button>
              </div>
              <pre className="p-3 bg-gray-900 text-[#fffbd8] rounded-b-lg text-[9px] font-mono overflow-x-auto max-h-48 leading-relaxed whitespace-pre">
                {APPS_SCRIPT_TEMPLATE}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ======================= EDIT PRODUCT DIALOG MODAL ======================= */}
      <AnimatePresence>
        {editingProduct && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h4 className="font-extrabold text-sm text-[#00523b] flex items-center gap-1">✏️ Sửa món ăn: {editingProduct.id}</h4>
                <button onClick={() => setEditingProduct(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Tên món ăn *</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Danh mục *</label>
                    <select
                      value={editCat}
                      onChange={e => setEditCat(e.target.value)}
                      className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Giá bán mới (VNĐ) *</label>
                    <input 
                      type="number" 
                      value={editPrice || ""}
                      onChange={e => setEditPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Giá nhập nguyên liệu</label>
                    <input 
                      type="number" 
                      value={editCost || ""}
                      onChange={e => setEditCost(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Phí chế biến &amp; hao hụt</label>
                    <input 
                      type="number" 
                      value={editFee || ""}
                      onChange={e => setEditFee(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Định lượng *</label>
                    <input 
                      type="number" 
                      value={editWeight || ""}
                      onChange={e => setEditWeight(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Đơn vị *</label>
                    <select
                      value={editUnit}
                      onChange={e => setEditUnit(e.target.value)}
                      className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium cursor-pointer"
                    >
                      <option value="g">gram (g)</option>
                      <option value="ml">mililit (ml)</option>
                      <option value="phần">phần</option>
                      <option value="con">con</option>
                      <option value="hộp">hộp</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Mô tả ngắn</label>
                  <textarea 
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">URL hình ảnh</label>
                  <input 
                    type="text" 
                    value={editImg}
                    onChange={e => setEditImg(e.target.value)}
                    className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Ghi chú nội bộ</label>
                  <input 
                    type="text" 
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-xs font-bold text-[#394013] hover:bg-gray-50 transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 py-2 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] rounded-lg text-xs font-bold shadow transition cursor-pointer"
                >
                  Lưu thay đổi 💾
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================= PORTION DETAIL DIALOG MODAL ======================= */}
      <AnimatePresence>
        {selectedOrderDetailId && selectedOrderDetails && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h4 className="font-extrabold text-sm text-[#00523b] flex items-center gap-1">📋 Chi tiết đơn {selectedOrderDetailId}</h4>
                <button onClick={() => setSelectedOrderDetailId(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
              </div>

              <div className="space-y-4">
                {selectedOrderDetails.portions.map((portion, pIdx) => {
                  const portTotal = portion.reduce((s, it) => s + it.qty * it.price, 0);
                  return (
                    <div key={pIdx} className="bg-[#fffbd8]/10 p-3 rounded-xl border border-[#00523b]/10 space-y-1.5">
                      <span className="font-extrabold text-xs text-[#00523b] block">📦 Khẩu phần {pIdx + 1}</span>
                      <div className="space-y-1">
                        {portion.map(item => (
                          <div key={item.id} className="flex justify-between text-xs font-medium">
                            <span>{item.name} <span className="font-bold text-[#00523b]">x{item.qty}</span></span>
                            <span>{(item.qty * item.price).toLocaleString("vi-VN")}đ</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-1.5 border-t border-dotted border-[#00523b]/10 flex justify-between text-xs font-extrabold text-[#00523b]">
                        <span>Cộng phần này:</span>
                        <span>{portTotal.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderDetailId(null)}
                className="w-full py-2.5 bg-[#00523b] text-[#fffbd8] hover:bg-[#003d2b] rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
