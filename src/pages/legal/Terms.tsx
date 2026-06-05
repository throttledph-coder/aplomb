import { Link } from 'react-router-dom'
import { LegalLayout, H2, P, Note, Mail } from './LegalLayout'

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="June 3, 2026">
      <Note>
        This is a general template provided for transparency and is not legal advice. Review and adapt
        it (including your legal entity and governing law) before relying on it.
      </Note>

      <H2>1. Acceptance</H2>
      <P>
        By downloading or using Aplomb (“the app”, “we”, “us”), you agree to these Terms. If you do not
        agree, do not use the app.
      </P>

      <H2>2. What Aplomb is</H2>
      <P>
        Aplomb is a tool to help you <strong>prepare and practice</strong> for job interviews. It generates
        practice answers and coaching from information you provide. It does not guarantee any interview
        result, job offer, or outcome, and you are responsible for how you use its output.
      </P>

      <H2>3. Accounts</H2>
      <P>
        You need an account to use the app. You are responsible for keeping your credentials secure and for
        activity under your account. Provide accurate information when registering.
      </P>

      <H2>4. License</H2>
      <P>
        We grant you a personal, non-exclusive, non-transferable license to use the app for its intended
        purpose. You may not resell, redistribute, reverse-engineer (except as permitted by law), or misuse
        the app.
      </P>

      <H2>5. Acceptable use</H2>
      <P>
        Use Aplomb lawfully and honestly, as a preparation aid. Do not use it to misrepresent your
        qualifications or to violate the rules of any third party, employer, or platform. You are solely
        responsible for complying with the policies of any interview or meeting you participate in.
      </P>

      <H2>6. Pro subscription &amp; billing</H2>
      <P>
        Pro features are offered as a recurring subscription. Payments are processed by{' '}
        <strong>Lemon Squeezy</strong>, which acts as our Merchant of Record and handles billing, applicable
        taxes, and receipts. Subscriptions renew automatically until cancelled. See our{' '}
        <Link to="/legal/refund" className="text-primary hover:underline">
          Refund Policy
        </Link>
        .
      </P>

      <H2>7. Third-party services</H2>
      <P>
        The app works with AI providers you choose (e.g., Groq or local Ollama). Your use of those services
        is governed by their terms. We are not responsible for third-party services.
      </P>

      <H2>8. Disclaimer of warranties</H2>
      <P>
        The app is provided “as is” and “as available”, without warranties of any kind to the extent
        permitted by law. We do not warrant that the app will be uninterrupted, error-free, or that AI
        output will be accurate or suitable.
      </P>

      <H2>9. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
        consequential damages, or for lost opportunities, arising from your use of the app. Our total
        liability will not exceed the amount you paid us in the 12 months before the claim.
      </P>

      <H2>10. Termination</H2>
      <P>
        You may stop using the app at any time. We may suspend or terminate access for breach of these
        Terms.
      </P>

      <H2>11. Governing law</H2>
      <P>
        These Terms are governed by the laws of the Republic of the Philippines, without regard to conflict
        of law rules. <em>(Update if your legal entity is established elsewhere.)</em>
      </P>

      <H2>12. Changes</H2>
      <P>We may update these Terms; continued use after changes means you accept them.</P>

      <H2>13. Contact</H2>
      <P>
        <Mail />
      </P>
    </LegalLayout>
  )
}
