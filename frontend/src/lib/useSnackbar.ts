import { useState, useCallback } from "react";
import { SnackbarType } from "../components/common/Snackbar";

interface SnackbarState {
  message: string;
  type: SnackbarType;
  isVisible: boolean;
}

export const useSnackbar = () => {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    message: "",
    type: "info",
    isVisible: false,
  });

  const showSnackbar = useCallback(
    (message: string, type: SnackbarType = "info") => {
      setSnackbar({
        message,
        type,
        isVisible: true,
      });
    },
    []
  );

  const hideSnackbar = useCallback(() => {
    setSnackbar((prev) => ({
      ...prev,
      isVisible: false,
    }));
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      showSnackbar(message, "success");
    },
    [showSnackbar]
  );

  const showError = useCallback(
    (message: string) => {
      showSnackbar(message, "error");
    },
    [showSnackbar]
  );

  const showWarning = useCallback(
    (message: string) => {
      showSnackbar(message, "warning");
    },
    [showSnackbar]
  );

  const showInfo = useCallback(
    (message: string) => {
      showSnackbar(message, "info");
    },
    [showSnackbar]
  );

  return {
    snackbar,
    showSnackbar,
    hideSnackbar,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };
};
