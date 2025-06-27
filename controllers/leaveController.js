const LeaveRequest = require('../models/LeaveRequest')
const User = require('../models/User') // Added missing import
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

exports.getLeaves = async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ employeeId: req.user.id }).populate('employeeId', 'name')
    res.status(200).json(leaves)
  } catch (error) {
    console.error('Error fetching leaves:', error)
    res.status(500).json({ message: 'Failed to fetch leaves: ' + error.message })
  }
}

exports.applyLeave = async (req, res) => {
  const { fromDate, toDate, type, reason } = req.body
  try {
    // Validate input
    if (!fromDate || !toDate || !type || !reason) {
      return res.status(400).json({ message: 'All fields are required' })
    }
    // Validate date format
    const from = new Date(fromDate)
    const to = new Date(toDate)
    if (isNaN(from) || isNaN(to)) {
      return res.status(400).json({ message: 'Invalid date format' })
    }
    if (from > to) {
      return res.status(400).json({ message: 'From date must be before to date' })
    }

    const leave = new LeaveRequest({
      employeeId: req.user.id,
      fromDate: from,
      toDate: to,
      type,
      reason,
    })
    await leave.save()

    // Send email to admin
    try {
      const admin = await User.findOne({ role: 'admin' })
      if (admin) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: admin.email,
          subject: 'New Leave Request',
          text: `A new leave request has been submitted by ${req.user.name}. Type: ${type}, From: ${fromDate}, To: ${toDate}, Reason: ${reason}`,
        })
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message)
      // Continue even if email fails
    }

    res.status(201).json({ message: 'Leave applied successfully', leave })
  } catch (error) {
    console.error('Error applying leave:', error)
    res.status(500).json({ message: 'Failed to apply leave: ' + error.message })
  }
}

exports.cancelLeave = async (req, res) => {
  const { id } = req.params
  try {
    const leave = await LeaveRequest.findOne({ _id: id, employeeId: req.user.id })
    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' })
    }
    if (leave.status !== 'Pending') {
      return res.status(400).json({ message: 'Cannot cancel non-pending leave' })
    }

    await LeaveRequest.deleteOne({ _id: id })
    res.status(200).json({ message: 'Leave cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling leave:', error)
    res.status(500).json({ message: 'Failed to cancel leave: ' + error.message })
  }
}