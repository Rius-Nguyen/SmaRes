import { describe, it, expect } from 'vitest';
import { filterDishesBySemanticIntent } from '@/app/lib/semanticMenuSearch';
import { INITIAL_MENU_ITEMS, type MenuItemData } from '@/app/lib/menuInitialData';

const SAMPLE_MENU: MenuItemData[] = [
  {
    _id: 'm1',
    name: 'Gỏi Cuốn Tôm Thịt Thanh Mát',
    price: 85000,
    description: 'Tôm đất luộc cuộn rau thơm thanh mát, chấm tương bơ.',
    imageUrl: '/foods/goi_cuon.jpg',
    category: 'Khai vị',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Chế biến nhanh tại chỗ',
  },
  {
    _id: 'm2',
    name: 'Nộm Hoa Chuối Tai Heo Giòn Chua Ngọt',
    price: 95000,
    description: 'Hoa chuối bào giòn rụm trộn tai heo bóp chua cay ngọt vị.',
    imageUrl: '/foods/nom_hoa_chuoi.jpg',
    category: 'Khai vị',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Món ăn kèm thanh đạm',
  },
  {
    _id: 'm3',
    name: 'Cá Chẽm Hoàng Gia Hấp Sốt Tàu Xì Cổ Truyền',
    price: 290000,
    description: 'Cá chẽm hấp gừng tươi và hành hoa thơm dịu.',
    imageUrl: '/foods/ca_chem_hap.jpg',
    category: 'Món chính',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Hấp nhiệt độ chuẩn xác',
  },
  {
    _id: 'm4',
    name: 'Bò Nướng Tiêu Đen & Ớt Hiểm',
    price: 320000,
    description: 'Thịt bò nướng sốt tiêu đen cay nồng cùng ớt hiểm Tây Nguyên.',
    imageUrl: '/foods/bo_nuong.jpg',
    category: 'Món chính',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Đậm vị cay nồng',
  },
  {
    _id: 'm5',
    name: 'Phở Bò Wagyu Không Cay Thanh Ngọt',
    price: 380000,
    description: 'Nước dùng hầm 24 giờ, không cay, giữ trọn vị ngọt tự nhiên.',
    imageUrl: '/foods/pho_bo2.jpg',
    category: 'Món chính',
    isAvailable: true,
    isPreOrderOnly: true,
    preparationNote: 'Đặt bàn trước 3 giờ',
  },
  {
    _id: 'm6',
    name: 'Chè Sen Hạt Long Nhãn Cung Đình',
    price: 65000,
    description: 'Hạt sen Huế ninh mềm thanh mát đường phèn.',
    imageUrl: '/foods/che_sen.jpg',
    category: 'Tráng miệng',
    isAvailable: false,
    isPreOrderOnly: false,
    preparationNote: 'Món ngọt thanh mát cung đình',
  },
  {
    _id: 'm7',
    name: 'Lẩu Hải Sản Sa Tế Siêu Cay',
    price: 420000,
    description: 'Nước lẩu hải sản sa tế ớt xiêm cay xé.',
    imageUrl: '/foods/lau.jpg',
    category: 'Món chính',
    isAvailable: false,
    isPreOrderOnly: false,
  },
  {
    _id: 'm8',
    name: 'Trà Sen Vàng Thượng Hạng Tây Hồ',
    price: 55000,
    description: 'Trà sen thanh khiết mát lành.',
    imageUrl: '/foods/tra_sen.jpg',
    category: 'Đồ uống',
    isAvailable: true,
    isPreOrderOnly: false,
  },
];

