import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - NirmiteeRPM',
  description: 'Privacy Policy for NirmiteeRPM',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Privacy Policy</h1>
      <p className="text-gray-600 dark:text-gray-400">Last updated: January 7, 2026</p>

      <h2>1. Introduction</h2>
      <p>
        Welcome to NirmiteeRPM. We respect your privacy and are committed to protecting your personal
        data. This privacy policy will inform you about how we look after your personal data and tell
        you about your privacy rights and how the law protects you.
      </p>

      <h2>2. Data We Collect</h2>
      <p>We collect and process the following types of personal data:</p>
      <ul>
        <li><strong>Identity Data:</strong> First name, last name, username</li>
        <li><strong>Contact Data:</strong> Email address, telephone number</li>
        <li><strong>Account Data:</strong> Login credentials, preferences</li>
        <li><strong>Usage Data:</strong> Information about how you use our platform</li>
        <li><strong>Technical Data:</strong> IP address, browser type, device information</li>
        <li><strong>Health Data:</strong> Patient vitals, medical history (if applicable)</li>
      </ul>

      <h2>3. How We Use Your Data</h2>
      <p>We use your personal data for the following purposes:</p>
      <ul>
        <li>To provide and maintain our service</li>
        <li>To notify you about changes to our service</li>
        <li>To provide customer support</li>
        <li>To gather analysis or valuable information to improve our service</li>
        <li>To monitor the usage of our service</li>
        <li>To detect, prevent and address technical issues</li>
      </ul>

      <h2>4. Legal Basis for Processing</h2>
      <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
      <ul>
        <li>Where we need to perform the contract we are about to enter into or have entered into with you</li>
        <li>Where it is necessary for our legitimate interests</li>
        <li>Where we need to comply with a legal obligation</li>
      </ul>

      <h2>5. Data Security</h2>
      <p>
        We have implemented appropriate security measures to prevent your personal data from being
        accidentally lost, used or accessed in an unauthorized way, altered or disclosed.
      </p>

      <h2>6. Your Rights</h2>
      <p>Under GDPR, you have the following rights:</p>
      <ul>
        <li><strong>Right to Access:</strong> You can request copies of your personal data</li>
        <li><strong>Right to Rectification:</strong> You can request correction of inaccurate data</li>
        <li><strong>Right to Erasure:</strong> You can request deletion of your personal data</li>
        <li><strong>Right to Restrict Processing:</strong> You can request restriction of processing</li>
        <li><strong>Right to Data Portability:</strong> You can request transfer of your data</li>
        <li><strong>Right to Object:</strong> You can object to processing of your data</li>
      </ul>

      <h2>7. Data Retention</h2>
      <p>
        We will only retain your personal data for as long as necessary to fulfill the purposes we
        collected it for, including for the purposes of satisfying any legal, accounting, or reporting
        requirements.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use cookies and similar tracking technologies to track activity on our service. You can
        instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
      </p>

      <h2>9. Third-Party Services</h2>
      <p>
        We may employ third-party companies and individuals to facilitate our service. These third
        parties have access to your personal data only to perform these tasks on our behalf and are
        obligated not to disclose or use it for any other purpose.
      </p>

      <h2>10. Contact Us</h2>
      <p>
        If you have any questions about this Privacy Policy, please contact us at:
        <br />
        Email: privacy@nirmitee.io
      </p>
    </div>
  );
}
