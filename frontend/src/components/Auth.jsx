import { useState } from 'react';
import axios from 'axios';
import { saveSession } from '../utils/auth';
import styles from './Auth.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const ALLOWED_DOMAIN = '@vishnu.edu.in';
const TEST_EMAILS = import.meta.env.VITE_TEST_EMAILS
  ? import.meta.env.VITE_TEST_EMAILS.split(',').map((e) => e.trim().toLowerCase())
  : [];

function validateEmail(email) {
  const trimmed = email.trim().toLowerCase();
  if (TEST_EMAILS.includes(trimmed)) return true;
  return /^[a-zA-Z0-9._%+\-]+@vishnu\.edu\.in$/.test(trimmed);
}

export default function Auth({ onLogin }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [countdown, setCountdown] = useState(0);

  function startCountdown(seconds) {
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setInfo('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!validateEmail(trimmedEmail)) {
      setError(`Please use a valid college email ending with ${ALLOWED_DOMAIN}`);
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/send-otp`, { email: trimmedEmail });
      setInfo('OTP sent! Please check your email. It expires in 5 minutes.');
      setStep('otp');
      startCountdown(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('OTP must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/verify-otp`, {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      saveSession(res.data.token, email.trim().toLowerCase());
      onLogin(res.data.token, email.trim().toLowerCase());
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (countdown > 0) return;
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/api/send-otp`, {
        email: email.trim().toLowerCase(),
      });
      setInfo('New OTP sent!');
      startCountdown(60);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend OTP.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>📚</span>
          <h1 className={styles.title}>Vishnu Exam Prep</h1>
          <p className={styles.subtitle}>Login with your college email</p>
        </div>

        {step === 'email' && (
          <form onSubmit={handleSendOtp} className={styles.form} noValidate>
            <label className={styles.label} htmlFor="email">
              College Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder={`yourname${ALLOWED_DOMAIN}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
            {error && <div className="alert alert-error">{error}</div>}
            <button
              type="submit"
              className={`btn-primary ${styles.submitBtn}`}
              disabled={loading || !email.trim()}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className={styles.form} noValidate>
            <p className={styles.emailDisplay}>
              OTP sent to <strong>{email}</strong>
            </p>
            <label className={styles.label} htmlFor="otp">
              Enter 6-digit OTP
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              autoFocus
              required
            />
            {info && <div className="alert alert-success">{info}</div>}
            {error && <div className="alert alert-error">{error}</div>}
            <button
              type="submit"
              className={`btn-primary ${styles.submitBtn}`}
              disabled={loading || otp.length !== 6}
            >
              {loading && <span className="spinner" />}
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div className={styles.resendRow}>
              <button
                type="button"
                className="btn-secondary"
                onClick={handleResendOtp}
                disabled={countdown > 0 || loading}
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError('');
                  setInfo('');
                }}
                disabled={loading}
              >
                Change Email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
