import { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import SignInPage from "./SignInPage";
import { LoadingSpinner } from "@/components/common";

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user } = useAuth();

  if (!user) return <SignInPage />;

  return <>{children}</>;
}
