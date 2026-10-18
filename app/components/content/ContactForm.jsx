import { Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cx } from "../../lib/format.js";
import { Button } from "../ui/Button.jsx";

const ENDPOINT = "https://api.web3forms.com/submit";
const ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_KEY;
const CAPTCHA_SCRIPT = "https://web3forms.com/client/script.js";
const MIN_MESSAGE = 20;
/** Letters typed within this many ms search together ("co" → "Collaboration"). */
const TYPEAHEAD_MS = 500;

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
        <SubjectSelect id="contact-topic" name="topic" options={subjects} />
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
      <label id={`${id}-label`} htmlFor={id} className="mono-label text-ink-muted">
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

/**
 * The subject menu: a styled stand-in for <select>, built as the WAI-ARIA
 * "select-only combobox". Focus stays on the button while the list is open.
 * Arrow keys, Home and End move through the subjects and typing a letter
 * jumps to one; Enter, Space or Tab picks it and Escape closes the list. A
 * hidden input carries the choice into the form data, and resetting the form
 * brings back the first subject.
 *
 * @param {object} props
 * @param {string} props.id  The button's id; the Field's label is `${id}-label`
 * @param {string} props.name  The form field it fills in
 * @param {string[]} props.options
 */
function SubjectSelect({ id, name, options }) {
  const [value, setValue] = useState(options[0] ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  /** @type {import("react").RefObject<HTMLInputElement | null>} */
  const inputRef = useRef(null);
  /** @type {import("react").RefObject<HTMLUListElement | null>} */
  const listRef = useRef(null);
  const typed = useRef({ text: "", time: 0 });
  const last = options.length - 1;
  const selected = Math.max(0, options.indexOf(value));
  const optionId = (/** @type {number} */ i) => `${id}-option-${i}`;

  // form.reset() after a message is sent does not reach React state.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => setValue(options[0] ?? "");
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [options]);

  // A long list scrolls to keep the highlighted subject in view.
  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  /** @param {number} i */
  const show = (i) => {
    setActive(i);
    setOpen(true);
  };

  /** @param {number} i */
  const choose = (i) => {
    setValue(options[i]);
    setOpen(false);
  };

  /**
   * The next subject starting with what was typed, or -1. A new letter
   * searches from the one after the current subject, so pressing "c" again
   * steps through every subject starting with C.
   * @param {string} key
   * @param {number} from
   */
  const typeahead = (key, from) => {
    const now = Date.now();
    const recent = now - typed.current.time < TYPEAHEAD_MS ? typed.current.text : "";
    const text = recent + key.toLowerCase();
    typed.current = { text, time: now };
    const start = from + (text.length === 1 ? 1 : 0);
    for (let n = 0; n < options.length; n++) {
      const i = (start + n) % options.length;
      if (options[i].toLowerCase().startsWith(text)) return i;
    }
    return -1;
  };

  /** @param {import("react").KeyboardEvent<HTMLButtonElement>} e */
  const onKeyDown = (e) => {
    const printable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) show(selected);
      else if (e.key === "Home") show(0);
      else if (e.key === "End") show(last);
      else if (printable) {
        const i = typeahead(e.key, selected);
        if (i >= 0) show(i);
      } else return;
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowUp" && e.altKey) choose(active);
    else if (e.key === "ArrowDown") setActive(Math.min(last, active + 1));
    else if (e.key === "ArrowUp") setActive(Math.max(0, active - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(last);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Tab") {
      choose(active);
      return; // focus moves on as usual
    } else if (printable) {
      const i = typeahead(e.key, active);
      if (i >= 0) setActive(i);
    } else return;
    e.preventDefault();
  };

  return (
    <div className="relative">
      <input ref={inputRef} type="hidden" name={name} value={value} />
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? optionId(active) : undefined}
        onClick={() => (open ? setOpen(false) : show(selected))}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
        className={cx(
          FIELD,
          "flex h-12 cursor-pointer items-center justify-between gap-3 text-left",
        )}
      >
        <span className="truncate">{value}</span>
        <ChevronDown
          aria-hidden="true"
          size={18}
          strokeWidth={1.75}
          className={cx(
            "shrink-0 text-ink-muted transition-transform duration-(--dur-fast) ease-out",
            open && "rotate-180",
          )}
        />
      </button>
      {/* Pressing an option must not move focus off the button, or the list
          would close before the click lands. */}
      <ul
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        aria-labelledby={`${id}-label`}
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        className={cx(
          "absolute inset-x-0 top-full z-10 mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto rounded-inner border border-line-strong bg-surface p-1.5 transition-[opacity,transform,visibility] duration-(--dur-fast) ease-out",
          open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0",
        )}
      >
        {options.map((option, i) => (
          <li
            key={option}
            id={optionId(i)}
            role="option"
            aria-selected={option === value}
            onClick={() => choose(i)}
            onPointerMove={() => setActive(i)}
            className={cx(
              "flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-chip px-3 text-body transition-colors duration-(--dur-fast) ease-out hover:bg-surface-2",
              i === active && "bg-surface-2",
            )}
          >
            <span className="truncate">{option}</span>
            {option === value && (
              <Check aria-hidden="true" size={16} strokeWidth={1.75} className="shrink-0" />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
