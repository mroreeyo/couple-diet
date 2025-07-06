'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User, UserInsert, UserUpdate } from '@/lib/supabase'

export default function TestUserSchema() {
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [testUser, setTestUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')

  useEffect(() => {
    // Get current authenticated user
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }

    getCurrentUser()
  }, [])

  const clearMessages = () => {
    setError(null)
    setSuccess(null)
  }

  // Test: Create user profile
  const testCreateUserProfile = async () => {
    if (!currentUser) {
      setError('Please login first at /test-auth')
      return
    }

    setLoading(true)
    clearMessages()

    try {
      const newUser: UserInsert = {
        id: currentUser.id,
        email: currentUser.email || '',
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
      }

      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single()

      if (error) throw error

      setTestUser(data)
      setSuccess('User profile created successfully!')
    } catch (err: any) {
      setError(`Error creating user profile: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test: Read user profile
  const testReadUserProfile = async () => {
    if (!currentUser) {
      setError('Please login first at /test-auth')
      return
    }

    setLoading(true)
    clearMessages()

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (error) throw error

      setTestUser(data)
      setSuccess('User profile retrieved successfully!')
    } catch (err: any) {
      setError(`Error reading user profile: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test: Update user profile
  const testUpdateUserProfile = async () => {
    if (!currentUser) {
      setError('Please login first at /test-auth')
      return
    }

    setLoading(true)
    clearMessages()

    try {
      const updates: UserUpdate = {
        display_name: displayName || null,
        avatar_url: avatarUrl || null,
      }

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', currentUser.id)
        .select()
        .single()

      if (error) throw error

      setTestUser(data)
      setSuccess('User profile updated successfully!')
    } catch (err: any) {
      setError(`Error updating user profile: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test: List all users (for testing RLS)
  const testListUsers = async () => {
    setLoading(true)
    clearMessages()

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')

      if (error) throw error

      setUsers(data)
      setSuccess(`Retrieved ${data.length} users (RLS policy applied)`)
    } catch (err: any) {
      setError(`Error listing users: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            User Schema Test Page
          </h1>

          {/* Current User Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-2">
              Current Authenticated User
            </h2>
            {currentUser ? (
              <div className="text-gray-600">
                <p><strong>ID:</strong> {currentUser.id}</p>
                <p><strong>Email:</strong> {currentUser.email}</p>
              </div>
            ) : (
              <p className="text-red-600">
                No authenticated user. Please login at{' '}
                <a href="/test-auth" className="underline">
                  /test-auth
                </a>
              </p>
            )}
          </div>

          {/* Form for user data */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              User Profile Data
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter display name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter avatar URL"
                />
              </div>
            </div>
          </div>

          {/* Test buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <button
              onClick={testCreateUserProfile}
              disabled={loading}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              {loading ? 'Creating...' : 'Create Profile'}
            </button>
            <button
              onClick={testReadUserProfile}
              disabled={loading}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              {loading ? 'Reading...' : 'Read Profile'}
            </button>
            <button
              onClick={testUpdateUserProfile}
              disabled={loading}
              className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 disabled:bg-gray-300"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
            <button
              onClick={testListUsers}
              disabled={loading}
              className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:bg-gray-300"
            >
              {loading ? 'Listing...' : 'List Users'}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              <strong>Success:</strong> {success}
            </div>
          )}

          {/* Current User Profile */}
          {testUser && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Current User Profile
              </h2>
              <pre className="text-sm text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                {JSON.stringify(testUser, null, 2)}
              </pre>
            </div>
          )}

          {/* Users List */}
          {users.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Users List ({users.length} users)
              </h2>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 bg-white rounded border"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      <div>
                        <strong>ID:</strong> {user.id}
                      </div>
                      <div>
                        <strong>Email:</strong> {user.email}
                      </div>
                      <div>
                        <strong>Display Name:</strong> {user.display_name || 'None'}
                      </div>
                      <div>
                        <strong>Partner ID:</strong> {user.partner_id || 'None'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Test Instructions
            </h3>
            <ol className="list-decimal list-inside text-gray-600 space-y-1">
              <li>Make sure you're logged in at <a href="/test-auth" className="text-blue-600 underline">/test-auth</a></li>
              <li>Run the SQL schema in Supabase Dashboard first</li>
              <li>Fill in the form fields above</li>
              <li>Click "Create Profile" to create your user profile</li>
              <li>Click "Read Profile" to retrieve your profile</li>
              <li>Update the form fields and click "Update Profile" to test updates</li>
              <li>Click "List Users" to test RLS policies</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
} 