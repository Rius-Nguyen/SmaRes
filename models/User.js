const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); 
const { encrypt, decrypt } = require('../utils/security'); 

const userSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  role_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' }
}, { timestamps: true });

// GỘP CHUNG BỘ LỌC BẢO MẬT (KHÔNG SỬ DỤNG NEXT NỮA)
userSchema.pre('save', async function () {
  
  // 1. Mã hóa số điện thoại bằng AES-256
  if (this.isModified('phone') && this.phone) {
    this.phone = encrypt(this.phone);
  }

  // 2. Băm mật khẩu bằng Bcrypt
  if (this.isModified('password') && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

});

// 3. Tự động giải mã SĐT và giấu mật khẩu khi trả dữ liệu về trình duyệt
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v;
    if (ret.phone) ret.phone = decrypt(ret.phone);
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);