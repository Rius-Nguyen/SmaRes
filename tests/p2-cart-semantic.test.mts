import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCustomizations,
  buildCartKey,
  migrateCartItems,
  addItemToCartList,
  removeItemFromCartList,
  updateItemQuantityInCartList,
  type AddCartItemInput,
  type CartItem,
} from '../app/lib/cartHelpers.ts';
import { filterDishesBySemanticIntent } from '../app/lib/semanticMenuSearch.ts';
import { formatMoney } from '../app/lib/format.ts';
import { INITIAL_MENU_ITEMS, type MenuItemData } from '../app/lib/menuInitialData.ts';

const PHO_DISH_INPUT: Omit<AddCartItemInput, 'customizations'> = {
  _id: 'dish-pho-wagyu',
  name: 'Phở Bò Wagyu A5 Thượng Hạng Dát Vàng',
  price: 380000,
  imageUrl: '/foods/pho_bo2.jpg',
  category: 'Món chính',
  isPreOrderOnly: true,
};

const TEA_DISH_INPUT: Omit<AddCartItemInput, 'customizations'> = {
  _id: 'dish-tra-sen',
  name: 'Trà Sen Vàng Thượng Hạng Tây Hồ',
  price: 55000,
  imageUrl: '/foods/tra_sen.jpg',
  category: 'Đồ uống',
  isPreOrderOnly: false,
};

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

