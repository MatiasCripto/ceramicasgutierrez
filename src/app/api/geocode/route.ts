import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q) {
    return NextResponse.json({ error: 'Missing q parameter' }, { status: 400 })
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=ar`,
    { headers: { 'User-Agent': 'CeramicasGutierrez/1.0 (server)' } }
  )

  if (!res.ok) {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })
  }

  const data = await res.json()

  if (!data?.[0]) {
    return NextResponse.json({ error: 'Address not found' }, { status: 404 })
  }

  return NextResponse.json({
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name,
  })
}
