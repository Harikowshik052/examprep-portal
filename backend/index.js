const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(express.json());

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['POST'],
}));

// In-memory OTP store: { email: { hash, expiresAt } }
// We store a HMAC of the OTP, never the raw OTP
const otpStore = new Map();

const crypto = require('crypto');

function hashOtp(otp, email) {
  return crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(otp + email)
    .digest('hex');
}

function generateOtp() {
  // 6-digit cryptographically random OTP
  const bytes = crypto.randomBytes(3);
  const num = parseInt(bytes.toString('hex'), 16) % 1000000;
  return String(num).padStart(6, '0');
}

const ALLOWED_DOMAIN = '@vishnu.edu.in';

// TEST_EMAILS: comma-separated personal emails allowed during development.
// Example in .env:  TEST_EMAILS=you@gmail.com,friend@gmail.com
// Remove this env var entirely before going to production.
const TEST_EMAILS = process.env.TEST_EMAILS
  ? process.env.TEST_EMAILS.split(',').map((e) => e.trim().toLowerCase())
  : [];

function isValidCollegeEmail(email) {
  if (TEST_EMAILS.includes(email)) return true;
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@vishnu\.edu\.in$/;
  return emailRegex.test(email);
}

// Rate limit: 3 OTP requests per 10 minutes per IP
const otpRequestLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Too many OTP requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limit: 5 verify attempts per 10 minutes per IP
const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many verification attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/send-otp
app.post('/api/send-otp', otpRequestLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, message: 'Email is required.' });
  }

  const sanitizedEmail = email.trim().toLowerCase();

  if (!isValidCollegeEmail(sanitizedEmail)) {
    return res.status(400).json({ success: false, message: `Only ${ALLOWED_DOMAIN} emails are allowed.` });
  }

  const otp = generateOtp();
  const hashedOtp = hashOtp(otp, sanitizedEmail);
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore.set(sanitizedEmail, { hash: hashedOtp, expiresAt, attempts: 0 });

  try {
    const { error } = await resend.emails.send({
      from: 'Vishnu Exam Prep <onboarding@resend.dev>',
      to: sanitizedEmail,
      subject: 'Your Login OTP - Vishnu Exam Prep',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #1d4ed8;">Vishnu Exam Prep</h2>
          <p>Your One-Time Password (OTP) for login is:</p>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1d4ed8; margin: 24px 0;">${otp}</div>
          <p>This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
          <p style="color: #6b7280; font-size: 12px;">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) throw new Error(error.message);

    return res.json({ success: true, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('Email send error:', err.message);
    otpStore.delete(sanitizedEmail);
    return res.status(500).json({ success: false, message: 'Failed to send OTP. Please try again.' });
  }
});

// POST /api/verify-otp
app.post('/api/verify-otp', otpVerifyLimiter, (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp || typeof email !== 'string' || typeof otp !== 'string') {
    return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
  }

  const sanitizedEmail = email.trim().toLowerCase();
  const sanitizedOtp = otp.trim();

  if (!isValidCollegeEmail(sanitizedEmail)) {
    return res.status(400).json({ success: false, message: 'Invalid email domain.' });
  }

  if (!/^\d{6}$/.test(sanitizedOtp)) {
    return res.status(400).json({ success: false, message: 'OTP must be 6 digits.' });
  }

  const record = otpStore.get(sanitizedEmail);

  if (!record) {
    return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(sanitizedEmail);
    return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
  }

  if (record.attempts >= 3) {
    otpStore.delete(sanitizedEmail);
    return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
  }

  const hashedInput = hashOtp(sanitizedOtp, sanitizedEmail);

  if (hashedInput !== record.hash) {
    record.attempts += 1;
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }

  // OTP valid — remove from store immediately
  otpStore.delete(sanitizedEmail);

  // Issue a short-lived JWT session token
  const token = jwt.sign(
    { email: sanitizedEmail },
    process.env.JWT_SECRET,
    { expiresIn: '8h', issuer: 'vishnu-exam-prep' }
  );

  return res.json({ success: true, token });
});

// Middleware: verify JWT on protected routes
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required.' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { issuer: 'vishnu-exam-prep' });
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired session.' });
  }
}

// Rate limit: 20 chat messages per minute per IP
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests. Slow down.' },
});

// POST /api/chat  — Gemini proxy (key stays on server)
app.post('/api/chat', requireAuth, chatLimiter, async (req, res) => {
  const { message, history, systemContext } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Message is required.' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ success: false, message: 'Message too long.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ success: false, message: 'AI service not configured.' });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const safeHistory = Array.isArray(history)
      ? (() => {
          const mapped = history.slice(-10).map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: String(m.text).slice(0, 2000) }],
          }));
          // Gemini requires history to start with a 'user' turn
          const firstUser = mapped.findIndex((m) => m.role === 'user');
          return firstUser > 0 ? mapped.slice(firstUser) : firstUser === 0 ? mapped : [];
        })()
      : [];

    const chat = model.startChat({
      history: safeHistory,
      systemInstruction: typeof systemContext === 'string'
        ? { role: 'system', parts: [{ text: systemContext.slice(0, 1000) }] }
        : undefined,
    });

    const result = await chat.sendMessage(message.trim());
    const text = result.response.text();

    return res.json({ success: true, text });
  } catch (err) {
    console.error('Gemini error:', err.message);
    return res.status(502).json({ success: false, message: 'AI service error. Please try again.' });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

module.exports = app;
