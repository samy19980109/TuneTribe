import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: artistName } = await params;

  const searchUrl = `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(artistName)}&limit=1&fmt=json`;

  try {
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'TuneTribe/1.0 (contact@tunetribe.com)',
      },
      next: { revalidate: 3600 }
    });

    if (!searchResponse.ok) {
      throw new Error('Failed to search artist');
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.artists || searchData.artists.length === 0) {
      return NextResponse.json({ name: artistName, genres: [] });
    }

    const artist = searchData.artists[0];
    const tags = artist.tags || [];
    
    const genreTags = tags
      .filter((t: { name: string; count: number }) => t.count > 0)
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
      .map((t: { name: string }) => t.name.toLowerCase())
      .slice(0, 5);

    return NextResponse.json({
      name: artist.name,
      genres: genreTags,
    });
  } catch (error) {
    console.error('MusicBrainz API error:', error);
    return NextResponse.json({ name: artistName, genres: [] });
  }
}
