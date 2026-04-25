export const setupContactForm = (siteConfig = window.siteConfig || {}) => {
  const form = document.querySelector('[data-demo-form]');
  const formNote = document.querySelector('[data-form-response]');
  if (!form || !formNote) {
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  const setFormState = (message, pending = false) => {
    formNote.textContent = message;
    if (pending) {
      form.setAttribute('aria-busy', 'true');
    } else {
      form.removeAttribute('aria-busy');
    }
    if (submitButton) {
      submitButton.disabled = pending;
    }
  };

  const openMailClientFallback = (name, email, message, contactEmail) => {
    const subject = encodeURIComponent(`Project inquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
    setFormState('Direct submit is unavailable right now. Opening your email client...');
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();

    if (!name || !email || !message) {
      setFormState('Please complete all fields before sending.');
      return;
    }

    const contactEmail = siteConfig.email || (window.siteConfig && window.siteConfig.email) || 'hello@example.com';
    const endpoint =
      form.getAttribute('data-form-endpoint') ||
      siteConfig.contactFormEndpoint ||
      (window.siteConfig && window.siteConfig.contactFormEndpoint) ||
      '';

    if (!window.fetch || !endpoint) {
      openMailClientFallback(name, email, message, contactEmail);
      return;
    }

    setFormState('Sending your brief...', true);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Form submit failed with status ${response.status}`);
      }

      form.reset();
      setFormState('Thanks, your brief was sent successfully. I usually reply within 24 hours.');
    } catch (error) {
      openMailClientFallback(name, email, message, contactEmail);
    }
  });
};
