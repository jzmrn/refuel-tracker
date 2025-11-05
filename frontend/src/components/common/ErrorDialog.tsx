interface ErrorDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onClose: () => void;
  variant?: "error" | "warning";
}

export default function ErrorDialog({
  isOpen,
  title,
  message,
  onClose,
  variant = "error",
}: ErrorDialogProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return {
          icon: (
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          ),
          iconBg: "bg-yellow-100",
        };
      case "error":
      default:
        return {
          icon: (
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          ),
          iconBg: "bg-red-100",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 p-2 rounded-full ${styles.iconBg}`}>
              {styles.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">
                {message}
              </p>
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="btn bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
