import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CANCELLATION_MIN_NOTICE_MINUTES,
  VIETNAM_DATE_REGEX,
  VIETNAM_TIME_REGEX,
  parseVietnamDateTime,
  evaluateCancellationWindow,
  generateBookingCode,
} from '../app/lib/reservationHelpers.ts';
import {
  KDS_ORDER_STATUS,
  normalizeOrderStatus,
  normalizeOrderCustomization,
  formatCustomizationLabels,
  groupKitchenDishes,
  getWaitMinutes,
  type KDSOrder,
} from '../app/lib/kdsAggregation.ts';

describe('reservationHelpers', () => {
  test('exposes expected constants and regex patterns', () => {
    assert.equal(CANCELLATION_MIN_NOTICE_MINUTES, 60);
    assert.equal(VIETNAM_DATE_REGEX.test('2026-11-20'), true);
    assert.equal(VIETNAM_DATE_REGEX.test('2026-1-20'), false);
    assert.equal(VIETNAM_TIME_REGEX.test('08:30'), true);
    assert.equal(VIETNAM_TIME_REGEX.test('8:30'), false);
  });

  test('parseVietnamDateTime parses +07:00 date/time and trims surrounding whitespace', () => {
    const eveningMs = parseVietnamDateTime('2026-11-20', '19:30');
    assert.equal(eveningMs, Date.UTC(2026, 10, 20, 12, 30, 0));

    // 02:15 in +07:00 maps back to 19:15 UTC on the previous calendar day
    const earlyMorningMs = parseVietnamDateTime('  2026-11-20 ', ' 02:15  ');
    assert.equal(earlyMorningMs, Date.UTC(2026, 10, 19, 19, 15, 0));

    // Boundary times within a day
    assert.equal(parseVietnamDateTime('2026-11-20', '00:00'), Date.UTC(2026, 10, 19, 17, 0, 0));
    assert.equal(parseVietnamDateTime('2026-11-20', '23:59'), Date.UTC(2026, 10, 20, 16, 59, 0));
  });

  test('parseVietnamDateTime rejects invalid calendar dates including Feb 30 and non-leap Feb 29', () => {
    assert.equal(Number.isNaN(parseVietnamDateTime('2026-02-30', '18:00')), true);
    assert.equal(Number.isNaN(parseVietnamDateTime('2026-02-29', '18:00')), true);
    assert.equal(Number.isNaN(parseVietnamDateTime('2026-04-31', '18:00')), true);
    assert.equal(Number.isNaN(parseVietnamDateTime('2026-13-01', '18:00')), true);
    assert.equal(Number.isNaN(parseVietnamDateTime('2026-00-10', '18:00')), true);
    assert.equal(Number.isNaN(parseVietnamDateTime('2026-01-00', '18:00')), true);

    // Leap years accept Feb 29
    assert.equal(
      parseVietnamDateTime('2024-02-29', '12:00'),
      Date.UTC(2024, 1, 29, 5, 0, 0)
    );
    assert.equal(
      parseVietnamDateTime('2028-02-29', '12:00'),
      Date.UTC(2028, 1, 29, 5, 0, 0)
    );
  });

  test('parseVietnamDateTime rejects invalid formats and out-of-range times', () => {
    assert.equal(Number.isNaN(parseVietnamDateTime('2026-11-20', '24:00')), true);
    assert.equal(Number.isNaN(parseVietnamDateTime('2026-11-20', '12:60')), true);
    assert.equal(Number.isNaN(parseVietnamDateTime('2026-11-20', '9:30')), true);
    assert.equal(Number.isNaN(parseVietnamDateTime('2026/11/20', '19:00')), true);
    assert.equal(Number.isNaN(parseVietnamDateTime('', '19:00')), true);
    assert.equal(Number.isNaN(parseVietnamDateTime('2026-11-20', '')), true);
  });

  test('evaluateCancellationWindow enforces exact > 60 minute cutoff in +07:00', () => {
    const bookingDate = '2026-11-20';
    const bookingTime = '19:00';
    const bookingMs = parseVietnamDateTime(bookingDate, bookingTime);
    assert.equal(bookingMs, Date.UTC(2026, 10, 20, 12, 0, 0));

    // > 60 minutes (60m + 1ms before) -> allowed
    const justOver60 = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs - (60 * 60_000 + 1));
    assert.equal(justOver60.allowed, true);
    assert.equal(justOver60.diffInMinutes > 60, true);
    assert.equal(justOver60.reason, undefined);

    // 61 minutes before -> allowed
    const at61Min = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs - 61 * 60_000);
    assert.equal(at61Min.allowed, true);
    assert.equal(at61Min.diffInMinutes, 61);

    // Exactly 60 minutes before -> rejected (<= 60)
    const exact60 = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs - 60 * 60_000);
    assert.equal(exact60.allowed, false);
    assert.equal(exact60.diffInMinutes, 60);
    assert.equal(exact60.reason, 'Chỉ được phép hủy đơn trước giờ hẹn ít nhất 60 phút.');

    // 59 minutes before -> rejected
    const at59Min = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs - 59 * 60_000);
    assert.equal(at59Min.allowed, false);
    assert.equal(at59Min.diffInMinutes, 59);
    assert.equal(at59Min.reason, 'Chỉ được phép hủy đơn trước giờ hẹn ít nhất 60 phút.');

    // Exact booking time (0 minutes) -> rejected as past/elapsed
    const atZero = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs);
    assert.equal(atZero.allowed, false);
    assert.equal(atZero.diffInMinutes, 0);
    assert.equal(atZero.reason, 'Không thể hủy đơn đặt bàn đã qua thời gian hẹn.');

    // Past booking time (< 0 minutes) -> rejected
    const pastTime = evaluateCancellationWindow(bookingDate, bookingTime, bookingMs + 15 * 60_000);
    assert.equal(pastTime.allowed, false);
    assert.equal(pastTime.diffInMinutes, -15);
    assert.equal(pastTime.reason, 'Không thể hủy đơn đặt bàn đã qua thời gian hẹn.');
  });

  test('evaluateCancellationWindow rejects invalid dates and non-finite nowMs', () => {
    const invalidCalendar = evaluateCancellationWindow('2026-02-30', '19:00', Date.UTC(2026, 1, 1));
    assert.equal(invalidCalendar.allowed, false);
    assert.equal(Number.isNaN(invalidCalendar.diffInMinutes), true);
    assert.equal(invalidCalendar.reason, 'Thời gian đặt bàn không hợp lệ.');

    const invalidNow = evaluateCancellationWindow('2026-11-20', '19:00', Number.NaN);
    assert.equal(invalidNow.allowed, false);
    assert.equal(Number.isNaN(invalidNow.diffInMinutes), true);
    assert.equal(invalidNow.reason, 'Thời gian đặt bàn không hợp lệ.');
  });

  test('generateBookingCode returns RES-XXXXXX with 6 uppercase hex characters', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      const code = generateBookingCode();
      assert.match(code, /^RES-[0-9A-F]{6}$/);
      codes.add(code);
    }
    assert.equal(codes.size > 40, true);
  });
});

