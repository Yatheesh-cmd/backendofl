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
        text: `Hello ${name}, your account has been created successfully.`,
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