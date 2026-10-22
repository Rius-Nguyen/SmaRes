export interface MenuItemData {
  _id: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: 'Khai vị' | 'Món chính' | 'Đồ uống' | 'Tráng miệng';
  isAvailable: boolean;
  isPreOrderOnly?: boolean;
  preparationNote?: string;
}

export const INITIAL_MENU_ITEMS: MenuItemData[] = [
  // Khai vị
  {
    _id: '6717a01a1e0011a100000001',
    name: 'Gỏi Cuốn Tôm Thịt Thanh Mát',
    price: 85000,
    description: 'Tôm đất luộc tươi ngọt cuộn cùng thịt ba rọi mềm thơm, rau thơm Tây Ninh thanh mát và bún tươi dai mềm chấm sốt tương bơ đậu phộng.',
    imageUrl: '/foods/goi_cuon.jpg',
    category: 'Khai vị',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Chế biến nhanh tại chỗ',
  },
  {
    _id: '6717a01a1e0011a100000002',
    name: 'Chả Giò Cua Hoàng Đế & Trứng Cá Tầm Caviar',
    price: 295000,
    description: 'Thịt cua hoàng đế tươi ngọt gói trọn trong lớp bánh tráng mỏng giòn, phủ lớp trứng cá tầm Caviar sang trọng. Chỉ nhận phục vụ khi đặt trước.',
    imageUrl: '/foods/cha_gio.jpg',
    category: 'Khai vị',
    isAvailable: true,
    isPreOrderOnly: true,
    preparationNote: 'Nguyên liệu hải sản tươi sống tuyển chọn trong ngày',
  },
  {
    _id: '6717a01a1e0011a100000003',
    name: 'Nộm Hoa Chuối Tai Heo Giòn Chua Ngọt',
    price: 95000,
    description: 'Hoa chuối bào giòn rụm trộn tai heo sần sật bóp chua cay ngọt vị, thêm lạc rang thơm bùi Tây Bắc.',
    imageUrl: '/foods/nom_hoa_chuoi.jpg',
    category: 'Khai vị',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Món ăn kèm thanh đạm',
  },

  // Món chính
  {
    _id: '6717a01a1e0011a100000004',
    name: 'Phở Bò Wagyu A5 Thượng Hạng Dát Vàng',
    price: 380000,
    description: 'Nước dùng truyền thống thanh ngọt từ xương hầm 24 giờ cùng thịt bò Wagyu A5 mềm mọng hảo hạng dát vàng lá thực phẩm sang trọng.',
    imageUrl: '/foods/pho_bo2.jpg',
    category: 'Món chính',
    isAvailable: true,
    isPreOrderOnly: true,
    preparationNote: 'Cần 3 giờ ninh chuẩn bị nước hầm Wagyu đặc biệt',
  },
  {
    _id: '6717a01a1e0011a100000005',
    name: 'Vịt Quay Bắc Kinh Sốt Mật Ong Rừng Tây Bắc',
    price: 450000,
    description: 'Thịt vịt tươi mềm bóng bẩy tẩm ướp mật ong rừng nguyên bản Tây Bắc cùng thảo mộc cung đình, nướng lu đất giòn da bóng bẩy.',
    imageUrl: '/foods/vit_quay2.jpg',
    category: 'Món chính',
    isAvailable: true,
    isPreOrderOnly: true,
    preparationNote: 'Chế biến lu nung thủ công 2.5 giờ trước giờ đến',
  },
  {
    _id: '6717a01a1e0011a100000006',
    name: 'Cá Chẽm Hoàng Gia Hấp Sốt Tàu Xì Cổ Truyền',
    price: 290000,
    description: 'Cá chẽm tươi nguyên con ngọt thịt hấp cùng nước sốt tương tàu xì hảo hạng, gừng tươi và hành hoa thơm dịu.',
    imageUrl: '/foods/ca_chem_hap.jpg',
    category: 'Món chính',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Hấp nhiệt độ chuẩn xác 20 phút',
  },

  // Tráng miệng
  {
    _id: '6717a01a1e0011a100000007',
    name: 'Chè Sen Hạt Long Nhãn Cung Đình',
    price: 65000,
    description: 'Hạt sen Huế ninh mềm dẻo lồng ghép tinh tế vào từng trái nhãn lồng Hưng Yên ngọt lịm nước đường phèn.',
    imageUrl: '/foods/che_sen.jpg',
    category: 'Tráng miệng',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Món ngọt thanh mát cung đình',
  },
  {
    _id: '6717a01a1e0011a100000008',
    name: 'Bánh Caramen Sốt Cà Phê Ban Mê',
    price: 55000,
    description: 'Bánh flan caramen mịn màng béo ngậy vị sữa thơm kết hợp tinh tế cùng sốt cà phê Phin đậm đặc đặc trưng.',
    imageUrl: '/foods/banh.jpg',
    category: 'Tráng miệng',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Caramen thủ công hàng ngày',
  },
  {
    _id: '6717a01a1e0011a100000009',
    name: 'Sữa Chua Nếp Cẩm Mộc Châu Nhà Làm',
    price: 50000,
    description: 'Nếp cẩm Sơn La dẻo thơm lên men chuẩn vị ngọt bùi hòa quyện cùng sữa chua nhà làm béo ngậy mát lành.',
    imageUrl: '/foods/sua_chua.jpg',
    category: 'Tráng miệng',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Men tự nhiên bổ dưỡng',
  },

  // Đồ uống & Rượu
  {
    _id: '6717a01a1e0011a100000010',
    name: 'Trà Sen Vàng Thượng Hạng Tây Hồ',
    price: 55000,
    description: 'Trà sen thủ công ướp bông hoa sen Bách Diệp ven hồ Tây, thanh khiết trang nhã, phục vụ kèm ấm gốm và tách nóng hổi.',
    imageUrl: '/foods/tra_sen.jpg',
    category: 'Đồ uống',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Pha ấm nóng 90 độ C chuẩn vị',
  },
  {
    _id: '6717a01a1e0011a100000011',
    name: 'Vang Đỏ Bordeaux Cao Cấp (Pháp)',
    price: 180000,
    description: 'Rượu vang đỏ đậm đà từ vùng Bordeaux nước Pháp, vị chát mượt mà lưu hương thảo mộc và gỗ sồi, thưởng thức hoàn hảo cùng món nướng.',
    imageUrl: '/foods/vang_do.jpg',
    category: 'Đồ uống',
    isAvailable: true,
    isPreOrderOnly: false,
    preparationNote: 'Phục vụ kèm ly pha lê ướp chuẩn nhiệt độ',
  },
];
