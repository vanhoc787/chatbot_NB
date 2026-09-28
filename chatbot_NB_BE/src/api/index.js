const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const chatbotRoutes = require('./chatbot.routes');
const userRoutes = require('./user.routes');
const converRoutes = require('./conversation.routers')
const documentRoutes = require('./document.routes')

router.use('/auth', authRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/users', userRoutes);
router.use('/conver', converRoutes);
router.use('/document', documentRoutes)


module.exports = router;