import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Travel DNA',
}

const LAST_UPDATED = 'May 3, 2026'
const PRIVACY_EMAIL = 'email.travel.parser@gmail.com'
const EDPB_URL = 'https://edpb.europa.eu/about-edpb/about-edpb/members_en'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.75rem' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {children}
      </div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0 }}>{children}</p>
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>
      {children}
    </a>
  )
}

function Table({ rows }: { rows: [string, string, string][] }) {
  const thStyle: React.CSSProperties = {
    textAlign: 'left', fontSize: '0.72rem', letterSpacing: '0.04em',
    textTransform: 'uppercase', color: 'var(--text-muted)',
    padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)',
    whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = {
    fontSize: '0.82rem', color: 'var(--text)',
    padding: '0.5rem 0.75rem', verticalAlign: 'top',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
  }
  return (
    <div className="scroll-x" style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr>
            <th style={thStyle}>Processing Activity</th>
            <th style={thStyle}>Lawful Basis</th>
            <th style={thStyle}>GDPR Article</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([activity, basis, article], i) => (
            <tr key={i}>
              <td style={tdStyle}>{activity}</td>
              <td style={tdStyle}>{basis}</td>
              <td style={{ ...tdStyle, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{article}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '88px 1.5rem 6rem', maxWidth: 720, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          Last updated {LAST_UPDATED}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.25rem', fontSize: '0.875rem', lineHeight: 1.75, color: 'var(--text)' }}>

        {/* Intro */}
        <section>
          <P>
            Travel DNA (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;, &ldquo;the Service&rdquo;) is a web application that
            discovers your travel history by scanning your Gmail inbox for flight, hotel, and
            booking confirmation emails. This Privacy Policy explains what personal data we
            collect, the legal basis on which we process it, with whom we share it, how long
            we keep it, and the rights you have over it. It applies to all users of{' '}
            <A href="https://traveldna.pages.dev">traveldna.pages.dev</A>.
          </P>
          <P>
            Please read this policy carefully before using the Service. By connecting your
            Gmail account, you confirm that you have read, understood, and consent to the
            processing described below.
          </P>
        </section>

        {/* 1 — Data Controller */}
        <Section title="1. Data Controller">
          <P>
            The <strong>data controller</strong> — the entity that determines the purposes and
            means of processing your personal data — is the operator of Travel DNA. For
            inquiries or to exercise your rights, contact us at{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>{PRIVACY_EMAIL}</a>.
          </P>
          <P>
            If you are located in the European Economic Area (EEA) and we have not designated
            a local EU representative, you may direct requests to us at the email above. We
            will respond to all data subject requests within 30 days as required by GDPR
            Article 12(3).
          </P>
        </Section>

        {/* 2 — Data We Collect */}
        <Section title="2. Personal Data We Collect">
          <P>We collect and process the following categories of personal data:</P>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>
              <strong>Account identifiers</strong> — your name, email address, and Google user
              ID, obtained at OAuth authentication.
            </li>
            <li>
              <strong>Gmail email content</strong> — sender, subject, date, and body of emails
              that match travel-related senders and keywords. This content is processed
              temporarily in memory during a scan and <strong>is never written to our database</strong>.
            </li>
            <li>
              <strong>Structured travel data</strong> — destination city names, travel dates,
              airline/hotel names, and booking categories derived from email content by automated
              extraction. This is the only email-derived data we store.
            </li>
            <li>
              <strong>OAuth tokens</strong> — Google access and refresh tokens, stored encrypted,
              used solely to query the Gmail API on your behalf.
            </li>
            <li>
              <strong>Technical data</strong> — IP address, browser type, and session data
              collected incidentally by our hosting infrastructure (Railway, Cloudflare).
            </li>
          </ul>
          <P>
            We access Gmail under a <strong>read-only</strong> scope. We never write,
            compose, send, delete, or modify emails or any other Gmail data.
          </P>
        </Section>

        {/* 3 — Lawful Basis */}
        <Section title="3. Purposes and Lawful Basis for Processing">
          <P>
            Under GDPR Article 13(1)(c), we are required to specify the lawful basis for each
            processing activity. The table below sets out each activity, its purpose, and its
            legal ground.
          </P>
          <Table rows={[
            ['Authenticate user via Google OAuth', 'Performance of a contract', 'Art. 6(1)(b)'],
            ['Read Gmail emails to search for travel bookings', 'Consent', 'Art. 6(1)(a)'],
            ['Send email content to OpenRouter for AI extraction', 'Consent', 'Art. 6(1)(a)'],
            ['Store structured travel data in your account', 'Consent / Contract performance', 'Art. 6(1)(a)/(b)'],
            ['Store OAuth tokens to maintain Gmail connection', 'Performance of a contract', 'Art. 6(1)(b)'],
            ['Maintain server access logs for security', 'Legitimate interests (security)', 'Art. 6(1)(f)'],
          ]} />
          <P>
            Where we rely on <strong>consent</strong> as the lawful basis, you have the right
            to withdraw that consent at any time (see Section 8). Withdrawal does not affect
            the lawfulness of processing carried out before withdrawal.
          </P>
        </Section>

        {/* 4 — Google API Limited Use */}
        <Section title="4. Google API Services User Data Policy">
          <div style={{
            padding: '0.85rem 1rem',
            background: 'rgba(0,212,170,0.06)',
            border: '1px solid rgba(0,212,170,0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            lineHeight: 1.65,
          }}>
            Travel DNA&rsquo;s use and transfer of information received from Google APIs to any
            other app will adhere to the{' '}
            <A href="https://developers.google.com/terms/api-services-user-data-policy">
              Google API Services User Data Policy
            </A>
            , including the Limited Use requirements.
          </div>
          <P>
            In accordance with Google&rsquo;s Limited Use requirements, Gmail data is:
          </P>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>Used <strong>only</strong> to provide you with your travel itinerary summary within the Service.</li>
            <li><strong>Not used</strong> for advertising, credit assessment, or any purpose beyond the user-facing feature.</li>
            <li><strong>Not sold</strong> to data brokers, information resellers, or any third party.</li>
            <li><strong>Not transferred</strong> to third parties except as necessary to operate the Service (see Section 6).</li>
            <li><strong>Not used</strong> to train, improve, or fine-tune any AI or machine learning model — including models operated by OpenRouter or its downstream providers.</li>
          </ul>
        </Section>

        {/* 5 — AI Processing */}
        <Section title="5. Automated Processing and AI">
          <P>
            During a scan, email content matching travel criteria is transmitted to{' '}
            <A href="https://openrouter.ai">OpenRouter</A> — an AI inference routing service —
            which forwards it to a large language model (LLM) for automated extraction of
            structured travel details (destination, dates, booking type).
          </P>
          <P>
            <strong>OpenRouter Zero Data Retention (ZDR)</strong> is enabled on our integration
            where supported, meaning prompts (which include email content) are not logged or
            retained by OpenRouter or its downstream model providers for training purposes.
            OpenRouter may route requests to various underlying model providers; their current
            list is available at{' '}
            <A href="https://openrouter.ai/models">openrouter.ai/models</A>.
          </P>
          <P>
            This automated processing does <strong>not</strong> constitute automated
            decision-making with legal or similarly significant effects on you within the
            meaning of GDPR Article 22. It produces only a personal travel summary for your
            own use; no profiling, scoring, or consequential decisions about you are made.
          </P>
        </Section>

        {/* 6 — Third-Party Processors */}
        <Section title="6. Data Processors and Third-Party Recipients">
          <P>
            As a <strong>data controller</strong>, we engage the following <strong>data
            processors</strong> who process personal data on our behalf under data processing
            agreements (DPAs):
          </P>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <li>
              <strong>OpenRouter, Inc.</strong> (United States) — AI inference routing.
              Email content is transmitted during scans. ZDR enabled. Privacy policy:{' '}
              <A href="https://openrouter.ai/privacy">openrouter.ai/privacy</A>.
            </li>
            <li>
              <strong>Railway Corp.</strong> (United States) — backend API hosting and database.
              Stores structured travel data and encrypted OAuth tokens. Privacy policy:{' '}
              <A href="https://railway.app/legal/privacy">railway.app/legal/privacy</A>.
            </li>
            <li>
              <strong>Cloudflare, Inc.</strong> (United States) — frontend CDN and hosting.
              Processes technical data (IP, headers) incidentally. No personal data stored.
              Privacy policy:{' '}
              <A href="https://www.cloudflare.com/privacypolicy/">cloudflare.com/privacypolicy</A>.
            </li>
            <li>
              <strong>Google LLC</strong> (United States) — OAuth authentication and Gmail API.
              Google acts as a separate data controller for your Google Account data under its
              own{' '}
              <A href="https://policies.google.com/privacy">Privacy Policy</A>.
            </li>
          </ul>
          <P>
            We do not sell, rent, or share your personal data with any other third party for
            their own purposes.
          </P>
        </Section>

        {/* 7 — International Transfers */}
        <Section title="7. International Data Transfers">
          <P>
            Our infrastructure is operated in the United States. If you are located in the
            EEA, United Kingdom, or Switzerland, your personal data is transferred to a
            country that may not provide the same level of data protection as your home
            jurisdiction.
          </P>
          <P>
            These transfers are safeguarded by the European Commission&rsquo;s{' '}
            <strong>Standard Contractual Clauses (SCCs)</strong> (Commission Decision 2021/914),
            which our processors — including Cloudflare, Railway, and OpenRouter — have
            implemented in their DPAs. Where applicable, processors certified under the
            <strong> EU-US Data Privacy Framework</strong> (adequacy decision of July 2023)
            provide an additional legal transfer mechanism.
          </P>
        </Section>

        {/* 8 — Retention */}
        <Section title="8. Data Retention">
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>
              <strong>Raw email content</strong> — never stored; processed in memory during
              extraction only and discarded immediately afterwards.
            </li>
            <li>
              <strong>Structured travel data</strong> — retained for as long as your account
              is active, or until you request deletion.
            </li>
            <li>
              <strong>OAuth tokens</strong> — retained until you revoke access via Google or
              delete your account.
            </li>
            <li>
              <strong>Server access logs</strong> — retained for up to 30 days for security
              and debugging, then automatically deleted.
            </li>
            <li>
              <strong>Account identifiers</strong> (name, email, Google user ID) — retained
              until account deletion.
            </li>
          </ul>
        </Section>

        {/* 9 — GDPR Rights */}
        <Section title="9. Your Rights Under GDPR">
          <P>
            If you are located in the EEA, UK, or Switzerland, you have the following rights
            under the General Data Protection Regulation (GDPR):
          </P>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li>
              <strong>Right of Access (Art. 15)</strong> — Request a copy of all personal data
              we hold about you.
            </li>
            <li>
              <strong>Right to Rectification (Art. 16)</strong> — Request correction of
              inaccurate or incomplete personal data.
            </li>
            <li>
              <strong>Right to Erasure / &ldquo;Right to be Forgotten&rdquo; (Art. 17)</strong> — Request
              deletion of your personal data. We will delete all stored data within 30 days of
              a verified request.
            </li>
            <li>
              <strong>Right to Restriction of Processing (Art. 18)</strong> — Request that we
              limit how we use your data in certain circumstances.
            </li>
            <li>
              <strong>Right to Data Portability (Art. 20)</strong> — Receive your stored travel
              data in a structured, machine-readable format (JSON).
            </li>
            <li>
              <strong>Right to Object (Art. 21)</strong> — Object to processing based on
              legitimate interests.
            </li>
            <li>
              <strong>Right to Withdraw Consent (Art. 7(3))</strong> — Withdraw consent at any
              time without affecting prior lawful processing. You can withdraw Gmail access
              immediately at{' '}
              <A href="https://myaccount.google.com/permissions">
                myaccount.google.com/permissions
              </A>. To delete stored data, email us at{' '}
              <a href={`mailto:${PRIVACY_EMAIL}`} style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>{PRIVACY_EMAIL}</a>.
            </li>
          </ul>
          <P>
            To exercise any of these rights, email{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>{PRIVACY_EMAIL}</a>.
            {' '}We
            will respond within <strong>30 days</strong>. We may ask you to verify your
            identity before processing the request.
          </P>
          <P>
            You also have the <strong>right to lodge a complaint</strong> with your national
            supervisory authority. A list of EEA supervisory authorities is available at{' '}
            <A href={EDPB_URL}>edpb.europa.eu</A>.
          </P>
        </Section>

        {/* 10 — CCPA */}
        <Section title="10. California Privacy Rights (CCPA/CPRA)">
          <P>
            If you are a California resident, the California Consumer Privacy Act (CCPA) and
            California Privacy Rights Act (CPRA) grant you the following rights:
          </P>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li><strong>Right to Know</strong> — Request disclosure of the categories and specific pieces of personal information we have collected about you.</li>
            <li><strong>Right to Delete</strong> — Request deletion of your personal information.</li>
            <li><strong>Right to Correct</strong> — Request correction of inaccurate personal information.</li>
            <li><strong>Right to Opt-Out of Sale or Sharing</strong> — We <strong>do not sell</strong> personal information and do not share it for cross-context behavioral advertising. No opt-out link is required, but we acknowledge Global Privacy Control (GPC) signals.</li>
            <li><strong>Right to Limit Use of Sensitive Personal Information</strong> — Email content (temporarily processed) may constitute sensitive personal information. We do not use it beyond the Service&rsquo;s core function.</li>
            <li><strong>Right to Non-Discrimination</strong> — We will not discriminate against you for exercising your CCPA rights.</li>
          </ul>
          <P>
            To submit a CCPA request, email{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>{PRIVACY_EMAIL}</a>.
            {' '}We will
            respond within <strong>45 days</strong> (extendable to 90 days with notice). You
            may designate an authorized agent to make requests on your behalf.
          </P>
          <P>
            <strong>Categories of personal information collected (CCPA statutory categories):</strong>{' '}
            Identifiers; Internet or electronic network activity information; Geolocation data
            (travel destinations); Inferences drawn from personal information (structured travel
            profile).
          </P>
          <P>
            <strong>Source:</strong> Directly from you via Google OAuth and your Gmail account.
          </P>
          <P>
            <strong>Business purpose for collection:</strong> To provide you with a personal
            travel itinerary summary derived from your booking confirmation emails.
          </P>
        </Section>

        {/* 11 — Cookies */}
        <Section title="11. Cookies and Tracking">
          <P>
            We use only <strong>strictly necessary cookies</strong> required to operate the
            Service:
          </P>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>
              <strong>Session cookie</strong> — maintains your authenticated session with our
              backend. Duration: session (expires when you close your browser or after 7 days
              of inactivity). Set by: email-discoverer.up.railway.app.
            </li>
            <li>
              <strong>Theme preference</strong> — stores your light/dark mode preference in
              localStorage (not a cookie; no network transmission). Duration: persistent until
              cleared.
            </li>
          </ul>
          <P>
            We do not use analytics, advertising, or tracking cookies. We do not use
            third-party tracking scripts. Cloudflare may process your IP address and headers
            as part of its CDN function; see{' '}
            <A href="https://www.cloudflare.com/privacypolicy/">Cloudflare&rsquo;s privacy policy</A>.
          </P>
        </Section>

        {/* 12 — Children */}
        <Section title="12. Children's Privacy">
          <P>
            The Service is not directed to children under the age of <strong>13</strong> (or
            under <strong>16</strong> in EEA member states where the higher age applies under
            GDPR Article 8). We do not knowingly collect personal data from children below
            these ages. If you believe a child has provided us with personal data, contact us
            at <a href={`mailto:${PRIVACY_EMAIL}`} style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>{PRIVACY_EMAIL}</a> and we will delete it promptly.
          </P>
        </Section>

        {/* 13 — Security */}
        <Section title="13. Security Measures">
          <P>
            We implement appropriate technical and organisational measures (GDPR Art. 32) to
            protect your personal data:
          </P>
          <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <li>All data in transit is encrypted using TLS 1.2 or higher (HTTPS).</li>
            <li>OAuth tokens are encrypted at rest in our database.</li>
            <li>Raw email content is never written to disk or database storage.</li>
            <li>Access to production systems is restricted by role-based access controls.</li>
            <li>We use OpenRouter&rsquo;s Zero Data Retention configuration to prevent prompt logging by AI providers.</li>
          </ul>
          <P>
            No method of transmission or storage is 100% secure. In the event of a personal
            data breach affecting your rights and freedoms, we will notify you and the
            relevant supervisory authority within 72 hours where required by GDPR Article 33.
          </P>
        </Section>

        {/* 14 — Changes */}
        <Section title="14. Changes to This Policy">
          <P>
            We will notify you of <strong>material changes</strong> to this policy by email
            (at the address associated with your Google account) at least 30 days before
            changes take effect. Where changes affect consent-based processing, we will seek
            fresh consent before the new processing begins.
          </P>
          <P>
            For non-material changes (e.g., clarifications, corrected links), updating the
            &ldquo;Last updated&rdquo; date at the top of this page constitutes sufficient notice.
          </P>
        </Section>

        {/* 15 — Contact */}
        <Section title="15. Contact Us">
          <P>
            For any privacy questions, data subject requests, or to report a concern, email
            our privacy team at{' '}
            <a href={`mailto:${PRIVACY_EMAIL}`} style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>{PRIVACY_EMAIL}</a>.
          </P>
          <P>
            We will acknowledge your request within 5 business days and resolve it within 30
            days (GDPR) or 45 days (CCPA).
          </P>
        </Section>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
          This policy applies to traveldna.pages.dev and the associated backend at
          email-discoverer.up.railway.app.
        </p>

      </div>
    </div>
  )
}
