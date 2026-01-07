import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - NirmiteeRPM',
  description: 'Terms of Service for NirmiteeRPM',
};

export default function TermsOfServicePage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Terms of Service</h1>
      <p className="text-gray-600 dark:text-gray-400">Last updated: January 7, 2026</p>

      <h2>1. Agreement to Terms</h2>
      <p>
        By accessing and using NirmiteeRPM, you accept and agree to be bound by the terms and
        provisions of this agreement. If you do not agree to abide by the above, please do not use
        this service.
      </p>

      <h2>2. Use License</h2>
      <p>
        Permission is granted to temporarily use NirmiteeRPM for personal, non-commercial transitory
        viewing only. This is the grant of a license, not a transfer of title, and under this license
        you may not:
      </p>
      <ul>
        <li>Modify or copy the materials</li>
        <li>Use the materials for any commercial purpose</li>
        <li>Attempt to decompile or reverse engineer any software</li>
        <li>Remove any copyright or other proprietary notations</li>
        <li>Transfer the materials to another person</li>
      </ul>

      <h2>3. User Account</h2>
      <p>You are responsible for:</p>
      <ul>
        <li>Maintaining the confidentiality of your account credentials</li>
        <li>All activities that occur under your account</li>
        <li>Notifying us immediately of any unauthorized use</li>
        <li>Ensuring accuracy of information provided</li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to use the service to:</p>
      <ul>
        <li>Violate any applicable laws or regulations</li>
        <li>Infringe on intellectual property rights</li>
        <li>Transmit malicious code or viruses</li>
        <li>Interfere with the service or servers</li>
        <li>Collect or harvest personal data</li>
      </ul>

      <h2>5. Service Availability</h2>
      <p>
        We strive to provide continuous service availability, but do not guarantee uninterrupted or
        error-free access. We reserve the right to modify or discontinue the service with or without
        notice.
      </p>

      <h2>6. Intellectual Property</h2>
      <p>
        The service and its original content, features, and functionality are owned by NirmiteeRPM
        and are protected by international copyright, trademark, and other intellectual property laws.
      </p>

      <h2>7. Termination</h2>
      <p>
        We may terminate or suspend your account and access to the service immediately, without prior
        notice or liability, for any reason, including breach of the Terms.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        In no event shall NirmiteeRPM, its directors, employees, or agents be liable for any indirect,
        incidental, special, consequential, or punitive damages resulting from your use of the service.
      </p>

      <h2>9. Governing Law</h2>
      <p>
        These Terms shall be governed by and construed in accordance with applicable laws, without
        regard to its conflict of law provisions.
      </p>

      <h2>10. Changes to Terms</h2>
      <p>
        We reserve the right to modify these terms at any time. We will notify you of any changes by
        posting the new Terms on this page.
      </p>

      <h2>11. Contact Information</h2>
      <p>
        If you have any questions about these Terms, please contact us at:
        <br />
        Email: legal@nirmitee.io
      </p>
    </div>
  );
}
