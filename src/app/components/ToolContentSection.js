/**
 * ToolContentSection – Server Component
 * Renders rich editorial content for a given tool:
 * description, how-to steps, features grid, and FAQ accordion.
 *
 * This is a SERVER component (no 'use client') so all content is
 * present in the initial HTML source, fully crawlable by Googlebot.
 */
import toolContent from '../data/toolContent';

export default function ToolContentSection({ tool }) {
  const content = toolContent[tool];
  if (!content) return null;

  const { title, description, howTo, features, faqs } = content;

  // HowTo structured data for Google rich results
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    'name': `How to use ${title}`,
    'description': description.split('\n\n')[0].trim(),
    'step': howTo.map((step, i) => ({
      '@type': 'HowToStep',
      'position': i + 1,
      'text': step,
    })),
  };

  return (
    <section className="tool-content-section" aria-label={`About ${title}`}>
      {/* HowTo JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      {/* Description */}
      <div className="tool-content-description">
        <h2 className="tool-content-h2">About {title}</h2>
        {description.split('\n\n').map((para, i) => (
          <p key={i} className="tool-content-para">{para.trim()}</p>
        ))}
      </div>

      {/* How To */}
      <div className="tool-content-howto">
        <h2 className="tool-content-h2">How to Use</h2>
        <ol className="tool-content-steps">
          {howTo.map((step, i) => (
            <li key={i} className="tool-content-step">
              <span className="step-number">{i + 1}</span>
              <span className="step-text">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Features */}
      <div className="tool-content-features">
        <h2 className="tool-content-h2">Key Features</h2>
        <div className="tool-features-grid">
          {features.map((feature, i) => (
            <div key={i} className="tool-feature-card">
              <h3 className="tool-feature-title">{feature.title}</h3>
              <p className="tool-feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ with FAQPage schema */}
      <div
        className="tool-content-faq"
        itemScope
        itemType="https://schema.org/FAQPage"
      >
        <h2 className="tool-content-h2">Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="faq-item"
              itemScope
              itemProp="mainEntity"
              itemType="https://schema.org/Question"
            >
              <summary className="faq-question" itemProp="name">
                {faq.q}
              </summary>
              <div
                className="faq-answer"
                itemScope
                itemProp="acceptedAnswer"
                itemType="https://schema.org/Answer"
              >
                <p itemProp="text">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

