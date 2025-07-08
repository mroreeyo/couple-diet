import { NextResponse } from 'next/server'

export async function GET() {
  // 개발 환경에서만 작동
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development' },
      { status: 403 }
    )
  }

  const envStatus = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      sample: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...' || 'N/A'
    },
    NEXT_PUBLIC_SUPABASE_ANON_KEY: {
      exists: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      sample: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 10) + '...' || 'N/A'
    },
    SUPABASE_SERVICE_ROLE_KEY: {
      exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      sample: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10) + '...' || 'N/A'
    },
    GOOGLE_API_KEY: {
      exists: !!process.env.GOOGLE_API_KEY,
      length: process.env.GOOGLE_API_KEY?.length || 0,
      sample: process.env.GOOGLE_API_KEY?.substring(0, 10) + '...' || 'N/A',
      startsWithAI: process.env.GOOGLE_API_KEY?.startsWith('AIzaSy') || false
    }
  }

  return NextResponse.json({
    message: 'Environment variables status',
    timestamp: new Date().toISOString(),
    env: envStatus
  })
} 