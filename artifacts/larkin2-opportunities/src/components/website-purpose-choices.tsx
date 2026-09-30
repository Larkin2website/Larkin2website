export const websitePurposeOptions = [
  ["roles_self", "Roles for myself"],
  ["training_self", "Training/development opportunities for myself"],
  ["share_network", "Opportunities to share with my network/community"],
  ["on_behalf", "Opportunities on behalf of someone else"],
  ["industry_interest", "General industry interest"],
  ["other", "Other"],
] as const;

export type WebsitePurpose = typeof websitePurposeOptions[number][0];

type WebsitePurposeChoicesProps = {
  purposes: WebsitePurpose[];
  other: string;
  disabled?: boolean;
  idPrefix: string;
  onPurposesChange: (purposes: WebsitePurpose[]) => void;
  onOtherChange: (other: string) => void;
};

export function WebsitePurposeChoices({
  purposes, other, disabled = false, idPrefix, onPurposesChange, onOtherChange,
}: WebsitePurposeChoicesProps) {
  const includesOther = purposes.includes("other");

  return (
    <fieldset className="hetv-subscription-options hetv-website-purpose">
      <legend>What are you looking for? (Select all that apply)</legend>
      {websitePurposeOptions.map(([value, label]) => (
        <label className="hetv-subscription-check" key={value} htmlFor={`${idPrefix}-${value}`}>
          <input
            id={`${idPrefix}-${value}`}
            data-testid={`${idPrefix}-${value}`}
            type="checkbox"
            checked={purposes.includes(value)}
            disabled={disabled}
            onChange={event => {
              const nextPurposes = event.target.checked
                ? [...new Set([...purposes, value])]
                : purposes.filter(item => item !== value);
              onPurposesChange(nextPurposes);
              if (value === "other" && !event.target.checked) onOtherChange("");
            }}
          />
          <span>{label}</span>
        </label>
      ))}
      {includesOther && (
        <>
          <label htmlFor={`${idPrefix}-other-detail`}>Other (optional)</label>
          <input
            id={`${idPrefix}-other-detail`}
            data-testid={`${idPrefix}-other-detail`}
            type="text"
            maxLength={120}
            value={other}
            disabled={disabled}
            onChange={event => onOtherChange(event.target.value)}
          />
          <p>Please don’t include personally identifying details about anyone you represent.</p>
        </>
      )}
    </fieldset>
  );
}