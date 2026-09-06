import { ArrowIcon } from '../Icons';

/** Native scroll drives the shared scene. The anchor always lets a visitor skip ahead. */
export function ThreadPassage() {
  return (
    <section aria-labelledby="connections-heading" className="thread-passage" id="connections">
      <div className="thread-passage__sticky section-shell">
        <div className="thread-passage__copy">
          <h2 id="connections-heading">Small details.<br /><em>Real connections.</em></h2>
          <p>An idea becomes a product<br />when the pieces work together.</p>
        </div>
        <a className="story-link thread-passage__skip" href="#trendyol">Next · Trendyol Price Tracker<ArrowIcon /></a>
      </div>
    </section>
  );
}
