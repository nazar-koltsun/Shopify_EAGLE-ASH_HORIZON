/**
 * Submits email signups to Klaviyo with a custom Interest Type profile property.
 */
class EmailSignupKlaviyo extends HTMLElement {
  /** @type {HTMLFormElement | null} */
  #form = null;

  /** @type {HTMLButtonElement | null} */
  #submitButton = null;

  /** @type {HTMLElement | null} */
  #errorMessage = null;

  /** @type {HTMLElement | null} */
  #successMessage = null;

  connectedCallback() {
    this.#form = this.querySelector('form');
    this.#submitButton = this.querySelector('button[type="submit"]');
    this.#errorMessage = this.querySelector('[data-signup-error]');
    this.#successMessage = this.querySelector('[data-signup-success]');

    this.#form?.addEventListener('submit', this.#onSubmit);
  }

  disconnectedCallback() {
    this.#form?.removeEventListener('submit', this.#onSubmit);
  }

  /** @param {Event} event */
  #onSubmit = async (event) => {
    event.preventDefault();

    if (!this.#form) return;

    this.#hideMessages();

    const companyId = this.dataset.companyId?.trim();
    const listId = this.dataset.listId?.trim();
    const formData = new FormData(this.#form);
    const email = formData.get('email');
    const interestType = formData.get('interest_type');

    const hasEmail = typeof email === 'string' && email.trim().length > 0;
    const hasInterest = typeof interestType === 'string' && interestType.length > 0;

    if (!hasEmail || !hasInterest) {
      this.#showError(this.dataset.fieldsRequired);
      return;
    }

    if (!companyId || !listId) {
      console.error('Email signup (Klaviyo): missing company ID or list ID in block settings.');
      this.#showError(this.dataset.errorMessage);
      return;
    }

    if (this.#submitButton) this.#submitButton.disabled = true;

    try {
      const response = await fetch(
        `https://a.klaviyo.com/client/subscriptions/?company_id=${encodeURIComponent(companyId)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/vnd.api+json',
            Accept: 'application/vnd.api+json',
            revision: '2025-07-15',
          },
          body: JSON.stringify({
            data: {
              type: 'subscription',
              attributes: {
                custom_source: this.dataset.customSource || 'Shopify theme signup',
                profile: {
                  data: {
                    type: 'profile',
                    attributes: {
                      email: email.trim(),
                      properties: {
                        'Interest Type': interestType,
                      },
                      subscriptions: {
                        email: {
                          marketing: {
                            consent: 'SUBSCRIBED',
                          },
                        },
                      },
                    },
                  },
                },
              },
              relationships: {
                list: {
                  data: {
                    type: 'list',
                    id: listId,
                  },
                },
              },
            },
          }),
        }
      );

      if (!response.ok) {
        let detail = `${response.status} ${response.statusText}`;
        try {
          const errorBody = await response.json();
          if (Array.isArray(errorBody?.errors) && errorBody.errors.length > 0) {
            detail = errorBody.errors.map((/** @type {any} */ error) => error.detail).join(' | ');
          }
        } catch {
          // Response body was not JSON; keep the status-based detail.
        }
        console.error('Email signup (Klaviyo) failed:', detail);
        throw new Error(detail);
      }

      this.#form.reset();
      this.#showSuccess();
    } catch {
      this.#showError(this.dataset.errorMessage);
    } finally {
      if (this.#submitButton) this.#submitButton.disabled = false;
    }
  };

  #hideMessages() {
    this.#errorMessage?.classList.add('hidden');
    this.#successMessage?.classList.add('hidden');
  }

  #showError(message) {
    if (!this.#errorMessage || !message) return;

    const text = this.#errorMessage.querySelector('.email-signup__message-text');
    if (text) text.textContent = message;

    this.#errorMessage.classList.remove('hidden');
    this.#errorMessage.focus();
  }

  #showSuccess() {
    this.#successMessage?.classList.remove('hidden');
    this.#successMessage?.focus();
  }
}

if (!customElements.get('email-signup-klaviyo')) {
  customElements.define('email-signup-klaviyo', EmailSignupKlaviyo);
}
