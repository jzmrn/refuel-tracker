import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { useAuth } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { clsx } from "clsx";

export default function UserProfile() {
  const { user, signOut } = useAuth();
  const { t } = useTranslation();

  if (!user) {
    return null;
  }

  return (
    <Menu as="div" className="relative ml-3 flex-shrink-0">
      <div>
        <Menu.Button className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-800 p-0 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white">
          <span className="sr-only">Open user menu</span>
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
        </Menu.Button>
      </div>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>

          <Menu.Item>
            {({ active }) => (
              <button
                onClick={signOut}
                className={clsx(
                  active ? "bg-gray-100" : "",
                  "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100",
                )}
              >
                {t.common.signOut}
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
