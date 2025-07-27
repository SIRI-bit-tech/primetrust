'use client'

import { 
  Home, 
  CreditCard, 
  Send, 
  History, 
  User, 
  Settings, 
  LogOut, 
  Search,
  DollarSign,
  TrendingUp,
  Receipt,
} from 'lucide-react'
import NotificationDropdown from './NotificationDropdown'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ThemeToggle } from './theme-toggle'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Virtual Cards', href: '/dashboard/cards', icon: CreditCard },
  { name: 'Transfer Money', href: '/dashboard/transfer', icon: Send },
  { name: 'Loans', href: '/dashboard/loans', icon: DollarSign },
  { name: 'Investments', href: '/dashboard/investments', icon: TrendingUp },
  { name: 'Pay Bills', href: '/dashboard/bills', icon: Receipt },
  { name: 'Transaction History', href: '/dashboard/transactions', icon: History },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { unreadCount } = useNotifications()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <SidebarProvider>
      <div className="grid w-full lg:grid-cols-[auto_1fr]">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2 px-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <span className="text-sm font-bold">P</span>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">PrimeTrust</span>
                <span className="truncate text-xs">Banking Platform</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigation.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link href={item.href}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.name}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <ThemeToggle />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions, cards..."
                    className="pl-8 w-80"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 ml-auto">
              <NotificationDropdown />
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src="" alt={user?.full_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
} 