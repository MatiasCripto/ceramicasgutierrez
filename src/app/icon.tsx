import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default async function Icon() {
  const logoPath = join(process.cwd(), 'public/logo1.png')
  const logoSrc = `data:image/png;base64,${(await readFile(logoPath)).toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          overflow: 'hidden',
          borderRadius: '50%',
        }}
      >
        <img
          src={logoSrc}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    ),
    { ...size }
  )
}
