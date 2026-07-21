'use client';

import { useState } from 'react';
import { Mail, MessageSquare, Send } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSubmitted(false);

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong. Please try again later.');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
    } catch (err) {
      console.error('Submission error:', err);
      setError(err.message || 'Failed to send your message.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="info-page-container">
      <h1 className="info-page-title">Contact Us</h1>
      <p className="info-page-subtitle">Have questions or feedback? We'd love to hear from you.</p>

      <div className="info-page-content">
        <p style={{ marginBottom: '2rem' }}>
          Do you have a feature request, bug report, or general inquiry? Feel free to fill out the form below, and we will get back to you as soon as possible.
        </p>

        {submitted && (
          <div className="contact-success" style={{
            backgroundColor: 'rgba(46, 213, 115, 0.1)',
            border: '1px solid var(--success-color)',
            color: 'var(--success-color)',
            padding: '1.25rem',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: '2rem',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            🎉 Your message has been sent successfully! We'll get back to you shortly.
          </div>
        )}

        {error && (
          <div className="contact-error" style={{
            backgroundColor: 'rgba(255, 107, 129, 0.1)',
            border: '1px solid var(--error-color)',
            color: 'var(--error-color)',
            padding: '1.25rem',
            borderRadius: 'var(--border-radius-md)',
            marginBottom: '2rem',
            textAlign: 'center',
            fontWeight: '600'
          }}>
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="contact-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="Your Name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="subject">Subject</label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              className="form-input"
              style={{ appearance: 'none', backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat' }}
            >
              <option value="General Inquiry">General Inquiry</option>
              <option value="Bug Report">Bug Report</option>
              <option value="Feature Request">Feature Request</option>
              <option value="Partnership">Partnership</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              className="form-textarea"
              placeholder="How can we help you?"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            disabled={submitting}
            style={{ marginTop: '1rem' }}
          >
            {submitting ? (
              <>Sending...</>
            ) : (
              <>
                <Send size={18} />
                Send Message
              </>
            )}
          </button>
        </form>

        <div style={{ 
          marginTop: '3rem', 
          borderTop: '1px solid var(--border-color)', 
          paddingTop: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="tool-card-icon-container" style={{ width: '40px', height: '40px', borderRadius: '8px' }}>
              <Mail size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700' }}>Email Us</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <a href="mailto:tuyishime1angel@gmail.com" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.color = 'var(--primary-color)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>
                  tuyishime1angel@gmail.com
                </a>
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="tool-card-icon-container" style={{ width: '40px', height: '40px', borderRadius: '8px', color: 'var(--secondary-color)', backgroundColor: 'rgba(155, 89, 182, 0.08)' }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700' }}>Community</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <a href="https://discord.gg/cwXngnqgu" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} onMouseEnter={(e) => e.target.style.color = 'var(--secondary-color)'} onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}>
                  Join Discord Server
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
