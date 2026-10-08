import { newFaq } from "./faq-data";

export function NewFaqAnswer() {
  return (
    <>
      {newFaq.paragraphs.map((text) => {
        const [before, after] = text.split("{email}");
        return (
          <p key={text}>
            {after === undefined ? text : (
              <>{before}<a href={`mailto:${newFaq.email}`}>{newFaq.email}</a>{after}</>
            )}
          </p>
        );
      })}
    </>
  );
}
