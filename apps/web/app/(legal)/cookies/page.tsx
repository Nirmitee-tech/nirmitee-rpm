import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy - NirmiteeRPM',
  description: 'Cookie Policy for NirmiteeRPM',
};

export default function CookiePolicyPage() {
  return (
    <div className="prose dark:prose-invert max-w-none">
      <h1>Cookie Policy</h1>
      <p className="text-gray-600 dark:text-gray-400">Last updated: January 7, 2026</p>

      <h2>1. What Are Cookies</h2>
      <p>
        Cookies are small text files that are placed on your computer or mobile device when you visit
        a website. They are widely used to make websites work more efficiently and provide information
        to the website owners.
      </p>

      <h2>2. How We Use Cookies</h2>
      <p>We use cookies for the following purposes:</p>
      <ul>
        <li><strong>Essential Cookies:</strong> Necessary for the website to function properly</li>
        <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our website</li>
        <li><strong>Marketing Cookies:</strong> Used to track visitors across websites</li>
        <li><strong>Preference Cookies:</strong> Enable the website to remember your preferences</li>
      </ul>

      <h2>3. Types of Cookies We Use</h2>

      <h3>Essential Cookies</h3>
      <p>
        These cookies are strictly necessary for the operation of our service. They enable core
        functionality such as security, authentication, and accessibility features.
      </p>
      <ul>
        <li><strong>Authentication Cookies:</strong> Keep you logged in</li>
        <li><strong>Security Cookies:</strong> Detect authentication abuse</li>
        <li><strong>Session Cookies:</strong> Maintain your session state</li>
      </ul>

      <h3>Analytics Cookies</h3>
      <p>
        These cookies allow us to recognize and count the number of visitors and see how visitors move
        around our website. This helps us improve the way our website works.
      </p>
      <ul>
        <li>Google Analytics</li>
        <li>Usage statistics</li>
        <li>Performance monitoring</li>
      </ul>

      <h3>Marketing Cookies</h3>
      <p>
        These cookies are used to track visitors across websites. The intention is to display ads that
        are relevant and engaging for the individual user.
      </p>

      <h3>Third-Party Cookies</h3>
      <p>
        Some cookies are placed by third-party services that appear on our pages. We do not control
        the placement of these cookies.
      </p>

      <h2>4. Cookie Duration</h2>
      <p>Cookies can be either:</p>
      <ul>
        <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
        <li><strong>Persistent Cookies:</strong> Remain on your device for a set period</li>
      </ul>

      <h2>5. Managing Cookies</h2>
      <p>You can control cookies in several ways:</p>
      <ul>
        <li>Using our cookie consent banner when you first visit</li>
        <li>Changing your browser settings to block or delete cookies</li>
        <li>Using browser plugins to manage cookies</li>
        <li>Visiting your privacy settings page to update preferences</li>
      </ul>

      <h2>6. Browser Controls</h2>
      <p>Most browsers allow you to:</p>
      <ul>
        <li>See what cookies you have and delete them individually</li>
        <li>Block third-party cookies</li>
        <li>Block cookies from specific websites</li>
        <li>Block all cookies</li>
        <li>Delete all cookies when you close your browser</li>
      </ul>

      <h2>7. Impact of Blocking Cookies</h2>
      <p>
        Please note that if you choose to block cookies, some features of our website may not function
        properly. Essential cookies are necessary for basic functionality and cannot be disabled.
      </p>

      <h2>8. Updates to This Policy</h2>
      <p>
        We may update this Cookie Policy from time to time. We will notify you of any changes by
        posting the new Cookie Policy on this page.
      </p>

      <h2>9. Contact Us</h2>
      <p>
        If you have any questions about our use of cookies, please contact us at:
        <br />
        Email: privacy@nirmitee.io
      </p>
    </div>
  );
}
