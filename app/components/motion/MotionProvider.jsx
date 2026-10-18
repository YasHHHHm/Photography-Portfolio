import { domAnimation, LazyMotion, MotionConfig } from "motion/react";

/**
 * Motion setup for the few components that animate with Motion (mobile
 * menu, lightbox, hover preview). Each of them is a lazily loaded chunk, so
 * Motion never ships on first load. Respects the visitor's reduced-motion
 * setting.
 * @param {{ children: import("react").ReactNode }} props
 */
export function MotionProvider({ children }) {
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation} strict>
        {children}
      </LazyMotion>
    </MotionConfig>
  );
}
