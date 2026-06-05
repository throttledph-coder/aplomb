import { LegalLayout, H2, P, UL, Note, Mail } from './LegalLayout'

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 3, 2026">
      <Note>
        This is a general template provided for transparency and is not legal advice. Review and adapt it
        (including your legal entity details) before relying on it.
      </Note>

      <H2>Summary</H2>
      <P>
        Aplomb is a desktop application for interview preparation. Your resume, job descriptions, and
        practice answers are processed on your computer and/or by the AI provider you choose, and are{' '}
        <strong>not</strong> sent to or stored on our servers. We only handle the minimum needed to run your
        account and (optionally) a Pro subscription.
      </P>

      <H2>What we collect</H2>
      <UL>
        <li>
          <strong>Account email</strong> — when you create an account, our authentication provider
          (Supabase) stores your email and an encrypted password to sign you in.
        </li>
        <li>
          <strong>Profile</strong> — the name, preferred name, and optional pronouns/birthday you enter are
          stored with your account to personalize your greeting and help the AI tailor answers. You can
          edit or clear these any time in Account.
        </li>
        <li>
          <strong>Subscription status</strong> — if you buy Pro, our payment provider (Lemon Squeezy)
          notifies us of your subscription state (active/cancelled and renewal date), linked to your
          account ID.
        </li>
      </UL>

      <H2>What we do NOT collect</H2>
      <UL>
        <li>
          Your <strong>resume, job descriptions, additional info, questions, or AI answers</strong>. These
          stay in a local database on your device.
        </li>
        <li>
          Your <strong>AI API key</strong> is stored encrypted on your device and never sent to us.
        </li>
        <li>Payment card details — these are handled entirely by Lemon Squeezy; we never see them.</li>
      </UL>

      <H2>AI processing</H2>
      <P>
        To generate answers, the app sends your resume + job description to the AI provider <em>you</em>{' '}
        configure: Groq (cloud, using your own key) or Ollama (fully local). This is your choice; using
        Ollama keeps everything on your machine. See each provider's own policy for how they handle
        requests.
      </P>

      <H2>Service providers (subprocessors)</H2>
      <UL>
        <li>
          <strong>Supabase</strong> — account authentication + subscription records.
        </li>
        <li>
          <strong>Lemon Squeezy</strong> — payments and subscription management (Merchant of Record).
        </li>
        <li>
          <strong>Cloudflare</strong> — website hosting and the subscription webhook.
        </li>
      </UL>

      <H2>Data retention &amp; your rights</H2>
      <P>
        We keep your account email and subscription status while your account exists. You can request
        access to, correction of, or deletion of your account data by emailing <Mail />. Deleting the app
        removes your local data from your device.
      </P>

      <H2>Selling data</H2>
      <P>We do not sell your personal data.</P>

      <H2>Changes</H2>
      <P>We may update this policy; the “Last updated” date will change accordingly.</P>

      <H2>Contact</H2>
      <P>
        <Mail />
      </P>
    </LegalLayout>
  )
}
