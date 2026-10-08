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
  const { open, unconfirmed, closed } = groupByRegistration(
    data.filter(programme => isTraining(programme) || programme.slug === "first-credit"), now,
  );
  const cards = (list: typeof data) => list.map((course) => {
    const reg = programmeRegistration(course, now);
    return (
      <article className="hetv-programme-item" key={course.id}>
        {reg.state !== "unconfirmed" && <div className={`programme-status-badge ${reg.state === "open" ? "is-open" : "is-closed"}`}>{reg.label}</div>}
        <h3>{course.title}</h3>
        <p>{course.shortDescription}</p>
        {course.applicationDeadline && <p className="larkin2-small">Deadline: {course.applicationDeadline}</p>}
        <MaskedLink href={`/opportunities/${course.slug}`} testId={`link-opp-${course.slug}`}>
          {isTraining(course) ? "View course details" : "View First Credit Programme"}
        </MaskedLink>
      </article>
    );
  });
  return (
    <>
      <section className="training-course-group" aria-labelledby="training-open-title" data-testid="training-open">
        <h2 id="training-open-title">Courses open for registration</h2>
        <div className="hetv-programme-list">
          {open.length ? cards(open) : <p>No training courses are currently open for registration.</p>}
        </div>
      </section>
      {unconfirmed.length > 0 && (
        <section className="training-course-group" aria-labelledby="training-more-title" data-testid="training-unconfirmed">
          <h2 id="training-more-title">More training courses</h2>
          <div className="hetv-programme-list">{cards(unconfirmed)}</div>
        </section>
      )}
      <section className="training-course-group" aria-labelledby="training-previous-title" data-testid="training-closed">
        <h2 id="training-previous-title">Previous and closed courses</h2>
        <p>Applications and registration for these listings are closed.</p>
        <div className="hetv-programme-list">{closed.length ? cards(closed) : <p>No closed training courses are currently listed.</p>}</div>
      </section>
    </>
  );
}
