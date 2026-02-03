import { Suspense } from "react";
import { StatusDashboard } from "@/components/status-dashboard";

export default function Home() {
  return (
    <Suspense fallback={null}>
      <StatusDashboard />
    </Suspense>
  );
}
