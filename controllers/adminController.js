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
      text: `Your leave request from ${leave.fromDate} to ${leave.toDate} has been ${status.toLowerCase()}. Reason: ${leave.reason}`,
    })

    res.status(200).json({ message: `Leave ${status} successfully` })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}