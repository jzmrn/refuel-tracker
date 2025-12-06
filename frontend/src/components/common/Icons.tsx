import React from "react";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BarChartIcon from "@mui/icons-material/BarChart";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import MuiTrendingUpIcon from "@mui/icons-material/TrendingUp";
import MuiTrendingDownIcon from "@mui/icons-material/TrendingDown";
import NumbersIcon from "@mui/icons-material/Numbers";
import CloseIcon from "@mui/icons-material/Close";
import CollectionsIcon from "@mui/icons-material/Collections";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import MuiEditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import ScienceIcon from "@mui/icons-material/Science";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import PeopleIcon from "@mui/icons-material/People";

// Common icon interface
interface IconProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  color?:
    | "blue"
    | "green"
    | "red"
    | "yellow"
    | "purple"
    | "indigo"
    | "orange"
    | "gray"
    | "current";
}

const getIconSize = (size: IconProps["size"] = "md") => {
  switch (size) {
    case "sm":
      return "icon-sm";
    case "md":
      return "icon-md";
    case "lg":
      return "icon-lg";
    case "xl":
      return "icon-xl";
    default:
      return "icon-md";
  }
};

const getIconColor = (color: IconProps["color"] = "current") => {
  switch (color) {
    case "blue":
      return "text-blue-600 dark:text-blue-400";
    case "green":
      return "text-green-600 dark:text-green-400";
    case "red":
      return "text-red-600 dark:text-red-400";
    case "yellow":
      return "text-yellow-600 dark:text-yellow-400";
    case "purple":
      return "text-purple-600 dark:text-purple-400";
    case "indigo":
      return "text-indigo-600 dark:text-indigo-400";
    case "orange":
      return "text-orange-600 dark:text-orange-400";
    case "gray":
      return "text-gray-600 dark:text-gray-400";
    case "current":
    default:
      return "text-current";
  }
};

// Clock Icon - Used for time tracking
export const ClockIcon = ({ className = "", size, color }: IconProps) => (
  <AccessTimeIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Chart/Statistics Icon
export const ChartIcon = ({ className = "", size, color }: IconProps) => (
  <BarChartIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Tag/Label Icon
export const TagIcon = ({ className = "", size, color }: IconProps) => (
  <LocalOfferIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Check Circle Icon - For completed items
export const CheckCircleIcon = ({ className = "", size, color }: IconProps) => (
  <CheckCircleOutlineIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Trending Up Icon - For max/high values
export const TrendingUpIcon = ({ className = "", size, color }: IconProps) => (
  <MuiTrendingUpIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Trending Down Icon - For min/low values
export const TrendingDownIcon = ({
  className = "",
  size,
  color,
}: IconProps) => (
  <MuiTrendingDownIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Hash Icon - For counts/entries
export const HashIcon = ({ className = "", size, color }: IconProps) => (
  <NumbersIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Close/X Icon - For dismiss actions
export const XIcon = ({ className = "", size, color }: IconProps) => (
  <CloseIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Collection Icon - For groups/collections
export const CollectionIcon = ({ className = "", size, color }: IconProps) => (
  <CollectionsIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Warning Triangle Icon
export const WarningIcon = ({ className = "", size, color }: IconProps) => (
  <WarningAmberIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Edit Icon
export const EditIcon = ({ className = "", size, color }: IconProps) => (
  <MuiEditIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Delete/Trash Icon
export const TrashIcon = ({ className = "", size, color }: IconProps) => (
  <DeleteIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Currency/Dollar Icon - For financial data
export const CurrencyIcon = ({ className = "", size, color }: IconProps) => (
  <AttachMoneyIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Beaker/Flask Icon - For fuel/liquids
export const BeakerIcon = ({ className = "", size, color }: IconProps) => (
  <ScienceIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Car Icon - For vehicles
export const CarIcon = ({ className = "", size, color }: IconProps) => (
  <DirectionsCarIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);

// Users/Share Icon - For sharing features
export const UsersIcon = ({ className = "", size, color }: IconProps) => (
  <PeopleIcon
    className={`${getIconSize(size)} ${getIconColor(color)} ${className}`}
  />
);
