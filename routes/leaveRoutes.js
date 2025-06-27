const express = require('express')
const router = express.Router()
const authMiddleware = require('../middleware/authMiddleware')
const roleMiddleware = require('../middleware/roleMiddleware')
const { getLeaves, applyLeave, cancelLeave } = require('../controllers/leaveController')

router.get('/', authMiddleware, roleMiddleware(['employee']), getLeaves)
router.post('/', authMiddleware, roleMiddleware(['employee']), applyLeave)
router.delete('/:id', authMiddleware, roleMiddleware(['employee']), cancelLeave)

module.exports = router