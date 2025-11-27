import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

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
  return (
    <>
      {/* FAB Button - Visible on mobile and md, hidden from lg onwards */}
      <button
        onClick={onAddClick}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 btn-primary rounded-full shadow-lg hover:shadow-xl flex items-center justify-center z-40"
        aria-label="Add new entry"
      >
        <svg
          className="w-6 h-6 !w-6 !h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </button>

      {/* Mobile/Tablet Modal - Visible on mobile and md, hidden from lg onwards */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50 lg:hidden"
          onClose={onClose || (() => {})}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left align-middle shadow-xl transition-all">
                  <div className="relative">
                    <button
                      onClick={onClose}
                      className="absolute top-4 right-4 z-10 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg
                        className="w-5 h-5 text-gray-500 dark:text-gray-400"
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
                    <div className="max-h-[80vh] overflow-y-auto">
                      {children}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
