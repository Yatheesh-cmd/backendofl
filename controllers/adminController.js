const LeaveRequest = require('../models/LeaveRequest')
const User = require('../models/User')
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

exports.getAllLeaves = async (req, res) => {
  const { employee, status, search } = req.query
  try {
    let query = {}
    if (employee) query.employeeId = employee
    if (status) query.status = status
    if (search) {
      const users = await User.find({ name: { $regex: search, $options: 'i' } }).select('_id')
      query.employeeId = { $in: users.map(u => u._id) }
    }

    const leaves = await LeaveRequest.find(query).populate('employeeId', 'name')
    res.status(200).json(leaves)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.updateLeaveStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  try {
    const leave = await LeaveRequest.findById(id).populate('employeeId', 'name email')
    if (!leave) return res.status(404).json({ message: 'Leave not found' })

    leave.status = status
    await leave.save()

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: leave.employeeId.email,
      subject: `Leave Request ${status}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e0e0e0;">
          <div style="text-align: center;">
            <img src="https://cdn-icons-png.flaticon.com/512/7603/7603479.png" alt="LeaveHub Logo" style="width: 100px; margin-bottom: 10px;">
            <h1 style="color: #333; font-size: 24px;">Welcome Leave Management Portal</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
            <p style="font-size: 16px; color: #333;">Dear ${leave.employeeId.name},</p>
            <p style="font-size: 16px; color: #333;">Your leave request from ${leave.fromDate} to ${leave.toDate} has been ${status.toLowerCase()}.</p>
            <ul style="font-size: 16px; color: #333;">
              <li><strong>Type:</strong> ${leave.type}</li>
              <li><strong>From:</strong> ${leave.fromDate}</li>
              <li><strong>To:</strong> ${leave.toDate}</li>
              <li><strong>Reason:</strong> ${leave.reason}</li>
            </ul>
          </div>
          <div style="text-align: center; margin-top: 20px; font-size: 14px; color: #666;">
            <p>Thank you for using LeaveHub!</p>
            <p>Contact us at <a href="mailto:support@leavehub.com">support@leavehub.com</a> for assistance.</p>
          </div>
        </div>
      `,
    })

    res.status(200).json({ message: `Leave ${status} successfully` })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}