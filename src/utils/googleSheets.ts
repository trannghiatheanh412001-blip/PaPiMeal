import { Order } from "../types";

const GOOGLE_SHEETS_URL_KEY = "papimeal_google_sheet_url";

export function getGoogleSheetsUrl(): string {
  return localStorage.getItem(GOOGLE_SHEETS_URL_KEY) || "";
}

export function saveGoogleSheetsUrl(url: string) {
  localStorage.setItem(GOOGLE_SHEETS_URL_KEY, url.trim());
}

export async function sendToGoogleSheets(actionType: "NEW_ORDER" | "UPDATE_STATUS", order: Order) {
  const url = getGoogleSheetsUrl();
  if (!url) return;

  try {
    const portionsText = order.portions.map((portion, idx) => {
      const itemsStr = portion.map(it => `${it.name} (x${it.qty})`).join(", ");
      return `[Khẩu phần ${idx + 1}]: ${itemsStr}`;
    }).join(" | ");

    const payload = {
      action: actionType,
      timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
      orderId: order.id,
      customerName: order.customerName,
      phone: order.phone,
      receiveDate: order.receiveDate,
      receiveTime: order.receiveTime,
      session: order.session,
      deliveryMethod: order.deliveryMethod,
      address: order.address || "",
      notes: order.notes || "",
      status: order.status,
      portionsCount: order.portionsCount,
      totalAmount: order.totalAmount,
      portionsText,
      adminNotificationEmail: localStorage.getItem("papimeal_admin_email") || ""
    };

    // We use mode: 'no-cors' and text/plain to circumvent browser preflight (CORS) check blockages on GAS
    await fetch(url, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(payload)
    });
    console.log(`[Google Sheets] Sent log for ${order.id} with action ${actionType}`);
  } catch (error) {
    console.error("[Google Sheets] Error sending data:", error);
  }
}

export const APPS_SCRIPT_TEMPLATE = `function doPost(e) {
  try {
    var jsonString = e.postData.contents;
    var data = JSON.parse(jsonString);
    
    // Mở Spreadsheet hiện tại
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Nếu sheet trống hoàn toàn, tạo tiêu đề cột trước
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Thời gian hệ thống", 
        "Hành động", 
        "Mã Đơn Hàng", 
        "Tên Khách Hàng", 
        "Số Điện Thoại", 
        "Ngày Nhận", 
        "Khung Giờ", 
        "Buổi", 
        "Hình Thức Giao", 
        "Địa Chỉ", 
        "Ghi Chú Đơn", 
        "Trạng Thái", 
        "Số Suất", 
        "Tổng Tiền (đ)", 
        "Chi Tiết Các Suất Món Ăn"
      ]);
      
      // Định dạng dòng đầu tiên in đậm để đẹp hơn
      var headerRange = sheet.getRange(1, 1, 1, 15);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#00523b");
      headerRange.setFontColor("#ffffff");
    }
    
    // Ghi dòng dữ liệu mới
    sheet.appendRow([
      data.timestamp || new Date().toISOString(),
      data.action || "NEW_ORDER",
      data.orderId,
      data.customerName,
      data.phone,
      data.receiveDate,
      data.receiveTime,
      data.session,
      data.deliveryMethod,
      data.address || "",
      data.notes || "",
      data.status,
      data.portionsCount,
      data.totalAmount,
      data.portionsText || ""
    ]);
    
    // Tự động căn chỉnh độ rộng cột
    sheet.autoResizeColumns(1, 15);
    
    // TỰ ĐỘNG GỬI EMAIL THÔNG BÁO CHO ADMIN KHI CÓ KHÁCH ĐẶT ĐƠN MỚI
    if ((data.action === "NEW_ORDER") && data.adminNotificationEmail) {
      var recipient = data.adminNotificationEmail.toString().trim();
      if (recipient.length > 3 && recipient.indexOf("@") !== -1) {
        var subject = "🔔 [ĐƠN HÀNG MỚI] Khách " + data.customerName + " đã đặt đơn " + data.orderId;
        var htmlBody = 
          "<div style='font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #00523b; border-radius: 12px; padding: 20px;'>" +
          "<h2 style='color: #00523b; border-bottom: 2px solid #00523b; padding-bottom: 10px;'>🍱 CÓ ĐƠN HÀNG MỚI TỪ PAPIMEAL!</h2>" +
          "<p><b>Mã đơn hàng:</b> <span style='font-size: 16px; color: #d97706; font-weight: bold;'>" + data.orderId + "</span></p>" +
          "<p><b>Tên khách hàng:</b> " + data.customerName + "</p>" +
          "<p><b>Số điện thoại:</b> " + data.phone + "</p>" +
          "<p><b>Thời gian nhận cơm:</b> <span style='color: #00523b; font-weight: bold;'>" + data.receiveTime + " ngày " + data.receiveDate + " (" + data.session + ")</span></p>" +
          "<p><b>Hình thức giao:</b> " + data.deliveryMethod + "</p>" +
          "<p><b>Địa chỉ:</b> " + (data.address || "Ghé lấy tại quầy") + "</p>" +
          "<p><b>Số phần ăn:</b> " + data.portionsCount + " suất</p>" +
          "<p><b>Tổng giá trị:</b> <span style='font-size: 16px; color: #00523b; font-weight: bold;'>" + Number(data.totalAmount).toLocaleString() + " đ</span></p>" +
          "<p><b>Chi tiết phần ăn món riêng:</b></p>" +
          "<div style='background-color: #fcfef1; padding: 12px; border-radius: 8px; border: 1px solid #00523b/10;'>" +
            data.portionsText +
          "</div>" +
          "<p style='margin-top: 15px;'><b>Ghi chú của khách:</b> " + (data.notes || "Không có") + "</p>" +
          "<p style='color: #888; font-size: 12px; margin-top: 25px; border-top: 1px dashed #ccc; padding-top: 10px;'>Hệ thống gửi tự động từ Website PaPiMeal. Vui lòng truy cập trang Quản trị Admin để cập nhật trạng thái đơn hàng.</p>" +
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
    
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
