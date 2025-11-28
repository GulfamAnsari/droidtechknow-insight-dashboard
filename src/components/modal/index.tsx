// src/components/ui/modal.tsx
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-lg w-[90%] max-w-3xl p-6 relative">
        {/* Close Button */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Title */}
        {title && <h2 className="text-2xl font-bold mb-4">{title}</h2>}

        {/* Content */}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
