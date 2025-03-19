// backend/src/routes/index.js
const express = require('express');
const interviewController = require('../controllers/interview.controller');

const router = express.Router();

// Rota de status
router.get('/status', (req, res) => {
  res.json({ status: 'online', model: process.env.GPT_MODEL });
});

// Rotas de entrevista
router.post('/interview/start', interviewController.startInterview);
router.post('/interview/respond', interviewController.processResponse);
router.get('/interview/audio/:id', interviewController.getAudio);

module.exports = router;