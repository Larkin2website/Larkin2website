import { getListPublicProgrammesQueryKey, useListPublicProgrammes } from "@workspace/api-client-react";
import { programmeRegistration } from "@workspace/programme-content/registration";
import { MaskedLink } from "./layout";
import { LIVE_QUERY_OPTIONS, groupByRegistration, isTraining, useNow } from "../lib/programme-presentation";

export function TrainingListings() {
  const now = useNow();
  const { data = [], isLoading, isError, refetch } = useListPublicProgrammes(undefined, {
    query: { queryKey: getListPublicProgrammesQueryKey(), ...LIVE_QUERY_OPTIONS },
  });
  if (isLoading) return <p role="status">Loading training courses…</p>;
  if (isError) return <div role="alert"><p>We couldn’t load training courses. Please try again.</p><button type="button" className="larkin2-btn" onClick={() => void refetch()}>Retry</button></div>;
  const { open, unconfirmed, closed } = groupByRegistration(data.filter(isTraining), now);
  const cards = (list: typeof data) => list.map((course) => {
    const reg = programmeRegistration(course, now);
    return (
      <article className="hetv-programme-item" key={course.id}>
        <div className={`programme-status-badge ${reg.state === "open" ? "is-open" : "is-closed"}`}>{reg.label}</div>
        <h3>{course.title}</h3>
        <p>{course.shortDescription}</p>
        {course.applicationDeadline && <p className="larkin2-small">Deadline: {course.applicationDeadline}</p>}
        <MaskedLink href={`/opportunities/${course.slug}`} testId={`link-opp-${course.slug}`}>View course details</MaskedLink>
      </article>
    );
  });
  return (
    <>
      <h2>Courses open for registration</h2>
      <div className="hetv-programme-list" data-testid="training-open">
        {open.length ? cards(open) : <p>No training courses are currently open for registration.</p>}
      </div>
      {unconfirmed.length > 0 && (
        <section aria-labelledby="training-unconfirmed-title" data-testid="training-unconfirmed">
          <h2 id="training-unconfirmed-title">Registration status unconfirmed</h2>
          <p>The registration deadline for these courses cannot be confirmed. Registration is not offered from this site; check the original course information.</p>
          <div className="hetv-programme-list">{cards(unconfirmed)}</div>
        </section>
      )}
      <section aria-labelledby="training-previous-title" data-testid="training-closed">
        <h2 id="training-previous-title">Previous and closed courses</h2>
        <p>Registration for these courses is closed. This does not confirm that a course has been delivered.</p>
        <div className="hetv-programme-list">{closed.length ? cards(closed) : <p>No closed training courses are currently listed.</p>}</div>
      </section>
    </>
  );
}
