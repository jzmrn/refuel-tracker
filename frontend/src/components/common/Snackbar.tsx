import React, { useEffect } from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CloseIcon from "@mui/icons-material/Close";

export type SnackbarType = "success" | "error" | "warning" | "info";

interface SnackbarProps {
  message: string;
  type: "success" | "error" | "warning" | "info";
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}

const Snackbar: React.FC<SnackbarProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 5000,
  position = "top-right",
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getTypeStyles = () => {
    switch (type) {
      case "success":
        return {
          container: "snackbar-success",
          progressBar: "snackbar-progress-success",
          progressFill: "snackbar-progress-fill-success",
        };
      case "error":
        return {
          container: "snackbar-error",
          progressBar: "snackbar-progress-error",
          progressFill: "snackbar-progress-fill-error",
        };
      case "warning":
        return {
          container: "snackbar-warning",
          progressBar: "snackbar-progress-warning",
          progressFill: "snackbar-progress-fill-warning",
        };
      case "info":
        return {
          container: "snackbar-info",
          progressBar: "snackbar-progress-info",
          progressFill: "snackbar-progress-fill-info",
        };
      default:
        return {
          container: "snackbar-error",
          progressBar: "snackbar-progress-error",
          progressFill: "snackbar-progress-fill-error",
        };
    }
  };

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleOutlineIcon className="icon-sm text-current" />;
      case "error":
        return <CloseIcon className="icon-sm text-current" />;
      case "warning":
        return <WarningAmberIcon className="icon-sm text-current" />;
      case "info":
        return <CheckCircleOutlineIcon className="icon-sm text-current" />;
      default:
        return null;
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case "top-left":
        return "top-4 left-4";
      case "bottom-right":
        return "bottom-4 right-4";
      case "bottom-left":
        return "bottom-4 left-4";
      case "top-right":
      default:
        return "top-4 right-4";
    }
  };

  const styles = getTypeStyles();

  return (
    <div className={`fixed ${getPositionStyles()} z-50 max-w-md`}>
      <div className={styles.container}>
        {/* Main content */}
        <div className="px-6 py-4 flex-between relative z-10">
          <div className="flex-center">
            <div className="mr-3">{getIcon()}</div>
            <span className="text-sm font-medium">{message}</span>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-current hover:opacity-75 transition-opacity"
            aria-label="Close notification"
          >
            <svg
              className="icon-sm"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress bar integrated at the bottom */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              animationDuration: `${duration}ms`,
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default Snackbar;