describe('kdsAggregation', () => {
  test('normalizeOrderStatus normalizes known statuses and defaults unknowns to PENDING', () => {
    assert.equal(normalizeOrderStatus('pending'), KDS_ORDER_STATUS.PENDING);
    assert.equal(normalizeOrderStatus(' COOKING '), KDS_ORDER_STATUS.COOKING);
    assert.equal(normalizeOrderStatus('preparing'), KDS_ORDER_STATUS.COOKING);
    assert.equal(normalizeOrderStatus('completed'), KDS_ORDER_STATUS.COMPLETED);
    assert.equal(normalizeOrderStatus('CANCELLED'), KDS_ORDER_STATUS.CANCELLED);
    assert.equal(normalizeOrderStatus(null), KDS_ORDER_STATUS.PENDING);
    assert.equal(normalizeOrderStatus(undefined), KDS_ORDER_STATUS.PENDING);
    assert.equal(normalizeOrderStatus('UNKNOWN'), KDS_ORDER_STATUS.PENDING);
  });

  test('normalizeOrderCustomization supports camelCase, snake_case, and defaults', () => {
    assert.deepEqual(normalizeOrderCustomization(null), {
      spicyLevel: 'NONE',
      allergyNotes: '',
    });

    assert.deepEqual(
      normalizeOrderCustomization({
        spicyLevel: ' hot ',
        iceLevel: ' 50% ',
        sweetnessLevel: '0%',
        allergyNotes: '  Không hành  ',
      }),
      {
        spicyLevel: 'HOT',
        iceLevel: '50%',
        sweetnessLevel: '0%',
        allergyNotes: 'Không hành',
      }
    );

    assert.deepEqual(
      normalizeOrderCustomization({
        spicy_level: 'medium',
        ice_level: '0%',
        sweetness_level: '50%',
        allergy_notes: '  Dị ứng đậu phộng ',
      }),
      {
        spicyLevel: 'MEDIUM',
        iceLevel: '0%',
        sweetnessLevel: '50%',
        allergyNotes: 'Dị ứng đậu phộng',
      }
    );

    // camelCase takes precedence over snake_case when both are present
    assert.deepEqual(
      normalizeOrderCustomization({
        spicyLevel: 'mild',
        spicy_level: 'hot',
        iceLevel: '100%',
        ice_level: '0%',
        allergyNotes: '',
        allergy_notes: 'Ignored snake_case',
      }),
      {
        spicyLevel: 'MILD',
        iceLevel: '100%',
        sweetnessLevel: undefined,
        allergyNotes: '',
      }
    );
  });

  test('formatCustomizationLabels translates spice levels and hides 100% drink defaults unless requested', () => {
    assert.deepEqual(
      formatCustomizationLabels({
        spicy_level: 'mild',
        ice_level: '100%',
        sweetness_level: '50%',
        allergy_notes: 'Ít dầu',
      }),
      ['Độ cay: Cay nhẹ', 'Ngọt: 50%', 'Lưu ý: Ít dầu']
    );

    assert.deepEqual(
      formatCustomizationLabels(
        {
          spicyLevel: 'NONE',
          iceLevel: '100%',
          sweetnessLevel: '100%',
          allergyNotes: '',
        },
        { includeDefaultLevels: true }
      ),
      ['Đá: 100%', 'Ngọt: 100%']
    );
  });

  test('groupKitchenDishes aggregates by menuItemId and foodId across tables and excludes COMPLETED/CANCELLED', () => {
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
    assert.equal(grouped.length, 3);

    // First item must be COOKING (from PREPARING ord-2)
    const pho = grouped[0];
    assert.equal(pho.dishKey, 'menu-pho-bo');
    assert.equal(pho.menuItemId, 'menu-pho-bo');
    assert.equal(pho.totalQuantity, 4);
    assert.equal(pho.status, 'COOKING');
    assert.equal(pho.oldestOrderTime.getTime(), t1.getTime());
    assert.equal(pho.tableBreakdown.length, 3);
    assert.equal(pho.breakdownSummary, '(Bàn B01: 3, Bàn B02: 1)');
    assert.deepEqual(pho.customizationSummary, [
      'Bàn B01: Độ cay: Cay nhiều • Lưu ý: Không hành',
      'Bàn B02: Độ cay: Cay nhẹ',
    ]);

    // Second item is PENDING with earlier oldestOrderTime (t2 < t4)
    const traDao = grouped[1];
    assert.equal(traDao.dishKey, 'food-tra-dao');
    assert.equal(traDao.foodId, 'food-tra-dao');
    assert.equal(traDao.totalQuantity, 3);
    assert.equal(traDao.status, 'PENDING');
    assert.equal(traDao.oldestOrderTime.getTime(), t2.getTime());
    assert.equal(traDao.breakdownSummary, '(Bàn B01: 1, Bàn B02: 2)');
    assert.deepEqual(traDao.customizationSummary, [
      'Bàn B01: Đá: 50%',
      'Bàn B02: Đá: 0% • Ngọt: 50% • Lưu ý: Ít đá',
    ]);

    // Third item falls back to lowercased trimmed name key and preserves 'Bàn 05'
    const flan = grouped[2];
    assert.equal(flan.dishKey, 'bánh flan');
    assert.equal(flan.totalQuantity, 2);
    assert.equal(flan.status, 'PENDING');
    assert.equal(flan.breakdownSummary, '(Bàn 05: 2)');
  });

  test('groupKitchenDishes merges shared key across menuItemId and foodId and falls back to Mang về', () => {
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
    assert.equal(grouped.length, 1);
    assert.equal(grouped[0].dishKey, 'dish-42');
    assert.equal(grouped[0].menuItemId, 'dish-42');
    assert.equal(grouped[0].foodId, 'dish-42');
    assert.equal(grouped[0].totalQuantity, 3);
    assert.equal(grouped[0].status, 'COOKING');
    assert.equal(grouped[0].breakdownSummary, '(Mang về: 1, Bàn T09: 2)');
  });

  test('getWaitMinutes returns non-negative elapsed minutes and 0 on invalid timestamps', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60_000 - 15_000);
    const wait = getWaitMinutes(fiveMinutesAgo);
    assert.equal(wait >= 5 && wait <= 6, true);

    assert.equal(getWaitMinutes('not-a-date'), 0);
    assert.equal(getWaitMinutes(new Date(Date.now() + 60_000)), 0);
  });
});
