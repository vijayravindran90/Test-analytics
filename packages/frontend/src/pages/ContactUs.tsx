import React, { useState } from 'react';
import apiClient from '../api/client';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export default function ContactUs() {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file && file.size > MAX_ATTACHMENT_BYTES) {
      setError('Attachment is too large (max 10MB)');
      event.target.value = '';
      setAttachment(null);
      return;
    }
    setError(null);
    setAttachment(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('subject', subject);
      formData.append('description', description);
      if (attachment) {
        formData.append('attachment', attachment);
      }

      // Let the browser set the multipart boundary itself - the api client
      // defaults Content-Type to application/json, which would break this.
      await apiClient.post('/contact', formData, { headers: { 'Content-Type': undefined } });
      setSubmitted(true);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Unable to send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg card p-8 text-center">
        <h1 className="text-2xl font-bold">Message sent</h1>
        <p className="mt-3 text-neutral-600">
          Thanks for reaching out — we've received your message and will get back to you at {email} soon.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg card p-6">
      <h1 className="text-2xl font-bold">Contact us</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Questions, feedback, or something not working right? Send us a message and we'll get back to you.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Subject</label>
          <input
            type="text"
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
            placeholder="What's this about?"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Description</label>
          <textarea
            required
            maxLength={5000}
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-primary-500"
            placeholder="Tell us more..."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Attachment (optional)</label>
          <input type="file" onChange={handleFileChange} className="w-full text-sm" />
          <p className="mt-1 text-xs text-neutral-500">Max 10MB</p>
        </div>

        {error && <div className="rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700">{error}</div>}

        <button type="submit" disabled={submitting} className="btn btn-primary w-full">
          {submitting ? 'Sending...' : 'Submit'}
        </button>
      </form>
    </div>
  );
}
