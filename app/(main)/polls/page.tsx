import { redirect } from 'next/navigation';

export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Polls Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View and manage your polls
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Placeholder for poll cards */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">No polls yet</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Create your first poll to get started
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
