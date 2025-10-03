import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const error = searchParams.get('error')
  
  // Redirect to our custom error page with the error parameter
  const errorUrl = new URL('/auth/error', request.url)
  if (error) {
    errorUrl.searchParams.set('error', error)
  }
  
  return NextResponse.redirect(errorUrl)
}
