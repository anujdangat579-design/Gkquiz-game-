import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav.jsx'

export default function TabLayout() {
  return (
    <>
      {/* Extra bottom padding so page content never sits under the fixed nav bar */}
      <div style={{ paddingBottom: 78 }}>
        <Outlet />
      </div>
      <BottomNav />
    </>
  )
}
