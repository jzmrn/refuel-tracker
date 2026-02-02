import React from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Panel from "@/components/common/Panel";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { CarAccessUser } from "@/lib/api";

interface SharedUsersPanelProps {
  sharedUsers: CarAccessUser[];
  onAddSharedUsers: () => void;
  onRemoveUser: (userId: string) => void;
  isRemoving?: boolean;
}

const SharedUsersPanel: React.FC<SharedUsersPanelProps> = ({
  sharedUsers,
  onAddSharedUsers,
  onRemoveUser,
  isRemoving = false,
}) => {
  const { t } = useTranslation();

  return (
    <Panel
      title={t.cars.sharedWith}
      actions={
        <button
          onClick={onAddSharedUsers}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={t.cars.addSharedUsers}
        >
          <AddIcon className="icon text-gray-600 dark:text-gray-400" />
        </button>
      }
    >
      {sharedUsers && sharedUsers.length > 0 ? (
        <div className="space-y-3">
          {sharedUsers.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {user.user_name}
                </div>
                <div className="text-sm text-secondary">{user.user_email}</div>
              </div>
              <button
                onClick={() => onRemoveUser(user.user_id)}
                disabled={isRemoving}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                aria-label={t.cars.removeAccess}
              >
                <DeleteIcon className="icon" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-secondary text-sm">{t.cars.noSharedAccess}</p>
      )}
    </Panel>
  );
};

export default SharedUsersPanel;
