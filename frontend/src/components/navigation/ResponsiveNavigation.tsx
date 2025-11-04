import React, { useState } from 'react'
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material'
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Campaign as CampaignIcon,
  Analytics as AnalyticsIcon,
  Link as LinkIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'

interface NavigationItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  divider?: boolean
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/',
  },
  {
    id: 'campaigns',
    label: 'Campaigns',
    icon: <CampaignIcon />,
    path: '/campaigns',
  },
  {
    id: 'links',
    label: 'Campaign Links',
    icon: <LinkIcon />,
    path: '/links',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: <AnalyticsIcon />,
    path: '/analytics',
    divider: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
  },
]

interface ResponsiveNavigationProps {
  title?: string
}

export const ResponsiveNavigation: React.FC<ResponsiveNavigationProps> = ({
  title = 'Campaign Click Tracker',
}) => {
  const theme = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleNavigation = (path: string) => {
    navigate(path)
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  const isActivePath = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const NavigationList = () => (
    <List sx={{ pt: 0 }}>
      {navigationItems.map((item) => (
        <React.Fragment key={item.id}>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={isActivePath(item.path)}
              sx={{
                minHeight: theme.touchTargets.comfortable,
                px: 2,
                py: 1.5,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main + '20',
                  borderRight: `3px solid ${theme.palette.primary.main}`,
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.main,
                  },
                  '& .MuiListItemText-primary': {
                    color: theme.palette.primary.main,
                    fontWeight: 600,
                  },
                },
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 40,
                  color: isActivePath(item.path) 
                    ? theme.palette.primary.main 
                    : theme.palette.text.secondary,
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: isMobile ? '1rem' : '0.875rem',
                  fontWeight: isActivePath(item.path) ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
          {item.divider && <Divider sx={{ my: 1 }} />}
        </React.Fragment>
      ))}
    </List>
  )

  const MobileDrawer = () => (
    <Drawer
      variant="temporary"
      anchor="left"
      open={mobileOpen}
      onClose={handleDrawerToggle}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
      }}
      sx={{
        display: { xs: 'block', md: 'none' },
        '& .MuiDrawer-paper': {
          boxSizing: 'border-box',
          width: 280,
          backgroundColor: theme.palette.background.paper,
        },
      }}
    >
      <Box sx={{ overflow: 'auto' }}>
        {/* Drawer Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 2,
            minHeight: theme.touchTargets.spacious,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Typography variant="h6" noWrap component="div">
            {title}
          </Typography>
          <IconButton
            onClick={handleDrawerToggle}
            sx={{
              minWidth: theme.touchTargets.minimum,
              minHeight: theme.touchTargets.minimum,
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
        
        <NavigationList />
      </Box>
    </Drawer>
  )

  const DesktopNavigation = () => (
    <Box
      sx={{
        display: { xs: 'none', md: 'flex' },
        alignItems: 'center',
        gap: 1,
      }}
    >
      {navigationItems.map((item) => (
        <IconButton
          key={item.id}
          onClick={() => handleNavigation(item.path)}
          sx={{
            minWidth: theme.touchTargets.minimum,
            minHeight: theme.touchTargets.minimum,
            color: isActivePath(item.path) 
              ? theme.palette.primary.contrastText 
              : 'rgba(255, 255, 255, 0.7)',
            backgroundColor: isActivePath(item.path) 
              ? 'rgba(255, 255, 255, 0.2)' 
              : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
          title={item.label}
        >
          {item.icon}
        </IconButton>
      ))}
    </Box>
  )

  return (
    <>
      <AppBar 
        position="fixed" 
        sx={{ 
          zIndex: theme.zIndex.drawer + 1,
          backgroundColor: theme.palette.primary.main,
        }}
      >
        <Toolbar
          sx={{
            minHeight: theme.touchTargets.spacious,
            px: { xs: 2, sm: 3 },
          }}
        >
          {/* Mobile Menu Button */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{
              mr: 2,
              display: { md: 'none' },
              minWidth: theme.touchTargets.minimum,
              minHeight: theme.touchTargets.minimum,
            }}
          >
            <MenuIcon />
          </IconButton>

          {/* App Title */}
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1.1rem', sm: '1.25rem' },
              fontWeight: 600,
            }}
          >
            {title}
          </Typography>

          {/* Desktop Navigation */}
          <DesktopNavigation />
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <MobileDrawer />

      {/* Spacer for fixed AppBar */}
      <Toolbar sx={{ minHeight: theme.touchTargets.spacious }} />
    </>
  )
}