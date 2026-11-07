import { NavLink, Outlet } from 'react-router-dom';
import { AppRoutes } from './router';

const navItems = [
  { to: '/', icon: '⌂', label: '首页' },
  { to: '/inventory', icon: '▦', label: '库存' },
  { to: '/recipes', icon: '◫', label: '菜谱', upcoming: true },
  { to: '/settings', icon: '○', label: '我的' },
];

function Layout() {
  return <div className="app-shell">
    <main className="app-content"><Outlet /></main>
    <nav className="bottom-nav" aria-label="主导航">
      {navItems.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
        <span className="nav-icon" aria-hidden>{item.icon}</span><span>{item.label}</span>
        {item.upcoming && <span className="upcoming">即将推出</span>}
      </NavLink>)}
    </nav>
  </div>;
}

export function App() { return <AppRoutes layout={<Layout />} />; }
