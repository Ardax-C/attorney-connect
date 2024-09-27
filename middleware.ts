import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: '/:path*',
};

export default function middleware(req: NextRequest) {
  const country = req.geo?.country || 'XX';
  
  // Allow access for US and Canada
  if (country === 'US' || country === 'CA') {
    return NextResponse.next();
  }
  
  // Block access for other countries
  return new NextResponse('Access denied', { status: 403 });
}