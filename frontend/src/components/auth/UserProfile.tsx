import { useUser } from "@/lib/auth/UserContext";

export default function UserProfile() {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400"></div>
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
