import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { IconButton } from "../ui/IconButton.jsx";

/**
 * Full-screen player for the showreel (a lazy chunk). The YouTube or Vimeo
 * player is created only when this opens, after the visitor pressed play,
 * so nothing from those sites loads before. Built on a modal <dialog>:
 * focus stays inside, Escape closes, focus returns to the button.
 *
 * @param {object} props
 * @param {string} props.src  The embeddable player URL
 * @param {string} props.title
 * @param {() => void} props.onClose
 */
export default function VideoDialog({ src, title, onClose }) {
  /** @type {import("react").RefObject<HTMLDialogElement | null>} */
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = /** @type {HTMLElement | null} */ (document.activeElement);
    document.documentElement.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.documentElement.style.overflow = "";
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-label={title}
      className="sheet lightbox"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="flex h-full flex-col bg-scrim text-on-photo">
        <div className="flex justify-end p-3 md:p-4">
          <IconButton label="Close the reel" onClick={onClose} autoFocus>
            <X aria-hidden="true" size={20} strokeWidth={1.75} />
          </IconButton>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-6 md:px-20">
          <iframe
            src={src}
            title={title}
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
            className="aspect-video max-h-full w-full max-w-6xl rounded-inner bg-bg"
          />
        </div>
      </div>
    </dialog>
  );
}