describe('semanticMenuSearch', () => {
  it('negated spicy queries ("món không cay", "thanh đạm không cay") suppress spicy intent & badge and exclude spicy dishes', () => {
    for (const query of ['món không cay', 'thanh đạm không cay']) {
      const results = filterDishesBySemanticIntent(SAMPLE_MENU, query, null, 'Tất cả');
      const ids = results.map((r) => r.dish._id);

      // Must exclude explicitly spicy dishes (m2 chua cay, m4 tiêu đen/ớt, m7 sa tế/ớt)
      expect(ids).not.toContain('m2');
      expect(ids).not.toContain('m4');
      expect(ids).not.toContain('m7');

      // Must preserve non-spicy & explicitly "không cay" dishes
      expect(ids).toContain('m1');
      expect(ids).toContain('m3');
      expect(ids).toContain('m5');

      // Must NEVER attach spicy badge wording
      for (const entry of results) {
        expect(entry.badge_reason?.includes('dậy vị cay nồng') ?? false).toBe(false);
        expect(entry.badge_reason).toBe('Phù hợp với khẩu vị thanh đạm, thanh nhẹ');
      }
    }

    // Verify against real INITIAL_MENU_ITEMS dataset
    const initialResults = filterDishesBySemanticIntent(
      INITIAL_MENU_ITEMS,
      'thanh đạm không cay',
      null,
      'Tất cả'
    );
    const initialIds = initialResults.map((r) => r.dish._id);
    expect(initialIds).not.toContain('6717a01a1e0011a100000003'); // Nộm Hoa Chuối (chua cay)
    expect(initialIds).toContain('6717a01a1e0011a100000001'); // Gỏi Cuốn
    expect(initialIds).toContain('6717a01a1e0011a100000006'); // Cá Chẽm Hấp
    for (const entry of initialResults) {
      expect(entry.badge_reason?.includes('dậy vị cay nồng') ?? false).toBe(false);
    }
  });

  it('positive spicy query ("cay đậm đà") and spicy chip match spicy dishes with spicy badge', () => {
    const queryResults = filterDishesBySemanticIntent(SAMPLE_MENU, 'cay đậm đà', null, 'Tất cả');
    const m4Entry = queryResults.find((r) => r.dish._id === 'm4');
    const m7Entry = queryResults.find((r) => r.dish._id === 'm7');

    expect(m4Entry).toBeDefined();
    expect(m7Entry).toBeDefined();
    expect(m4Entry?.badge_reason).toBe('Hương vị đậm đà, dậy vị cay nồng chuẩn vị');
    expect(m7Entry?.badge_reason).toBe('Hương vị đậm đà, dậy vị cay nồng chuẩn vị');

    const chipResults = filterDishesBySemanticIntent(SAMPLE_MENU, '', 'Món cay đậm đà', 'Tất cả');
    expect(
      chipResults.some(
        (r) =>
          r.dish._id === 'm4' &&
          r.badge_reason === 'Hương vị đậm đà, dậy vị cay nồng chuẩn vị'
      )
    ).toBe(true);
  });

  it('negation overrides Best Seller chip spicy risk while allowing Best Seller badge on non-spicy items', () => {
    const results = filterDishesBySemanticIntent(
      SAMPLE_MENU,
      'món không cay',
      'Best Seller',
      'Tất cả'
    );
    const ids = results.map((r) => r.dish._id);

    expect(ids).not.toContain('m4');
    expect(ids).not.toContain('m7');
    expect(ids).toContain('m5');
    for (const entry of results) {
      expect(entry.badge_reason?.includes('dậy vị cay nồng') ?? false).toBe(false);
    }
  });

  it('category filter narrows results by regular category and Món đặc biệt pre-order flag', () => {
    const appetizers = filterDishesBySemanticIntent(SAMPLE_MENU, '', null, 'Khai vị');
    expect(appetizers.map((r) => r.dish._id)).toEqual(['m1', 'm2']);

    const nonSpicyAppetizers = filterDishesBySemanticIntent(
      SAMPLE_MENU,
      'món không cay',
      null,
      'Khai vị'
    );
    expect(nonSpicyAppetizers.map((r) => r.dish._id)).toEqual(['m1']);

    const specialDishes = filterDishesBySemanticIntent(SAMPLE_MENU, '', null, 'Món đặc biệt');
    expect(specialDishes.map((r) => r.dish._id)).toEqual(['m5']);

    const drinks = filterDishesBySemanticIntent(SAMPLE_MENU, '', null, 'Đồ uống');
    expect(drinks.map((r) => r.dish._id)).toEqual(['m8']);
  });

  it('retains isAvailable: false items for UI sold-out rendering while enforcing negation & category filters', () => {
    // Sold-out dessert m6 ("Chè Sen ... thanh mát") remains present for DishCard sold-out overlay
    const desserts = filterDishesBySemanticIntent(SAMPLE_MENU, '', null, 'Tráng miệng');
    expect(desserts).toHaveLength(1);
    expect(desserts[0].dish._id).toBe('m6');
    expect(desserts[0].dish.isAvailable).toBe(false);

    // Sold-out m6 matches semantic light query too, preserving isAvailable: false
    const lightResults = filterDishesBySemanticIntent(
      SAMPLE_MENU,
      'thanh đạm không cay',
      null,
      'Tráng miệng'
    );
    expect(lightResults).toHaveLength(1);
    expect(lightResults[0].dish._id).toBe('m6');
    expect(lightResults[0].dish.isAvailable).toBe(false);

    // Sold-out spicy m7 appears on positive spicy search (with isAvailable: false)
    // and is still excluded on negated spicy query
    const spicyResults = filterDishesBySemanticIntent(SAMPLE_MENU, 'cay đậm đà', null, 'Món chính');
    expect(spicyResults.some((r) => r.dish._id === 'm7' && r.dish.isAvailable === false)).toBe(true);

    const nonSpicyMains = filterDishesBySemanticIntent(
      SAMPLE_MENU,
      'món không cay',
      null,
      'Món chính'
    );
    expect(nonSpicyMains.some((r) => r.dish._id === 'm7')).toBe(false);
  });

  it('falls back to substring keyword matching for non-semantic queries and returns all for empty query', () => {
    const keywordResults = filterDishesBySemanticIntent(SAMPLE_MENU, 'tàu xì', null, 'Tất cả');
    expect(keywordResults).toHaveLength(1);
    expect(keywordResults[0].dish._id).toBe('m3');
    expect(keywordResults[0].badge_reason).toBe('Khớp từ khóa "tàu xì"');

    const allResults = filterDishesBySemanticIntent(SAMPLE_MENU, '', null, 'Tất cả');
    expect(allResults).toHaveLength(SAMPLE_MENU.length);
  });
});
