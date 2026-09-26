import SchoolAdminBottomNav from '@/components/SchoolAdminBottomNav'
import React from 'react'

export default function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen">
      {children}
      <SchoolAdminBottomNav />
    </div>
  )
}
