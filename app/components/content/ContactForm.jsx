import { useRef, useState } from "react";

import { cx } from "../../lib/format.js";
import { Button } from "../ui/Button.jsx";

const ENDPOINT = "https://api.web3forms.com/submit";
const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY;
const CAPTCHA_SCRIPT = "https://web3forms.com/client/script.js";
const MIN_MESSAGE = 20;

/** @typedef {"idle" | "sending" | "success" | "error"} Status */
/** @typedef {Partial<Record<"name" | "email" | "message", string>>} FieldErrors */

/**
 * Checks the fields and returns a plain-English message for each problem.
 * @param {Record<string, string>} data
 * @returns {FieldErrors}
 */
function validate(data) {
  /** @type {FieldErrors} */
  const errors = {};
  if (!data.name?.trim()) errors.name = "Please tell me your name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email?.trim() ?? "")) {
    errors.email = "Please enter an email address I can reply to, like name@example.com.";
  }
  if ((data.message?.trim().length ?? 0) < MIN_MESSAGE) {
    errors.message = `Please write at least ${MIN_MESSAGE} characters, so I know what you have in mind.`;
  }
  return errors;
}

/** Loads Web3Forms' hCaptcha widget, once, on first focus of any field. */
function loadCaptcha() {
  if (document.querySelector(`script[src="${CAPTCHA_SCRIPT}"]`)) return;
  const script = document.createElement("script");
  script.src = CAPTCHA_SCRIPT;
  script.async = true;
  script.defer = true;
  document.head.append(script);
}

const FIELD =
  "w-full rounded-inner border border-line-strong bg-surface-2 px-4 text-body transition-colors duration-(--dur-fast) ease-out placeholder:text-ink-muted aria-invalid:border-ink";

/**
 * The contact form (a lazy chunk). Posts to Web3Forms with fetch; a hidden
 * honeypot catches simple bots and hCaptcha loads on first focus. Every
 * state is announced politely; on failure it offers the email address.
 *
 * @param {object} props
 * @param {string} props.email  Fallback address for errors
 * @param {string[]} props.subjects
 */
export default function ContactForm({ email, subjects }) {
  const [status, setStatus] = useState(/** @type {Status} */ ("idle"));
  const [errors, setErrors] = useState(/** @type {FieldErrors} */ ({}));
  /** @type {import("react").RefObject<HTMLFormElement | null>} */
  const formRef = useRef(null);

  /** @param {import("react").FormEvent<HTMLFormElement>} event */
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = /** @type {Record<string, string>} */ (Object.fromEntries(new FormData(form)));
    if (data.botcheck) return;

    const found = validate(data);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      /** @type {HTMLElement | null} */ (form.elements.namedItem(first))?.focus();
      return;
    }

    setStatus("sending");
    try {
      if (!ACCESS_KEY) throw new Error("VITE_WEB3FORMS_KEY is not set");
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...data,
          access_key: ACCESS_KEY,
          subject: `${data.topic}: a message from ${data.name}`,
          from_name: data.name,
        }),
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setStatus("success");
      form.reset();
    } catch (error) {
      if (import.meta.env.DEV) console.error("Contact form:", error);
      setStatus("error");
    }
  }

  /** @param {"name" | "email" | "message"} field */
  const describedBy = (field) => (errors[field] ? `contact-${field}-error` : undefined);

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={submit}
      onFocusCapture={loadCaptcha}
      className="flex flex-col gap-5"
    >
      <Field label="Name" error={errors.name} id="contact-name">
        <input
          id="contact-name"
          name="name"
          autoComplete="name"
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={describedBy("name")}
          className={cx(FIELD, "h-12")}
        />
      </Field>
      <Field label="Email" error={errors.email} id="contact-email">
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={describedBy("email")}
          className={cx(FIELD, "h-12")}
        />
      </Field>
      <Field label="Subject" id="contact-topic">
        <select id="contact-topic" name="topic" className={cx(FIELD, "h-12")}>
          {subjects.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Message" error={errors.message} id="contact-message">
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          aria-invalid={errors.message ? true : undefined}
          aria-describedby={describedBy("message")}
          className={cx(FIELD, "h-32 resize-y py-3")}
        />
      </Field>

      {/* Honeypot: hidden from people, tempting to bots. */}
      <input type="checkbox" name="botcheck" tabIndex={-1} aria-hidden="true" className="hidden" />
      <div className="h-captcha" data-captcha="true" />

      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          altLabel="Sending…"
          rolled={status === "sending"}
          disabled={status === "sending"}
          arrow
        >
          Send message
        </Button>
      </div>

      <p role="status" aria-live="polite" className="text-body-s">
        {status === "sending" && "Sending your message…"}
        {status === "success" && "Thank you! Your message is on its way. I will reply soon."}
        {status === "error" && (
          <>
            Sorry, the message could not be sent. Please try again, or email me at{" "}
            <a
              href={`mailto:${email}`}
              className="underline underline-offset-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              {email}
            </a>
            .
          </>
        )}
      </p>
    </form>
  );
}

/**
 * A visible label above a control, with its error message below.
 * @param {{ label: string, id: string, error?: string, children: import("react").ReactNode }} props
 */
function Field({ label, id, error, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="mono-label text-ink-muted">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-body-s text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