describe('cartHelpers', () => {
  test('normalizeCustomizations and buildCartKey canonicalize camelCase and snake_case identically', () => {
    const camelNormalized = normalizeCustomizations({
      spicyLevel: 'HOT',
      iceLevel: '50%',
      sweetnessLevel: '0%',
      allergyNotes: '  Không hành  ',
    });
    const snakeNormalized = normalizeCustomizations({
      spicy_level: 'hot' as unknown as 'HOT',
      ice_level: '50%',
      sweetness_level: '0%',
      allergy_notes: 'Không hành',
    });

    assert.deepEqual(camelNormalized, {
      spicyLevel: 'HOT',
      iceLevel: '50%',
      sweetnessLevel: '0%',
      allergyNotes: 'Không hành',
    });
    assert.deepEqual(snakeNormalized, camelNormalized);

    const keyFromCamel = buildCartKey(' dish-1 ', {
      spicyLevel: 'MEDIUM',
      allergyNotes: 'Ít tiêu',
    });
    const keyFromSnake = buildCartKey('dish-1', {
      spicy_level: 'MEDIUM',
      allergy_notes: '  Ít tiêu  ',
    });
    assert.equal(keyFromCamel, keyFromSnake);
    assert.equal(
      keyFromCamel,
      'dish-1::{"spicyLevel":"MEDIUM","iceLevel":"","sweetnessLevel":"","allergyNotes":"Ít tiêu"}'
    );
  });

  test('adding two customized variants of the same _id keeps distinct cartKeys and merges identical variants', () => {
    let list: CartItem[] = [];

    list = addItemToCartList(
      list,
      {
        ...PHO_DISH_INPUT,
        customizations: { spicyLevel: 'NONE', allergyNotes: '' },
      },
      1
    );

    list = addItemToCartList(
      list,
      {
        ...PHO_DISH_INPUT,
        customizations: { spicyLevel: 'HOT', allergyNotes: 'Không hành' },
      },
      2
    );

    assert.equal(list.length, 2);
    assert.equal(list[0]._id, PHO_DISH_INPUT._id);
    assert.equal(list[1]._id, PHO_DISH_INPUT._id);
    assert.notEqual(list[0].cartKey, list[1].cartKey);
    assert.equal(list[0].quantity, 1);
    assert.equal(list[1].quantity, 2);

    // Adding the second variant again using legacy snake_case keys merges into entry [1]
    list = addItemToCartList(
      list,
      {
        ...PHO_DISH_INPUT,
        customizations: { spicy_level: 'HOT', allergy_notes: '  Không hành ' },
      },
      1
    );

    assert.equal(list.length, 2);
    assert.equal(list[0].quantity, 1);
    assert.equal(list[1].quantity, 3);

    // Non-positive or non-finite quantities leave list unchanged
    const unchangedZero = addItemToCartList(list, PHO_DISH_INPUT, 0);
    const unchangedNaN = addItemToCartList(list, PHO_DISH_INPUT, Number.NaN);
    assert.equal(unchangedZero.length, 2);
    assert.equal(unchangedNaN.length, 2);
  });

  test('updateItemQuantityInCartList and removeItemFromCartList by cartKey leave sibling variants untouched', () => {
    let list: CartItem[] = [];
    list = addItemToCartList(
      list,
      {
        ...TEA_DISH_INPUT,
        customizations: { iceLevel: '50%', sweetnessLevel: '50%', allergyNotes: '' },
      },
      2
    );
    list = addItemToCartList(
      list,
      {
        ...TEA_DISH_INPUT,
        customizations: { iceLevel: '100%', sweetnessLevel: '0%', allergyNotes: 'Ít đá' },
      },
      1
    );

    assert.equal(list.length, 2);
    const firstKey = list[0].cartKey;
    const secondKey = list[1].cartKey;

    // Update quantity of the first variant only
    list = updateItemQuantityInCartList(list, firstKey, 5);
    assert.equal(list.length, 2);
    assert.equal(list[0].quantity, 5);
    assert.equal(list[1].quantity, 1);

    // Updating quantity to 0 removes only the targeted variant
    const afterZeroUpdate = updateItemQuantityInCartList(list, firstKey, 0);
    assert.equal(afterZeroUpdate.length, 1);
    assert.equal(afterZeroUpdate[0].cartKey, secondKey);
    assert.equal(afterZeroUpdate[0].quantity, 1);

    // Removing the second variant leaves the first untouched
    const afterRemoveSecond = removeItemFromCartList(list, secondKey);
    assert.equal(afterRemoveSecond.length, 1);
    assert.equal(afterRemoveSecond[0].cartKey, firstKey);
    assert.equal(afterRemoveSecond[0].quantity, 5);

    // Legacy removal by plain _id (without '::') removes all variants of that dish
    const afterLegacyRemove = removeItemFromCartList(list, TEA_DISH_INPUT._id);
    assert.equal(afterLegacyRemove.length, 0);
  });

  test('migrateCartItems upgrades legacy items without cartKey, merges duplicate variants, and drops invalid rows', () => {
    const legacyPayload = [
      {
        _id: 'dish-a',
        name: 'Gỏi Cuốn',
        price: 85000,
        imageUrl: '/foods/goi_cuon.jpg',
        category: 'Khai vị',
        quantity: 2,
      },
      {
        _id: 'dish-b',
        name: 'Bò Lúc Lắc',
        price: 250000,
        imageUrl: '/foods/bo.jpg',
        category: 'Món chính',
        quantity: 1,
        customizations: { spicy_level: 'MILD', allergy_notes: ' Không tiêu ' },
      },
      {
        _id: 'dish-b',
        cartKey: buildCartKey('dish-b', { spicyLevel: 'MILD', allergyNotes: 'Không tiêu' }),
        name: 'Bò Lúc Lắc',
        price: 250000,
        imageUrl: '/foods/bo.jpg',
        category: 'Món chính',
        quantity: 2,
        customizations: { spicyLevel: 'MILD', allergyNotes: 'Không tiêu' },
      },
      {
        _id: 'dish-b',
        name: 'Bò Lúc Lắc',
        price: 250000,
        imageUrl: '/foods/bo.jpg',
        category: 'Món chính',
        quantity: 1,
        customizations: { spicyLevel: 'HOT', allergyNotes: '' },
      },
      // Corrupt / invalid rows that must be discarded
      null,
      { _id: '', name: 'Missing ID', price: 10000, quantity: 1 },
      { _id: 'dish-zero', name: 'Zero Qty', price: 10000, quantity: 0 },
      { _id: 'dish-neg', name: 'Negative Qty', price: 10000, quantity: -2 },
    ];

    const migrated = migrateCartItems(legacyPayload);
    assert.equal(migrated.length, 3);

    // Legacy item without cartKey is upgraded
    assert.equal(migrated[0]._id, 'dish-a');
    assert.equal(migrated[0].cartKey, buildCartKey('dish-a'));
    assert.equal(migrated[0].quantity, 2);

    // Duplicate equivalent variants (snake_case legacy + camelCase) merged into quantity 3
    assert.equal(migrated[1]._id, 'dish-b');
    assert.equal(
      migrated[1].cartKey,
      buildCartKey('dish-b', { spicyLevel: 'MILD', allergyNotes: 'Không tiêu' })
    );
    assert.equal(migrated[1].quantity, 3);

    // Distinct spicy variant of same _id stays separate
    assert.equal(migrated[2]._id, 'dish-b');
    assert.equal(migrated[2].cartKey, buildCartKey('dish-b', { spicyLevel: 'HOT' }));
    assert.equal(migrated[2].quantity, 1);

    assert.deepEqual(migrateCartItems(null), []);
    assert.deepEqual(migrateCartItems('invalid'), []);
  });
});

