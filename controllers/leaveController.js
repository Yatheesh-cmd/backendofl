const User = require('../models/User')
const bcrypt = require('bcryptjs')
const { generateToken } = require('../utils/generateToken')
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

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
          <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e0e0e0;">
            <div style="text-align: center;">
              <img src="https://cdn-icons-png.flaticon.com/512/7603/7603479.png" alt="LeaveHub Logo" style="width: 100px; margin-bottom: 10px;">
              <h1 style="color: #333; font-size: 24px;">Welcome Leave Management Portal</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9; border-radius: 5px;">
              <p style="font-size: 16px; color: #333;">Hello ${name},</p>
              <p style="font-size: 16px; color: #333;">Your account has been created successfully. Welcome to LeaveHub, your one-stop portal for managing leave requests.</p>
            </div>
            <div style="text-align: center; margin-top: 20px; font-size: 14px; color: #666;">
              <p>Thank you for using LeaveHub!</p>
              <p>Contact us at <a href="mailto:support@leavehub.com">support@leavehub.com</a> for assistance.</p>
            </div>
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