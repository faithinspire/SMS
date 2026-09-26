import SchoolAdminBottomNav from '@/components/SchoolAdminBottomNav'

export default function SchoolAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <SchoolAdminBottomNav />
    </>
  )
}
