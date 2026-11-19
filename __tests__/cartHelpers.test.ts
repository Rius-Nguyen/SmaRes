import { describe, it, expect } from 'vitest';
import {
  normalizeCustomizations,
  buildCartKey,
  migrateCartItems,
  addItemToCartList,
  removeItemFromCartList,
  updateItemQuantityInCartList,
  type AddCartItemInput,
  type CartItem,
  type SpicyLevelOption,
} from '@/app/lib/cartHelpers';
import { formatMoney } from '@/app/lib/format';

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

describe('cartHelpers', () => {
  it('normalizeCustomizations and buildCartKey canonicalize camelCase and snake_case identically', () => {
    const camelNormalized = normalizeCustomizations({
      spicyLevel: 'HOT',
      iceLevel: '50%',
      sweetnessLevel: '0%',
      allergyNotes: '  Không hành  ',
    });
    const snakeNormalized = normalizeCustomizations({
      spicy_level: 'hot' as unknown as SpicyLevelOption,
      ice_level: '50%',
      sweetness_level: '0%',
      allergy_notes: 'Không hành',
    });

    expect(camelNormalized).toEqual({
      spicyLevel: 'HOT',
      iceLevel: '50%',
      sweetnessLevel: '0%',
      allergyNotes: 'Không hành',
    });
    expect(snakeNormalized).toEqual(camelNormalized);

    const keyFromCamel = buildCartKey(' dish-1 ', {
      spicyLevel: 'MEDIUM',
      allergyNotes: 'Ít tiêu',
    });
    const keyFromSnake = buildCartKey('dish-1', {
      spicy_level: 'MEDIUM',
      allergy_notes: '  Ít tiêu  ',
    });

    expect(keyFromCamel).toBe(keyFromSnake);
    expect(keyFromCamel).toBe(
      'dish-1::{"spicyLevel":"MEDIUM","iceLevel":"","sweetnessLevel":"","allergyNotes":"Ít tiêu"}'
    );
  });

  it('adding two customized variants of the same _id keeps distinct cartKeys and merges identical variants', () => {
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

    expect(list).toHaveLength(2);
    expect(list[0]._id).toBe(PHO_DISH_INPUT._id);
    expect(list[1]._id).toBe(PHO_DISH_INPUT._id);
    expect(list[0].cartKey).not.toBe(list[1].cartKey);
    expect(list[0].quantity).toBe(1);
    expect(list[1].quantity).toBe(2);

    // Adding the second variant again using legacy snake_case keys merges into entry [1]
    list = addItemToCartList(
      list,
      {
        ...PHO_DISH_INPUT,
        customizations: { spicy_level: 'HOT', allergy_notes: '  Không hành ' },
      },
      1
    );

    expect(list).toHaveLength(2);
    expect(list[0].quantity).toBe(1);
    expect(list[1].quantity).toBe(3);

    // Non-positive or non-finite quantities leave list unchanged
    const unchangedZero = addItemToCartList(list, PHO_DISH_INPUT, 0);
    const unchangedNaN = addItemToCartList(list, PHO_DISH_INPUT, Number.NaN);
    expect(unchangedZero).toHaveLength(2);
    expect(unchangedNaN).toHaveLength(2);
  });

  it('updateItemQuantityInCartList and removeItemFromCartList by cartKey leave sibling variants untouched', () => {
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

    expect(list).toHaveLength(2);
    const firstKey = list[0].cartKey;
    const secondKey = list[1].cartKey;

    // Update quantity of the first variant only
    list = updateItemQuantityInCartList(list, firstKey, 5);
    expect(list).toHaveLength(2);
    expect(list[0].quantity).toBe(5);
    expect(list[1].quantity).toBe(1);

    // Non-finite quantity leaves list unchanged
    const unchangedNaN = updateItemQuantityInCartList(list, firstKey, Number.NaN);
    expect(unchangedNaN[0].quantity).toBe(5);

    // Updating quantity to 0 removes only the targeted variant
    const afterZeroUpdate = updateItemQuantityInCartList(list, firstKey, 0);
    expect(afterZeroUpdate).toHaveLength(1);
    expect(afterZeroUpdate[0].cartKey).toBe(secondKey);
    expect(afterZeroUpdate[0].quantity).toBe(1);

    // Removing the second variant leaves the first untouched
    const afterRemoveSecond = removeItemFromCartList(list, secondKey);
    expect(afterRemoveSecond).toHaveLength(1);
    expect(afterRemoveSecond[0].cartKey).toBe(firstKey);
    expect(afterRemoveSecond[0].quantity).toBe(5);

    // Legacy removal by plain _id (without '::') removes all variants of that dish
    const afterLegacyRemove = removeItemFromCartList(list, TEA_DISH_INPUT._id);
    expect(afterLegacyRemove).toHaveLength(0);
  });

  it('migrateCartItems upgrades legacy items without cartKey, merges duplicate variants, and drops invalid rows', () => {
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
    expect(migrated).toHaveLength(3);

    // Legacy item without cartKey is upgraded
    expect(migrated[0]._id).toBe('dish-a');
    expect(migrated[0].cartKey).toBe(buildCartKey('dish-a'));
    expect(migrated[0].quantity).toBe(2);

    // Duplicate equivalent variants (snake_case legacy + camelCase) merged into quantity 3
    expect(migrated[1]._id).toBe('dish-b');
    expect(migrated[1].cartKey).toBe(
      buildCartKey('dish-b', { spicyLevel: 'MILD', allergyNotes: 'Không tiêu' })
    );
    expect(migrated[1].quantity).toBe(3);

    // Distinct spicy variant of same _id stays separate
    expect(migrated[2]._id).toBe('dish-b');
    expect(migrated[2].cartKey).toBe(buildCartKey('dish-b', { spicyLevel: 'HOT' }));
    expect(migrated[2].quantity).toBe(1);

    expect(migrateCartItems(null)).toEqual([]);
    expect(migrateCartItems('invalid')).toEqual([]);
  });
});

describe('formatMoney', () => {
  it('formats Vietnamese VND values and safely falls back to 0đ for invalid numbers', () => {
    expect(formatMoney(380000)).toBe('380.000đ');
    expect(formatMoney(85000)).toBe('85.000đ');
    expect(formatMoney(1250000)).toBe('1.250.000đ');
    expect(formatMoney(0)).toBe('0đ');
    expect(formatMoney(Number.NaN)).toBe('0đ');
    expect(formatMoney(Number.POSITIVE_INFINITY)).toBe('0đ');
    expect(formatMoney(Number.NEGATIVE_INFINITY)).toBe('0đ');
  });
});
