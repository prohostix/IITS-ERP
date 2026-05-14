import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  userId: string;
  organizationId: mongoose.Types.ObjectId;
  departmentId?: mongoose.Types.ObjectId;
  additionalDepartmentIds?: mongoose.Types.ObjectId[]; // multi-dept access (branch managers etc.)
  branchId?: mongoose.Types.ObjectId; // set when user is a branch manager
  subDepartmentId?: mongoose.Types.ObjectId;
  ceoPanelId?: mongoose.Types.ObjectId;
  studyCenterId?: mongoose.Types.ObjectId;
  email: string;
  password: string;
  name: string;
  role: string;
  avatar?: string;
  phone?: string;
  designation?: string;
  reportingTo?: mongoose.Types.ObjectId;
  status: 'active' | 'inactive' | 'on_leave';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    userId: { 
      type: String, 
      unique: true,
      trim: true 
    },
    organizationId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization', 
      required: true 
    },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    additionalDepartmentIds: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    subDepartmentId: { type: Schema.Types.ObjectId, ref: 'SubDepartment' },
    ceoPanelId: { type: Schema.Types.ObjectId, ref: 'CeoPanel' },
    studyCenterId: { type: Schema.Types.ObjectId, ref: 'StudyCenter', default: null },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      lowercase: true, 
      trim: true 
    },
    password: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { 
      type: String, 
      required: true,
      enum: [
        'superadmin', 'org_admin', 'ceo', 'ops_admin', 'ops_sub_admin',
        'finance_admin', 'hr_admin', 'sales_admin', 'center_admin', 'employee', 'staff'
      ]
    },
    avatar: { type: String },
    phone: { type: String },
    designation: { type: String },
    reportingTo: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { 
      type: String, 
      enum: ['active', 'inactive', 'on_leave'], 
      default: 'active' 
    },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

// Indexes
userSchema.index({ organizationId: 1, role: 1 });
userSchema.index({ departmentId: 1 });
userSchema.index({ additionalDepartmentIds: 1 });

// Auto-generate userId before saving
userSchema.pre('save', async function (next) {
  if (!this.userId) {
    // Get the count of existing users to generate the next ID
    const count = await mongoose.model('User').countDocuments();
    this.userId = `IITSRPS${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);
