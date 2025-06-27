const mongoose = require('mongoose')

const leaveRequestSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  type: { type: String, enum: ['sick', 'casual', 'annual'], required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
}, { timestamps: true })

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema)