import { Product, Category } from "../types";

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "MON_CHINH", name: "Món Chính 🍛" },
  { id: "MON_PHU", name: "Món Phụ & Canh 🥗" },
  { id: "TRANG_MIENG", name: "Tráng Miệng 🍮" },
  { id: "NUOC_UONG", name: "Nước Uống 🥤" }
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "TOM_LUOC",
    name: "Tôm Sú Luộc Nước Dừa",
    category: "MON_CHINH",
    description: "Tôm sú tươi sống luộc ngọt lịm cùng nước dừa xiêm tự nhiên, đi kèm muối tiêu chanh ớt siêu cuốn.",
    weight: 200,
    unit: "g",
    cost: 45000,
    fee: 5000,
    price: 65000,
    oldPrice: 75000,
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=300&q=80",
    status: "Đang bán",
    note: "Nguyên liệu tươi mua trong ngày"
  },
  {
    id: "COM_TAM",
    name: "Cơm Tấm Sườn Bì Chả PaPi",
    category: "MON_CHINH",
    description: "Sườn nướng mật ong thơm phức, bì trộn thính gạo rang tay, chả trứng chưng mềm mọng chuẩn vị Sài Gòn.",
    weight: 450,
    unit: "phần",
    cost: 25000,
    fee: 5000,
    price: 45000,
    oldPrice: 0,
    image: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?auto=format&fit=crop&w=300&q=80",
    status: "Đang bán",
    note: "Bán chạy nhất"
  },
  {
    id: "GA_KHO_GUNG",
    name: "Gà Ta Kho Gừng Sợi",
    category: "MON_CHINH",
    description: "Thịt gà ta săn chắc kho đậm đà cùng gừng non thái sợi ấm nồng, đưa cơm cực kỳ trong những ngày mưa.",
    weight: 250,
    unit: "g",
    cost: 22000,
    fee: 4000,
    price: 40000,
    oldPrice: 45000,
    image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=300&q=80",
    status: "Đang bán",
    note: "Dành cho thực đơn trưa văn phòng"
  },
  {
    id: "CANH_CHUA",
    name: "Canh Chua Cá Lóc Đồng",
    category: "MON_PHU",
    description: "Nước canh chua cay đậm đà với bạc hà, cà chua, thơm, giá đỗ và cá lóc đồng ngọt thịt rắc ngò gai tỏi phi.",
    weight: 350,
    unit: "ml",
    cost: 18000,
    fee: 3000,
    price: 35000,
    oldPrice: 0,
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=300&q=80",
    status: "Đang bán",
    note: "Vị chua thanh mát lành"
  },
  {
    id: "CHE_DUONG_NHAN",
    name: "Chè Dưỡng Nhan Tuyết Yến",
    category: "TRANG_MIENG",
    description: "Gồm tuyết yến, nhựa đào, bồ mễ, kỷ tử, táo đỏ, long nhãn và hạt sen hầm nhừ ngọt thanh mát lạnh mát da.",
    weight: 250,
    unit: "ml",
    cost: 12000,
    fee: 2000,
    price: 25000,
    oldPrice: 30000,
    image: "https://images.unsplash.com/photo-1511081692775-05d0f180a419?auto=format&fit=crop&w=300&q=80",
    status: "Đang bán",
    note: "Món tráng miệng healthy"
  },
  {
    id: "TRA_SUA",
    name: "Trà Sữa PaPi Trân Châu Đường Đen",
    category: "NUOC_UONG",
    description: "Trà sữa đậm vị trà ô long kết hợp sữa béo ngậy cùng trân châu đen dai giòn ngọt lịm đường đen.",
    weight: 500,
    unit: "ml",
    cost: 8000,
    fee: 2000,
    price: 20000,
    oldPrice: 0,
    image: "https://images.unsplash.com/photo-1541658016709-82535e94bc69?auto=format&fit=crop&w=300&q=80",
    status: "Đang bán",
    note: "Luôn nấu mới mỗi ngày"
  }
];
