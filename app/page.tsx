import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isOnboardingComplete } from '@/lib/onboarding';

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    // Not signed in - show sign in page
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-2 text-center">PartnerOS</h1>
          <p className="text-gray-600 text-center mb-8">
            Partner Intelligence Platform
          </p>
          <div className="space-y-4">
            <Link
              href="/auth/signin"
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-center"
            >
              Sign In with Email
            </Link>
            <p className="text-sm text-gray-500 text-center">
              We'll send you a magic link to sign in
            </p>
          </div>
        </div>
      </main>
    );
  }

  // User is signed in - check onboarding status
  const onboardingComplete = await isOnboardingComplete(user.id!);

  if (!onboardingComplete) {
    // Redirect to onboarding
    redirect('/onboarding');
  }

  // Onboarding complete - show welcome dashboard
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Welcome to PartnerOS</h1>
        <p className="text-lg text-gray-600 mb-8">
          You're all set up! Here's what you can do next:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/dashboard"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Dashboard</h2>
            <p className="text-gray-600">View your partner insights and recommendations</p>
          </Link>
          <Link
            href="/partners"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Partners</h2>
            <p className="text-gray-600">Manage your partner list and RSS feeds</p>
          </Link>
          <Link
            href="/objectives"
            className="p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Objectives</h2>
            <p className="text-gray-600">Set and prioritize your partnership goals</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
