import { FC, ReactNode } from "react";

interface ModalProps {
  open?: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
}

const Modal: FC<ModalProps> = ({ open = true, title, children, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="
          bg-[#0d0d0d] text-white rounded-2xl
          w-[70vw] h-[70vh]
          relative overflow-hidden
          border border-white/10
          shadow-[0_0_30px_rgba(0,0,0,0.8)]
        "
      >
        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl z-50"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Title */}
        {title && (
          <h2 className="absolute top-4 left-6 text-xl font-semibold text-white/90">
            {title}
          </h2>
        )}

        {/* Content */}
        <div className="w-full h-full pt-16">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
