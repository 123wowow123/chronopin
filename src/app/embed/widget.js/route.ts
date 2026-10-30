import { widgetLoaderScript } from '@/lib/widget';

// The script a blog includes to turn <div class="chronopin-embed" data-pin="123">
// into the pin widget (docs: /embed).
export function GET() {
  return new Response(widgetLoaderScript(), {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
