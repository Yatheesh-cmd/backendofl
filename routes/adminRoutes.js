const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const roleMiddleware = require('../middleware/roleMiddleware')
const { getAllLeaves, updateLeaveStatus } = require('../controllers/adminController')

router.get('/', authMiddleware, roleMiddleware(['admin']), getAllLeaves)
router.put('/:id/status', authMiddleware, roleMiddleware(['admin']), updateLeaveStatus)

module.exports = router