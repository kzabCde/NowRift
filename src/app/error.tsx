"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="modal-shade">
      <section className="modal-panel">
        <span className="eyebrow">A BREAK IN THE VEIL</span>
        <h1>The journey was interrupted.</h1>
        <p>
          Your completed run records have not been reset. Retry the page to
          return to the forest.
        </p>
        <button className="primary-button" onClick={reset} type="button">
          TRY AGAIN →
        </button>
      </section>
    </main>
  );
}
