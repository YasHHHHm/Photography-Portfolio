import { lazy, Suspense, useEffect, useRef, useState } from "react";

import { FormSkeleton } from "../skeletons/Skeletons.jsx";

const loadForm = () => import("./ContactForm.jsx");
const ContactForm = lazy(loadForm);

/**
 * The contact form's slot. The form is a lazy chunk: it loads when the
 * reader gets near it (or arrives at #contact), and a skeleton of the same
 * size holds its place until then, so nothing moves. Without JavaScript the
 * email link beside it still works.
 *
 * @param {object} props
 * @param {string} props.email
 * @param {string[]} props.subjects
 */
export function ContactSection({ email, subjects }) {
  /** @type {import("react").RefObject<HTMLDivElement | null>} */
  const ref = useRef(null);
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setWanted(true);
        observer.disconnect();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {wanted ? (
        <Suspense fallback={<FormSkeleton />}>
          <ContactForm email={email} subjects={subjects} />
        </Suspense>
      ) : (
        <FormSkeleton />
      )}
    </div>
  );
}
