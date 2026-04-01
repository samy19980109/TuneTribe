import { refreshAccessToken } from './spotify-auth'

async function fetchWithRefresh(
  url: string,
  options: RequestInit,
  token: string
): Promise<Response> {
  let response = await fetch(url, {
    ...options,
    headers: { ...options.headers as Record<string, string>, Authorization: `Bearer ${token}` },
  })

  if (response.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      response = await fetch(url, {
        ...options,
        headers: { ...options.headers as Record<string, string>, Authorization: `Bearer ${newToken}` },
      })
    }
  }

  return response
}

export async function transferPlayback(
  deviceId: string,
  token: string
): Promise<boolean> {
  try {
    const response = await fetchWithRefresh(
      'https://api.spotify.com/v1/me/player',
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [deviceId], play: false }),
      },
      token
    )
    return response.status === 204 || response.ok
  } catch {
    return false
  }
}

export async function startPlayback(
  deviceId: string,
  trackId: string,
  positionMs: number,
  token: string
): Promise<{ success: boolean }> {
  const body = JSON.stringify({
    uris: [`spotify:track:${trackId}`],
    position_ms: positionMs,
  })

  try {
    let response = await fetchWithRefresh(
      `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
      { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body },
      token
    )

    if (response.status === 204 || response.ok) {
      return { success: true }
    }

    // Device not active — transfer and retry with progressive backoff
    if (response.status === 404) {
      console.log('[TuneTribe] Device not active, transferring playback...')
      await transferPlayback(deviceId, token)

      for (const delayMs of [500, 1000, 2000]) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
        response = await fetchWithRefresh(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body },
          token
        )
        if (response.status === 204 || response.ok) {
          return { success: true }
        }
        if (response.status !== 404) break
      }
    }

    console.error('Playback API error:', response.status, await response.text())
    return { success: false }
  } catch (error) {
    console.error('Playback request failed:', error)
    return { success: false }
  }
}
