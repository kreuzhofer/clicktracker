import React from 'react'
import {
  BottomNavigation as MuiBottomNavigation,
  BottomNavigationAction,
  Paper,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import {
  Dashboard as DashboardIcon,
  Campaign as CampaignIcon,
  Analytics as AnalyticsIcon,
  Link as LinkIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'

interface BottomNavigationItem {
  label: string
  icon: React.ReactNode
  path: string
}

const navigationItems: BottomNavigationItem[] = [
  {
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/',
  },
  {
    label: 'Campaigns',
    icon: <CampaignIcon />,
    path: '/campaigns',
  },
  {
    label: 'Links',
    icon: <LinkIcon />,
    path: '/links',
  },
  {
    label: 'Analytics',
    icon: <AnalyticsIcon />,
    path: '/analytics',
  },
]

export const BottomNavigation: React.FC = () => {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Only show on mobile devices
  if (!isMobile) {
    return null
  }

  const getCurrentValue = () => {
    const currentPath = location.pathname
    const activeItem = navigationItems.find(item => {
      if (item.path === '/') {
        return currentPath === '/'
      }
      return currentPath.startsWith(item.path)
    })
    return activeItem ? navigationItems.indexOf(activeItem) : 0
  }

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    const selectedItem = navigationItems[newValue]
    if (selectedItem) {
      navigate(selectedItem.path)
    }
  }

  return (
    <Paper
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: theme.zIndex.appBar,
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
      elevation={8}
    >
      <MuiBottomNavigation
        value={getCurrentValue()}
        onChange={handleChange}
        sx={{
          height: 64, // Comfortable touch target height
          '& .MuiBottomNavigationAction-root': {
            minWidth: 'auto',
            padding: '6px 12px 8px',
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            },
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.75rem',
            '&.Mui-selected': {
              fontSize: '0.75rem',
            },
          },
        }}
      >
        {navigationItems.map((item, index) => (
          <BottomNavigationAction
            key={index}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </MuiBottomNavigation>
    </Paper>
  )
}