import { getListPublicProgrammesQueryKey, useListPublicProgrammes } from "@workspace/api-client-react";
import { MaskedLink } from "./layout";
import { DEVELOPMENT_SLUGS, splitPublicProgrammes } from "../lib/programme-presentation";

export function DevelopmentListings() {
  const { data = [], isLoading, isError, refetch } = useListPublicProgrammes(undefined, {
    query: { queryKey: getListPublicProgrammesQueryKey(), staleTime: 60_000, retry: 2 },
  });
  const { current, previous } = splitPublicProgrammes(data.filter((programme) => DEVELOPMENT_SLUGS.includes(programme.slug)));
  if (isLoading) return <p role="status">Loading development programmes…</p>;
  if (isError) return <div role="alert"><p>We couldn’t load development programmes. Please try again.</p><button type="button" className="larkin2-btn" onClick={() => void refetch()}>Retry</button></div>;
  const cards = (programmes: typeof data, closed: boolean) => programmes.map((programme) => (
    <article className="hetv-programme-item" key={programme.id}>
      <div className={`programme-status-badge ${closed ? "is-closed" : "is-open"}`}>Applications {closed ? "closed" : "open"}</div>
      <h3>{programme.title}</h3>
      <p>{programme.shortDescription}</p>
      <MaskedLink href={`/opportunities/${programme.slug}`} testId={`link-opp-${programme.slug}`}>View programme details</MaskedLink>
    </article>
  ));
  return (
    <>
      <h2>Current development programmes</h2>
      <div className="hetv-programme-list">
        {current.length ? cards(current, false) : <p>No development programmes are currently accepting applications.</p>}
      </div>
      <section className="previous-programmes" id="previous-programmes" aria-labelledby="previous-development-title">
        <h2 id="previous-development-title">Previous programmes</h2>
        <p>These development programme application windows are closed. This does not confirm that a programme has been delivered.</p>
        <div className="hetv-programme-list">{previous.length ? cards(previous, true) : <p>No closed development programmes are currently listed.</p>}</div>
        <MaskedLink href="/opportunities#previous-programmes" testId="link-development-previous">Explore all closed programme records</MaskedLink>
      </section>
    </>
  );
}
