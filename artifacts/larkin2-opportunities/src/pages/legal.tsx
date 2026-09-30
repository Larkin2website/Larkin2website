import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { MobileMenu, SiteFooter, SiteHeader } from "../components/layout";

type LegalPageProps = {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
};

function LegalPage({ title, eyebrow, description, children }: LegalPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    document.title = `${title} | HETV Opportunities Hub`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.setAttribute("content", description);
  }, [description, title]);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      setScrolled(current > 38);
      if (current < 20 || current < lastScrollY.current - 5) {
        setHeaderHidden(false);
      } else if (current > lastScrollY.current + 8 && current > 90 && !menuOpen) {
        const active = document.activeElement;
        if (!(headerRef.current && active && headerRef.current.contains(active))) {
          setHeaderHidden(true);
        }
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  return (
    <main className="larkin2-page legal-page" id="top">
      <a className="larkin2-skip" href="#legal-content" data-testid="link-skip-content">Skip to content</a>
      <SiteHeader
        scrolled={scrolled}
        headerHidden={headerHidden}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        headerRef={headerRef}
        menuButtonRef={menuButtonRef}
      />
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuButtonRef={menuButtonRef} />

      <header className="legal-hero">
        <span className="larkin2-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>

      <div className="legal-content" id="legal-content">
        <article className="legal-document">{children}</article>
      </div>
      <SiteFooter />
    </main>
  );
}

function Section({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`legal-section-${number}`}>
      <h2 id={`legal-section-${number}`}><span>{String(number).padStart(2, "0")}</span>{title}</h2>
      {children}
    </section>
  );
}

