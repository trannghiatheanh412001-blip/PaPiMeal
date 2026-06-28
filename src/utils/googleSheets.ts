import { Order, Product, Category, StatusLog } from "../types";
import { syncConfigToFirestore } from "./firebaseSync";
import { loadProducts, loadCategories, loadOrders, loadLogs } from "./storage";

const GOOGLE_SHEETS_URL_KEY = "papimeal_google_sheet_url";

export function getGoogleSheetsUrl(): string {
  return localStorage.getItem(GOOGLE_SHEETS_URL_KEY) || "";
}

export function saveGoogleSheetsUrl(url: string) {
  localStorage.setItem(GOOGLE_SHEETS_URL_KEY, url.trim());
  syncConfigToFirestore();
}

export async function sendToGoogleSheets(actionType: "NEW_ORDER" | "UPDATE_STATUS" | "BULK_SYNC", order?: Order) {
  const url = getGoogleSheetsUrl();
  if (!url) return;

  try {
    // 1. Prepare portion text for legacy email notifications
    let portionsText = "";
    if (order && order.portions) {
      portionsText = order.portions.map((portion, idx) => {
        const itemsStr = portion.map(it => `${it.name} (x${it.qty})`).join(", ");
        return `[Khẩu phần ${idx + 1}]: ${itemsStr}`;
      }).join(" | ");
    }

    // 2. Load all entities for multi-tab synchronization
    const products = loadProducts();
    const categories = loadCategories();
    const orders = loadOrders();
    const logs = loadLogs();

    // 3. Table 1: San_Pham
    const sanPhamRows: any[][] = [
      ["Ma_San_Pham", "Ten_San_Pham", "Ma_Danh_Muc", "Mo_Ta", "Dinh_Luong", "Don_Vi_Tinh", "Gia_Nhap", "Phi_Che_Bien", "Gia_Thanh_Pham", "Gia_Cu", "Hinh_Anh", "Trang_Thai", "Ghi_Chu_Noi_Bo"],
      ...products.map(p => [
        p.id,
        p.name,
        p.category,
        p.description || "",
        p.weight,
        p.unit,
        p.cost,
        p.fee,
        p.price,
        p.oldPrice || 0,
        p.image || "",
        p.status,
        p.note || ""
      ])
    ];

    // 4. Table 2: Don_Hang
    const donHangRows: any[][] = [
      ["Ma_Don_Hang", "Ngay_Tao_Don", "Thoi_Gian_Tao_Don", "Ten_Khach_Hang", "So_Dien_Thoai", "Ngay_Nhan_Mon", "Gio_Nhan_Mon", "Buoi_Nhan_Mon", "Phuong_Thuc_Nhan", "Dia_Chi_Nhan", "So_Luong_Khau_Phan", "Tong_Don_Hang", "Ghi_Chu_Khach_Hang", "Trang_Thai_Don_Hang"],
      ...orders.map(o => [
        o.id,
        o.createdAt,
        o.createdTime,
        o.customerName,
        o.phone,
        o.receiveDate,
        o.receiveTime,
        o.session,
        o.deliveryMethod,
        o.address || "",
        o.portionsCount,
        o.totalAmount,
        o.notes || "",
        o.status
      ])
    ];

    // 5. Table 3: Chi_Tiet_Don_Hang
    const chiTietRows: any[][] = [
      ["ID_Chi_Tiet", "Ma_Don_Hang", "Khau_Phan_So", "Ma_San_Pham", "Ten_San_Pham", "So_Luong", "Gia_Ban", "Thanh_Tien"]
    ];
    orders.forEach(o => {
      o.portions.forEach((portion, pIdx) => {
        portion.forEach(item => {
          chiTietRows.push([
            `${o.id}-${pIdx+1}-${item.id}`,
            o.id,
            pIdx + 1,
            item.id,
            item.name,
            item.qty,
            item.price,
            item.qty * item.price
          ]);
        });
      });
    });

    // 6. Table 4: Danh_Muc
    const danhMucRows: any[][] = [
      ["Ma_Danh_Muc", "Ten_Danh_Muc"],
      ...categories.map(c => [
        c.id,
        c.name
      ])
    ];

    // 7. Table 5: Khach_Hang (CRM stats computed live)
    const khachHangMap: { [phone: string]: { name: string; address: string; count: number; total: number; lastDate: string } } = {};
    orders.forEach(o => {
      const phone = o.phone.trim();
      if (!phone) return;
      if (!khachHangMap[phone]) {
        khachHangMap[phone] = {
          name: o.customerName,
          address: o.address || "",
          count: 0,
          total: 0,
          lastDate: o.receiveDate
        };
      }
      const curr = khachHangMap[phone];
      curr.count += 1;
      curr.total += o.totalAmount;
      if (o.receiveDate > curr.lastDate) {
        curr.lastDate = o.receiveDate;
        curr.address = o.address || curr.address;
        curr.name = o.customerName || curr.name;
      }
    });
    const khachHangRows: any[][] = [
      ["So_Dien_Thoai", "Ten_Khach_Hang", "Dia_Chi_Mac_Dinh", "So_Lan_Mua", "Tong_Chi_Tieu", "Ngay_Mua_Gan_Nhat"],
      ...Object.entries(khachHangMap).map(([phone, data]) => [
        phone,
        data.name,
        data.address,
        data.count,
        data.total,
        data.lastDate
      ])
    ];

    // 8. Table 6: Lich_Su_Trang_Thai
    const lichSuRows: any[][] = [
      ["ID_Log", "Ma_Don_Hang", "Trang_Thai_Cu", "Trang_Thai_Moi", "Nguoi_Cap_Nhat", "Thoi_Gian_Cap_Nhat"],
      ...logs.map(l => [
        l.id,
        l.orderId,
        l.oldStatus || "",
        l.newStatus,
        l.updatedBy || "Hệ thống",
        l.timestamp
      ])
    ];

    // 9. Table 7: Tong_Hop_San_Xuat (aggregated list of items to cook per day & session)
    const prodGroup: { [key: string]: { date: string; session: string; prodId: string; name: string; qty: number } } = {};
    orders.filter(o => o.status !== "Đã Hủy").forEach(o => {
      o.portions.forEach(portion => {
        portion.forEach(item => {
          const k = `${o.receiveDate}_${o.session}_${item.id}`;
          if (!prodGroup[k]) {
            prodGroup[k] = {
              date: o.receiveDate,
              session: o.session,
              prodId: item.id,
              name: item.name,
              qty: 0
            };
          }
          prodGroup[k].qty += item.qty;
        });
      });
    });
    const tongHopRows: any[][] = [
      ["Ngay_Giao", "Buoi_Giao", "Ma_San_Pham", "Ten_San_Pham", "Tong_So_Luong_Can_Lam"],
      ...Object.values(prodGroup).map(g => [
        g.date,
        g.session,
        g.prodId,
        g.name,
        g.qty
      ])
    ];

    // 10. Table 8: Ke_Hoach_Nguyen_Lieu (aggregated weights of raw materials to purchase per day & session)
    const ingGroup: { [key: string]: { date: string; session: string; name: string; weight: number; unit: string } } = {};
    const productMap: { [id: string]: Product } = {};
    products.forEach(p => { productMap[p.id] = p; });

    orders.filter(o => o.status !== "Đã Hủy").forEach(o => {
      o.portions.forEach(portion => {
        portion.forEach(item => {
          const p = productMap[item.id];
          if (!p) return;
          const k = `${o.receiveDate}_${o.session}_${p.name}`;
          if (!ingGroup[k]) {
            ingGroup[k] = {
              date: o.receiveDate,
              session: o.session,
              name: p.name,
              weight: 0,
              unit: p.unit === "phần" ? "g" : p.unit
            };
          }
          ingGroup[k].weight += item.qty * p.weight;
        });
      });
    });
    const nguyenLieuRows: any[][] = [
      ["Ngay_Giao", "Buoi_Giao", "Ten_Nguyen_Lieu", "Tong_Khoi_Luong_Can_Mua", "Don_Vi_Tinh"],
      ...Object.values(ingGroup).map(g => [
        g.date,
        g.session,
        g.name,
        g.weight,
        g.unit
      ])
    ];

    // Format final multi-tab package payload
    const payload = {
      action: actionType,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      orderId: order?.id || "",
      customerName: order?.customerName || "",
      phone: order?.phone || "",
      receiveDate: order?.receiveDate || "",
      receiveTime: order?.receiveTime || "",
      session: order?.session || "",
      deliveryMethod: order?.deliveryMethod || "",
      address: order?.address || "",
      notes: order?.notes || "",
      status: order?.status || "",
      portionsCount: order?.portionsCount || 0,
      totalAmount: order?.totalAmount || 0,
      portionsText,
      adminNotificationEmail: localStorage.getItem("papimeal_admin_email") || "",
      sheets: {
        "San_Pham": sanPhamRows,
        "Don_Hang": donHangRows,
        "Chi_Tiet_Don_Hang": chiTietRows,
        "Danh_Muc": danhMucRows,
        "Khach_Hang": khachHangRows,
        "Lich_Su_Trang_Thai": lichSuRows,
        "Tong_Hop_San_Xuat": tongHopRows,
        "Ke_Hoach_Nguyen_Lieu": nguyenLieuRows
      }
    };

    // Post to Google Apps Script Web App
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(payload)
    });
    console.log(`[Google Sheets Multi-Sync] Bulk synced 8 sheets successfully. Action: ${actionType}${order ? ` for order: ${order.id}` : ""}`);
  } catch (error) {
    console.error("[Google Sheets Multi-Sync] Error during sync process:", error);
  }
}

