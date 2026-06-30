'use client'

import { useState } from 'react'

interface ValueIconProps {
  src: string
  title: string
}

export default function ValueIcon({ src, title }: ValueIconProps) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <span className="text-2xl font-serif text-[#F5C200]">
        {title[0]}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={title}
      className="w-full h-full object-contain p-2"
      loading="lazy"
      onError={() => setErrored(true)}
    />
  )
}
