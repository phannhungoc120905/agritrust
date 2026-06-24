/**
 * Dữ liệu giá nông sản Việt Nam — Đơn vị: đồng/kg
 * Nguồn: chogia.vn (crawl), vietnambiz.vn, thoibaotaichinhvietnam.vn
 * Cập nhật lần cuối: 10:26:36 24/6/2026
 *
 * ⚠️ Đây là dữ liệu DEMO tham khảo, dựa trên giá thị trường thực tế.
 */

export interface MarketProduct {
  keywords: string[];
  name: string;
  price: number;       // đồng/kg
  unit: string;        // đơn vị hiển thị
  category: string;
}

export const mockMarketPrices: MarketProduct[] = [
  // ═══ LÚA GẠO ═══
  { keywords: ["st25","lúa st25","gạo st25"], name: 'Lúa ST25', price: 9200, unit: 'đồng/kg', category: 'Lúa gạo' },
  { keywords: ["đài thơm","đài thơm 8"], name: 'Lúa Đài Thơm 8', price: 6500, unit: 'đồng/kg', category: 'Lúa gạo' },
  { keywords: ["om18","om 18"], name: 'Lúa OM 18', price: 6400, unit: 'đồng/kg', category: 'Lúa gạo' },
  { keywords: ["om5451","om 5451"], name: 'Lúa OM 5451', price: 5800, unit: 'đồng/kg', category: 'Lúa gạo' },
  { keywords: ["ir50404","ir 50404","ir504"], name: 'Lúa IR 50404', price: 5500, unit: 'đồng/kg', category: 'Lúa gạo' },
  { keywords: ["nếp","gạo nếp"], name: 'Lúa nếp', price: 7200, unit: 'đồng/kg', category: 'Lúa gạo' },
  { keywords: ["lúa","gạo"], name: 'Lúa (chung)', price: 6000, unit: 'đồng/kg', category: 'Lúa gạo' },
  // ═══ CÔNG NGHIỆP ═══
  { keywords: ["điều","hạt điều"], name: 'Hạt điều tươi', price: 29000, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["đậu nành","đậu tương"], name: 'Đậu nành hạt', price: 12000, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["cao su","mủ cao su"], name: 'Mủ cao su', price: 42000, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["đường","mía đường"], name: 'Đường RS', price: 18500, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["mía"], name: 'Mía nguyên liệu', price: 1200, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["ngô","bắp","ngô hạt"], name: 'Ngô hạt', price: 8500, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["sắn","khoai mì","mì"], name: 'Sắn (khoai mì) tươi', price: 4300, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["đậu phộng","lạc","đậu phụng"], name: 'Đậu phộng', price: 28000, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["đậu xanh"], name: 'Đậu xanh', price: 35000, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["đậu đen"], name: 'Đậu đen', price: 40000, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["mè","vừng"], name: 'Mè (Vừng)', price: 45000, unit: 'đồng/kg', category: 'Công nghiệp' },
  // ═══ TRÁI CÂY ═══
  { keywords: ["sầu riêng","ri6","sầu riêng ri6","sau rieng"], name: 'Sầu riêng Ri6 (loại 1)', price: 58000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["sầu riêng thái","monthong"], name: 'Sầu riêng Thái (loại 1)', price: 85000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["thanh long","thanh long ruột đỏ"], name: 'Thanh long ruột đỏ', price: 18000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["xoài","xoài cát","xoài cát hòa lộc"], name: 'Xoài cát Hòa Lộc', price: 25000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["xoài cát chu"], name: 'Xoài cát Chu', price: 32000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["mít","mít thái"], name: 'Mít Thái', price: 6000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["bưởi","bưởi da xanh","bưởi năm roi"], name: 'Bưởi da xanh', price: 30000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["cam","cam sành"], name: 'Cam sành', price: 15000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["quýt","quýt đường"], name: 'Quýt đường', price: 20000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["nhãn","nhãn lồng","nhãn xuồng"], name: 'Nhãn xuồng', price: 25000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["vải","vải thiều"], name: 'Vải thiều', price: 65000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["chôm chôm","chôm chôm nhãn","chôm chôm thái"], name: 'Chôm chôm Thái', price: 45000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["dưa hấu"], name: 'Dưa hấu', price: 8000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["chuối","chuối già","chuối xuất khẩu"], name: 'Chuối già Nam Mỹ', price: 12000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["chanh dây","chanh leo"], name: 'Chanh dây', price: 16000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["măng cụt"], name: 'Măng cụt', price: 22000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["bơ","bơ sáp","bơ 034"], name: 'Bơ sáp', price: 35000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["ổi","ổi lê","ổi ruby"], name: 'Ổi lê', price: 15000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["đu đủ"], name: 'Đu đủ', price: 8000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["dứa","thơm","khóm"], name: 'Dứa (Khóm)', price: 10000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["sapoche","hồng xiêm","xa pô chê"], name: 'Sapoche (Hồng xiêm)', price: 28000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["na","mãng cầu","mãng cầu ta"], name: 'Na (Mãng cầu)', price: 35000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["chanh"], name: 'Chanh không hạt', price: 12000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["táo","táo xanh"], name: 'Táo xanh Ninh Thuận', price: 18000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["dừa","dừa xiêm"], name: 'Dừa xiêm', price: 8000, unit: 'đồng/kg', category: 'Trái cây' },
  { keywords: ["mận","mận hậu","mận an phước"], name: 'Mận An Phước', price: 20000, unit: 'đồng/kg', category: 'Trái cây' },
  // ═══ RAU CỦ ═══
  { keywords: ["khoai lang","khoai lang tím","khoai lang nhật"], name: 'Khoai lang Nhật', price: 28000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["khoai tây"], name: 'Khoai tây', price: 12000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["cà rốt"], name: 'Cà rốt', price: 13000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["dưa leo","dưa chuột"], name: 'Dưa leo', price: 18000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["bắp cải"], name: 'Bắp cải trắng', price: 15000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["hành tây"], name: 'Hành tây', price: 28000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["cà chua"], name: 'Cà chua', price: 20000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["ớt","ớt chỉ thiên"], name: 'Ớt chỉ thiên', price: 35000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["tỏi","tỏi khô"], name: 'Tỏi khô', price: 50000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["gừng"], name: 'Gừng', price: 30000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["bí đỏ","bí ngô"], name: 'Bí đỏ', price: 10000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["rau muống"], name: 'Rau muống', price: 12000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["cải bó xôi","bó xôi"], name: 'Cải bó xôi', price: 24000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["su hào"], name: 'Su hào', price: 12000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["súp lơ","bông cải","bông cải xanh"], name: 'Súp lơ xanh', price: 30000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["đậu bắp"], name: 'Đậu bắp', price: 15000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["mướp","mướp hương"], name: 'Mướp hương', price: 12000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["khổ qua","mướp đắng"], name: 'Khổ qua (Mướp đắng)', price: 18000, unit: 'đồng/kg', category: 'Rau củ' },
  { keywords: ["bầu"], name: 'Bầu', price: 8000, unit: 'đồng/kg', category: 'Rau củ' },
  // ═══ CÔNG NGHIỆP ═══
  { keywords: ["cà phê","robusta","cafe","cà phê robusta"], name: 'Cà phê Robusta', price: 88475, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["cà phê arabica","arabica"], name: 'Cà phê Arabica', price: 103475, unit: 'đồng/kg', category: 'Công nghiệp' },
  { keywords: ["hồ tiêu","tiêu","tiêu đen"], name: 'Hồ tiêu đen', price: 139000, unit: 'đồng/kg', category: 'Công nghiệp' },
];

/**
 * Tìm giá theo tên sản phẩm (fuzzy match theo keyword).
 * Trả về đồng/kg.
 */
export function getMockPrice(productName: string): number {
  if (!productName) return 6000;
  const normalized = productName.toLowerCase().trim();

  for (const item of mockMarketPrices) {
    if (item.keywords.some(k => normalized.includes(k))) {
      return item.price;
    }
  }
  return 6000; // Mặc định giá lúa chung
}

/**
 * Tìm đối tượng sản phẩm đầy đủ (bao gồm tên, đơn vị, category).
 */
export function findProduct(productName: string): MarketProduct | null {
  if (!productName) return null;
  const normalized = productName.toLowerCase().trim();

  for (const item of mockMarketPrices) {
    if (item.keywords.some(k => normalized.includes(k))) {
      return item;
    }
  }
  return null;
}
