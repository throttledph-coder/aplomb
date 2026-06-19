import { LegalLayout, H2, P, UL, Note, Mail } from './LegalLayout'

export default function Refund() {
  return (
    <LegalLayout title="Refund Policy" updated="June 3, 2026">
      <Note>
        This is a general template provided for transparency and is not legal advice. Review and adapt it
        before relying on it.
      </Note>

      <H2>Free plan</H2>
      <P>Aplomb's preparation features are free — no purchase, no charge, nothing to refund.</P>

      <H2>Pro subscription</H2>
      <UL>
        <li>
          <strong>Cancel anytime.</strong> Cancelling stops future renewals; you keep Pro until the end of
          the current billing period.
        </li>
        <li>
          <strong>7-day refund.</strong> If you're not satisfied, request a refund within 7 days of your
          first charge and we'll refund it.
        </li>
        <li>
          <strong>Accidental or duplicate charges</strong> are refunded in full.
        </li>
      </UL>

      <H2>How to request a refund</H2>
      <P>
        Email <Mail /> from your account email with your order details. Payments and refunds are processed
        by our Merchant of Record, <strong>Lemon Squeezy</strong>; approved refunds are returned to your
        original payment method.
      </P>

      <H2>Contact</H2>
      <P>
        <Mail />
      </P>
    </LegalLayout>
  )
}
