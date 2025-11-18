import React, { useState } from 'react';
import * as api from '../services/api';
import { useSession } from '../context/SessionContext';

export const Login: React.FC = () => {
  const { login } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const sessionData = await api.loginUser(username, password);
      login(sessionData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-800">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-gray-900 rounded-2xl shadow-xl">
        <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Learning Platform</h1>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Please sign in to your account</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
                <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
             <div>
                {/* FIX: Corrected typo from `c lassName` to `className`. */}
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

            {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-900 transition-transform transform hover:scale-105 disabled:bg-blue-400 disabled:cursor-wait"
            >
                {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
        </form>
      </div>
    </div>
  );
};
