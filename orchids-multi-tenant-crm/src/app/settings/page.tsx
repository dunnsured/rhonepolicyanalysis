"use client"

import { AppSidebar } from '@/components/app-sidebar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useState } from 'react'
import { Building2, User, Bell, Shield, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [companySettings, setCompanySettings] = useState({
    name: 'Acme Corp',
    email: 'contact@acmecorp.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business Ave, Suite 100',
    website: 'https://acmecorp.com',
  })

  const [profileSettings, setProfileSettings] = useState({
    name: 'John Smith',
    email: 'john@acmecorp.com',
    role: 'Admin',
  })

  const [notifications, setNotifications] = useState({
    emailDeals: true,
    emailTickets: true,
    emailPartners: false,
    browserDeals: true,
    browserTickets: true,
    browserPartners: true,
  })

  function handleSaveCompany(e: React.FormEvent) {
    e.preventDefault()
    toast.success('Company settings saved')
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    toast.success('Profile settings saved')
  }

  function handleSaveNotifications() {
    toast.success('Notification preferences saved')
  }

  return (
    <AppSidebar>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Company</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Company Information</h2>
                  <p className="text-sm text-muted-foreground">Update your company details</p>
                </div>
              </div>

              <form onSubmit={handleSaveCompany} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      value={companySettings.name}
                      onChange={(e) => setCompanySettings({ ...companySettings, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-email">Email</Label>
                    <Input
                      id="company-email"
                      type="email"
                      value={companySettings.email}
                      onChange={(e) => setCompanySettings({ ...companySettings, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-phone">Phone</Label>
                    <Input
                      id="company-phone"
                      value={companySettings.phone}
                      onChange={(e) => setCompanySettings({ ...companySettings, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company-website">Website</Label>
                    <Input
                      id="company-website"
                      value={companySettings.website}
                      onChange={(e) => setCompanySettings({ ...companySettings, website: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-address">Address</Label>
                  <Input
                    id="company-address"
                    value={companySettings.address}
                    onChange={(e) => setCompanySettings({ ...companySettings, address: e.target.value })}
                  />
                </div>
                <div className="pt-4">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Profile Settings</h2>
                  <p className="text-sm text-muted-foreground">Manage your personal information</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Full Name</Label>
                    <Input
                      id="profile-name"
                      value={profileSettings.name}
                      onChange={(e) => setProfileSettings({ ...profileSettings, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Email</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      value={profileSettings.email}
                      onChange={(e) => setProfileSettings({ ...profileSettings, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-role">Role</Label>
                  <Input
                    id="profile-role"
                    value={profileSettings.role}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Contact your administrator to change your role</p>
                </div>
                <div className="pt-4">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Notification Preferences</h2>
                  <p className="text-sm text-muted-foreground">Choose how you want to be notified</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-4">Email Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Deal Updates</p>
                        <p className="text-xs text-muted-foreground">Get notified when deals change stages</p>
                      </div>
                      <Switch
                        checked={notifications.emailDeals}
                        onCheckedChange={(v) => setNotifications({ ...notifications, emailDeals: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Ticket Assignments</p>
                        <p className="text-xs text-muted-foreground">Get notified when tickets are assigned to you</p>
                      </div>
                      <Switch
                        checked={notifications.emailTickets}
                        onCheckedChange={(v) => setNotifications({ ...notifications, emailTickets: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">New Referrals</p>
                        <p className="text-xs text-muted-foreground">Get notified when new referrals come in</p>
                      </div>
                      <Switch
                        checked={notifications.emailPartners}
                        onCheckedChange={(v) => setNotifications({ ...notifications, emailPartners: v })}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-4">Browser Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Deal Updates</p>
                        <p className="text-xs text-muted-foreground">Show browser notifications for deals</p>
                      </div>
                      <Switch
                        checked={notifications.browserDeals}
                        onCheckedChange={(v) => setNotifications({ ...notifications, browserDeals: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Ticket Assignments</p>
                        <p className="text-xs text-muted-foreground">Show browser notifications for tickets</p>
                      </div>
                      <Switch
                        checked={notifications.browserTickets}
                        onCheckedChange={(v) => setNotifications({ ...notifications, browserTickets: v })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">New Referrals</p>
                        <p className="text-xs text-muted-foreground">Show browser notifications for referrals</p>
                      </div>
                      <Switch
                        checked={notifications.browserPartners}
                        onCheckedChange={(v) => setNotifications({ ...notifications, browserPartners: v })}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveNotifications}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Security Settings</h2>
                  <p className="text-sm text-muted-foreground">Manage your account security</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium mb-4">Change Password</h3>
                  <div className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Current Password</Label>
                      <Input id="current-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" />
                    </div>
                    <Button onClick={() => toast.success('Password updated')}>
                      Update Password
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-4">Two-Factor Authentication</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add an extra layer of security to your account
                  </p>
                  <Button variant="outline" onClick={() => toast.info('2FA setup coming soon')}>
                    Enable 2FA
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-4 text-destructive">Danger Zone</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Permanently delete your account and all associated data
                  </p>
                  <Button variant="destructive" onClick={() => toast.error('This action is not available in demo mode')}>
                    Delete Account
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppSidebar>
  )
}
