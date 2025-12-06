import { useEffect } from "react";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";

interface FloatingActionButtonProps {
  onAddClick: () => void;
  children?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function FloatingActionButton({
  onAddClick,
  children,
  isOpen = false,
  onClose,
}: FloatingActionButtonProps) {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* FAB Button - Visible on mobile and md, hidden from lg onwards */}
      <button
        onClick={onAddClick}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 btn-primary rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-40"
        aria-label="Add new entry"
      >
        <AddIcon className="w-6 h-6" />
      </button>

      {/* Mobile/Tablet Modal - Visible on mobile and md, hidden from lg onwards */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-25 transition-opacity duration-300"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all">
                <div className="relative">
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Close"
                  >
                    <CloseIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                  <div className="max-h-[80vh] overflow-y-auto">{children}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
