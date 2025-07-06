'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Couple, ActiveCouple, CoupleRequestResponse } from '@/types/database';

export default function TestCouplesSchema() {
  const [user, setUser] = useState<any>(null);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [activeCouples, setActiveCouples] = useState<ActiveCouple[]>([]);
  const [targetEmail, setTargetEmail] = useState('');
  const [coupleIdToAccept, setCoupleIdToAccept] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await fetchCouples();
        await fetchActiveCouples();
      }
    };
    getUser();
  }, [supabase]);

  // Test database connection
  const testConnection = async () => {
    try {
      setLoading(true);
      setError('');
      
      // First check if couples table exists
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .limit(1);
      
      if (error) {
        setError(`❌ Database connection failed: ${error.message} (Code: ${error.code})`);
        console.error('Supabase error details:', error);
        return;
      }
      
      setMessage('✅ Couples table connection successful!');
      
      // Also test if we can access the relationship_status enum
      const { data: enumData, error: enumError } = await supabase
        .rpc('sql', { query: "SELECT unnest(enum_range(NULL::relationship_status)) as status" })
        .select();
      
      if (enumError) {
        console.log('Enum test failed:', enumError);
      } else {
        console.log('Enum values:', enumData);
      }
      
    } catch (err) {
      console.error('Full error:', err);
      setError(`❌ Database connection failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch couples (all relationships user is part of)
  const fetchCouples = async () => {
    try {
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCouples(data || []);
    } catch (err) {
      setError(`Failed to fetch couples: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Fetch active couples view
  const fetchActiveCouples = async () => {
    try {
      const { data, error } = await supabase
        .from('active_couples')
        .select('*')
        .order('accepted_at', { ascending: false });
      
      if (error) throw error;
      setActiveCouples(data || []);
    } catch (err) {
      setError(`Failed to fetch active couples: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  // Send couple request
  const sendCoupleRequest = async () => {
    if (!targetEmail.trim()) {
      setError('Please enter target user email');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase
        .rpc('send_couple_request', { target_user_email: targetEmail });
      
      if (error) throw error;
      
      const response = data as CoupleRequestResponse;
      if (response.success) {
        setMessage(`✅ ${response.message}`);
        setTargetEmail('');
        await fetchCouples();
      } else {
        setError(`❌ ${response.message}`);
      }
    } catch (err) {
      setError(`Failed to send couple request: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Accept couple request
  const acceptCoupleRequest = async () => {
    if (!coupleIdToAccept.trim()) {
      setError('Please enter couple ID to accept');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase
        .rpc('accept_couple_request', { couple_id: coupleIdToAccept });
      
      if (error) throw error;
      
      const response = data as CoupleRequestResponse;
      if (response.success) {
        setMessage(`✅ ${response.message}`);
        setCoupleIdToAccept('');
        await fetchCouples();
        await fetchActiveCouples();
      } else {
        setError(`❌ ${response.message}`);
      }
    } catch (err) {
      setError(`Failed to accept couple request: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Update couple status
  const updateCoupleStatus = async (coupleId: string, newStatus: 'inactive' | 'blocked') => {
    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase
        .from('couples')
        .update({ relationship_status: newStatus })
        .eq('id', coupleId);
      
      if (error) throw error;
      
      setMessage(`✅ Couple relationship set to ${newStatus}`);
      await fetchCouples();
      await fetchActiveCouples();
    } catch (err) {
      setError(`Failed to update couple status: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Delete couple record
  const deleteCoupleRecord = async (coupleId: string) => {
    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase
        .from('couples')
        .delete()
        .eq('id', coupleId);
      
      if (error) throw error;
      
      setMessage('✅ Couple record deleted successfully');
      await fetchCouples();
      await fetchActiveCouples();
    } catch (err) {
      setError(`Failed to delete couple record: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'inactive': return 'text-gray-600';
      case 'blocked': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Couples Schema Test</h1>
        <p className="text-red-600">Please log in to test couples schema</p>
        <a href="/test-auth" className="text-blue-600 underline">Go to Auth Test</a>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Couples Schema Test</h1>
      
      <div className="mb-6 p-4 bg-black text-white rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Current User</h2>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>ID:</strong> {user.id}</p>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg">
          {message}
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {/* Test Connection */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">1. Test Database Connection</h2>
        <button
          onClick={testConnection}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {/* Send Couple Request */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">2. Send Couple Request</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="email"
            placeholder="Target user email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={sendCoupleRequest}
            disabled={loading || !targetEmail.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Request'}
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Enter the email of the user you want to connect with as a couple
        </p>
      </div>

      {/* Accept Couple Request */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">3. Accept Couple Request</h2>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Couple ID to accept"
            value={coupleIdToAccept}
            onChange={(e) => setCoupleIdToAccept(e.target.value)}
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={acceptCoupleRequest}
            disabled={loading || !coupleIdToAccept.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Accepting...' : 'Accept Request'}
          </button>
        </div>
        <p className="text-sm text-gray-600">
          Copy the couple ID from the pending requests below
        </p>
      </div>

      {/* All Couples */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">4. All Couple Relationships</h2>
        <button
          onClick={fetchCouples}
          disabled={loading}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        
        {couples.length === 0 ? (
          <p className="text-gray-600">No couple relationships found</p>
        ) : (
          <div className="space-y-2">
            {couples.map((couple) => (
              <div key={couple.id} className="p-3 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <p><strong>ID:</strong> {couple.id}</p>
                    <p><strong>User 1:</strong> {couple.user1_id}</p>
                    <p><strong>User 2:</strong> {couple.user2_id}</p>
                    <p><strong>Status:</strong> <span className={getStatusColor(couple.relationship_status)}>{couple.relationship_status}</span></p>
                    <p><strong>Requested By:</strong> {couple.requested_by}</p>
                    <p><strong>Requested At:</strong> {new Date(couple.requested_at).toLocaleString()}</p>
                    {couple.accepted_at && (
                      <p><strong>Accepted At:</strong> {new Date(couple.accepted_at).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {couple.relationship_status === 'active' && (
                      <>
                        <button
                          onClick={() => updateCoupleStatus(couple.id, 'inactive')}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                        >
                          Deactivate
                        </button>
                        <button
                          onClick={() => updateCoupleStatus(couple.id, 'blocked')}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Block
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => deleteCoupleRecord(couple.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Couples View */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">5. Active Couples View</h2>
        <button
          onClick={fetchActiveCouples}
          disabled={loading}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Active Couples'}
        </button>
        
        {activeCouples.length === 0 ? (
          <p className="text-gray-600">No active couple relationships found</p>
        ) : (
          <div className="space-y-2">
            {activeCouples.map((couple) => (
              <div key={couple.id} className="p-3 border rounded-lg bg-green-50 text-black">
                <p><strong>Couple ID:</strong> {couple.id}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <h4 className="font-medium">User 1:</h4>
                    <p>Email: {couple.user1_email}</p>
                    <p>Name: {couple.user1_display_name || 'Not set'}</p>
                    <p>ID: {couple.user1_id}</p>
                  </div>
                  <div>
                    <h4 className="font-medium">User 2:</h4>
                    <p>Email: {couple.user2_email}</p>
                    <p>Name: {couple.user2_display_name || 'Not set'}</p>
                    <p>ID: {couple.user2_id}</p>
                  </div>
                </div>
                <p className="mt-2"><strong>Connected Since:</strong> {new Date(couple.accepted_at || couple.requested_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Test Instructions */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-black">Test Instructions</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm text-black">
          <li>Test database connection first</li>
          <li>Create another test user account (different email)</li>
          <li>Send couple request to the other user's email</li>
          <li>Log in as the other user and accept the request</li>
          <li>Check that both users' partner_id fields are updated</li>
          <li>Verify RLS policies prevent unauthorized access</li>
          <li>Test status changes (inactive, blocked)</li>
          <li>Verify active couples view works correctly</li>
        </ol>
      </div>
    </div>
  );
} 