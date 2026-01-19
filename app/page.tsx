import { Suspense } from 'react';

import { WelcomeScreen } from '@/components/welcome-screen';

export default function Home() {
  return (
    <div className="animate-fade-in min-h-screen">
      <Suspense fallback={null}>
        <WelcomeScreen />
      </Suspense>
    </div>
  );
}
