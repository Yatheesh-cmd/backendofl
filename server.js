const express = require('express')
const dotenv = require('dotenv')
const connectDB = require('./config/db')
const cors = require('cors')

dotenv.config()
connectDB()

const app = express()


app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], 
  credentials: true
}))
app.use(express.json())

app.use('/api/auth', require('./routes/authRoutes'))
app.use('/api/leaves', require('./routes/leaveRoutes'))
app.use('/api/admin/leaves', require('./routes/adminRoutes'))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))