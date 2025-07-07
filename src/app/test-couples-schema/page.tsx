'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface CoupleRecord {
  id: string;
  user1_id: string;
  user2_id: string;
  relationship_status: 'pending' | 'active' | 'inactive' | 'blocked';
  created_at: string;
  accepted_at?: string;
}

interface TestResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

export default function TestCouplesSchema() {
  const [user, setUser] = useState<User | null>(null);
  const [couples, setCouples] = useState<CoupleRecord[]>([]);
  const [targetEmail, setTargetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [testResults, setTestResults] = useState<TestResult[]>([]);

  // Add test result
  const addTestResult = useCallback((result: TestResult) => {
    setTestResults(prev => [result, ...prev.slice(0, 9)]);
  }, []);

  // Test database connection
  const testConnection = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .limit(1);
      
      if (error) {
        setError(`❌ Database connection failed: ${error.message}`);
        return;
      }
      
      setMessage('✅ Couples table connection successful!');
      addTestResult({ success: true, message: 'Database connection test passed', data: { result: data } });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`❌ Database connection failed: ${errorMessage}`);
      addTestResult({ success: false, message: `Database connection failed: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  }, [addTestResult]);

  // Fetch couples data
  const fetchCouples = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('couples')
        .select('*')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCouples(data || []);
      addTestResult({ success: true, message: 'Fetched couples data', data: { count: data?.length || 0 } });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch couples: ${errorMessage}`);
      addTestResult({ success: false, message: `Failed to fetch couples: ${errorMessage}` });
    }
  }, [user, addTestResult]);

  // Send couple request
  const sendCoupleRequest = useCallback(async () => {
    if (!targetEmail.trim()) {
      setError('Please enter target user email');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Find target user by email
      const { data: targetUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', targetEmail)
        .single();
      
      if (userError) {
        setError('User not found');
        return;
      }
      
      // Create couple request
      const { data, error } = await supabase
        .from('couples')
        .insert({
          user1_id: user?.id,
          user2_id: targetUser.id,
          relationship_status: 'pending'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setMessage('✅ Couple request sent successfully!');
      setTargetEmail('');
      await fetchCouples();
      addTestResult({ success: true, message: 'Couple request sent', data });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to send couple request: ${errorMessage}`);
      addTestResult({ success: false, message: `Failed to send couple request: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  }, [targetEmail, user, fetchCouples, addTestResult]);

  // Accept couple request
  const acceptCoupleRequest = useCallback(async (coupleId: string) => {
    try {
      setLoading(true);
      setError('');
      
      const { data, error } = await supabase
        .from('couples')
        .update({ 
          relationship_status: 'active', 
          accepted_at: new Date().toISOString() 
        })
        .eq('id', coupleId)
        .select()
        .single();
      
      if (error) throw error;
      
      setMessage('✅ Couple request accepted!');
      await fetchCouples();
      addTestResult({ success: true, message: 'Couple request accepted', data });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to accept couple request: ${errorMessage}`);
      addTestResult({ success: false, message: `Failed to accept couple request: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  }, [fetchCouples, addTestResult]);

  // Delete couple record
  const deleteCoupleRecord = useCallback(async (coupleId: string) => {
    try {
      setLoading(true);
      setError('');
      
      const { error } = await supabase
        .from('couples')
        .delete()
        .eq('id', coupleId);
      
      if (error) throw error;
      
      setMessage('✅ Couple record deleted!');
      await fetchCouples();
      addTestResult({ success: true, message: 'Couple record deleted' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to delete couple record: ${errorMessage}`);
      addTestResult({ success: false, message: `Failed to delete couple record: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  }, [fetchCouples, addTestResult]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'inactive': return 'bg-gray-500';
      case 'blocked': return 'bg-red-500';
      default: return 'bg-gray-300';
    }
  };

  // Clear results
  const clearResults = useCallback(() => {
    setTestResults([]);
    setMessage('');
    setError('');
  }, []);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Fetch couples when user changes
  useEffect(() => {
    if (user) {
      fetchCouples();
    }
  }, [user, fetchCouples]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-black mb-2">커플 스키마 테스트</h1>
        <p className="text-gray-800 text-lg">Supabase 커플 테이블 및 관계 테스트</p>
      </div>

      {/* User Info */}
      {user && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold text-black mb-4">현재 사용자</h2>
          <div className="text-black">
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-bold text-black mb-4">테스트 컨트롤</h2>
        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <label className="text-sm font-bold text-black">대상 사용자 이메일</label>
            <input
              type="email"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
              className="px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="커플 요청을 보낼 사용자 이메일"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <button
              onClick={testConnection}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? '처리 중...' : '연결 테스트'}
            </button>
            
            <button
              onClick={sendCoupleRequest}
              disabled={loading || !targetEmail.trim()}
              className="px-4 py-2 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? '처리 중...' : '커플 요청 보내기'}
            </button>
            
            <button
              onClick={fetchCouples}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white font-bold rounded-md hover:bg-purple-700 disabled:bg-gray-400"
            >
              {loading ? '처리 중...' : '커플 목록 새로고침'}
            </button>
            
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-gray-600 text-white font-bold rounded-md hover:bg-gray-700"
            >
              결과 지우기
            </button>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {message && (
        <div className="bg-green-100 border-2 border-green-300 rounded-lg p-4 shadow-md">
          <p className="text-green-800 font-bold">{message}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-2 border-red-300 rounded-lg p-4 shadow-md">
          <p className="text-red-800 font-bold">{error}</p>
        </div>
      )}

      {/* Couples List */}
      {couples.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold text-black mb-4">커플 목록</h2>
          <div className="space-y-4">
            {couples.map((couple) => (
              <div key={couple.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="text-black">
                    <p><strong>ID:</strong> {couple.id}</p>
                    <p><strong>User 1:</strong> {couple.user1_id}</p>
                    <p><strong>User 2:</strong> {couple.user2_id}</p>
                    <p><strong>생성일:</strong> {new Date(couple.created_at).toLocaleString()}</p>
                    {couple.accepted_at && (
                      <p><strong>수락일:</strong> {new Date(couple.accepted_at).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <span className={`px-2 py-1 rounded text-white text-sm ${getStatusColor(couple.relationship_status)}`}>
                      {couple.relationship_status}
                    </span>
                    {couple.relationship_status === 'pending' && couple.user2_id === user?.id && (
                      <button
                        onClick={() => acceptCoupleRequest(couple.id)}
                        disabled={loading}
                        className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                      >
                        수락
                      </button>
                    )}
                    <button
                      onClick={() => deleteCoupleRecord(couple.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:bg-gray-400"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-bold text-black mb-4">테스트 결과</h2>
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div key={index} className={`p-3 rounded-lg ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="flex justify-between items-start">
                  <span className={`font-bold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                    {result.success ? '✅' : '❌'} {result.message}
                  </span>
                  <span className="text-sm text-gray-600">
                    #{testResults.length - index}
                  </span>
                </div>
                {result.data && (
                  <pre className="mt-2 text-sm text-gray-700 bg-gray-50 p-2 rounded overflow-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage Guide */}
      <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-bold text-black mb-4">📋 사용 가이드</h2>
        <div className="space-y-3 text-base text-black">
          <p><strong className="text-blue-800">1. 연결 테스트:</strong> 먼저 데이터베이스 연결을 테스트합니다.</p>
          <p><strong className="text-blue-800">2. 커플 요청:</strong> 다른 사용자의 이메일을 입력하여 커플 요청을 보냅니다.</p>
          <p><strong className="text-blue-800">3. 요청 수락:</strong> 받은 요청을 수락하여 커플 관계를 활성화합니다.</p>
          <p><strong className="text-blue-800">4. 관계 관리:</strong> 기존 커플 관계를 조회하고 관리합니다.</p>
        </div>
      </div>
    </div>
  );
} 