import { geolocation } from '@vercel/edge';
import type { RequestContext } from '@vercel/edge';

export const config = {
  matcher: '/:path*',
};

export default function middleware(request: Request, context: RequestContext) {
  const { country } = geolocation(request);
  
  // Allow access for US and Canada
  if (country === 'US' || country === 'CA') {
    return new Response(null, {
      status: 200,
    });
  }
  
  // Block access for other countries
  return new Response('Access denied', { status: 403 });
}