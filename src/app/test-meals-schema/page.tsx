'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Meal, MealInsert, MealUpdate, MealType, DailyMealSummary } from '@/lib/supabase'

export default function TestMealsSchema() {
  const [meals, setMeals] = useState<Meal[]>([])
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [testMeal, setTestMeal] = useState<Meal | null>(null)
  const [dailySummary, setDailySummary] = useState<DailyMealSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [mealName, setMealName] = useState('')
  const [calories, setCalories] = useState('')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [photoUrl, setPhotoUrl] = useState('')
  const [description, setDescription] = useState('')
  const [mealDate, setMealDate] = useState(new Date().toISOString().split('T')[0])

  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

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

  // Test: Create meal
  const testCreateMeal = async () => {
    if (!currentUser) {
      setError('Please login first at /test-auth')
      return
    }

    setLoading(true)
    clearMessages()

    try {
      const newMeal: MealInsert = {
        user_id: currentUser.id,
        meal_name: mealName,
        calories: calories ? parseInt(calories) : null,
        meal_type: mealType,
        photo_url: photoUrl || null,
        description: description || null,
        meal_date: mealDate,
      }

      const { data, error } = await supabase
        .from('meals')
        .insert([newMeal])
        .select()
        .single()

      if (error) throw error

      setTestMeal(data)
      setSuccess('Meal created successfully!')
    } catch (err: any) {
      setError(`Error creating meal: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test: Read meals
  const testReadMeals = async () => {
    if (!currentUser) {
      setError('Please login first at /test-auth')
      return
    }

    setLoading(true)
    clearMessages()

    try {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setMeals(data)
      setSuccess(`Retrieved ${data.length} meals`)
    } catch (err: any) {
      setError(`Error reading meals: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test: Update meal
  const testUpdateMeal = async () => {
    if (!currentUser || !testMeal) {
      setError('Please create a meal first')
      return
    }

    setLoading(true)
    clearMessages()

    try {
      const updates: MealUpdate = {
        meal_name: mealName,
        calories: calories ? parseInt(calories) : null,
        meal_type: mealType,
        photo_url: photoUrl || null,
        description: description || null,
        meal_date: mealDate,
      }

      const { data, error } = await supabase
        .from('meals')
        .update(updates)
        .eq('id', testMeal.id)
        .select()
        .single()

      if (error) throw error

      setTestMeal(data)
      setSuccess('Meal updated successfully!')
    } catch (err: any) {
      setError(`Error updating meal: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test: Delete meal
  const testDeleteMeal = async () => {
    if (!currentUser || !testMeal) {
      setError('Please create a meal first')
      return
    }

    setLoading(true)
    clearMessages()

    try {
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', testMeal.id)

      if (error) throw error

      setTestMeal(null)
      setSuccess('Meal deleted successfully!')
    } catch (err: any) {
      setError(`Error deleting meal: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Test: Get daily summary
  const testGetDailySummary = async () => {
    if (!currentUser) {
      setError('Please login first at /test-auth')
      return
    }

    setLoading(true)
    clearMessages()

    try {
      const { data, error } = await supabase
        .from('daily_meal_summary')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('meal_date', { ascending: false })

      if (error) throw error

      setDailySummary(data)
      setSuccess(`Retrieved ${data.length} daily summaries`)
    } catch (err: any) {
      setError(`Error getting daily summary: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            Meals Schema Test Page
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

          {/* Form for meal data */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Meal Data
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Name *
                </label>
                <input
                  type="text"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter meal name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calories
                </label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter calories"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Type *
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                >
                  {mealTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter photo URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Date
                </label>
                <input
                  type="date"
                  value={mealDate}
                  onChange={(e) => setMealDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  placeholder="Enter description"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Test buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <button
              onClick={testCreateMeal}
              disabled={loading}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 disabled:bg-gray-300"
            >
              {loading ? 'Creating...' : 'Create Meal'}
            </button>
            <button
              onClick={testReadMeals}
              disabled={loading}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 disabled:bg-gray-300"
            >
              {loading ? 'Reading...' : 'Read Meals'}
            </button>
            <button
              onClick={testUpdateMeal}
              disabled={loading}
              className="bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 disabled:bg-gray-300"
            >
              {loading ? 'Updating...' : 'Update Meal'}
            </button>
            <button
              onClick={testDeleteMeal}
              disabled={loading}
              className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 disabled:bg-gray-300"
            >
              {loading ? 'Deleting...' : 'Delete Meal'}
            </button>
            <button
              onClick={testGetDailySummary}
              disabled={loading}
              className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:bg-gray-300"
            >
              {loading ? 'Loading...' : 'Daily Summary'}
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

          {/* Current Test Meal */}
          {testMeal && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Current Test Meal
              </h2>
              <pre className="text-sm text-gray-600 bg-white p-3 rounded border overflow-x-auto">
                {JSON.stringify(testMeal, null, 2)}
              </pre>
            </div>
          )}

          {/* Meals List */}
          {meals.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Meals List ({meals.length} meals)
              </h2>
              <div className="space-y-2">
                {meals.map((meal) => (
                  <div key={meal.id} className="p-3 bg-white rounded border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                      <div><strong>Name:</strong> {meal.meal_name}</div>
                      <div><strong>Calories:</strong> {meal.calories || 'N/A'}</div>
                      <div><strong>Type:</strong> {meal.meal_type}</div>
                      <div><strong>Date:</strong> {meal.meal_date}</div>
                      <div><strong>Description:</strong> {meal.description || 'None'}</div>
                      <div><strong>Photo:</strong> {meal.photo_url ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Summary */}
          {dailySummary.length > 0 && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-700 mb-2">
                Daily Meal Summary ({dailySummary.length} days)
              </h2>
              <div className="space-y-2">
                {dailySummary.map((summary, index) => (
                  <div key={index} className="p-3 bg-white rounded border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                      <div><strong>Date:</strong> {summary.meal_date}</div>
                      <div><strong>Total Meals:</strong> {summary.total_meals}</div>
                      <div><strong>Total Calories:</strong> {summary.total_calories || 'N/A'}</div>
                      <div><strong>Breakdown:</strong> B:{summary.breakfast_count} L:{summary.lunch_count} D:{summary.dinner_count} S:{summary.snack_count}</div>
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
              <li>Run the Meals SQL schema in Supabase Dashboard first</li>
              <li>Fill in the meal form fields above (meal name is required)</li>
              <li>Click "Create Meal" to create a test meal</li>
              <li>Click "Read Meals" to retrieve all your meals</li>
              <li>Update the form fields and click "Update Meal" to test updates</li>
              <li>Click "Delete Meal" to remove the test meal</li>
              <li>Click "Daily Summary" to test the daily summary view</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
} 