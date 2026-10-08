import { useEffect, useRef, useState } from "react";
import { MobileMenu, SiteFooter, SiteHeader } from "../components/layout";
import "./faqs.css";
import { newFaq } from "./faq-data";
import { NewFaqAnswer } from "./faq-answer";

const questions = [
  {
    question: "Do you offer individual feedback on applications?",
    answer: "Due to the volume of applications we receive, we’re unable to provide individual feedback",
  },
  {
    question: "Why do some roles use an application form and others have a different way to apply?",
    answer: "One of our commitments is to widen access to our industry and support consistent processes. With this, as well as the recruitment that takes place directly within departments, we also open up a number of roles in each department to a recruitment process, which has a clear application process and form.",
  },
  { question: newFaq.question, answer: null },
];

export function FAQsPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "FAQs | HETV Opportunities Hub";
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      setScrolled(current > 38);
      if (current < 20 || current < lastScrollY.current - 5) {
        setHeaderHidden(false);
      } else if (current > lastScrollY.current + 8 && current > 90 && !menuOpen) {
        if (!(headerRef.current && document.activeElement && headerRef.current.contains(document.activeElement))) {
          setHeaderHidden(true);
        }
      }
      lastScrollY.current = current;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  return (
    <div className="larkin2-page legal-page hetv-faq-page" id="top">
      <a className="larkin2-skip" href="#content" data-testid="link-skip-content">Skip to content</a>
      <SiteHeader
        scrolled={scrolled}
        headerHidden={headerHidden}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        headerRef={headerRef}
        menuButtonRef={menuButtonRef}
      />
      <MobileMenu menuOpen={menuOpen} setMenuOpen={setMenuOpen} menuButtonRef={menuButtonRef} />
      <main id="content">
        <header className="legal-hero">
          <span className="larkin2-eyebrow">The details / 01</span>
          <h1>Frequently Asked Questions</h1>
          <p>Answers to common questions about applying for roles in high-end television.</p>
        </header>
        <div className="legal-content">
          <div className="legal-document hetv-faq-list">
            {questions.map(({ question, answer }, index) => (
              <section key={question} aria-labelledby={`faq-question-${index + 1}`}>
                <h2 id={`faq-question-${index + 1}`} data-testid={`text-faq-question-${index + 1}`}>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{question}
                </h2>
                {answer === null ? (
                  <div data-testid={`text-faq-answer-${index + 1}`}>
                    <NewFaqAnswer />
                  </div>
                ) : <p data-testid={`text-faq-answer-${index + 1}`}>{answer}</p>}
              </section>
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}