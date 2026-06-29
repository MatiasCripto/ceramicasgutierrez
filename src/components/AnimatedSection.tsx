'use client'

import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
}

const directionClasses: Record<string, string> = {
  up: 'animate-fade-in-up',
  down: 'animate-fade-in-down',
  left: 'animate-fade-in-left',
  right: 'animate-fade-in-right',
  none: 'animate-fade-in',
}

export default function AnimatedSection({ children, className, delay = 0, direction = 'up' }: Props) {
  return (
    <div
      className={`${directionClasses[direction]} ${className || ''}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  )
}
