import CircularProgress from "@mui/material/CircularProgress";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface FavoriteToggleButtonProps {
  isFavorite: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  isLoading?: boolean;
  size?: "sm" | "md";
}

export default function FavoriteToggleButton({
  isFavorite,
  onAdd,
  onRemove,
  isLoading = false,
  size = "sm",
}: FavoriteToggleButtonProps) {
  const { t } = useTranslation();

  if (!onAdd && !onRemove) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLoading) return;
    if (isFavorite && onRemove) {
      onRemove();
    } else if (!isFavorite && onAdd) {
      onAdd();
    }
  };

  const className =
    size === "md"
      ? isFavorite
        ? "btn-icon"
        : "btn-icon"
      : isFavorite
      ? "btn-sm-secondary"
      : "btn-sm-primary";

  return (
    <button
      onClick={handleClick}
      className={className}
      title={
        isFavorite
          ? t.fuelPrices.removeFromFavorites
          : t.fuelPrices.addToFavorites
      }
      disabled={isLoading}
    >
      {isLoading ? (
        <CircularProgress
          size={size === "md" ? 20 : 16}
          sx={{ color: "currentColor" }}
        />
      ) : isFavorite ? (
        "★"
      ) : (
        "☆"
      )}
    </button>
  );
}
