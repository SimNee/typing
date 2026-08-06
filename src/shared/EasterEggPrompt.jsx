import { useState } from "react";

export default function EasterEggPrompt({ submit, close }) {
  const [answer, setAnswer] = useState("");
  return (
    <div className="modal-bg">
      <form
        className="egg-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="egg-question"
        onSubmit={(e) => {
          e.preventDefault();
          submit(answer);
        }}
      >
        <button
          type="button"
          className="egg-close"
          onClick={close}
          aria-label="Close"
        >
          ×
        </button>
        <span className="egg-icon">🚉</span>
        <h2 id="egg-question">what does this line reminds you of?</h2>
        <input
          autoFocus
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          aria-label="Easter egg answer"
          autoComplete="off"
        />
        <button type="submit" className="primary">
          Answer
        </button>
      </form>
    </div>
  );
}
