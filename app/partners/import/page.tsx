'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportPartnersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ created: number; errors?: Array<{ row: number; name: string; error: string }> } | null>(null);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/partners/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error importing partners:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Import Partners from CSV</h1>

        <div className="bg-white rounded shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">CSV Format</h2>
          <p className="text-sm text-gray-600 mb-4">
            Your CSV should have the following columns (name is required):
          </p>
          <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto">
{`name,domain,rss_url,github_org,notes
Snowflake,snowflake.com,https://www.snowflake.com/en/feed/,,Data platform
Databricks,databricks.com,https://www.databricks.com/blog/rss.xml,,`}
          </pre>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select CSV File</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-3 py-2 border rounded"
              required
            />
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={!file || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import Partners'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/partners')}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded ${result.errors && result.errors.length > 0 ? 'bg-yellow-50' : 'bg-green-50'}`}>
            <h3 className="font-semibold mb-2">
              Import Complete: {result.created} partners created
            </h3>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-yellow-800 mb-2">Errors:</p>
                <ul className="list-disc list-inside text-sm text-yellow-700">
                  {result.errors.map((error, idx) => (
                    <li key={idx}>
                      Row {error.row} ({error.name}): {error.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