export const APPS_SCRIPT_TEMPLATE = `/**
 * GOOGLE APPS SCRIPT CHO HỆ THỐNG QUẢN LÝ PAPIMEAL
 * Đồng bộ tự động 8 Tab dữ liệu thời gian thực và tự động gửi Email báo đơn mới.
 * 
 * Hướng dẫn sử dụng:
 * 1. Mở file Google Sheet của bạn.
 * 2. Chọn Tiện ích mở rộng (Extensions) -> Trình chỉnh sửa Apps Script (Apps Script).
 * 3. Xóa hết code cũ, dán toàn bộ đoạn code này vào.
 * 4. Nhấn Lưu và chọn Triển khai (Deploy) -> Triển khai mới (New Deployment).
 * 5. Chọn loại triển khai là "Ứng dụng web" (Web App).
 * 6. Mục "Ai có quyền truy cập" (Who has access) chọn "Bất kỳ ai" (Anyone).
 * 7. Nhấn Triển khai, cấp quyền truy cập tài khoản, và COPY URL Triển khai dán vào Website Quản trị PaPi(ml)!
 */

function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- PHẦN 1: ĐỒNG BỘ 8 TAB DỮ LIỆU ĐỒNG THỜI (BULK SYNC) ---
    if (data.sheets) {
      for (var sheetName in data.sheets) {
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
        }
        
        // Làm sạch toàn bộ dữ liệu hiện tại
        sheet.clear();
        
        var rows = data.sheets[sheetName];
        if (rows && rows.length > 0) {
          var rowCount = rows.length;
          var colCount = rows[0].length;
          
          // Ghi dữ liệu hàng loạt xuống dải ô tương ứng
          var range = sheet.getRange(1, 1, rowCount, colCount);
          range.setValues(rows);
          
          // Định dạng dòng tiêu đề (Dòng 1)
          var headerRange = sheet.getRange(1, 1, 1, colCount);
          headerRange.setFontWeight("bold")
                     .setBackground("#00523b") // Màu xanh đậm thương hiệu PaPi(ml)
                     .setFontColor("#ffffff")
                     .setHorizontalAlignment("center")
                     .setVerticalAlignment("middle");
          
          sheet.setRowHeight(1, 32); // Làm dòng tiêu đề cao hơn cho thoáng
          
          // Định dạng căn lề giữa cho các cột Mã, Ngày, Số điện thoại
          sheet.getRange(2, 1, rowCount - 1, colCount).setHorizontalAlignment("left");
          
          // Tự động căn chỉnh độ rộng cột
          sheet.autoResizeColumns(1, colCount);
        }
      }
    }
    
    // --- PHẦN 2: TỰ ĐỘNG GỬI EMAIL THÔNG BÁO KHI CÓ KHÁCH ĐẶT ĐƠN MỚI ---
    if ((data.action === "NEW_ORDER") && data.adminNotificationEmail) {
      var recipient = data.adminNotificationEmail.toString().trim();
      if (recipient.length > 3 && recipient.indexOf("@") !== -1) {
        var subject = "🔔 [ĐƠN HÀNG MỚI] Khách " + data.customerName + " đã đặt đơn " + data.orderId;
        var htmlBody = 
          "<div style='font-family: Arial, Helvetica, sans-serif; max-width: 600px; border: 1.5px solid #00523b; border-radius: 16px; padding: 24px; background-color: #fcfef1; color: #394013;'>" +
          "<div style='text-align: center; border-bottom: 2.5px solid #00523b; padding-bottom: 16px; margin-bottom: 20px;'>" +
          "  <h1 style='color: #00523b; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;'>🍱 PAPI(ML) - CƠM TRƯA NGÀY MAI</h1>" +
          "  <p style='margin: 4px 0 0 0; font-size: 13px; font-weight: bold; color: #394013/80; text-transform: uppercase;'>Đã nhận đơn hàng mới thành công!</p>" +
          "</div>" +
          "<p style='font-size: 15px;'>Chào Mẹ, website vừa ghi nhận một đơn hàng mới từ Khách Hàng. Thông tin cụ thể như sau:</p>" +
          
          "<div style='background-color: #ffffff; border: 1px solid #00523b/15; border-radius: 12px; padding: 18px; margin: 16px 0; shadow: 0 2px 4px rgba(0,0,0,0.02);'>" +
          "  <p style='margin: 6px 0;'><b>Mã đơn hàng:</b> <span style='font-size: 16px; color: #d97706; font-weight: 900; letter-spacing: 0.5px;'>" + data.orderId + "</span></p>" +
          "  <p style='margin: 6px 0;'><b>Họ và tên khách:</b> <span style='font-weight: 700;'>" + data.customerName + "</span></p>" +
          "  <p style='margin: 6px 0;'><b>Số điện thoại:</b> <span style='font-weight: 700;'>" + data.phone + "</span></p>" +
          "  <p style='margin: 6px 0;'><b>Ngày nhận cơm:</b> <span style='color: #00523b; font-weight: 800;'>" + data.receiveDate + "</span></p>" +
          "  <p style='margin: 6px 0;'><b>Giờ giao cơm:</b> <span style='color: #00523b; font-weight: 800;'>" + data.receiveTime + " (" + data.session + ")</span></p>" +
          "  <p style='margin: 6px 0;'><b>Hình thức nhận:</b> <span style='font-weight: bold;'>" + data.deliveryMethod + "</span></p>" +
          "  <p style='margin: 6px 0;'><b>Địa chỉ nhận:</b> " + (data.address || "Ghé lấy trực tiếp tại quầy") + "</p>" +
          "  <p style='margin: 6px 0;'><b>Tổng số suất ăn:</b> <span style='font-weight: bold; color: #00523b;'>" + data.portionsCount + " suất</span></p>" +
          "  <p style='margin: 6px 0;'><b>Tổng tiền đơn:</b> <span style='font-size: 18px; color: #00523b; font-weight: 900;'>" + Number(data.totalAmount).toLocaleString() + " đ</span></p>" +
          "</div>" +
          
          "<p style='font-size: 14px; font-weight: bold; color: #00523b; margin-bottom: 8px;'>📦 CHI TIẾT THỰC ĐƠN TỪNG KHẨU PHẦN:</p>" +
          "<div style='background-color: #ffffff; padding: 14px; border-radius: 12px; border: 1px solid #00523b/15; font-size: 13.5px; line-height: 1.6; font-weight: 500;'>" +
             data.portionsText.split(" | ").join("<br><hr style='border: none; border-top: 1px dashed #00523b/10; margin: 8px 0;'>") +
          "</div>" +
          
          "<p style='margin-top: 16px; font-size: 13.5px;'><b>Ghi chú của khách hàng:</b> <i>" + (data.notes || "Không có ghi chú thêm") + "</i></p>" +
          
          "<div style='margin-top: 28px; border-top: 1.5px dashed #00523b/20; padding-top: 14px; text-align: center;'>" +
          "  <p style='color: #394013/60; font-size: 11.5px; margin: 0;'>Đây là email tự động từ hệ thống đồng bộ hóa PaPi(ml). Vui lòng truy cập trang Quản Trị để duyệt đơn hàng.</p>" +
          "  <p style='color: #00523b; font-size: 12px; font-weight: bold; margin-top: 4px;'>Chúc Mẹ một ngày nấu nướng vui vẻ & hanh thông! 🌸</p>" +
          "</div>" +
          "</div>";
          
        try {
          MailApp.sendEmail({
            to: recipient,
            subject: subject,
            htmlBody: htmlBody
          });
        } catch (emailErr) {
          Logger.log("Lỗi gửi email: " + emailErr.toString());
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success", "message": "Đã đồng bộ hóa đầy đủ 8 Tab dữ liệu lên Google Sheets thành công!" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