export function PrivacyNoticePage() {
  return (
    <LegalPage
      title="Privacy Notice"
      eyebrow="Legal / Privacy"
      description="How Larkin AV Limited collects, uses, shares and protects personal data through the HETV Opportunities Hub."
    >
      <Section number={1} title="Introduction">
        <p>This privacy notice sets out how we, Larkin AV Limited (<strong>we, us, Larkin</strong>), process your personal data when you visit this website (the <strong>Website</strong>). Larkin is the controller of your personal data meaning that we are responsible for determining the purposes for processing your personal data.</p>
        <p>We understand that people may not have time to review every privacy notice that they come across so we have set out below a quick summary about how we process your personal data. Please read our privacy notice in full however to understand more about our processing and your rights.</p>
      </Section>
      <Section number={2} title="Summary">
        <p>We will process information about you, such as your application and CV and application, when you apply for a role with Larkin. This processing is necessary to consider you for the role and to communicate with you.</p>
        <p>We also advertise training sessions on the Website and process personal data of those who register for and attend them. If you sign up, we record your interest in general HETV news and announcements. You can optionally choose preferences for roles, programmes or training, and tell us what you are looking for in HETV opportunities. We use these optional answers to understand audience needs. Choosing no opportunity preferences does not opt you into every opportunity. You can unsubscribe at any time.</p>
      </Section>
      <Section number={3} title="How we collect your information">
        <p>When you apply for a role with us, we will collect personal data from you (such as your name, contact details and CV). We may also collect information from third parties, such as referees and former employers.</p>
        <p>If you sign up for one of our training sessions, we will collect information about your name and contact details.</p>
        <p>If you sign up for HETV news, we collect your name and email address. You may also choose interests in roles, programmes and training.</p>
        <p>You may also optionally tell us what you are looking for, such as opportunities for yourself, to share with a network, on behalf of someone else, or a general industry interest. You can optionally add a short answer under “Other”. We use these answers to understand the needs of our audience. Please do not include personally identifying details about anyone you represent. You can change or remove these preferences through the subscription management page.</p>
        <p>You may optionally tell us how you heard about HETV news and share further detail, including the name of someone who recommended us. We use this voluntary information only to understand how people learn about our opportunities and to inform our outreach. You can decline to provide detail, and can change or remove these preferences through the subscription management page. Please do not include private content from groups.</p>
      </Section>
      <Section number={4} title="How do we use your personal data">
        <p>We will process your personal data for the following purposes. We have set out the lawful basis on which we process your personal data (as required under the UK GDPR). Where we have included text in italics, it is because it relates to special categories of personal data or personal data relating to criminal convictions and offences and we have set out the additional lawful basis for such data. We may also process your personal data for additional purposes if these are compatible with the list below. If we process your personal data for any other additional purposes, we will update this privacy notice.</p>
        <div className="legal-table-wrap" role="region" aria-label="Privacy purposes and legal bases table" tabIndex={0}>
          <table>
            <thead><tr><th>Purpose</th><th>Lawful Basis</th></tr></thead>
            <tbody>
              <tr><td>Recruitment: To assess your skills, qualifications and suitability for the role for which you have applied.</td><td>Legitimate interests, specifically to enable us to assess candidates and offer roles to suitable candidates.</td></tr>
              <tr><td>Recruitment: To assess your eligibility to work in the UK.</td><td>Necessary to comply with our legal obligations.</td></tr>
              <tr><td>Recruitment: To communicate with you, such as to arrange interviews, request further information, and to let you know when your application has been successful.</td><td>Legitimate interests, specifically to facilitate the application process and to notify you if you have been successful.</td></tr>
              <tr><td>Recruitment: To contact your referees and former employers for references and to verify your previous roles.</td><td>Legitimate interests, specifically to assess your suitability for the role.</td></tr>
              <tr><td>Recruitment: To carry out DBS checks.</td><td>Necessary to comply with our legal obligations. <em>Necessary to comply with employment obligations / preventing unlawful acts / safeguarding children and vulnerable individuals.</em></td></tr>
              <tr><td>Recruitment: To carry out background checks, such as on LinkedIn.</td><td>Legitimate interests, specifically to assess your suitability for the role.</td></tr>
              <tr><td>Recruitment: To make necessary adjustments to accommodate you in respect of any health data you have provided to us</td><td>Necessary to comply with our legal obligations. <em>Necessary in respect of legal obligations in the field of employment.</em></td></tr>
              <tr><td>Recruitment: To assess our diversity and equality in respect of data concerning health, race or ethnicity, religious or philosophical beliefs, gender, or your sexual orientation.</td><td>Legitimate interests, specifically to review and understand our diversity and equality across roles. <em>Necessary for the purposes of diversity monitoring (Substantial public interest).</em></td></tr>
              <tr><td>Recruitment: To send out surveys and feedback forms in respect of the application process.</td><td>Legitimate interests, specifically to improve our services.</td></tr>
              <tr><td>Training: To register you for training sessions.</td><td>Legitimate interests, specifically to enable you to access our training.</td></tr>
              <tr><td>Training: To send out surveys and feedback forms in respect of any training attended.</td><td>Legitimate interests, specifically to improve our training.</td></tr>
              <tr><td>Updates: To send you updates about roles and training.</td><td>Consent.</td></tr>
              <tr><td>General: To analyse how our Website is accessed and performs.</td><td>Legitimate interests, specifically to improve our Website.</td></tr>
              <tr><td>General: To enforce our rights and to defend ourselves legally.</td><td>Legitimate interests, specifically to enable us to take appropriate legal action.</td></tr>
            </tbody>
          </table>
        </div>
        <h3>Update subscriptions</h3>
        <p>When you subscribe, we store your name, email address, affirmative consent and consent timestamp. Additional interests and profile details are optional. We are currently collecting interest only and do not send automated update emails. New signups do not receive or need a personal management link. Previously issued private links remain usable; a hash of each existing link&apos;s token is stored in our database, and some older visitors may have saved their token in their browser.</p>
         <p>To change preferences or unsubscribe, you can request a short-lived verification code sent to your subscribed email address. This verification-only message is sent through Resend from hetv@gentraxtech.com; it does not mean that automated opportunity updates are being sent. Entering an email address alone cannot remove or reveal a subscription. Existing private-link holders can still use their original link. For an erasure or other data-rights request, email <a href="mailto:opportunities@baileyopportunities.com">opportunities@baileyopportunities.com</a>. When a subscription is deactivated, we retain a suppression record so the opt-out continues to be respected.</p>
      </Section>
      <Section number={5} title="Automated decision-making">
        <p>Under data protection laws, you have the right not to have significant decisions made about you without human involvement. All decisions about our roles are made by humans.</p>
      </Section>
      <Section number={6} title="Who do we share your personal data with?">
        <p>We may share your personal data with our group companies and those entities to which the role relates. As mentioned, we may also share your information with the Disclosure and Barring Service and your former employers and referees.</p>
        <p>We will share your personal data with our service providers, such as those managing our recruitment platform. These service providers are considered processors and will be contractually bound only to process your personal data in accordance with our instructions.</p>
        <p>We may share your personal data in the event of any corporate activity, such as a sale or merger.</p>
        <p>We may share your personal data with law enforcement or third parties investigating unlawful activity. Generally, this will only be where we are legally required to do so or where we consider the request to be necessary and proportionate.</p>
      </Section>
      <Section number={7} title="Transferring your personal data outside of the UK">
        <p>If we transfer your personal data outside of the UK, we will ensure that there are appropriate safeguards in place to ensure your personal data is adequately protected. These safeguards include transferring to adequate territories with similar data protection laws (such as the EU) or implementing standard contractual clauses with the importing entity.</p>
      </Section>
      <Section number={8} title="How long do we keep your personal data?">
        <p>If you are successful, we will retain your personal data and process it in accordance with the privacy notice relevant to your role.</p>
        <p>If you are unsuccessful, we may retain your personal data for up to 12 months in case any other suitable opportunities arise. If you would prefer us not to retain your personal data, you can contact us at any time.</p>
        <p>We will retain information about those who register for training and recruitment for up to six years.</p>
        <p>We will retain information about those who subscribe to updates for so long as they are subscribed and up to 12 months thereafter.</p>
      </Section>
      <Section number={9} title="Cookies">
        <p>We may use cookies and similar technologies on our Website. Cookies are text files containing small amounts of information which are downloaded to your personal computer, mobile or other device when you visit a website.</p>
        <p>We use cookies for performance and analytical purposes to understand better how our Website operates.</p>
        <p>We may also use cookies that are necessary to the functionality of our Website, for example to allow you to move through the application forms.</p>
        <p>You can learn more about cookies and how to disable them <a href="https://ico.org.uk/for-the-public/online/cookies/" target="_blank" rel="noreferrer">here<span className="legal-external" aria-hidden="true">↗</span></a>.</p>
      </Section>
      <Section number={10} title="Your rights">
        <p>Under data protection laws, you have the following rights in respect of your personal data:</p>
        <ol>
          <li>The right to request access to your personal data.</li>
          <li>The right to request correction of the personal data we hold about you.</li>
          <li>The right to request that we erase the personal data held about you.</li>
          <li>The right to object to processing carried out on the basis of our legitimate interests, save where we have compelling interests to continue processing.</li>
          <li>The right to object to direct marketing.</li>
          <li>The right to request the restriction of processing of your personal data.</li>
          <li>The right to request your personal data is ‘ported’ to a third party.</li>
          <li>The right to withdraw your consent.</li>
        </ol>
        <p>It is important to note that none of these rights are absolute and there may be circumstances in which we are unable to fulfil your request (in whole or in part).</p>
        <p>If you wish to exercise any of your rights, please contact us.</p>
        <p>You also have the right to complain to us or your supervisory authority (in the UK this is the ICO) if you have any concerns about how our personal data is being processed. We ask that you contact us with any complaints in the first instance.</p>
      </Section>
      <Section number={11} title="Contact us">
        <p>If you have any questions about our privacy notice or wish to exercise your rights, please contact us at <a href="mailto:opportunities@baileyopportunities.com">opportunities@baileyopportunities.com</a>.</p>
      </Section>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage
      title="Website Terms & Conditions"
      eyebrow="Legal / Terms"
      description="The rules and conditions that apply when using the HETV Opportunities Hub."
    >
      <p className="legal-updated">Last updated: [DATE]</p>
      <Section number={1} title="Introduction">
        <p>Welcome to our website, [URL] (the <strong>Website</strong>).</p>
        <p>These terms and conditions (the <strong>Terms</strong>) explain the rules for using the Website. Please read them carefully before using the Website. By accessing or using the Website, you confirm that you accept these Terms and agree to follow them. If you do not agree, please do not use the Website.</p>
      </Section>
      <Section number={2} title="About us">
        <p>The Website is operated by Larkin AV Limited together with Bailey Productions Limited whose registered offices are at 21 Poland Street, Third Floor, London, England, W1F 8QG (together, the <strong>Companies</strong>, <strong>we</strong>, <strong>us</strong> or <strong>our</strong> and each a <strong>Company</strong>). Larkin AV Limited is responsible for producing the audio-visual programme provisionally entitled “Larkin” and Bailey Productions Limited is responsible for producing the audio-visual programme provisionally entitled “Bailey” (together, the <strong>Productions</strong> and each a <strong>Production</strong>).</p>
      </Section>
      <Section number={3} title="About the Website">
        <p>The Website provides functionality enabling users (<strong>you</strong>, <strong>your</strong>) to:</p>
        <ol><li>browse and apply for job opportunities relating to the Productions;</li><li>browse and apply for training opportunities relating to the Productions and/or other training opportunities; and</li><li>sign up to the Companies’ (respective) mailing list to receive updates.</li></ol>
        <p>To access the main features of the Website, you will need to create an account and log in (see Section 5 below for more information).</p>
        <p>When applying for roles or training opportunities, you may be redirected to an external application form (hosted by Airtable) to complete and submit outside of the Website.</p>
        <p>All job and training opportunities, respective to the relevant Production, are posted and managed by or on behalf of the Companies; and all hiring, acceptance, and other decisions are made solely by or on behalf of the relevant Company.</p>
      </Section>
      <Section number={4} title="Who can use the Website">
        <p>The Website is designed for individuals working in, or looking to enter, the television and film production industry who are interested in job or training opportunities.</p>
        <p>You may use the Website if you are: (a) an individual acting on your own behalf; or (b) a company or other organisation using the Website on behalf of your employees or contractors (for example, to apply for training opportunities on their behalf).</p>
        <p>If you are using the Website on behalf of an organisation, you confirm that you have the authority to bind that organisation to these Terms, and references to <strong>you</strong> and <strong>your</strong> in these Terms include that organisation.</p>
      </Section>
      <Section number={5} title="Your account">
        <p>To access the main features of the Website, and in particular to apply for any roles or training opportunities, you will need to register for an account. For information about how we process your personal data in connection with your account, please see the Privacy Notice [LINK].</p>
        <p>If you create an account with us, you are responsible for keeping your login details secure and confidential. You must not share your account, or account details, with others.</p>
        <p>You agree to provide accurate and up-to-date information when creating your account and when applying for opportunities. If any of your details change, please update them promptly.</p>
        <p>We reserve the right to suspend or terminate your account at any time if we reasonably believe you have breached these Terms.</p>
      </Section>
      <Section number={6} title="Acceptable use">
        <p>You agree to use the Website only for lawful purposes and in a way that does not infringe the rights of others or restrict their use of the Website.</p>
        <p>In particular, you must not:</p>
        <ol><li>use the Website in any way that is unlawful, fraudulent, or harmful;</li><li>submit false, misleading, or inaccurate information to or via the Website;</li><li>attempt to gain unauthorised access to the Website, its servers, or any connected systems;</li><li>introduce viruses, malware, or other harmful material to or via the Website;</li><li>use any automated systems (such as bots or scrapers) to access the Website;</li><li>upload, post, or transmit any content that is abusive, obscene, defamatory, libellous, threatening, harassing, or otherwise objectionable; or</li><li>harass, abuse, or harm any other user of the Website.</li></ol>
      </Section>
      <Section number={7} title="Job and training opportunities">
        <p>The job and training opportunities listed on the Website are subject to availability and may change at short notice.</p>
        <p>Given the nature of audiovisual production, roles may need to be filled urgently and at very short notice (for example, where there is a last-minute need for particular crew members).</p>
        <p>We reserve the right, without liability, to:</p>
        <ol><li>withdraw any job or training opportunity at any time without notice;</li><li>amend role descriptions or training opportunity details at any time, including (but without limitation) where the scope of a role evolves as the Production progresses or for creative or other reasons; and</li><li>accept or decline any application at our sole discretion.</li></ol>
        <p>We do not guarantee that any particular opportunity will remain available on the relevant Production nor that you will be offered a role or training place.</p>
      </Section>
      <Section number={8} title="Vetting and moderation">
        <p>We reserve the right – but do not commit and are not obliged – to monitor, review, and/or moderate use of the Website and any applications submitted through it. This may include reviewing application materials, verifying information provided, and taking such other steps as we consider appropriate.</p>
        <p>We may remove or reject any content or application that we consider, in our sole but reasonable opinion, to be inappropriate, inaccurate, or in breach of these Terms.</p>
      </Section>
      <Section number={9} title="Intellectual property">
        <p>Each of the Companies owns (or has the right to use) all intellectual property rights in and to the Website and its content, including but not limited to text, graphics, logos, images, software, and design elements. All such rights are reserved.</p>
        <p>You may view, download, and print content from the Website for your personal, non-commercial use only. You must not otherwise reproduce, distribute, modify, or use any content from the Website without our prior written consent.</p>
      </Section>
      <Section number={10} title="Limitation of liability">
        <p>The Companies provide the Website on an “as is” basis. While we take reasonable care to ensure the information on the Website is accurate, we do not warrant that the Website, or any content on it, will be error-free, uninterrupted, or free from viruses or other harmful elements.</p>
        <p>To the fullest extent permitted by law:</p>
        <ol><li>we exclude all implied warranties, conditions, and representations;</li><li>we will not be liable for any indirect, consequential, or special loss or damage arising from your use of the Website;</li><li>we will not be liable for any loss arising from: (i) your reliance on any information or content on the Website; (ii) any decision made by us in relation to job or training applications; (iii) any failure to secure a role or training place; or (iv) the unavailability of the Website for any reason; and</li><li>to the extent permitted by law, we exclude all other liability to you in connection with your use of the Website.</li></ol>
        <p>Nothing in these Terms excludes or limits our liability for death or personal injury caused by our negligence, for fraud or fraudulent misrepresentation, or for any other liability that cannot be excluded or limited by law.</p>
      </Section>
      <Section number={11} title="External links and services">
        <p>The Website may contain links to external websites or services (including, but without limitation, Airtable for role application forms). We are not responsible for the content, privacy or other practices, or availability of any external sites or services. Your use of any external sites is at your own risk and subject to their terms and conditions.</p>
      </Section>
      <Section number={12} title="Your privacy">
        <p>We take your privacy seriously. For information about how we collect, use, and protect your personal data, please see the Privacy Notice [LINK].</p>
      </Section>
      <Section number={13} title="Changes to these Terms">
        <p>We may update these Terms from time to time. Any changes will be posted on this page with an updated date. We encourage you to review these Terms periodically. Your continued use of the Website after any changes constitutes your acceptance of the updated Terms.</p>
      </Section>
      <Section number={14} title="General">
        <p>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions will continue in full force and effect.</p>
        <p>Our failure to enforce any right or provision of these Terms does not constitute a waiver of that right or provision.</p>
        <p>These Terms constitute the entire agreement between you and the Companies regarding your use of the Website.</p>
        <p>These Terms are personal to you and you may not transfer or assign any of your rights or obligations under these Terms without our prior written consent. We may transfer or assign our rights and obligations under these Terms at any time without notice to you.</p>
        <p>These Terms do not create any rights enforceable by any person who is not a party to them under the Contracts (Rights of Third Parties) Act 1999.</p>
        <p>We will not be liable for any failure or delay in performing our obligations under these Terms where such failure or delay results from circumstances beyond our reasonable control.</p>
      </Section>
      <Section number={15} title="Governing law and jurisdiction">
        <p>These Terms are governed by the laws of England and Wales. Any disputes arising from or in connection with these Terms or your use of the Website shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
      </Section>
      <Section number={16} title="Contact us">
        <p>If you have any questions about these Terms or the Website, please contact us at [CONTACT EMAIL ADDRESS].</p>
      </Section>
    </LegalPage>
  );
}