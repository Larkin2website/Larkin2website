import type { FormEvent } from "react";

type RoleSearchComposerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  showPrompt?: boolean;
  inputTestId?: string;
  clearTestId?: string;
  className?: string;
};

export function RoleSearchComposer({
  id,
  value,
  onChange,
  onSubmit,
  showPrompt = true,
  inputTestId,
  clearTestId,
  className = "",
}: RoleSearchComposerProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.(value.trim());
  };

  return (
    <div className={`roles-chat-search ${className}`.trim()}>
      {showPrompt && (
        <div className="roles-chat-prompt">
          <span className="roles-chat-label">Role finder</span>
          <p>What kind of role are you looking for?</p>
        </div>
      )}
      <form className="roles-chat-composer" role="search" onSubmit={handleSubmit}>
        <label htmlFor={id}>Search roles by keyword</label>
        <input
          id={id}
          type="search"
          className="roles-chat-input"
          placeholder="Message the role finder"
          value={value}
          onChange={event => onChange(event.target.value)}
          autoComplete="off"
          data-testid={inputTestId}
        />
        {value && (
          <button
            type="button"
            className="roles-chat-clear"
            onClick={() => onChange("")}
            aria-label="Clear role search"
            data-testid={clearTestId}
          >
            <span aria-hidden="true">×</span>
          </button>
        )}
        <button type="submit" className="roles-chat-send" aria-label="Search roles">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
          </svg>
        </button>
      </form>
      <span className="roles-chat-hint">Try “camera”, “part time” or “closed”</span>
    </div>
  );
}