import { newFaq } from "../pages/faq-data";
import { NewFaqAnswer } from "../pages/faq-answer";

function FaqChevron() {
  return (
    <svg className="home-faq-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function HomeFaqs() {
  return (
    <>
      <details className="hetv-faq-item home-faq-dropdown">
        <summary>
          <h3>Do you offer individual feedback on applications?</h3>
          <FaqChevron />
        </summary>
        <div className="home-faq-answer">
          <p>Due to the volume of applications we receive, we’re unable to provide individual feedback</p>
        </div>
      </details>
      <details className="hetv-faq-item home-faq-dropdown">
        <summary>
          <h3>{newFaq.question}</h3>
          <FaqChevron />
        </summary>
        <div className="home-faq-answer"><NewFaqAnswer /></div>
      </details>
    </>
  );
}
