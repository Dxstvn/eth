"use client"

import { useState } from "react"
import { useAuth } from "@/context/auth-context-v2"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, User, Mail, Phone, Shield, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export function ProfileSettings() {
  const { user, updateProfile, changePassword, sendVerificationEmail } = useAuth()
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone_number: user?.phone_number || "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await updateProfile(profileData)
      toast.success("Profile updated successfully")
    } catch (error) {
      console.error("Profile update error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
    } catch (error) {
      console.error("Password change error:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendVerificationEmail = async () => {
    setLoading(true)
    try {
      await sendVerificationEmail()
    } catch (error) {
      console.error("Verification email error:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="flex-1"
                />
                {!user.emailVerified && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendVerificationEmail}
                    disabled={loading}
                  >
                    Verify Email
                  </Button>
                )}
              </div>
              {!user.emailVerified && (
                <p className="text-sm text-yellow-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Email not verified
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number</Label>
              <Input
                id="phone_number"
                type="tel"
                value={profileData.phone_number}
                onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Profile
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your account password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                required
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your account details and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">User ID</span>
            <span className="text-sm font-mono">{user.uid}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-muted-foreground">Registration Method</span>
            <span className="text-sm capitalize">{user.registrationMethod}</span>
          </div>
          {user.isAdmin && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Admin Status</span>
              <span className="text-sm flex items-center gap-1 text-green-600">
                <Shield className="h-3 w-3" />
                Administrator
              </span>
            </div>
          )}
          {user.createdAt && (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Member Since</span>
              <span className="text-sm">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}