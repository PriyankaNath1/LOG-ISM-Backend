import mongoose from "mongoose";

const CurveSchema = new mongoose.Schema({
  name: String,
  unit: String,
  data: [Number]
});

const WellInfoSchema = new mongoose.Schema(
  {
    mnemonic: String,
    unit: String,
    value: String,
    description: String
  },
  { _id: false }
);

const WellLogSchema = new mongoose.Schema({
  wellId: String,
  userId: String,
  wellName: String,
  depth: [Number],
  curves: [CurveSchema],
  wellInfo: [WellInfoSchema],
  nullValue: Number,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("WellLog", WellLogSchema);