describe('semanticMenuSearch', () => {
  test('negated spicy queries ("món không cay", "thanh đạm không cay") suppress spicy intent & badge and exclude spicy dishes', () => {
    for (const query of ['món không cay', 'thanh đạm không cay']) {
      const results = filterDishesBySemanticIntent(SAMPLE_MENU, query, null, 'Tất cả');
      const ids = results.map((r) => r.dish._id);

      // Must exclude explicitly spicy dishes (m2 chua cay, m4 tiêu đen/ớt, m7 sa tế/ớt)
      assert.equal(ids.includes('m2'), false, `${query} must exclude m2 (chua cay)`);
      assert.equal(ids.includes('m4'), false, `${query} must exclude m4 (cay nồng / ớt)`);
      assert.equal(ids.includes('m7'), false, `${query} must exclude m7 (siêu cay / sa tế)`);

      // Must preserve non-spicy & explicitly "không cay" dishes
      assert.equal(ids.includes('m1'), true, `${query} should include m1`);
      assert.equal(ids.includes('m3'), true, `${query} should include m3`);
      assert.equal(ids.includes('m5'), true, `${query} should include explicit non-spicy m5`);

      // Must NEVER attach spicy badge wording
      for (const entry of results) {
        assert.equal(
          entry.badge_reason?.includes('dậy vị cay nồng') ?? false,
          false,
          `Unexpected spicy badge on ${entry.dish.name} for "${query}"`
        );
        assert.equal(entry.badge_reason, 'Phù hợp với khẩu vị thanh đạm, thanh nhẹ');
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
    assert.equal(initialIds.includes('6717a01a1e0011a100000003'), false); // Nộm Hoa Chuối (chua cay)
    assert.equal(initialIds.includes('6717a01a1e0011a100000001'), true); // Gỏi Cuốn
    assert.equal(initialIds.includes('6717a01a1e0011a100000006'), true); // Cá Chẽm Hấp
    for (const entry of initialResults) {
      assert.equal(entry.badge_reason?.includes('dậy vị cay nồng') ?? false, false);
    }
  });

  test('positive spicy query ("cay đậm đà") and spicy chip match spicy dishes with spicy badge', () => {
    const queryResults = filterDishesBySemanticIntent(SAMPLE_MENU, 'cay đậm đà', null, 'Tất cả');
    const m4Entry = queryResults.find((r) => r.dish._id === 'm4');
    const m7Entry = queryResults.find((r) => r.dish._id === 'm7');

    if (!m4Entry || !m7Entry) {
      assert.fail('Expected m4 and m7 to match "cay đậm đà"');
    }
    assert.equal(m4Entry.badge_reason, 'Hương vị đậm đà, dậy vị cay nồng chuẩn vị');
    assert.equal(m7Entry.badge_reason, 'Hương vị đậm đà, dậy vị cay nồng chuẩn vị');

    const chipResults = filterDishesBySemanticIntent(SAMPLE_MENU, '', 'Món cay đậm đà', 'Tất cả');
    assert.equal(
      chipResults.some(
        (r) =>
          r.dish._id === 'm4' &&
          r.badge_reason === 'Hương vị đậm đà, dậy vị cay nồng chuẩn vị'
      ),
      true
    );
  });

  test('negation overrides Best Seller chip spicy risk while allowing Best Seller badge on non-spicy items', () => {
    const results = filterDishesBySemanticIntent(
      SAMPLE_MENU,
      'món không cay',
      'Best Seller',
      'Tất cả'
    );
    const ids = results.map((r) => r.dish._id);

    assert.equal(ids.includes('m4'), false);
    assert.equal(ids.includes('m7'), false);
    assert.equal(ids.includes('m5'), true);
    for (const entry of results) {
      assert.equal(entry.badge_reason?.includes('dậy vị cay nồng') ?? false, false);
    }
  });

  test('category filter narrows results by regular category and Món đặc biệt pre-order flag', () => {
    const appetizers = filterDishesBySemanticIntent(SAMPLE_MENU, '', null, 'Khai vị');
    assert.deepEqual(
      appetizers.map((r) => r.dish._id),
      ['m1', 'm2']
    );

    const nonSpicyAppetizers = filterDishesBySemanticIntent(
      SAMPLE_MENU,
      'món không cay',
      null,
      'Khai vị'
    );
    assert.deepEqual(
      nonSpicyAppetizers.map((r) => r.dish._id),
      ['m1']
    );

    const specialDishes = filterDishesBySemanticIntent(SAMPLE_MENU, '', null, 'Món đặc biệt');
    assert.deepEqual(
      specialDishes.map((r) => r.dish._id),
      ['m5']
    );

    const drinks = filterDishesBySemanticIntent(SAMPLE_MENU, '', null, 'Đồ uống');
    assert.deepEqual(
      drinks.map((r) => r.dish._id),
      ['m8']
    );
  });

  test('retains isAvailable: false items for UI sold-out rendering while enforcing negation & category filters', () => {
    // Sold-out dessert m6 ("Chè Sen ... thanh mát") remains present for DishCard sold-out overlay
    const desserts = filterDishesBySemanticIntent(SAMPLE_MENU, '', null, 'Tráng miệng');
    assert.equal(desserts.length, 1);
    assert.equal(desserts[0].dish._id, 'm6');
    assert.equal(desserts[0].dish.isAvailable, false);

    // Sold-out m6 matches semantic light query too, preserving isAvailable: false
    const lightResults = filterDishesBySemanticIntent(
      SAMPLE_MENU,
      'thanh đạm không cay',
      null,
      'Tráng miệng'
    );
    assert.equal(lightResults.length, 1);
    assert.equal(lightResults[0].dish._id, 'm6');
    assert.equal(lightResults[0].dish.isAvailable, false);

    // Sold-out spicy m7 appears on positive spicy search (with isAvailable: false)
    // and is still excluded on negated spicy query
    const spicyResults = filterDishesBySemanticIntent(SAMPLE_MENU, 'cay đậm đà', null, 'Món chính');
    assert.equal(spicyResults.some((r) => r.dish._id === 'm7' && r.dish.isAvailable === false), true);

    const nonSpicyMains = filterDishesBySemanticIntent(
      SAMPLE_MENU,
      'món không cay',
      null,
      'Món chính'
    );
    assert.equal(nonSpicyMains.some((r) => r.dish._id === 'm7'), false);
  });
});

describe('formatMoney', () => {
  test('formats Vietnamese VND values and safely falls back to 0đ for invalid numbers', () => {
    assert.equal(formatMoney(380000), '380.000đ');
    assert.equal(formatMoney(85000), '85.000đ');
    assert.equal(formatMoney(1250000), '1.250.000đ');
    assert.equal(formatMoney(0), '0đ');
    assert.equal(formatMoney(Number.NaN), '0đ');
    assert.equal(formatMoney(Number.POSITIVE_INFINITY), '0đ');
    assert.equal(formatMoney(Number.NEGATIVE_INFINITY), '0đ');
  });
});
