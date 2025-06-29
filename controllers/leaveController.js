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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
          <h2 style="color: #333;">Leave Request Update</h2>
          <p style="color: ${status === 'Approved' ? '#28a745' : status === 'Rejected' ? '#dc3545' : '#ffc107'}; font-weight: bold;">
            Your leave request from ${leave.fromDate.toDateString()} to ${leave.toDate.toDateString()} has been ${status.toLowerCase()}.
          </p>
          <p><strong>Reason:</strong> ${leave.reason}</p>
          <div style="text-align: center; margin: 20px 0;">
            <img src="http://backoffice.hpushimla.in/img/leave.png" alt="Leave Management Logo" style="max-width: 200px;">
          </div>
          <p style="color: #333;">Thank you for using the Leave Management System.</p>
        </div>
      `,
    })

    res.status(200).json({ message: `Leave ${status} successfully` })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

exports.register = async (req, res) => {
  const { name, email, password, role } = req.body
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    let user = await User.findOne({ email: email.toLowerCase() })
    if (user) {
      return res.status(400).json({ message: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    user = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'employee',
    })
    await user.save()

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Welcome to LeaveHub',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h2 style="color: #333;">Welcome to Leave Management System</h2>
            <p style="color: #333;">Hello ${name},</p>
            <p style="color: #333;">Your account has been created successfully. You can now apply for leaves and manage your requests through our system.</p>
            <div style="text-align: center; margin: 20px 0;">
              <img src="http://backoffice.hpushimla.in/img/leave.png" alt="Leave Management Logo" style="max-width: 200px;">
            </div>
            <p style="color: #333;">Thank you for joining LeaveHub!</p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message)
    }

    res.status(201).json({ message: 'Registration successful' })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Server error: ' + error.message })
  }
}

exports.login = async (req, res) => {
  const { email, password, role } = req.body
  try {
    if (!email || !password || !role) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }
    if (user.role !== role) {
      return res.status(400).json({ message: 'Invalid role' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = generateToken(user._id, user.role)
    res.status(200).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Server error: ' + error.message })
  }
}

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
    if (!fromDate || !toDate || !type || !reason) {
      return res.status(400).json({ message: 'All fields are required' })
    }
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

    try {
      const admin = await User.findOne({ role: 'admin' })
      if (admin) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: admin.email,
          subject: 'New Leave Request',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
              <h2 style="color: #333;">New Leave Request</h2>
              <p style="color: #333;">A new leave request has been submitted by ${req.user.name}.</p>
              <p><strong>Type:</strong> ${type}</p>
              <p><strong>From:</strong> ${fromDate}</p>
              <p><strong>To:</strong> ${toDate}</p>
              <p><strong>Reason:</strong> ${reason}</p>
              <div style="text-align: center; margin: 20px 0;">
                <img src="http://backoffice.hpushimla.in/img/leave.png" alt="Leave Management Logo" style="max-width: 200px;">
              </div>
              <p style="color: #333;">Please review this request in the Leave Management System.</p>
            </div>
          `,
        })
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError.message)
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