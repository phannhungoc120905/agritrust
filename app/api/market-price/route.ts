import { NextRequest } from 'next/server';
import { getMockPrice, findProduct } from '../../../lib/data/marketPrices';

/**
 * GET /api/market-price?product=...
 * Trả về giá tham khảo (Demo) theo đơn vị đồng/kg.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const product = searchParams.get('product');

  if (!product) {
    return Response.json({ error: 'Thiếu tham số product' }, { status: 400 });
  }

  try {
    const matched = findProduct(product);

    if (matched) {
      return Response.json({
        success: true,
        product: matched.name,
        price: matched.price,
        unit: matched.unit,
        category: matched.category,
        source: 'Dữ liệu tham khảo (Demo)',
        timestamp: new Date().toISOString()
      });
    }

    // Fallback mặc định
    return Response.json({
      success: true,
      product,
      price: getMockPrice(product),
      unit: 'đồng/kg',
      category: 'Không xác định',
      source: 'Dữ liệu tham khảo (Demo)',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return Response.json(
      { error: 'Lỗi khi lấy dữ liệu giá', details: error.message },
      { status: 500 }
    );
  }
}
