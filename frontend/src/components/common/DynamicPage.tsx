import React, { Suspense } from "react";
import { useRouter } from "next/router";
import PageContainer from "./PageContainer";
import LoadingSpinner from "./LoadingSpinner";

interface DynamicPageProps {
  paramName?: string;
  children: (id: string) => React.ReactNode;
}

export default function DynamicPage({
  paramName = "id",
  children,
}: DynamicPageProps) {
  const router = useRouter();

  // Don't render children until router is ready on client
  // This prevents hydration mismatches with useSuspenseQuery hooks
  if (!router.isReady) {
    return (
      <PageContainer>
        <LoadingSpinner />
      </PageContainer>
    );
  }

  const rawValue = router.query[paramName];
  const id = typeof rawValue === "string" ? rawValue : undefined;

  return (
    <PageContainer>
      <Suspense fallback={<LoadingSpinner />}>
        {id ? children(id) : <LoadingSpinner />}
      </Suspense>
    </PageContainer>
  );
}
