import { describe, it, expect } from 'vitest';
import {
  KDS_ORDER_STATUS,
  normalizeOrderStatus,
  normalizeOrderCustomization,
  formatCustomizationLabels,
  groupKitchenDishes,
  getWaitMinutes,
  type KDSOrder,
} from '@/app/lib/kdsAggregation';

describe('kdsAggregation', () => {
  it('normalizeOrderStatus normalizes known statuses and defaults unknowns to PENDING', () => {
    expect(normalizeOrderStatus('pending')).toBe(KDS_ORDER_STATUS.PENDING);
    expect(normalizeOrderStatus(' COOKING ')).toBe(KDS_ORDER_STATUS.COOKING);
    expect(normalizeOrderStatus('preparing')).toBe(KDS_ORDER_STATUS.COOKING);
    expect(normalizeOrderStatus('completed')).toBe(KDS_ORDER_STATUS.COMPLETED);
    expect(normalizeOrderStatus('CANCELLED')).toBe(KDS_ORDER_STATUS.CANCELLED);
    expect(normalizeOrderStatus(null)).toBe(KDS_ORDER_STATUS.PENDING);
    expect(normalizeOrderStatus(undefined)).toBe(KDS_ORDER_STATUS.PENDING);
    expect(normalizeOrderStatus('UNKNOWN')).toBe(KDS_ORDER_STATUS.PENDING);
  });

  it('normalizeOrderCustomization supports camelCase, snake_case, and defaults', () => {
    expect(normalizeOrderCustomization(null)).toEqual({
      spicyLevel: 'NONE',
      allergyNotes: '',
    });

    expect(
      normalizeOrderCustomization({
        spicyLevel: ' hot ',
        iceLevel: ' 50% ',
        sweetnessLevel: '0%',
        allergyNotes: '  Không hành  ',
      })
    ).toEqual({
      spicyLevel: 'HOT',
      iceLevel: '50%',
      sweetnessLevel: '0%',
      allergyNotes: 'Không hành',
    });

    expect(
      normalizeOrderCustomization({
        spicy_level: 'medium',
        ice_level: '0%',
        sweetness_level: '50%',
        allergy_notes: '  Dị ứng đậu phộng ',
      })
    ).toEqual({
      spicyLevel: 'MEDIUM',
      iceLevel: '0%',
      sweetnessLevel: '50%',
      allergyNotes: 'Dị ứng đậu phộng',
    });

    // camelCase takes precedence over snake_case when both are present
    expect(
      normalizeOrderCustomization({
        spicyLevel: 'mild',
        spicy_level: 'hot',
        iceLevel: '100%',
        ice_level: '0%',
        allergyNotes: '',
        allergy_notes: 'Ignored snake_case',
      })
    ).toEqual({
      spicyLevel: 'MILD',
      iceLevel: '100%',
      sweetnessLevel: undefined,
      allergyNotes: '',
    });
  });

  it('formatCustomizationLabels translates spice levels and hides 100% drink defaults unless requested', () => {
    expect(
      formatCustomizationLabels({
        spicy_level: 'mild',
        ice_level: '100%',
        sweetness_level: '50%',
        allergy_notes: 'Ít dầu',
      })
    ).toEqual(['Độ cay: Cay nhẹ', 'Ngọt: 50%', 'Lưu ý: Ít dầu']);

    expect(
      formatCustomizationLabels({
        spicyLevel: 'MEDIUM',
      })
    ).toEqual(['Độ cay: Cay vừa']);

    expect(
      formatCustomizationLabels(
        {
          spicyLevel: 'NONE',
          iceLevel: '100%',
          sweetnessLevel: '100%',
          allergyNotes: '',
        },
        { includeDefaultLevels: true }
      )
    ).toEqual(['Đá: 100%', 'Ngọt: 100%']);
  });

  it('groupKitchenDishes aggregates by menuItemId and foodId across tables and excludes COMPLETED/CANCELLED', () => {
    const t1 = new Date('2026-11-19T11:00:00.000Z');
    const t2 = new Date('2026-11-19T11:05:00.000Z');
    const t3 = new Date('2026-11-19T11:10:00.000Z');
    const t4 = new Date('2026-11-19T11:15:00.000Z');

    const orders: KDSOrder[] = [
      {
        _id: 'ord-1',
        orderCode: 'ORD-001',
        tableNumber: 'B01',
        status: 'PENDING',
        createdAt: t2,
        items: [
          {
            menuItemId: 'menu-pho-bo',
            name: 'Phở Bò Đặc Biệt',
            quantity: 2,
            customizations: { spicyLevel: 'HOT', allergyNotes: 'Không hành' },
          },
          {
            foodId: 'food-tra-dao',
            name: 'Trà Đào Cam Sả',
            quantity: 1,
            customizations: { ice_level: '50%', sweetness_level: '100%' },
          },
        ],
      },
      {
        _id: 'ord-2',
        orderCode: 'ORD-002',
        tableNumber: 'B02',
        status: 'PREPARING',
        createdAt: t1,
        items: [
          {
            menuItemId: 'menu-pho-bo',
            name: 'Phở Bò Đặc Biệt',
            quantity: 1,
            customizations: { spicy_level: 'mild' },
          },
        ],
      },
      {
        _id: 'ord-3',
        orderCode: 'ORD-003',
        tableNumber: 'B01',
        status: 'PENDING',
        createdAt: t3,
        items: [
          {
            menuItemId: 'menu-pho-bo',
            name: 'Phở Bò Đặc Biệt',
            quantity: 1,
          },
        ],
      },
      {
        _id: 'ord-7',
        orderCode: 'ORD-007',
        tableNumber: 'B02',
        status: 'PENDING',
        createdAt: t3,
        items: [
          {
            foodId: 'food-tra-dao',
            name: 'Trà Đào Cam Sả',
            quantity: 2,
            customizations: { iceLevel: '0%', sweetnessLevel: '50%', allergyNotes: 'Ít đá' },
          },
        ],
      },
      {
        _id: 'ord-4',
        orderCode: 'ORD-004',
        tableNumber: 'B03',
        status: 'COMPLETED',
        createdAt: t1,
        items: [{ menuItemId: 'menu-pho-bo', name: 'Phở Bò Đặc Biệt', quantity: 5 }],
      },
      {
        _id: 'ord-5',
        orderCode: 'ORD-005',
        tableNumber: 'B04',
        status: 'CANCELLED',
        createdAt: t1,
        items: [{ foodId: 'food-tra-dao', name: 'Trà Đào Cam Sả', quantity: 4 }],
      },
      {
        _id: 'ord-6',
        orderCode: 'ORD-006',
        tableNumber: 'Bàn 05',
        status: 'PENDING',
        createdAt: t4,
        items: [
          {
            name: '  Bánh Flan  ',
            quantity: 2,
          },
          {
            menuItemId: 'ignored-zero',
            name: 'Món 0 phần',
            quantity: 0,
          },
        ],
      },
    ];

    const grouped = groupKitchenDishes(orders);
    expect(grouped).toHaveLength(3);

    // First item must be COOKING (from PREPARING ord-2)
    const pho = grouped[0];
    expect(pho.dishKey).toBe('menu-pho-bo');
    expect(pho.menuItemId).toBe('menu-pho-bo');
    expect(pho.totalQuantity).toBe(4);
    expect(pho.status).toBe('COOKING');
    expect(pho.oldestOrderTime.getTime()).toBe(t1.getTime());
    expect(pho.tableBreakdown).toHaveLength(3);
    expect(pho.breakdownSummary).toBe('(Bàn B01: 3, Bàn B02: 1)');
    expect(pho.customizationSummary).toEqual([
      'Bàn B01: Độ cay: Cay nhiều • Lưu ý: Không hành',
      'Bàn B02: Độ cay: Cay nhẹ',
    ]);

    // Second item is PENDING with earlier oldestOrderTime (t2 < t4)
    const traDao = grouped[1];
    expect(traDao.dishKey).toBe('food-tra-dao');
    expect(traDao.foodId).toBe('food-tra-dao');
    expect(traDao.totalQuantity).toBe(3);
    expect(traDao.status).toBe('PENDING');
    expect(traDao.oldestOrderTime.getTime()).toBe(t2.getTime());
    expect(traDao.breakdownSummary).toBe('(Bàn B01: 1, Bàn B02: 2)');
    expect(traDao.customizationSummary).toEqual([
      'Bàn B01: Đá: 50%',
      'Bàn B02: Đá: 0% • Ngọt: 50% • Lưu ý: Ít đá',
    ]);

    // Third item falls back to lowercased trimmed name key and preserves 'Bàn 05'
    const flan = grouped[2];
    expect(flan.dishKey).toBe('bánh flan');
    expect(flan.totalQuantity).toBe(2);
    expect(flan.status).toBe('PENDING');
    expect(flan.breakdownSummary).toBe('(Bàn 05: 2)');
  });

  it('groupKitchenDishes merges shared key across menuItemId and foodId and falls back to Mang về', () => {
    const orders: KDSOrder[] = [
      {
        _id: 'ord-a',
        status: 'PENDING',
        createdAt: '2026-11-19T12:00:00.000Z',
        items: [{ menuItemId: 'dish-42', name: 'Cơm Tấm Sườn', quantity: 1 }],
      },
      {
        _id: 'ord-b',
        tableId: 'T09',
        status: 'COOKING',
        createdAt: '2026-11-19T11:50:00.000Z',
        items: [{ foodId: 'dish-42', name: 'Cơm Tấm Sườn', quantity: 2 }],
      },
    ];

    const grouped = groupKitchenDishes(orders);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].dishKey).toBe('dish-42');
    expect(grouped[0].menuItemId).toBe('dish-42');
    expect(grouped[0].foodId).toBe('dish-42');
    expect(grouped[0].totalQuantity).toBe(3);
    expect(grouped[0].status).toBe('COOKING');
    expect(grouped[0].breakdownSummary).toBe('(Mang về: 1, Bàn T09: 2)');
  });

  it('returns empty array for empty or all-completed orders', () => {
    expect(groupKitchenDishes([])).toEqual([]);
    expect(
      groupKitchenDishes([
        {
          _id: 'ord-done',
          status: 'COMPLETED',
          createdAt: '2026-11-19T12:00:00.000Z',
          items: [{ menuItemId: 'dish-1', name: 'Gỏi Cuốn', quantity: 2 }],
        },
      ])
    ).toEqual([]);
  });

  it('getWaitMinutes returns non-negative elapsed minutes and 0 on invalid timestamps', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000 - 15_000);
    const wait = getWaitMinutes(fiveMinutesAgo);
    expect(wait).toBeGreaterThanOrEqual(5);
    expect(wait).toBeLessThanOrEqual(6);

    expect(getWaitMinutes('not-a-date')).toBe(0);
    expect(getWaitMinutes(new Date(Date.now() + 60_000))).toBe(0);
  });
});
