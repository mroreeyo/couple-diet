'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestSupabasePage() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [projectInfo, setProjectInfo] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        // Test basic connection by checking auth status
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        
        if (authError) {
          throw authError
        }

        // Test database connection by attempting to query
        const { data, error: dbError } = await supabase
          .from('users') // This will fail if table doesn't exist, but connection works
          .select('*')
          .limit(1)

        // Even if query fails due to missing table, if error is about missing table, connection is OK
        if (dbError && !dbError.message.includes('relation "public.users" does not exist')) {
          throw dbError
        }

        setConnectionStatus('connected')
        setProjectInfo({
          authSession: session ? 'Session exists' : 'No active session',
          databaseAccess: dbError?.message.includes('does not exist') ? 'Connected (tables not created yet)' : 'Connected',
        })
      } catch (err: any) {
        setConnectionStatus('error')
        setError(err.message || 'Unknown error')
      }
    }

    testConnection()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Supabase Connection Test
          </h1>
          
          <div className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-3">
              <span className="font-medium">Connection Status:</span>
              {connectionStatus === 'loading' && (
                <span className="text-yellow-600">🔄 Testing...</span>
              )}
              {connectionStatus === 'connected' && (
                <span className="text-green-600">✅ Connected</span>
              )}
              {connectionStatus === 'error' && (
                <span className="text-red-600">❌ Error</span>
              )}
            </div>

            {/* Project Info */}
            {projectInfo && (
              <div className="bg-green-50 border border-green-200 rounded p-4">
                <h3 className="font-medium text-green-800 mb-2">Connection Details:</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Auth Status: {projectInfo.authSession}</li>
                  <li>• Database: {projectInfo.databaseAccess}</li>
                </ul>
              </div>
            )}

            {/* Error Details */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-4">
                <h3 className="font-medium text-red-800 mb-2">Error Details:</h3>
                <pre className="text-sm text-red-700 whitespace-pre-wrap">
                  {error}
                </pre>
                <div className="mt-3 text-sm text-red-600">
                  <p>Common issues:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Check if NEXT_PUBLIC_SUPABASE_URL is correct</li>
                    <li>Check if NEXT_PUBLIC_SUPABASE_ANON_KEY is correct</li>
                    <li>Verify .env.local file exists and has correct values</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Environment Check */}
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <h3 className="font-medium text-blue-800 mb-2">Environment Variables:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</li>
                <li>• Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 