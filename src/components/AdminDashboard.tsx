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
  loadAccounts,
  saveAccounts,
  SHOP_ADDRESS, 
  STATUS_FLOW, 
  STATUS_CANCEL 
} from "../utils/storage";
import { loadTextConfig, saveTextConfig } from "../utils/textConfig";
import { sendToGoogleSheets, getGoogleSheetsUrl, saveGoogleSheetsUrl, APPS_SCRIPT_TEMPLATE } from "../utils/googleSheets";
import { syncConfigToFirestore } from "../utils/firebaseSync";

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
  const [loggedInRole, setLoggedInRole] = useState<"ADMIN" | "KITCHEN" | "PACKER" | "SHIPPER" | null>(null);
  const [loggedInName, setLoggedInName] = useState("");

  // Subtab navigation: 'products' | 'add' | 'giao_dien' | 'orders' | 'crm' | 'production' | 'sheets' | 'accounts'
  const [activeTab, setActiveTab] = useState<'products' | 'add' | 'giao_dien' | 'orders' | 'crm' | 'production' | 'sheets' | 'accounts'>('products');

  // Staff accounts management state
  const [accountsList, setAccountsList] = useState<any[]>([]);
  const [newAccName, setNewAccName] = useState("");
  const [newAccPhone, setNewAccPhone] = useState("");
  const [newAccPassword, setNewAccPassword] = useState("");
  const [newAccRole, setNewAccRole] = useState<"ADMIN" | "KITCHEN" | "PACKER" | "SHIPPER">("PACKER");

  // Google Sheets state
  const [sheetUrl, setSheetUrl] = useState(() => getGoogleSheetsUrl());
  const [copied, setCopied] = useState(false);

  // Credentials & Notification states
  const [adminPhone, setAdminPhone] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [kitchenPhone, setKitchenPhone] = useState("");
  const [kitchenPassword, setKitchenPassword] = useState("");
  const [adminNotificationEmail, setAdminNotificationEmail] = useState(() => localStorage.getItem("papimeal_admin_email") || "");

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

  // Category management states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");

  // Orders List filtering states
  const [orderFilterDate, setOrderFilterDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>("");
  const [selectedOrderDetailId, setSelectedOrderDetailId] = useState<string | null>(null);

  // Production plan states
  const [productionStartDate, setProductionStartDate] = useState("");
  const [productionEndDate, setProductionEndDate] = useState("");
  const [textConfig, setTextConfig] = useState(() => loadTextConfig());

  useEffect(() => {
    const saved = sessionStorage.getItem("papimeal_admin_logged");
    const savedRole = sessionStorage.getItem("papimeal_admin_role");
    const savedName = sessionStorage.getItem("papimeal_admin_name");

    if (saved === "true") {
      setIsLoggedIn(true);
      if (savedRole) {
        setLoggedInRole(savedRole as any);
        // Direct default tabs depending on role
        if (savedRole === "SHIPPER") {
          setActiveTab("orders");
        } else if (savedRole === "PACKER") {
          setActiveTab("orders");
        }
      }
      if (savedName) setLoggedInName(savedName);
    }
    setProducts(loadProducts());
    setCategories(loadCategories());

    const accs = loadAccounts();
    setAccountsList(accs);

    // Load admin & kitchen credentials
    const adminAcc = accs.find(a => a.role === "ADMIN");
    const kitchenAcc = accs.find(a => a.role === "KITCHEN");
    if (adminAcc) {
      setAdminPhone(adminAcc.phone);
      setAdminPassword(adminAcc.password);
    }
    if (kitchenAcc) {
      setKitchenPhone(kitchenAcc.phone);
      setKitchenPassword(kitchenAcc.password);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    const accounts = loadAccounts();
    const account = accounts.find(a => a.phone === cleanPhone && a.password === password);
    
    if (account) {
      setIsLoggedIn(true);
      setLoggedInRole(account.role);
      setLoggedInName(account.name);
      sessionStorage.setItem("papimeal_admin_logged", "true");
      sessionStorage.setItem("papimeal_admin_role", account.role);
      sessionStorage.setItem("papimeal_admin_name", account.name);
      setLoginError("");

      // Adjust activeTab automatically based on role
      if (account.role === "SHIPPER" || account.role === "PACKER") {
        setActiveTab("orders");
      } else {
        setActiveTab("products");
      }
    } else {
      setLoginError("❌ Sai thông tin đăng nhập hoặc bạn không có tài khoản nhân sự!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setLoggedInRole(null);
    setLoggedInName("");
    sessionStorage.removeItem("papimeal_admin_logged");
    sessionStorage.removeItem("papimeal_admin_role");
    sessionStorage.removeItem("papimeal_admin_name");
    setPhone("");
    setPassword("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      alert("❌ Vui lòng chỉ chọn file hình ảnh!");
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) {
      alert("⚠️ Hình ảnh này có dung lượng lớn hơn 2MB. Hãy chọn hoặc nén ảnh nhỏ hơn 2MB để hệ thống lưu trữ mượt mà nhất!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      if (isEdit) {
        setEditImg(base64);
      } else {
        setNewImg(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const exportAllData = () => {
    try {
      const data = {
        products: localStorage.getItem("papimeal_products") || "[]",
        categories: localStorage.getItem("papimeal_categories") || "[]",
        orders: localStorage.getItem("papimeal_orders") || "[]",
        logs: localStorage.getItem("papimeal_logs") || "[]",
        appName: localStorage.getItem("papimeal_cfg_app_name") || "",
        slogan: localStorage.getItem("papimeal_cfg_slogan") || "",
        homeBannerTitle: localStorage.getItem("papimeal_cfg_home_banner_title") || "",
        homeBannerSubtitle: localStorage.getItem("papimeal_cfg_home_banner_subtitle") || "",
        successMessage: localStorage.getItem("papimeal_cfg_success_message") || "",
        step1Title: localStorage.getItem("papimeal_cfg_step1_title") || "",
        step1Sub: localStorage.getItem("papimeal_cfg_step1_sub") || "",
        headerLogo: localStorage.getItem("papimeal_cfg_header_logo") || "",
        homeRoundLogo: localStorage.getItem("papimeal_cfg_home_round_logo") || "",
        homeBannerImage: localStorage.getItem("papimeal_cfg_home_banner_image") || "",
        valueProp1Icon: localStorage.getItem("papimeal_cfg_vp1_icon") || "",
        valueProp1Title: localStorage.getItem("papimeal_cfg_vp1_title") || "",
        valueProp1Desc: localStorage.getItem("papimeal_cfg_vp1_desc") || "",
        valueProp2Icon: localStorage.getItem("papimeal_cfg_vp2_icon") || "",
        valueProp2Title: localStorage.getItem("papimeal_cfg_vp2_title") || "",
        valueProp2Desc: localStorage.getItem("papimeal_cfg_vp2_desc") || "",
        valueProp3Icon: localStorage.getItem("papimeal_cfg_vp3_icon") || "",
        valueProp3Title: localStorage.getItem("papimeal_cfg_vp3_title") || "",
        valueProp3Desc: localStorage.getItem("papimeal_cfg_vp3_desc") || "",
        shopAddress: localStorage.getItem("papimeal_cfg_shop_address") || "",
        shopPhone: localStorage.getItem("papimeal_cfg_shop_phone") || "",
        startOrderBtn: localStorage.getItem("papimeal_cfg_start_order_btn") || "",
        homeBackBtn: localStorage.getItem("papimeal_cfg_home_back_btn") || "",
        step2Title: localStorage.getItem("papimeal_cfg_step2_title") || "",
        step2Sub: localStorage.getItem("papimeal_cfg_step2_sub") || "",
        confirmTitle: localStorage.getItem("papimeal_cfg_confirm_title") || "",
        confirmSub: localStorage.getItem("papimeal_cfg_confirm_sub") || "",
        roleCustomerTitle: localStorage.getItem("papimeal_cfg_role_customer_title") || "",
        roleCustomerSub: localStorage.getItem("papimeal_cfg_role_customer_sub") || "",
        roleTrackingTitle: localStorage.getItem("papimeal_cfg_role_tracking_title") || "",
        roleTrackingSub: localStorage.getItem("papimeal_cfg_role_tracking_sub") || "",
        roleKitchenTitle: localStorage.getItem("papimeal_cfg_role_kitchen_title") || "",
        roleKitchenSub: localStorage.getItem("papimeal_cfg_role_kitchen_sub") || "",
        roleAdminTitle: localStorage.getItem("papimeal_cfg_role_admin_title") || "",
        roleAdminSub: localStorage.getItem("papimeal_cfg_role_admin_sub") || "",
        demoGuideTitle: localStorage.getItem("papimeal_cfg_demo_guide_title") || "",
        demoGuideText: localStorage.getItem("papimeal_cfg_demo_guide_text") || "",
        googleSheetsUrl: localStorage.getItem("papimeal_google_sheets_url") || "",
        accounts: localStorage.getItem("papimeal_accounts") || "",
        adminNotificationEmail: localStorage.getItem("papimeal_admin_email") || ""
      };
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      const dateStr = new Date().toISOString().split('T')[0];
      downloadAnchor.setAttribute("download", `papimeal_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("❌ Lỗi khi xuất file sao lưu: " + String(err));
    }
  };

  const importAllData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        
        const confirmOverwrite = window.confirm("⚠️ Bạn có chắc chắn muốn ghi đè toàn bộ dữ liệu hiện tại bằng file sao lưu này? Hành động này sẽ thay thế toàn bộ danh sách món ăn, đơn hàng và các câu chữ cấu hình hiện có!");
        if (!confirmOverwrite) return;

        if (parsed.products) {
          localStorage.setItem("papimeal_products", parsed.products);
          setProducts(JSON.parse(parsed.products));
        }
        if (parsed.categories) {
          localStorage.setItem("papimeal_categories", parsed.categories);
          setCategories(JSON.parse(parsed.categories));
        }
        if (parsed.orders) {
          localStorage.setItem("papimeal_orders", parsed.orders);
        }
        if (parsed.logs) {
          localStorage.setItem("papimeal_logs", parsed.logs);
        }
        
        const keysMap: { [key: string]: string } = {
          appName: "papimeal_cfg_app_name",
          slogan: "papimeal_cfg_slogan",
          homeBannerTitle: "papimeal_cfg_home_banner_title",
          homeBannerSubtitle: "papimeal_cfg_home_banner_subtitle",
          successMessage: "papimeal_cfg_success_message",
          step1Title: "papimeal_cfg_step1_title",
          step1Sub: "papimeal_cfg_step1_sub",
          headerLogo: "papimeal_cfg_header_logo",
          homeRoundLogo: "papimeal_cfg_home_round_logo",
          homeBannerImage: "papimeal_cfg_home_banner_image",
          valueProp1Icon: "papimeal_cfg_vp1_icon",
          valueProp1Title: "papimeal_cfg_vp1_title",
          valueProp1Desc: "papimeal_cfg_vp1_desc",
          valueProp2Icon: "papimeal_cfg_vp2_icon",
          valueProp2Title: "papimeal_cfg_vp2_title",
          valueProp2Desc: "papimeal_cfg_vp2_desc",
          valueProp3Icon: "papimeal_cfg_vp3_icon",
          valueProp3Title: "papimeal_cfg_vp3_title",
          valueProp3Desc: "papimeal_cfg_vp3_desc",
          shopAddress: "papimeal_cfg_shop_address",
          shopPhone: "papimeal_cfg_shop_phone",
          startOrderBtn: "papimeal_cfg_start_order_btn",
          homeBackBtn: "papimeal_cfg_home_back_btn",
          step2Title: "papimeal_cfg_step2_title",
          step2Sub: "papimeal_cfg_step2_sub",
          confirmTitle: "papimeal_cfg_confirm_title",
          confirmSub: "papimeal_cfg_confirm_sub",
          roleCustomerTitle: "papimeal_cfg_role_customer_title",
          roleCustomerSub: "papimeal_cfg_role_customer_sub",
          roleTrackingTitle: "papimeal_cfg_role_tracking_title",
          roleTrackingSub: "papimeal_cfg_role_tracking_sub",
          roleKitchenTitle: "papimeal_cfg_role_kitchen_title",
          roleKitchenSub: "papimeal_cfg_role_kitchen_sub",
          roleAdminTitle: "papimeal_cfg_role_admin_title",
          roleAdminSub: "papimeal_cfg_role_admin_sub",
          demoGuideTitle: "papimeal_cfg_demo_guide_title",
          demoGuideText: "papimeal_cfg_demo_guide_text",
          googleSheetsUrl: "papimeal_google_sheets_url"
        };

        Object.keys(keysMap).forEach(k => {
          if (parsed[k] !== undefined) {
            localStorage.setItem(keysMap[k], parsed[k]);
          }
        });

        if (parsed.accounts) {
          localStorage.setItem("papimeal_accounts", parsed.accounts);
          try {
            const accs = JSON.parse(parsed.accounts);
            const adminAcc = accs.find((a: any) => a.role === "ADMIN");
            const kitchenAcc = accs.find((a: any) => a.role === "KITCHEN");
            if (adminAcc) {
              setAdminPhone(adminAcc.phone);
              setAdminPassword(adminAcc.password);
            }
            if (kitchenAcc) {
              setKitchenPhone(kitchenAcc.phone);
              setKitchenPassword(kitchenAcc.password);
            }
          } catch (accErr) {
            console.error("Error restoring accounts", accErr);
          }
        }
        if (parsed.adminNotificationEmail !== undefined) {
          localStorage.setItem("papimeal_admin_email", parsed.adminNotificationEmail);
          setAdminNotificationEmail(parsed.adminNotificationEmail);
        }

        // Update states
        setTextConfig(loadTextConfig());
        if (parsed.googleSheetsUrl !== undefined) {
          setSheetUrl(parsed.googleSheetsUrl);
        }
        triggerRefresh();
        alert("🎉 Khôi phục và nâng cấp toàn bộ dữ liệu hệ thống thành công! Trang web đã tải lại các cấu hình cũ của bạn.");
      } catch (err) {
        alert("❌ File sao lưu không đúng định dạng hoặc bị lỗi: " + String(err));
      }
    };
    fileReader.readAsText(file);
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
    if (!newId.trim() || !newName.trim() || newPrice <= 0 || newWeight <= 0) {
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

  // Category Management Handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert("Tên danh mục này đã tồn tại rồi!");
      return;
    }

    const newCatObj: Category = {
      id: "cat_" + Date.now(),
      name
    };

    const updated = [...categories, newCatObj];
    setCategories(updated);
    saveCategories(updated);
    setNewCategoryName("");
    alert("🎉 Thêm danh mục mới thành công!");
    triggerRefresh();
  };

  const startEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const handleSaveEditCategory = (catId: string) => {
    const name = editingCatName.trim();
    if (!name) return;

    if (categories.some(c => c.id !== catId && c.name.toLowerCase() === name.toLowerCase())) {
      alert("Tên danh mục này đã tồn tại!");
      return;
    }

    const updated = categories.map(c => c.id === catId ? { ...c, name } : c);
    setCategories(updated);
    saveCategories(updated);
    setEditingCatId(null);
    setEditingCatName("");
    alert("🎉 Cập nhật danh mục thành công!");
    triggerRefresh();
  };

  const handleDeleteCategory = (catId: string) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    const confirmMsg = `Bạn có chắc chắn muốn xóa danh mục "${cat.name}"?\n\nTất cả các món ăn thuộc danh mục này sẽ được tự động chuyển về trạng thái "Chưa phân loại" để bạn có thể chỉnh sửa lại sau.`;
    if (!window.confirm(confirmMsg)) {
      return;
    }

    const updatedCats = categories.filter(c => c.id !== catId);
    setCategories(updatedCats);
    saveCategories(updatedCats);

    const updatedProds = products.map(p => {
      if (p.category === catId) {
        return { ...p, category: "" };
      }
      return p;
    });

    setProducts(updatedProds);
    saveProducts(updatedProds);
    alert(`🎉 Đã xóa danh mục "${cat.name}". Các món ăn liên quan đã được chuyển về trạng thái Chưa phân loại!`);
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
    if (!editName.trim() || editPrice <= 0 || editWeight <= 0) {
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
    else if (currentStatus === "Chờ nhận hàng/giao hàng") nextStatus = "Đang giao";
    else if (currentStatus === "Đang giao") nextStatus = "Hoàn tất";

    if (!nextStatus) return;

    const updated = orders.map(o => {
      if (o.id === orderId) {
        addStatusLog(orderId, currentStatus, nextStatus, loggedInName || "Quản trị viên");
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

  // Print order receipt
  const handlePrintOrder = (order: Order) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    const portionItemsHtml = order.portions.map((portion, pIdx) => {
      const portTotal = portion.reduce((s, it) => s + it.qty * it.price, 0);
      const itemsList = portion.map(item => {
        const prod = products.find(p => p.id === item.id);
        const cat = prod ? categories.find(c => c.id === prod.category) : undefined;
        const catName = cat ? cat.name : item.categoryName || "";
        return `
          <tr style="border-bottom: 1px dashed #eee;">
            <td style="padding: 6px 0; vertical-align: top; text-align: left;">
              <div style="font-weight: bold; font-size: 13px;">${item.name}</div>
              ${catName ? `<div style="font-size: 10px; color: #666; font-style: italic; margin-top: 2px;">📂 ${catName}</div>` : ''}
            </td>
            <td style="padding: 6px 0; vertical-align: top; text-align: center; font-weight: bold; font-size: 13px;">x${item.qty}</td>
            <td style="padding: 6px 0; vertical-align: top; text-align: right; font-weight: bold; font-size: 13px;">${(item.price * item.qty).toLocaleString('vi-VN')}đ</td>
          </tr>
        `;
      }).join('');

      return `
        <div style="margin-bottom: 15px; border: 1px solid #ddd; padding: 10px; border-radius: 8px; background-color: #fafafa;">
          <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; border-bottom: 2px solid #00523b; padding-bottom: 4px; color: #00523b;">
            📦 Khẩu phần ${pIdx + 1}
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid #000; font-size: 11px; color: #555; text-transform: uppercase;">
                <th style="text-align: left; padding-bottom: 4px;">Món ăn</th>
                <th style="text-align: center; padding-bottom: 4px; width: 40px;">SL</th>
                <th style="text-align: right; padding-bottom: 4px; width: 80px;">Cộng</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList}
            </tbody>
          </table>
          <div style="text-align: right; font-weight: bold; font-size: 13px; margin-top: 8px; color: #00523b;">
            Cộng phần: ${portTotal.toLocaleString('vi-VN')}đ
          </div>
        </div>
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Hóa đơn ${order.id}</title>
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            margin: 0;
            padding: 20px;
            width: 80mm;
            box-sizing: border-box;
          }
          @media print {
            body {
              width: 80mm;
              padding: 5px;
            }
          }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 12px;">
          <h1 style="font-size: 18px; margin: 0 0 4px 0; text-transform: uppercase; font-weight: 800; color: #00523b;">
            ${textConfig.appName || "Cơm Niêu PaPi"}
          </h1>
          <p style="margin: 3px 0; font-size: 10px; font-style: italic; color: #555;">
            ${textConfig.slogan || "Mâm Cơm Việt - Đậm Đà Hương Vị Quê Hương"}
          </p>
          ${textConfig.shopPhone ? `<p style="margin: 3px 0; font-size: 11px; font-weight: bold;">📞 Hotline: ${textConfig.shopPhone}</p>` : ''}
          ${textConfig.shopAddress ? `<p style="margin: 3px 0; font-size: 10px; color: #444; line-height: 1.2;">📍 Đ/c: ${textConfig.shopAddress}</p>` : ''}
        </div>

        <div style="font-size: 12px; margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; line-height: 1.45;">
          <div style="font-weight: 900; font-size: 14px; margin-bottom: 8px; text-align: center; border: 2px solid #000; padding: 4px; border-radius: 4px; background-color: #eee;">
            PHIẾU THANH TOÁN
          </div>
          <div><b>Mã đơn hàng:</b> <span style="font-size: 13px; font-weight: bold; background: #000; color: #fff; padding: 2px 6px; border-radius: 4px;">${order.id}</span></div>
          <div style="margin-top: 4px;"><b>Khách hàng:</b> <span style="font-weight: bold; font-size: 13px;">${order.customerName}</span></div>
          <div><b>Điện thoại:</b> <span style="font-weight: bold; font-size: 13px;">${order.phone}</span></div>
          <div><b>Hẹn nhận:</b> <span style="font-weight: bold; color: #00523b; font-size: 13px;">${order.receiveTime} (${order.session})</span> - ${order.receiveDate}</div>
          <div><b>Hình thức:</b> <span style="font-weight: bold; background: #eee; padding: 1px 4px; border-radius: 2px;">${order.deliveryMethod}</span></div>
          ${order.address ? `<div style="margin-top: 2px; line-height: 1.3;"><b>Địa chỉ giao:</b> ${order.address}</div>` : ''}
          <div style="margin-top: 6px; font-size: 10px; color: #666; text-align: right;"><i>In lúc: ${new Date().toLocaleString('vi-VN')}</i></div>
        </div>

        <div class="items-area">
          ${portionItemsHtml}
        </div>

        ${order.notes ? `
          <div style="background-color: #fffbeb; border: 1px dashed #d97706; padding: 8px; margin-top: 10px; border-radius: 6px; font-style: italic; font-size: 11.5px; color: #92400e;">
            <b>✍️ Ghi chú của khách:</b><br/>
            "${order.notes}"
          </div>
        ` : ''}

        <div style="border-top: 2px dashed #000; border-bottom: 2px dashed #000; padding: 10px 0; margin-top: 15px; margin-bottom: 15px; display: flex; justify-content: space-between; font-weight: bold; font-size: 15px;">
          <span>TỔNG THANH TOÁN:</span>
          <span style="color: #c2410c; font-size: 16px;">${order.totalAmount.toLocaleString('vi-VN')}đ</span>
        </div>

        <div style="text-align: center; margin-top: 20px; font-size: 11.5px; border-top: 1px dotted #ccc; padding-top: 10px;">
          <p style="margin: 2px 0; font-weight: bold; font-size: 12px; color: #00523b;">Chúc Quý Khách Ngon Miệng! ❤️</p>
          <p style="margin: 2px 0; font-size: 10px; color: #666;">Cảm ơn quý khách đã tin tưởng Cơm Niêu PaPi!</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          }
        </script>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.error(e);
      }
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 5000);
    }, 500);
  };

  // Filtered orders list for the tabular date-status view
  const filteredOrders = orders.filter(o => {
    const matchesDate = o.receiveDate === orderFilterDate;
    
    // Role-specific status filters
    let matchesRole = true;
    if (loggedInRole === "SHIPPER") {
      matchesRole = ["Bếp đã chuẩn bị xong", "Chờ nhận hàng/giao hàng", "Đang giao", "Hoàn tất"].includes(o.status);
    } else if (loggedInRole === "PACKER") {
      matchesRole = ["Đang chế biến", "Bếp đã chuẩn bị xong", "Chờ nhận hàng/giao hàng", "Đang giao", "Hoàn tất"].includes(o.status);
    }

    const matchesStatus = orderFilterStatus ? o.status === orderFilterStatus : true;
    return matchesDate && matchesRole && matchesStatus;
  });

  // Calculate matching stats
  const totalOrdersCount = filteredOrders.length;
  const totalRevenueSum = filteredOrders.reduce((sum, o) => sum + (o.status !== STATUS_CANCEL ? o.totalAmount : 0), 0);

  // Tab 4: Detailed Production & Profit analysis for Admin
  const getProductionStats = () => {
    const dayOrders = orders.filter(o => {
      if (productionStartDate && o.receiveDate < productionStartDate) return false;
      if (productionEndDate && o.receiveDate > productionEndDate) return false;
      return true;
    });

    const activeOrdersForProcurement = dayOrders.filter(o => o.status !== STATUS_CANCEL);
    const completedOrdersForRevenue = dayOrders.filter(o => o.status === "Hoàn tất");

    // Sum product quantities for Completed orders (Revenue)
    const qtyMapCompleted: { [prodId: string]: number } = {};
    completedOrdersForRevenue.forEach(o => {
      o.portions.forEach(p => {
        p.forEach(it => {
          qtyMapCompleted[it.id] = (qtyMapCompleted[it.id] || 0) + it.qty;
        });
      });
    });

    // Sum product quantities for All Active orders (Procurement/Go to Market)
    const qtyMapActive: { [prodId: string]: number } = {};
    let totalPortionsCount = 0;
    activeOrdersForProcurement.forEach(o => {
      totalPortionsCount += o.portionsCount;
      o.portions.forEach(p => {
        p.forEach(it => {
          qtyMapActive[it.id] = (qtyMapActive[it.id] || 0) + it.qty;
        });
      });
    });

    // Financial calculations (Completed orders ONLY)
    let totalProfit = 0;
    let totalSellingSum = 0; // Doanh thu
    let totalCostSum = 0;    // Chi phí của các đơn hoàn tất (gốc + chế biến)

    // Procurement calculations (All active orders)
    let totalIngredientCostNeed = 0; // Tổng tiền nguyên liệu cần chuẩn bị đi chợ

    const itemsSummary = products.map(p => {
      const qtyCompleted = qtyMapCompleted[p.id] || 0;
      const qtyActive = qtyMapActive[p.id] || 0;

      const singleCost = p.cost + p.fee;
      const totalCostCompleted = qtyCompleted * singleCost;
      const totalRevenueCompleted = qtyCompleted * p.price;
      const itemProfitCompleted = totalRevenueCompleted - totalCostCompleted;

      const itemRawCostActive = qtyActive * p.cost;

      if (qtyCompleted > 0) {
        totalProfit += itemProfitCompleted;
        totalSellingSum += totalRevenueCompleted;
        totalCostSum += totalCostCompleted;
      }

      if (qtyActive > 0) {
        totalIngredientCostNeed += itemRawCostActive;
      }

      return {
        product: p,
        qtyCompleted,
        qtyActive,
        totalWeightCompleted: qtyCompleted * p.weight,
        totalWeightActive: qtyActive * p.weight,
        totalCostCompleted,
        totalRevenueCompleted,
        itemProfitCompleted,
        itemRawCostActive
      };
    }).filter(it => it.qtyCompleted > 0 || it.qtyActive > 0);

    return {
      items: itemsSummary,
      totalPortionsCount,
      totalSellingSum,
      totalCostSum,
      totalProfit,
      totalIngredientCostNeed
    };
  };

  const prodStats = getProductionStats();
  const selectedOrderDetails = orders.find(o => o.id === selectedOrderDetailId);

  if (!isLoggedIn) {
    return (
      <div className="max-w-sm mx-auto space-y-4">
        <div className="text-center py-4">
          <ShieldCheck size={48} className="mx-auto text-[#00523b] mb-2" />
          <h3 className="text-xl font-extrabold text-[#00523b] font-sans">Bảng Quản Trị PaPi(ml)</h3>
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

        {/* Password suggestion removed for security */}

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
          <div className="text-left">
            <span className="font-extrabold text-xs block leading-tight font-sans tracking-tight">HỆ THỐNG VẬN HÀNH PAPI ⚙️</span>
            <span className="text-[9px] font-bold text-amber-300 block leading-none">
              Chào {loggedInName || "Chủ Quán"} ({loggedInRole === "ADMIN" ? "Chủ Quán / Admin 👑" : (loggedInRole === "PACKER" ? "Đóng Gói 📦" : "Shipper Giao Hàng 🛵")})
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition flex items-center gap-1 text-[10px] uppercase tracking-wider font-extrabold cursor-pointer"
        >
          Đăng xuất <LogOut size={12} />
        </button>
      </div>

      {/* Admin Nav Tabs (Dynamic based on Role) */}
      <div className="flex flex-wrap gap-1 bg-[#00523b]/5 p-1 rounded-xl">
        {loggedInRole === "ADMIN" && (
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 min-w-[50px] py-2 text-[8px] sm:text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
              activeTab === 'products' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:bg-[#00523b]/10"
            }`}
          >
            📋 Menu
          </button>
        )}
        {loggedInRole === "ADMIN" && (
          <button
            onClick={() => setActiveTab('giao_dien')}
            className={`flex-1 min-w-[50px] py-2 text-[8px] sm:text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
              activeTab === 'giao_dien' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:bg-[#00523b]/10"
            }`}
          >
            🖼️ Giao diện
          </button>
        )}
        {loggedInRole === "ADMIN" && (
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 min-w-[50px] py-2 text-[8px] sm:text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
              activeTab === 'add' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:bg-[#00523b]/10"
            }`}
          >
            ➕ Thêm
          </button>
        )}
        {(loggedInRole === "ADMIN" || loggedInRole === "PACKER" || loggedInRole === "SHIPPER") && (
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 min-w-[50px] py-2 text-[8px] sm:text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
              activeTab === 'orders' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:bg-[#00523b]/10"
            }`}
          >
            🛒 Đơn hàng
          </button>
        )}
        {loggedInRole === "ADMIN" && (
          <button
            onClick={() => setActiveTab('crm')}
            className={`flex-1 min-w-[50px] py-2 text-[8px] sm:text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
              activeTab === 'crm' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:bg-[#00523b]/10"
            }`}
          >
            👥 Khách
          </button>
        )}
        {(loggedInRole === "ADMIN" || loggedInRole === "PACKER") && (
          <button
            onClick={() => setActiveTab('production')}
            className={`flex-1 min-w-[50px] py-2 text-[8px] sm:text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
              activeTab === 'production' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:bg-[#00523b]/10"
            }`}
          >
            💰 Báo cáo
          </button>
        )}
        {loggedInRole === "ADMIN" && (
          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex-1 min-w-[50px] py-2 text-[8px] sm:text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
              activeTab === 'sheets' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:bg-[#00523b]/10"
            }`}
          >
            ⚙️ Cài đặt
          </button>
        )}
        {loggedInRole === "ADMIN" && (
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex-1 min-w-[50px] py-2 text-[8px] sm:text-[9px] font-bold rounded-lg transition duration-150 cursor-pointer text-center ${
              activeTab === 'accounts' ? "bg-[#00523b] text-[#fffbd8] shadow" : "text-[#394013]/70 hover:bg-[#00523b]/10"
            }`}
          >
            👥 Nhân Sự
          </button>
        )}
      </div>

      {/* ======================= TAB 1: PRODUCT LIST ======================= */}
      {activeTab === 'products' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-1 border-b border-[#00523b]/10">
            <div>
              <h4 className="text-xs font-bold text-[#00523b] uppercase tracking-wider">
                Thực đơn vận hành ({products.length} món)
              </h4>
              <span className="text-[10px] text-[#394013]/50 font-bold">* Gạt công tắc để ẩn/hiện sản phẩm</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('giao_dien')}
              className="px-3 py-1.5 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer w-full sm:w-auto shadow-sm transition"
            >
              🖼️ QUẢN LÝ GIAO DIỆN & DANH MỤC
            </button>
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
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="text-[9px] bg-[#00523b]/10 text-[#00523b] px-1.5 py-0.5 rounded font-extrabold">
                          {p.weight} {p.unit}
                        </span>
                        {p.category && categories.some(c => c.id === p.category) ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-extrabold">
                            📂 {categories.find(c => c.id === p.category)?.name}
                          </span>
                        ) : (
                          <span className="text-[9px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-extrabold">
                            ⚠️ Chưa phân loại
                          </span>
                        )}
                      </div>
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

      {/* ======================= TAB: GIAO DIỆN & DANH MỤC ======================= */}
      {activeTab === 'giao_dien' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 pb-1 border-b border-[#00523b]/10">
            <div>
              <h4 className="text-xs font-bold text-[#00523b] uppercase tracking-wider">
                Quản lý Giao diện & Danh mục món ăn
              </h4>
              <span className="text-[10px] text-[#394013]/50 font-bold">* Thiết lập danh mục sản phẩm và chỉnh sửa thông tin giao diện khách hàng</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className="px-3 py-1.5 bg-[#00523b] hover:bg-[#003d2b] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 cursor-pointer w-full sm:w-auto shadow-sm transition"
            >
              ⬅️ QUAY LẠI MENU
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Cột trái: Quản lý danh mục */}
            <div className="lg:col-span-1 space-y-4">
              {/* Form thêm mới danh mục */}
              <form onSubmit={handleAddCategory} className="bg-[#fcfef1] p-4 rounded-2xl border border-[#00523b]/10 shadow-sm space-y-3">
                <label className="block text-xs font-black text-[#00523b] uppercase tracking-wider">
                  ➕ Thêm danh mục món mới:
                </label>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    placeholder="Ví dụ: Lẩu & Súp 🍲, Món cuốn 🌯..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-lg text-xs transition cursor-pointer shadow"
                  >
                    TẠO DANH MỤC ✨
                  </button>
                </div>
              </form>

              {/* Danh sách danh mục */}
              <div className="bg-[#fcfef1] p-4 rounded-2xl border border-[#00523b]/10 shadow-sm space-y-3">
                <span className="block text-xs font-black text-gray-400 uppercase tracking-wider">
                  Danh sách danh mục hiện tại:
                </span>
                
                {categories.length === 0 ? (
                  <div className="text-center py-6 text-xs text-gray-400 font-bold">
                    Chưa có danh mục nào. Hãy tạo danh mục món ăn đầu tiên của bạn!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categories.map(cat => {
                      const count = products.filter(p => p.category === cat.id).length;
                      const isEditingThis = editingCatId === cat.id;

                      return (
                        <div 
                          key={cat.id} 
                          className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#00523b]/10 shadow-sm gap-2"
                        >
                          {isEditingThis ? (
                            <div className="flex-1 flex gap-1.5 items-center">
                              <input
                                type="text"
                                value={editingCatName}
                                onChange={e => setEditingCatName(e.target.value)}
                                className="flex-1 px-3 py-2 border border-[#00523b]/30 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-semibold"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditCategory(cat.id)}
                                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer shadow"
                                title="Lưu"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCatId(null);
                                  setEditingCatName("");
                                }}
                                className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition cursor-pointer"
                                title="Hủy"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-extrabold text-[#00523b] block truncate">{cat.name}</span>
                                <span className="text-[9px] text-[#394013]/60 font-bold">Chứa {count} món ăn trong thực đơn</span>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEditCategory(cat)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer border border-blue-100"
                                  title="Đổi tên"
                                >
                                  <Edit2 size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer border border-red-100"
                                  title="Xóa"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: Tùy biến câu chữ & giao diện */}
            <div className="lg:col-span-2 space-y-4">
              {/* ======================= CHỈNH SỬA TIÊU ĐỀ & CÂU CHỮ ======================= */}
              <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm space-y-4">
                <h4 className="font-extrabold text-sm text-[#00523b] flex items-center gap-1.5 uppercase tracking-wider">
                  ✍️ Tùy Biến Giao Diện &amp; Ảnh/Logo Khách Hàng
                </h4>
                <p className="text-xs text-[#394013]/80 leading-relaxed font-medium">
                  Bạn có thể dễ dàng thay đổi tên thương hiệu, slogan, tải lên URL logo mới, đổi emoji, hoặc chỉnh sửa nội dung giới thiệu mà khách hàng sẽ thấy. Chỉ có Admin sau khi đăng nhập mới có quyền thay đổi các cài đặt này!
                </p>

                <div className="space-y-4 pt-1">
                  {/* PHẦN 1: THƯƠNG HIỆU & LOGO */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-100 space-y-3">
                    <h5 className="text-xs font-black text-[#00523b] uppercase tracking-wider border-b border-gray-100 pb-1.5">
                      📌 Thương hiệu &amp; Logo hình ảnh
                    </h5>
                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Tên ứng dụng chính (VD: PaPi(ml)):</label>
                      <input 
                        type="text" 
                        value={textConfig.appName}
                        onChange={e => setTextConfig(prev => ({ ...prev, appName: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Slogan hiển thị (VD: Cơm Trưa Ngày Mai):</label>
                      <input 
                        type="text" 
                        value={textConfig.slogan}
                        onChange={e => setTextConfig(prev => ({ ...prev, slogan: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Logo góc trên bên trái (Nhập emoji hoặc link ảnh):</label>
                      <input 
                        type="text" 
                        value={textConfig.headerLogo}
                        onChange={e => setTextConfig(prev => ({ ...prev, headerLogo: e.target.value }))}
                        placeholder="Nhập chữ, emoji hoặc link hình ảnh (http...)"
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium font-mono"
                      />
                      <span className="text-[9px] text-[#394013]/50 font-bold mt-1 block">💡 Ví dụ: <code className="bg-gray-100 px-1 rounded">P</code> hoặc link ảnh <code className="bg-gray-100 px-1 rounded">https://ten-mien.com/logo.png</code></span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Logo tròn chính giữa trang chủ (Nhập emoji hoặc link ảnh):</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={textConfig.homeRoundLogo}
                          onChange={e => setTextConfig(prev => ({ ...prev, homeRoundLogo: e.target.value }))}
                          placeholder="Nhập emoji hoặc link hình ảnh (http...)"
                          className="flex-1 px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTextConfig(prev => ({ ...prev, homeRoundLogo: "/src/assets/images/papimeal_logo_1782435524190.jpg" }));
                            alert("🎉 Đã chọn logo Bento PaPi(ml) 🍱 mẫu! Hãy bấm nút [Lưu Toàn Bộ Cấu Hình 💾] ở bên dưới cùng để áp dụng nhé!");
                          }}
                          className="px-2.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-[10px] transition cursor-pointer shrink-0"
                        >
                          Sử dụng Logo PaPi(ml) 🍱
                        </button>
                      </div>
                      <span className="text-[9px] text-[#394013]/50 font-bold mt-1 block">💡 Bạn có thể dán link ảnh tùy ý, hoặc bấm nút màu cam ở trên để sử dụng ngay bức ảnh Logo Bento PaPi(ml) 🍱 sắc nét được thiết kế riêng!</span>
                    </div>
                  </div>

                  {/* PHẦN 2: BANNER TRANG CHỦ */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-100 space-y-3">
                    <h5 className="text-xs font-black text-[#00523b] uppercase tracking-wider border-b border-gray-100 pb-1.5">
                      🎨 Banner Quảng Cáo &amp; Khẩu hiệu chính
                    </h5>
                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Tiêu đề Banner Trang Chủ:</label>
                      <input 
                        type="text" 
                        value={textConfig.homeBannerTitle}
                        onChange={e => setTextConfig(prev => ({ ...prev, homeBannerTitle: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Mô tả Banner Trang Chủ:</label>
                      <textarea 
                        rows={2}
                        value={textConfig.homeBannerSubtitle}
                        onChange={e => setTextConfig(prev => ({ ...prev, homeBannerSubtitle: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Hình nền / Icon mờ góc Banner (Nhập emoji hoặc link ảnh):</label>
                      <input 
                        type="text" 
                        value={textConfig.homeBannerImage}
                        onChange={e => setTextConfig(prev => ({ ...prev, homeBannerImage: e.target.value }))}
                        placeholder="Ví dụ: 🥗 hoặc link hình ảnh"
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium font-mono"
                      />
                    </div>
                  </div>

                  {/* PHẦN 3: 3 KHỐI LỢI ÍCH TRANG CHỦ */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-100 space-y-4">
                    <h5 className="text-xs font-black text-[#00523b] uppercase tracking-wider border-b border-gray-100 pb-1.5">
                      ⭐ 3 Khối Lợi Ích &amp; Cam Kết (Trang chủ khách hàng)
                    </h5>

                    {/* Khối 1 */}
                    <div className="p-2.5 bg-gray-50 rounded-lg space-y-2">
                      <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded font-bold text-gray-700">Khối lợi ích 1</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Icon / Link ảnh</label>
                          <input 
                            type="text"
                            value={textConfig.valueProp1Icon}
                            onChange={e => setTextConfig(prev => ({ ...prev, valueProp1Icon: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Tiêu đề chính</label>
                          <input 
                            type="text"
                            value={textConfig.valueProp1Title}
                            onChange={e => setTextConfig(prev => ({ ...prev, valueProp1Title: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Mô tả ngắn gọn</label>
                        <input 
                          type="text"
                          value={textConfig.valueProp1Desc}
                          onChange={e => setTextConfig(prev => ({ ...prev, valueProp1Desc: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-medium"
                        />
                      </div>
                    </div>

                    {/* Khối 2 */}
                    <div className="p-2.5 bg-gray-50 rounded-lg space-y-2">
                      <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded font-bold text-gray-700">Khối lợi ích 2</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Icon / Link ảnh</label>
                          <input 
                            type="text"
                            value={textConfig.valueProp2Icon}
                            onChange={e => setTextConfig(prev => ({ ...prev, valueProp2Icon: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Tiêu đề chính</label>
                          <input 
                            type="text"
                            value={textConfig.valueProp2Title}
                            onChange={e => setTextConfig(prev => ({ ...prev, valueProp2Title: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Mô tả ngắn gọn</label>
                        <input 
                          type="text"
                          value={textConfig.valueProp2Desc}
                          onChange={e => setTextConfig(prev => ({ ...prev, valueProp2Desc: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-medium"
                        />
                      </div>
                    </div>

                    {/* Khối 3 */}
                    <div className="p-2.5 bg-gray-50 rounded-lg space-y-2">
                      <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded font-bold text-gray-700">Khối lợi ích 3</span>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Icon / Link ảnh</label>
                          <input 
                            type="text"
                            value={textConfig.valueProp3Icon}
                            onChange={e => setTextConfig(prev => ({ ...prev, valueProp3Icon: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Tiêu đề chính</label>
                          <input 
                            type="text"
                            value={textConfig.valueProp3Title}
                            onChange={e => setTextConfig(prev => ({ ...prev, valueProp3Title: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-bold"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Mô tả ngắn gọn</label>
                        <input 
                          type="text"
                          value={textConfig.valueProp3Desc}
                          onChange={e => setTextConfig(prev => ({ ...prev, valueProp3Desc: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PHẦN 4: THÔNG BÁO & QUY TRÌNH */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-100 space-y-3">
                    <h5 className="text-xs font-black text-[#00523b] uppercase tracking-wider border-b border-gray-100 pb-1.5">
                      💬 Quy trình đặt, Thông báo, Nút nhấn &amp; Liên hệ
                    </h5>
                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Tiêu đề Bước 1 (Chọn lượng &amp; Hẹn giờ):</label>
                      <input 
                        type="text" 
                        value={textConfig.step1Title}
                        onChange={e => setTextConfig(prev => ({ ...prev, step1Title: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Phụ đề Bước 1 (Giải thích khẩu phần):</label>
                      <textarea 
                        rows={2}
                        value={textConfig.step1Sub}
                        onChange={e => setTextConfig(prev => ({ ...prev, step1Sub: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium resize-none"
                      />
                    </div>

                    {/* Bước 2 */}
                    <div className="border-t border-gray-100 pt-3">
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Tiêu đề Bước 2 (Chọn món theo phần):</label>
                      <input 
                        type="text" 
                        value={textConfig.step2Title}
                        onChange={e => setTextConfig(prev => ({ ...prev, step2Title: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Phụ đề Bước 2 (Mô tả chọn món):</label>
                      <textarea 
                        rows={2}
                        value={textConfig.step2Sub}
                        onChange={e => setTextConfig(prev => ({ ...prev, step2Sub: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium resize-none"
                      />
                    </div>

                    {/* Xác nhận */}
                    <div className="border-t border-gray-100 pt-3">
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Tiêu đề Bước Xác nhận hóa đơn:</label>
                      <input 
                        type="text" 
                        value={textConfig.confirmTitle}
                        onChange={e => setTextConfig(prev => ({ ...prev, confirmTitle: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Phụ đề Bước Xác nhận hóa đơn:</label>
                      <textarea 
                        rows={2}
                        value={textConfig.confirmSub}
                        onChange={e => setTextConfig(prev => ({ ...prev, confirmSub: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium resize-none"
                      />
                    </div>

                    {/* Các nút bấm */}
                    <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-[#394013] mb-1">Tên nút đặt món chính:</label>
                        <input 
                          type="text" 
                          value={textConfig.startOrderBtn}
                          onChange={e => setTextConfig(prev => ({ ...prev, startOrderBtn: e.target.value }))}
                          className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium animate-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#394013] mb-1">Tên nút quay lại trang chủ:</label>
                        <input 
                          type="text" 
                          value={textConfig.homeBackBtn}
                          onChange={e => setTextConfig(prev => ({ ...prev, homeBackBtn: e.target.value }))}
                          className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium animate-none"
                        />
                      </div>
                    </div>

                    {/* Địa chỉ & Điện thoại */}
                    <div className="border-t border-gray-100 pt-3">
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Địa chỉ bếp (Hiện khi chọn Ghé lấy):</label>
                      <input 
                        type="text" 
                        value={textConfig.shopAddress}
                        onChange={e => setTextConfig(prev => ({ ...prev, shopAddress: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium animate-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Điện thoại liên hệ của bếp:</label>
                      <input 
                        type="text" 
                        value={textConfig.shopPhone}
                        onChange={e => setTextConfig(prev => ({ ...prev, shopPhone: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium animate-none"
                      />
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <label className="block text-[11px] font-bold text-[#394013] mb-1">Thông báo khi khách Đặt đơn Thành Công:</label>
                      <textarea 
                        rows={2}
                        value={textConfig.successMessage}
                        onChange={e => setTextConfig(prev => ({ ...prev, successMessage: e.target.value }))}
                        className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium resize-none"
                      />
                    </div>
                  </div>

                  {/* PHẦN 5: VAI TRÒ & HƯỚNG DẪN DEMO */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-100 space-y-4">
                    <h5 className="text-xs font-black text-[#00523b] uppercase tracking-wider border-b border-gray-100 pb-1.5">
                      💡 Tùy chỉnh Các Vai Trò &amp; Hướng dẫn Demo ở Trang Chủ
                    </h5>
                    
                    <div className="p-2.5 bg-emerald-50/50 rounded-lg space-y-3">
                      <span className="text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded font-bold text-emerald-800">1. Vai trò "Khách Hàng"</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Tên hiển thị</label>
                          <input 
                            type="text"
                            value={textConfig.roleCustomerTitle || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, roleCustomerTitle: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-bold animate-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Mô tả phụ</label>
                          <input 
                            type="text"
                            value={textConfig.roleCustomerSub || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, roleCustomerSub: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-medium animate-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-amber-50/50 rounded-lg space-y-3">
                      <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded font-bold text-amber-800">2. Vai trò "Tra Cứu Đơn"</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Tên hiển thị</label>
                          <input 
                            type="text"
                            value={textConfig.roleTrackingTitle || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, roleTrackingTitle: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-bold animate-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Mô tả phụ</label>
                          <input 
                            type="text"
                            value={textConfig.roleTrackingSub || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, roleTrackingSub: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-medium animate-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-teal-50/50 rounded-lg space-y-3">
                      <span className="text-[10px] bg-teal-100 px-1.5 py-0.5 rounded font-bold text-teal-800">3. Vai trò "Màn Hình Bếp"</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Tên hiển thị</label>
                          <input 
                            type="text"
                            value={textConfig.roleKitchenTitle || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, roleKitchenTitle: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-bold animate-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Mô tả phụ</label>
                          <input 
                            type="text"
                            value={textConfig.roleKitchenSub || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, roleKitchenSub: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-medium animate-none"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5 bg-blue-50/50 rounded-lg space-y-3">
                      <span className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded font-bold text-blue-800">4. Vai trò "Ban Quản Trị"</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Tên hiển thị</label>
                          <input 
                            type="text"
                            value={textConfig.roleAdminTitle || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, roleAdminTitle: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-bold animate-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-extrabold text-gray-500 mb-0.5">Mô tả phụ</label>
                          <input 
                            type="text"
                            value={textConfig.roleAdminSub || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, roleAdminSub: e.target.value }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none bg-white font-medium animate-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* ======================= GỢI Ý NÂNG CẤP PHÂN QUYỀN VẬN HÀNH BẾP ĐA NGƯỜI DÙNG ======================= */}
                    <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
                      <div className="flex items-center gap-1.5">
                        <span className="p-1 bg-amber-500 text-white rounded font-bold text-[10px] animate-pulse">✨ GỢI Ý NÂNG CẤP ĐA NGƯỜI DÙNG</span>
                      </div>
                      <h6 className="text-[11px] font-extrabold text-amber-900 leading-tight">
                        Mô Hình Vận Hành Phân Quyền Giữa Bếp, Nhân Viên Đóng Gói (Packer) &amp; Shipper
                      </h6>
                      <p className="text-[10px] text-amber-800/90 leading-relaxed">
                        Khi quy mô của <b>Cơm Niêu PaPi</b> mở rộng, bạn sẽ có nhiều người sử dụng chung hệ thống cùng lúc. Đây là sơ đồ thiết kế đề xuất để tối ưu hóa quy trình đóng gói &amp; giao hàng không sai sót:
                      </p>
                      
                      <div className="space-y-2 pt-1 border-t border-amber-200/50">
                        <div className="flex items-start gap-1.5 text-[10px]">
                          <span className="text-amber-600 shrink-0 mt-0.5">👨‍🍳</span>
                          <div>
                            <strong className="text-amber-950 block">1. Vai Trò Bộ Phận Bếp (Kitchen Admin):</strong>
                            <span className="text-amber-800/80">Chỉ xem danh sách món ăn cần nấu tổng hợp theo ngày (Màn hình Chế biến). Khi nấu xong món nào, đầu bếp nhấn <span className="bg-amber-100 px-1 rounded font-bold text-amber-900">"Hoàn tất nấu"</span>, trạng thái món lập tức chuyển sang chờ đóng gói.</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5 text-[10px]">
                          <span className="text-amber-600 shrink-0 mt-0.5">📦</span>
                          <div>
                            <strong className="text-amber-950 block">2. Vai Trò Nhân Viên Xếp Đơn &amp; Đóng Gói (Packer):</strong>
                            <span className="text-amber-800/80">Sử dụng màn hình riêng để quét mã đơn hoặc xem danh sách các đơn đã chuẩn bị đầy đủ món. Packer xếp bento vào túi kèm hóa đơn, gạt trạng thái đơn sang <span className="bg-amber-100 px-1 rounded font-bold text-amber-900">"Đã đóng gói - Chờ giao"</span>.</span>
                          </div>
                        </div>

                        <div className="flex items-start gap-1.5 text-[10px]">
                          <span className="text-amber-600 shrink-0 mt-0.5">🚴</span>
                          <div>
                            <strong className="text-amber-950 block">3. Vai Trò Shipper (Người giao hàng):</strong>
                            <span className="text-amber-800/80">Truy cập giao diện đơn giản trên điện thoại, chỉ hiển thị danh sách địa chỉ cần giao của hôm nay. Shipper nhận đơn đi giao, cập nhật <span className="bg-amber-100 px-1 rounded font-bold text-amber-900">"Đang giao"</span> và <span className="bg-amber-100 px-1 rounded font-bold text-amber-900">"Giao thành công"</span> để báo cáo doanh thu tức thời.</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-200/50 bg-amber-500/5 p-2 rounded-lg text-[9px] text-amber-900 leading-relaxed">
                        <p className="font-extrabold uppercase text-amber-950 mb-1">🛠️ Cách tích hợp thực tế:</p>
                        <p>• <b>Đồng bộ dữ liệu thời gian thực:</b> Nâng cấp từ LocalStorage lên cơ sở dữ liệu đám mây <b>Firebase Firestore</b> để mọi người dùng cập nhật trạng thái đơn tức thời (Real-time) không bị trễ.</p>
                        <p>• <b>Tạo tài khoản riêng:</b> Sử dụng <b>Firebase Authentication</b> để cấp tài khoản Email/Mật khẩu riêng cho từng nhân viên, ghi nhận chính xác ai là người đã nấu, người đóng gói, người giao đơn để hạn chế thất thoát hàng hóa.</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <span className="text-[10px] bg-purple-100 px-1.5 py-0.5 rounded font-bold text-purple-800 block w-fit">💡 Hướng Dẫn Trải Nghiệm Demo (Hộp màu vàng chân trang)</span>
                      <div>
                        <label className="block text-[11px] font-bold text-[#394013] mb-1">Tiêu đề khung hướng dẫn:</label>
                        <input 
                          type="text" 
                          value={textConfig.demoGuideTitle || ""}
                          onChange={e => setTextConfig(prev => ({ ...prev, demoGuideTitle: e.target.value }))}
                          className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-bold animate-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#394013] mb-1">Nội dung hướng dẫn chi tiết (Hỗ trợ xuống dòng, để trống sẽ ẩn hoàn toàn khung này):</label>
                        <textarea 
                          rows={5}
                          value={textConfig.demoGuideText || ""}
                          onChange={e => setTextConfig(prev => ({ ...prev, demoGuideText: e.target.value }))}
                          placeholder="Nếu bạn muốn ẩn khung hướng dẫn màu vàng ở trang chủ khi gửi cho khách, chỉ cần xóa sạch toàn bộ nội dung trong ô này!"
                          className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium"
                        />
                      </div>
                    </div>

                    {/* Customizable Operational Guide Fields */}
                    <div className="border-t border-gray-100 pt-3 space-y-3">
                      <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded font-bold text-amber-800 block w-fit">📖 Tùy Chỉnh Cẩm Nang Vận Hành Chi Tiết (Nút &amp; Nội Dung Modal)</span>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-[#394013] mb-1">Nút mở góc trên (Header):</label>
                          <input 
                            type="text" 
                            value={textConfig.guideBtnText || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideBtnText: e.target.value }))}
                            className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#394013] mb-1">Nút lớn màu vàng (Trang chủ):</label>
                          <input 
                            type="text" 
                            value={textConfig.guideBannerBtnText || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideBannerBtnText: e.target.value }))}
                            className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#394013] mb-1">Tiêu đề Modal:</label>
                          <input 
                            type="text" 
                            value={textConfig.guideModalTitle || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideModalTitle: e.target.value }))}
                            className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-bold"
                          />
                        </div>
                      </div>

                      {/* Customer Tab Customization */}
                      <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 space-y-2">
                        <span className="text-[10px] font-extrabold text-[#00523b]">🍛 Tab KHÁCH HÀNG:</span>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Tiêu đề Concept:</label>
                          <input 
                            type="text" 
                            value={textConfig.guideCustTitle || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideCustTitle: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-200 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Mô tả ngắn Concept:</label>
                          <textarea 
                            rows={2}
                            value={textConfig.guideCustDesc || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideCustDesc: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-200 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Các bước hướng dẫn chi tiết:</label>
                          <textarea 
                            rows={4}
                            value={textConfig.guideCustSteps || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideCustSteps: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-200 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                          />
                        </div>
                      </div>

                      {/* Admin Tab Customization */}
                      <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 space-y-2">
                        <span className="text-[10px] font-extrabold text-amber-700">⚙️ Tab ADMIN:</span>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Tiêu đề chính:</label>
                          <input 
                            type="text" 
                            value={textConfig.guideAdminTitle || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideAdminTitle: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-200 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Mô tả lưu ý:</label>
                          <textarea 
                            rows={2}
                            value={textConfig.guideAdminDesc || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideAdminDesc: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-200 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Nhiệm vụ trọng tâm của Admin:</label>
                          <textarea 
                            rows={4}
                            value={textConfig.guideAdminSteps || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideAdminSteps: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-200 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                          />
                        </div>
                      </div>

                      {/* Kitchen Tab Customization */}
                      <div className="bg-gray-50/50 p-2.5 rounded-xl border border-gray-100 space-y-2">
                        <span className="text-[10px] font-extrabold text-teal-700">👨‍🍳 Tab TỔ BẾP:</span>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Tiêu đề chính:</label>
                          <input 
                            type="text" 
                            value={textConfig.guideKitchenTitle || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideKitchenTitle: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-200 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Mô tả lưu ý:</label>
                          <textarea 
                            rows={2}
                            value={textConfig.guideKitchenDesc || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideKitchenDesc: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-200 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 mb-0.5">Nội dung hướng dẫn chi tiết:</label>
                          <textarea 
                            rows={4}
                            value={textConfig.guideKitchenSteps || ""}
                            onChange={e => setTextConfig(prev => ({ ...prev, guideKitchenSteps: e.target.value }))}
                            className="w-full px-2.5 py-1.5 border border-gray-200 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      saveTextConfig(textConfig);
                      triggerRefresh();
                      alert("🎉 Đã cập nhật và lưu toàn bộ tiêu đề, logo & các chi tiết giao diện thành công!");
                    }}
                    className="w-full py-4 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-black rounded-xl text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    Lưu Toàn Bộ Cấu Hình 💾
                  </button>
                </div>
              </div>
            </div>
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
              <label className="block text-[10px] font-bold text-[#394013] mb-0.5">Danh mục món</label>
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                className="w-full px-3 py-2.5 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium cursor-pointer"
              >
                <option value="">-- Chưa phân loại --</option>
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
            <label className="block text-[10px] font-bold text-[#394013] mb-0.5">Hình ảnh món ăn (URL hoặc Tải lên từ máy)</label>
            <div className="space-y-2">
              <input 
                type="text" 
                placeholder="https://... hoặc chuỗi dữ liệu ảnh tải lên"
                value={newImg}
                onChange={e => setNewImg(e.target.value)}
                className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
              />
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => handleImageUpload(e, false)}
                  id="add-product-image-upload"
                  className="hidden"
                />
                <label 
                  htmlFor="add-product-image-upload"
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#00523b] border border-[#00523b]/30 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                >
                  📸 Chọn ảnh từ điện thoại / máy tính
                </label>
                {newImg && (
                  <button 
                    type="button"
                    onClick={() => setNewImg("")}
                    className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>
              {newImg && (
                <div className="mt-1 border border-dashed border-[#00523b]/20 p-1.5 rounded-lg inline-block bg-white">
                  <img 
                    src={newImg} 
                    alt="Preview" 
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 object-cover rounded-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80";
                    }}
                  />
                </div>
              )}
            </div>
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
                const canProgress = ["Chờ xử lý", "Đang chế biến", "Bếp đã chuẩn bị xong", "Chờ nhận hàng/giao hàng", "Đang giao"].includes(order.status);
                const canCancel = order.status !== "Hoàn tất" && order.status !== STATUS_CANCEL;

                let nextStatusLabel = "";
                if (order.status === "Chờ xử lý") nextStatusLabel = "Duyệt & Nấu ⏱️";
                else if (order.status === "Đang chế biến") nextStatusLabel = "Đã nấu xong 🍳";
                else if (order.status === "Bếp đã chuẩn bị xong") nextStatusLabel = "Đóng gói xong 📦";
                else if (order.status === "Chờ nhận hàng/giao hàng") nextStatusLabel = "Bắt đầu giao 🛵";
                else if (order.status === "Đang giao") nextStatusLabel = "Giao xong ✓ Hoàn tất";

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

                      <button
                        onClick={() => handlePrintOrder(order)}
                        className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                        title="In hóa đơn đơn đặt hàng"
                      >
                        🖨️ In hóa đơn
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

      {/* ======================= TAB 3.5: CUSTOMER CRM SYSTEM ======================= */}
      {activeTab === 'crm' && (() => {
        // Build CRM list from orders
        const customerMap: {
          [phone: string]: {
            name: string;
            phone: string;
            totalOrders: number;
            completedOrders: number;
            canceledOrders: number;
            totalSpent: number;
            latestOrderDate: string;
            latestStatus: string;
          }
        } = {};

        orders.forEach(order => {
          const cleanPhone = order.phone.trim();
          if (!cleanPhone) return;

          if (!customerMap[cleanPhone]) {
            customerMap[cleanPhone] = {
              name: order.customerName,
              phone: cleanPhone,
              totalOrders: 0,
              completedOrders: 0,
              canceledOrders: 0,
              totalSpent: 0,
              latestOrderDate: order.receiveDate,
              latestStatus: order.status
            };
          }

          const cust = customerMap[cleanPhone];
          cust.totalOrders += 1;

          if (order.status === "Hoàn tất") {
            cust.completedOrders += 1;
            cust.totalSpent += order.totalAmount;
          } else if (order.status === "Đã Hủy") {
            cust.canceledOrders += 1;
          } else {
            // Other active statuses: we count their spending towards general trust
            cust.totalSpent += order.totalAmount;
          }

          if (order.receiveDate >= cust.latestOrderDate) {
            cust.name = order.customerName;
            cust.latestOrderDate = order.receiveDate;
            cust.latestStatus = order.status;
          }
        });

        const customerList = Object.values(customerMap).sort((a, b) => b.totalSpent - a.totalSpent);

        return (
          <div className="space-y-4">
            <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm space-y-2">
              <div className="flex justify-between items-center pb-1">
                <h4 className="font-extrabold text-sm text-[#00523b] uppercase tracking-wider flex items-center gap-1">
                  👥 Theo Dõi Khách Hàng (CRM)
                </h4>
                <span className="text-[10px] font-black text-[#00523b] bg-[#00523b]/10 px-2 py-0.5 rounded-full">
                  {customerList.length} số điện thoại
                </span>
              </div>
              <p className="text-xs text-[#394013]/80 leading-relaxed font-medium">
                Quản lý mức độ đóng góp và lòng trung thành của khách hàng. Xếp hạng dựa trên tổng số tiền đã đặt mua thành công và đang chế biến.
              </p>
            </div>

            <div className="space-y-3">
              {customerList.length === 0 ? (
                <div className="bg-[#fcfef1] p-10 rounded-2xl border border-[#00523b]/10 text-center text-[#394013]/60 font-bold text-sm">
                  Chưa có khách hàng nào đặt đơn trên hệ thống.
                </div>
              ) : (
                customerList.map((cust, idx) => {
                  const cancelRate = cust.totalOrders > 0 
                    ? Math.round((cust.canceledOrders / cust.totalOrders) * 100) 
                    : 0;

                  return (
                    <div 
                      key={cust.phone}
                      className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm hover:border-[#00523b]/30 transition duration-150 space-y-3"
                    >
                      <div className="flex justify-between items-start border-b border-gray-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-[#00523b] text-[#fffbd8] flex items-center justify-center font-black text-xs shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <h5 className="font-extrabold text-sm text-gray-800 leading-tight">{cust.name}</h5>
                            <span className="text-xs text-gray-500 font-bold tracking-wider select-all block mt-0.5">{cust.phone}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] text-gray-400 font-extrabold block uppercase tracking-wider">Tổng Đã Mua</span>
                          <span className="text-sm font-black text-[#00523b]">
                            {cust.totalSpent.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-extrabold">
                        <div className="bg-blue-50 border border-blue-100/50 p-2 rounded-xl text-blue-900 space-y-0.5">
                          <span className="text-blue-500 block text-[8px] uppercase tracking-wider">Tổng Đơn</span>
                          <span className="text-xs font-black">{cust.totalOrders} lần</span>
                        </div>
                        <div className="bg-green-50 border border-green-100/50 p-2 rounded-xl text-green-900 space-y-0.5">
                          <span className="text-green-500 block text-[8px] uppercase tracking-wider">Xong (Nhận)</span>
                          <span className="text-xs font-black">{cust.completedOrders} lần</span>
                        </div>
                        <div className="bg-red-50 border border-red-100/50 p-2 rounded-xl text-red-900 space-y-0.5">
                          <span className="text-red-500 block text-[8px] uppercase tracking-wider">Đã Hủy</span>
                          <span className="text-xs font-black">{cust.canceledOrders} lần</span>
                        </div>
                        <div className="bg-amber-50 border border-amber-100/50 p-2 rounded-xl text-amber-900 space-y-0.5">
                          <span className="text-amber-600 block text-[8px] uppercase tracking-wider">Tỉ Lệ Hủy</span>
                          <span className="text-xs font-black">{cancelRate}%</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-semibold bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <span>Lần cuối lên đơn: <strong className="text-gray-700">{cust.latestOrderDate.split('-').reverse().join('/')}</strong></span>
                        <span className="flex items-center gap-1 text-gray-600">
                          Trạng thái gần nhất: 
                          <strong className="text-[#00523b] bg-white border border-[#00523b]/10 px-1.5 py-0.5 rounded shadow-sm text-[9px]">
                            {cust.latestStatus}
                          </strong>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* ======================= TAB 4: PRODUCTION SUMMARY & BUSINESS REPORT ======================= */}
      {activeTab === 'production' && (
        <div className="space-y-4">
          <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm space-y-3">
            <label className="block text-xs font-black text-[#00523b] uppercase tracking-wider flex items-center gap-1">
              <Calendar size={14} className="text-[#00523b]" /> Chọn khoảng thời gian báo cáo
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-[#394013]/60 font-black uppercase block mb-1">Từ ngày</span>
                <input 
                  type="date"
                  value={productionStartDate}
                  onChange={e => setProductionStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-bold cursor-pointer"
                />
              </div>
              <div>
                <span className="text-[10px] text-[#394013]/60 font-black uppercase block mb-1">Đến ngày</span>
                <input 
                  type="date"
                  value={productionEndDate}
                  onChange={e => setProductionEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-bold cursor-pointer"
                />
              </div>
            </div>

            {/* Quick selectors */}
            <div className="flex gap-1.5 flex-wrap pt-1.5 border-t border-[#00523b]/10">
              <button 
                type="button"
                onClick={() => {
                  setProductionStartDate("");
                  setProductionEndDate("");
                }}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                  !productionStartDate && !productionEndDate 
                    ? "bg-[#00523b] text-white border-transparent shadow-sm" 
                    : "bg-white text-[#394013] border-gray-200 hover:bg-gray-50"
                }`}
              >
                Tất cả ngày 🌐
              </button>
              <button 
                type="button"
                onClick={() => {
                  const today = new Date().toISOString().split('T')[0];
                  setProductionStartDate(today);
                  setProductionEndDate(today);
                }}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                  productionStartDate === new Date().toISOString().split('T')[0] && productionEndDate === new Date().toISOString().split('T')[0]
                    ? "bg-[#00523b] text-white border-transparent shadow-sm" 
                    : "bg-white text-[#394013] border-gray-200 hover:bg-gray-50"
                }`}
              >
                Hôm nay 🎯
              </button>
              <button 
                type="button"
                onClick={() => {
                  const to = new Date();
                  const from = new Date();
                  from.setDate(to.getDate() - 29); // 30 days total
                  setProductionStartDate(from.toISOString().split('T')[0]);
                  setProductionEndDate(to.toISOString().split('T')[0]);
                }}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition cursor-pointer ${
                  productionStartDate && productionEndDate && (new Date(productionEndDate).getTime() - new Date(productionStartDate).getTime() >= 28 * 24 * 3600 * 1000)
                    ? "bg-[#00523b] text-white border-transparent shadow-sm" 
                    : "bg-white text-[#394013] border-gray-200 hover:bg-gray-50"
                }`}
              >
                30 ngày gần đây 📅
              </button>
            </div>
          </div>

          <div className="bg-[#fcfef1] p-5 rounded-2xl border border-[#00523b]/15 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-[#00523b]/10 pb-2">
              <h4 className="font-extrabold text-sm text-[#00523b] uppercase tracking-wider">
                💰 Báo cáo Doanh Thu &amp; Chi Phí
              </h4>
              <span className="text-[10px] font-bold bg-[#00523b]/10 text-[#00523b] px-2.5 py-0.5 rounded-full">
                {(!productionStartDate && !productionEndDate) 
                  ? "Tất cả các ngày" 
                  : `${productionStartDate ? productionStartDate.split('-').reverse().join('/') : 'Trước'} - ${productionEndDate ? productionEndDate.split('-').reverse().join('/') : 'Sau'}`}
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
                    <span className="text-[9px] font-bold text-green-700 block uppercase tracking-wider">Doanh Thu (Hoàn tất)</span>
                    <span className="text-xs font-black text-green-800 block mt-0.5">
                      {prodStats.totalSellingSum.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="bg-red-50 border border-red-200/50 p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-red-700 block uppercase tracking-wider">Chi Phí (Hoàn tất)</span>
                    <span className="text-xs font-black text-red-800 block mt-0.5">
                      {prodStats.totalCostSum.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  <div className="bg-[#00523b]/10 border border-[#00523b]/20 p-2.5 rounded-xl">
                    <span className="text-[9px] font-bold text-[#00523b] block uppercase tracking-wider">Lợi Nhuận Thực</span>
                    <span className="text-xs font-black text-[#00523b] block mt-0.5">
                      {prodStats.totalProfit.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                </div>

                {/* Packaging count & Ingredient budget */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-teal-50 border-l-3 border-teal-600 p-2.5 rounded-r-xl text-[11px] flex justify-between items-center font-bold text-[#394013]">
                    <span>Tổng hộp đóng cơm:</span>
                    <span className="text-teal-950 font-black">{prodStats.totalPortionsCount} chiếc</span>
                  </div>
                  <div className="bg-amber-50 border-l-3 border-amber-600 p-2.5 rounded-r-xl text-[11px] flex justify-between items-center font-bold text-[#394013]">
                    <span>Tiền mua nguyên liệu:</span>
                    <span className="text-amber-950 font-black">{(prodStats.totalIngredientCostNeed || 0).toLocaleString("vi-VN")}đ</span>
                  </div>
                </div>

                {/* Detailed Products Margin Table */}
                <div className="space-y-2">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Bảng định lượng chi tiết sản lượng</span>
                  <div className="space-y-1.5">
                    {prodStats.items.map(it => (
                      <div key={it.product.id} className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col gap-1.5 text-xs">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-[#394013]">{it.product.name}</span>
                          <div className="flex gap-1.5">
                            <span className="text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded text-[9px] font-bold">Cần làm: {it.qtyActive} phần</span>
                            {it.qtyCompleted > 0 && (
                              <span className="text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded text-[9px] font-bold">Đã hoàn thành: {it.qtyCompleted} phần</span>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 font-semibold pt-1 border-t border-gray-50">
                          <span>Nguyên liệu: {it.totalWeightActive} {it.product.unit === 'g' || it.product.unit === 'gram' ? 'g' : it.product.unit} (chi phí: {it.itemRawCostActive.toLocaleString("vi-VN")}đ)</span>
                          {it.qtyCompleted > 0 ? (
                            <>
                              <span>Doanh thu: {it.totalRevenueCompleted.toLocaleString("vi-VN")}đ</span>
                              <span className="text-green-700 font-bold">Lãi: +{it.itemProfitCompleted.toLocaleString("vi-VN")}đ</span>
                            </>
                          ) : (
                            <span className="text-gray-400">Chưa có đơn hoàn tất</span>
                          )}
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
          {/* ======================= SAO LƯU & KHÔI PHỤC HỆ THỐNG ======================= */}
          <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm text-[#00523b] flex items-center gap-1.5 uppercase tracking-wider">
              💾 Sao Lưu & Khôi Phục Hệ Thống (Tránh Mất Dữ Liệu)
            </h4>
            <p className="text-xs text-[#394013]/80 leading-relaxed font-medium">
              Bạn lo lắng mất dữ liệu (đơn hàng, danh sách món ăn, cài đặt câu chữ) khi nâng cấp hệ thống hoặc thay đổi link web? 
              Hãy tải file sao lưu (.json) dưới đây để lưu lại và khôi phục (import) nhanh chóng bất cứ lúc nào!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Xuất dữ liệu */}
              <button
                type="button"
                onClick={exportAllData}
                className="py-3 px-4 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-black rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
              >
                📥 Tải File Sao Lưu Hệ Thống (.json)
              </button>

              {/* Nhập dữ liệu */}
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={importAllData}
                  id="import-backup-file"
                  className="hidden"
                />
                <label
                  htmlFor="import-backup-file"
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
                >
                  📤 Khôi Phục Từ File Sao Lưu (.json)
                </label>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 italic text-center font-bold">
              💡 Khuyên dùng: Nên tải và cất giữ file backup này về máy tính cá nhân trước mỗi lần nâng cấp web!
            </p>
          </div>

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
                        address: "Địa chỉ Thử nghiệm PaPi(ml)",
                        notes: "Đây là đơn thử nghiệm kiểm tra kết nối Google Sheet",
                        status: "Chờ xử lý",
                        portionsCount: 1,
                        totalAmount: 35000,
                        portions: [[{ id: "TEST", name: "Cơm Gà Thử Nghiệm", qty: 1, price: 35000 }]]
                      };
                      await sendToGoogleSheets("NEW_ORDER", testOrder);
                      alert("✉️ Đã gửi tín hiệu thử nghiệm! Hãy kiểm tra Google Sheet & Hộp thư Email của bạn để xem dòng dữ liệu mới nhé!");
                    }}
                    className="py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    Gửi Thử Nghiệm ⚡
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ======================= QUẢN LÝ TÀI KHOẢN & THÔNG BÁO ======================= */}
          <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm text-[#00523b] flex items-center gap-1.5 uppercase tracking-wider">
              🔐 Tài Khoản Đăng Nhập & Email Thông Báo
            </h4>
            <p className="text-xs text-[#394013]/80 leading-relaxed font-medium">
              Tự do thay đổi số điện thoại và mật khẩu đăng nhập của Admin, màn hình Bếp và cấu hình Email nhận thông báo tự động mỗi khi có khách đặt món!
            </p>

            {/* Phần 1: Tài khoản */}
            <div className="space-y-3 border-t border-[#00523b]/10 pt-3">
              <h5 className="text-[11px] font-black text-[#00523b] uppercase tracking-wider">
                👥 Thay đổi tài khoản hệ thống:
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Admin */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-2">
                  <span className="text-[10px] font-extrabold text-amber-800 uppercase block">🛡️ Tài khoản Admin (Quản trị)</span>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Số điện thoại đăng nhập:</label>
                    <input 
                      type="text" 
                      value={adminPhone}
                      onChange={e => setAdminPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#00523b]/15 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Mật khẩu:</label>
                    <input 
                      type="text" 
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#00523b]/15 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    />
                  </div>
                </div>

                {/* Kitchen */}
                <div className="bg-white p-3 rounded-xl border border-gray-100 space-y-2">
                  <span className="text-[10px] font-extrabold text-teal-800 uppercase block">🍳 Tài khoản Bếp (Màn hình nấu)</span>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Số điện thoại đăng nhập:</label>
                    <input 
                      type="text" 
                      value={kitchenPhone}
                      onChange={e => setKitchenPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#00523b]/15 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Mật khẩu:</label>
                    <input 
                      type="text" 
                      value={kitchenPassword}
                      onChange={e => setKitchenPassword(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-[#00523b]/15 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!adminPhone.trim() || !adminPassword.trim() || !kitchenPhone.trim() || !kitchenPassword.trim()) {
                    alert("❌ Vui lòng điền đầy đủ thông tin số điện thoại và mật khẩu!");
                    return;
                  }
                  const updatedAccounts = [
                    { phone: adminPhone.trim(), password: adminPassword.trim(), role: "ADMIN" as const, name: "Quản trị" },
                    { phone: kitchenPhone.trim(), password: kitchenPassword.trim(), role: "KITCHEN" as const, name: "Bếp" }
                  ];
                  saveAccounts(updatedAccounts);
                  alert("🎉 Đã lưu thông tin tài khoản mới thành công! Từ giờ hãy dùng thông tin này để đăng nhập hệ thống.");
                }}
                className="w-full py-2 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-lg text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                Cập Nhật Tài Khoản Đăng Nhập 💾
              </button>
            </div>

            {/* Phần 2: Email */}
            <div className="space-y-3 border-t border-[#00523b]/10 pt-3">
              <h5 className="text-[11px] font-black text-[#00523b] uppercase tracking-wider">
                ✉️ Email nhận thông báo đơn hàng:
              </h5>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 mb-1">Địa chỉ Email nhận tin nhắn:</label>
                <input 
                  type="email" 
                  placeholder="nhap_email_cua_ban@gmail.com"
                  value={adminNotificationEmail}
                  onChange={e => setAdminNotificationEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-xl text-xs outline-none bg-white font-medium"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const val = adminNotificationEmail.trim();
                  if (val && val.indexOf("@") === -1) {
                    alert("❌ Địa chỉ Email không hợp lệ!");
                    return;
                  }
                  localStorage.setItem("papimeal_admin_email", val);
                  syncConfigToFirestore();
                  alert("🎉 Đã lưu email thông báo đơn hàng: " + (val || "(Trống - Tắt thông báo)") + "!");
                }}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs shadow-sm transition cursor-pointer"
              >
                Lưu Cấu Hình Email 💾
              </button>

              <div className="bg-amber-50 border border-amber-200/50 p-2.5 rounded-lg text-[10px] text-amber-900 leading-relaxed space-y-1">
                <p className="font-extrabold text-amber-950 uppercase">💡 HƯỚNG DẪN ĐỂ EMAIL HOẠT ĐỘNG:</p>
                <p>1. Cơm Niêu PaPi sử dụng chính hạ tầng Google Apps Script miễn phí của bạn để gửi email tốc độ cao.</p>
                <p>2. Khi bạn cập nhật email ở đây, hãy sao chép mẫu <b>Google Apps Script</b> ở khung phía dưới và dán đè/cập nhật lên script hiện tại của bạn.</p>
                <p>3. Chọn <b>Deploy (Triển khai)</b> và <b>New Deployment (Triển khai mới)</b> trên Google Sheets để lưu phiên bản mới nhất.</p>
              </div>
            </div>
          </div>

          {/* ======================= CHỈNH SỬA TIÊU ĐỀ & CÂU CHỮ ======================= */}
          <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm space-y-4">
            <p className="text-xs text-[#394013]/80 leading-relaxed font-medium">
              Cài đặt câu chữ và giao diện đã được chuyển sang tab <b>Giao diện</b> 🖼️ để quản lý tập trung và khoa học hơn. Hãy sử dụng tab Giao diện ở menu trên để chỉnh sửa các thông tin này!
            </p>

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

      {/* ======================= TAB 7: STAFF ACCOUNTS MANAGEMENT ======================= */}
      {activeTab === 'accounts' && loggedInRole === 'ADMIN' && (
        <div className="space-y-4">
          <div className="bg-[#fcfef1] p-4 rounded-xl border border-[#00523b]/10 shadow-sm space-y-4">
            <h4 className="font-extrabold text-sm text-[#00523b] flex items-center gap-1.5 uppercase tracking-wider">
              👥 QUẢN LÝ TÀI KHOẢN NHÂN SỰ
            </h4>
            <p className="text-xs text-[#394013]/80 leading-relaxed font-medium">
              Bạn có thể tự tạo tài khoản (SĐT và Mật khẩu) để cung cấp cho từng nhân viên (Bếp, Nhân viên đóng gói, Shipper). 
              Nhân viên sẽ sử dụng SĐT và mật khẩu này để đăng nhập vào đúng màn hình làm việc của họ.
            </p>

            {/* Form thêm tài khoản mới */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newAccPhone.trim() || !newAccPassword.trim() || !newAccName.trim()) {
                  alert("❌ Vui lòng nhập đầy đủ thông tin: SĐT, Mật khẩu và Tên nhân viên!");
                  return;
                }
                const phoneClean = newAccPhone.trim().replace(/\D/g, "");
                const exist = accountsList.find(a => a.phone === phoneClean);
                if (exist) {
                  alert(`❌ SĐT ${newAccPhone} đã được dùng cho tài khoản "${exist.name}". Hãy dùng SĐT khác!`);
                  return;
                }
                const updatedList = [
                  ...accountsList,
                  {
                    phone: phoneClean,
                    password: newAccPassword.trim(),
                    role: newAccRole,
                    name: newAccName.trim()
                  }
                ];
                setAccountsList(updatedList);
                saveAccounts(updatedList);
                // Clear inputs
                setNewAccPhone("");
                setNewAccPassword("");
                setNewAccName("");
                alert("🎉 Đã thêm tài khoản nhân sự mới thành công!");
              }}
              className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3"
            >
              <span className="text-[10px] uppercase tracking-widest bg-[#00523b]/10 text-[#00523b] px-2.5 py-1 rounded-full font-extrabold block w-fit">
                ➕ Thêm tài khoản mới
              </span>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Tên nhân viên / Bộ phận *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Anh Quân (Shipper Q1)"
                    value={newAccName}
                    onChange={e => setNewAccName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Số điện thoại (dùng làm Tài khoản) *</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 0922333444"
                    value={newAccPhone}
                    onChange={e => setNewAccPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Mật khẩu đăng nhập *</label>
                  <input
                    type="text"
                    placeholder="Nhập mật khẩu dễ nhớ"
                    value={newAccPassword}
                    onChange={e => setNewAccPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Vai trò vận hành *</label>
                  <select
                    value={newAccRole}
                    onChange={e => setNewAccRole(e.target.value as any)}
                    className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium cursor-pointer"
                  >
                    <option value="ADMIN">Chủ quán (Toàn quyền Admin) 👑</option>
                    <option value="KITCHEN">Đầu bếp (Chỉ xem bếp nấu) 👨‍🍳</option>
                    <option value="PACKER">Nhân viên Đóng Gói đơn hàng 📦</option>
                    <option value="SHIPPER">Shipper Giao hàng 🛵</option>
                  </select>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full py-2.5 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-lg text-xs shadow-sm transition cursor-pointer"
              >
                Cấp Tài Khoản Nhân Viên 👤
              </button>
            </form>

            {/* Danh sách tài khoản hiện có */}
            <div className="space-y-2.5 pt-2">
              <span className="text-[10px] uppercase tracking-widest text-[#394013]/60 font-black block">
                👥 DANH SÁCH TÀI KHOẢN HIỆN TẠI ({accountsList.length})
              </span>
              
              <div className="grid grid-cols-1 gap-2">
                {accountsList.map((acc, idx) => (
                  <div key={acc.phone} className="bg-white border border-gray-200/80 p-3.5 rounded-xl flex justify-between items-center shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-sm text-[#00523b]">{acc.name}</span>
                        <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                          acc.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                          acc.role === 'KITCHEN' ? 'bg-amber-100 text-amber-800' :
                          acc.role === 'PACKER' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {acc.role === 'ADMIN' ? 'Chủ quán' :
                           acc.role === 'KITCHEN' ? 'Tổ Bếp' :
                           acc.role === 'PACKER' ? 'Đóng Gói' : 'Shipper'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 font-semibold space-y-0.5">
                        <p>📞 SĐT (Tài khoản): <strong className="text-gray-800">{acc.phone}</strong></p>
                        <p>🔑 Mật khẩu: <strong className="text-gray-800 font-mono bg-gray-50 px-1 py-0.5 rounded border border-gray-100 text-[11px]">{acc.password}</strong></p>
                      </div>
                    </div>
                    
                    {/* Nút xóa tài khoản - không cho xóa tài khoản gốc/admin hiện tại */}
                    {acc.phone !== "0901464021" ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn XÓA tài khoản của "${acc.name}" không?`)) {
                            const updatedList = accountsList.filter(a => a.phone !== acc.phone);
                            setAccountsList(updatedList);
                            saveAccounts(updatedList);
                            alert("🗑️ Đã xóa tài khoản thành công!");
                          }
                        }}
                        className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600 transition text-[10px] font-bold cursor-pointer border border-red-200"
                        title="Xóa tài khoản"
                      >
                        Xóa 🗑️
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 italic">Mặc định 🔒</span>
                    )}
                  </div>
                ))}
              </div>
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
                    <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Danh mục</label>
                    <select
                      value={editCat}
                      onChange={e => setEditCat(e.target.value)}
                      className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium cursor-pointer"
                    >
                      <option value="">-- Chưa phân loại --</option>
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
                  <label className="block text-[10px] font-bold text-gray-400 mb-0.5">Hình ảnh món ăn (URL hoặc Tải lên từ máy)</label>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      value={editImg}
                      onChange={e => setEditImg(e.target.value)}
                      className="w-full px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    />
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => handleImageUpload(e, true)}
                        id="edit-product-image-upload"
                        className="hidden"
                      />
                      <label 
                        htmlFor="edit-product-image-upload"
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#00523b] border border-[#00523b]/30 rounded-lg text-[10px] font-bold cursor-pointer transition flex items-center gap-1"
                      >
                        📸 Chọn ảnh từ điện thoại / máy tính
                      </label>
                      {editImg && (
                        <button 
                          type="button"
                          onClick={() => setEditImg("")}
                          className="text-red-500 text-[10px] font-bold hover:underline cursor-pointer"
                        >
                          Xóa ảnh
                        </button>
                      )}
                    </div>
                    {editImg && (
                      <div className="mt-1 border border-dashed border-[#00523b]/20 p-1.5 rounded-lg inline-block bg-white">
                        <img 
                          src={editImg} 
                          alt="Preview" 
                          referrerPolicy="no-referrer"
                          className="h-16 w-16 object-cover rounded-md"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80";
                          }}
                        />
                      </div>
                    )}
                  </div>
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

      {/* ======================= CATEGORY MANAGEMENT MODAL ======================= */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                <h4 className="font-extrabold text-sm text-[#00523b] flex items-center gap-1.5">📂 Quản lý danh mục ({categories.length})</h4>
                <button 
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCatId(null);
                  }} 
                  className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg cursor-pointer transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form thêm mới danh mục */}
              <form onSubmit={handleAddCategory} className="bg-[#00523b]/5 p-3 rounded-xl border border-[#00523b]/10 space-y-2">
                <label className="block text-[10px] font-black text-[#00523b] uppercase tracking-wider">
                  ➕ Thêm danh mục món mới:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ví dụ: Lẩu & Súp 🍲"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="flex-1 px-3 py-2 border border-[#00523b]/20 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-medium"
                    required
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#00523b] hover:bg-[#003d2b] text-[#fffbd8] font-bold rounded-lg text-xs transition cursor-pointer"
                  >
                    Thêm
                  </button>
                </div>
              </form>

              {/* Danh sách danh mục */}
              <div className="space-y-2.5">
                <span className="block text-[10px] font-black text-gray-400 uppercase tracking-wider">
                  Danh mục hiện tại:
                </span>
                
                {categories.length === 0 ? (
                  <div className="text-center py-4 text-xs text-gray-400 font-bold">
                    Chưa có danh mục nào. Hãy thêm danh mục mới!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {categories.map(cat => {
                      const count = products.filter(p => p.category === cat.id).length;
                      const isEditingThis = editingCatId === cat.id;

                      return (
                        <div 
                          key={cat.id} 
                          className="flex items-center justify-between p-2.5 bg-[#fcfef1] rounded-xl border border-[#00523b]/10 shadow-sm gap-2"
                        >
                          {isEditingThis ? (
                            <div className="flex-1 flex gap-1.5 items-center">
                              <input
                                type="text"
                                value={editingCatName}
                                onChange={e => setEditingCatName(e.target.value)}
                                className="flex-1 px-2 py-1.5 border border-[#00523b]/30 focus:border-[#00523b] rounded-lg text-xs outline-none bg-white font-semibold"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveEditCategory(cat.id)}
                                className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer"
                                title="Lưu"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCatId(null);
                                  setEditingCatName("");
                                }}
                                className="p-1.5 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition cursor-pointer"
                                title="Hủy"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-bold text-gray-800 truncate block">{cat.name}</span>
                                <span className="text-[9px] text-gray-400 font-bold">({count} món ăn)</span>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEditCategory(cat)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                  title="Đổi tên danh mục"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCategory(cat.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                                  title="Xóa danh mục"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-gray-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCatId(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Đóng lại
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
                        {portion.map(item => {
                          const prod = products.find(p => p.id === item.id);
                          const cat = prod ? categories.find(c => c.id === prod.category) : undefined;
                          const catName = cat ? cat.name : item.categoryName || "";
                          return (
                            <div key={item.id} className="flex justify-between items-center text-xs font-medium py-0.5">
                              <span className="flex items-center gap-1.5 flex-wrap">
                                <span>{item.name}</span>
                                {catName && (
                                  <span className="inline-block text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                                    {catName}
                                  </span>
                                )}
                                <span className="font-bold text-[#00523b]">x{item.qty}</span>
                              </span>
                              <span>{(item.qty * item.price).toLocaleString("vi-VN")}đ</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="pt-1.5 border-t border-dotted border-[#00523b]/10 flex justify-between text-xs font-extrabold text-[#00523b]">
                        <span>Cộng phần này:</span>
                        <span>{portTotal.toLocaleString("vi-VN")}đ</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintOrder(selectedOrderDetails)}
                  className="flex-1 py-2.5 bg-amber-500 text-white hover:bg-amber-600 rounded-lg text-xs font-extrabold transition cursor-pointer flex items-center justify-center gap-1 shadow-sm"
                >
                  🖨️ In hóa đơn
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderDetailId(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
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
