"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/context/auth-context-v2"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield } from "lucide-react"

export default function SettingsPage() {
  const { user, updateProfile } = useAuth()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update profile
      await updateProfile({
        displayName: formData.displayName,
      })

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)

    try {
      // Validate passwords
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error("Passwords do not match")
      }

      if (formData.newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters")
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Password Updated",
        description: "Your password has been updated successfully.",
      })

      // Reset password fields
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }))
    } catch (error) {
      toast({
        title: "Update Failed",
        description: (error as Error).message || "Failed to update password. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Settings</h3>
        <p className="text-sm text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        <TabsContent value="profile" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your public profile information</CardDescription>
            </CardHeader>
            <form onSubmit={handleProfileUpdate}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="Your display name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Your email"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    Your email address is used for login and cannot be changed.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update Profile"}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="security" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Change your password</CardDescription>
            </CardHeader>
            <form onSubmit={handlePasswordChange}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    placeholder="Your current password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    placeholder="Your new password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your new password"
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Change Password"}
                </Button>
              </CardFooter>
            </form>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Authenticator App</p>
                  <p className="text-sm text-muted-foreground">Use an authenticator app to generate one-time codes</p>
                </div>
                <Button variant="outline">Enable</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">SMS Recovery</p>
                  <p className="text-sm text-muted-foreground">Use your phone number for recovery</p>
                </div>
                <Button variant="outline">Enable</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                  <span className="absolute h-4 w-4 rounded-full bg-white translate-x-6"></span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Transaction Updates</p>
                  <p className="text-sm text-muted-foreground">Get notified about transaction status changes</p>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                  <span className="absolute h-4 w-4 rounded-full bg-white translate-x-6"></span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-muted-foreground">Receive promotional emails and updates</p>
                </div>
                <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                  <span className="absolute h-4 w-4 rounded-full bg-white translate-x-1"></span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Preferences</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Developer Mode - Temporary Admin Toggle */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="mt-6 border-dashed border-2 border-yellow-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-yellow-600" />
              Developer Mode
            </CardTitle>
            <CardDescription>
              Development-only settings for testing admin features
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                This section is only visible in development mode and will not appear in production.
              </AlertDescription>
            </Alert>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="admin-toggle">Admin Access</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle admin privileges for testing KYC admin dashboard
                </p>
              </div>
              <Switch
                id="admin-toggle"
                checked={user?.isAdmin || false}
                onCheckedChange={async (checked) => {
                  try {
                    // For development testing, update localStorage directly
                    const storedProfile = localStorage.getItem('clearhold_user_profile')
                    if (storedProfile) {
                      const profile = JSON.parse(storedProfile)
                      profile.isAdmin = checked
                      localStorage.setItem('clearhold_user_profile', JSON.stringify(profile))
                      
                      toast({
                        title: checked ? "Admin access enabled" : "Admin access disabled",
                        description: checked 
                          ? "You now have access to admin features" 
                          : "Admin features have been disabled",
                      })
                      
                      // Reload the page to refresh the navigation and auth state
                      setTimeout(() => {
                        window.location.reload()
                      }, 500)
                    }
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to update admin status",
                      variant: "destructive",
                    })
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
