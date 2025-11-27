import { useUser } from "@/lib/auth/UserContext";

export default function UserProfile() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-400"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative ml-3 flex-shrink-0" title={user.name}>
      {user.picture ? (
        <img
          className="h-8 w-8 rounded-full object-cover"
          src={user.picture}
          alt={user.name}
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center">
          <span className="text-sm font-medium text-white">
            {user.name.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}
