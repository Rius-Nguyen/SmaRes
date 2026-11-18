import { NextResponse } from 'next/server';

const searchCache = new Map();

const sampleDishes = [
  { id: '1', name: 'Phở Bò Wagyu A5 Thượng Hạng Dát Vàng', price: 380000, tags: 'pho bo nuoc dung nong' },
  { id: '2', name: 'Cá Chẽm Hoàng Gia Hấp Sốt Tàu Xì Cổ Truyền', price: 290000, tags: 'ca hap hai san thanh dam' },
  { id: '3', name: 'Vịt Quay Bắc Kinh Sốt Mật Ong Rừng Tây Bắc', price: 450000, tags: 'vit quay gion mat ong' },
  { id: '4', name: 'Nộm Hoa Chuối Tai Heo Giòn Chua Ngọt', price: 95000, tags: 'nom goi khai vi chua ngot' },
  { id: '5', name: 'Chè Sen Hạt Long Nhãn Cung Đình', price: 65000, tags: 'che trang mieng thanh mat' }
];

export async function GET(request) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get('q') || '';
  const query = rawQuery.trim().toLowerCase();
  const limitParam = Number(searchParams.get('limit') || '5');
  const limit = limitParam > 0 && limitParam <= 20 ? limitParam : 5;

  const cacheKey = `${query}__${limit}`;

  if (searchCache.has(cacheKey)) {
    return NextResponse.json(
      {
        success: true,
        cached: true,
        responseTimeMs: Date.now() - startTime,
        results: searchCache.get(cacheKey)
      },
      { status: 200 }
    );
  }

  const matched = [];
  for (let i = 0; i < sampleDishes.length; i++) {
    const dish = sampleDishes[i];
    const matchName = dish.name.toLowerCase().includes(query);
    const matchTags = dish.tags.toLowerCase().includes(query);
    if (!query || matchName || matchTags) {
      matched.push(dish);
      if (matched.length >= limit) {
        break;
      }
    }
  }

  searchCache.set(cacheKey, matched);

  return NextResponse.json(
    {
      success: true,
      cached: false,
      responseTimeMs: Date.now() - startTime,
      results: matched
    },
    { status: 200 }
  );
}