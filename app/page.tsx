import { Suspense } from "react";

import { WelcomeScreen } from "@/components/welcome-screen";

export default function Home() {
  return (
    <div className="min-h-screen animate-fade-in">
      <Suspense fallback={null}>
        <WelcomeScreen />
      </Suspense>
    </div>
  );
}
