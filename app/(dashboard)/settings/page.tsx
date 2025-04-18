"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HelpCircle } from "lucide-react"
import { useWallet } from "@/context/wallet-context"
import { useOnboarding } from "@/context/onboarding-context"

export default function SettingsPage() {
  const { isConnected, walletProvider } = useWallet()
  const { setShowOnboarding } = useOnboarding()

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-white border border-gray-200 p-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="ipfs">IPFS</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>

        {/* Profile tab content */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Manage your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Profile Settings</h3>
                  <p className="text-sm text-gray-500">
                    Update your profile information and how others see you on the platform.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security tab content */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your security settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Security Settings</h3>
                  <p className="text-sm text-gray-500">
                    Manage your password, two-factor authentication, and other security settings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications tab content */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Notification Settings</h3>
                  <p className="text-sm text-gray-500">
                    Control how and when you receive notifications about your transactions and account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallet tab content */}
        <TabsContent value="wallet">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Settings</CardTitle>
              <CardDescription>Manage your wallet connections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Wallet Configuration</h3>
                  <p className="text-sm text-gray-500">Configure your wallet connections and preferences.</p>
                  <div className="mt-4">
                    <Button asChild variant="outline">
                      <a href="/settings/wallets">Manage Wallets</a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IPFS tab content */}
        <TabsContent value="ipfs">
          <Card>
            <CardHeader>
              <CardTitle>IPFS Configuration</CardTitle>
              <CardDescription>Manage your IPFS settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">IPFS Settings</h3>
                  <p className="text-sm text-gray-500">Configure your connection to IPFS for document storage.</p>
                  <div className="mt-4">
                    <Button asChild variant="outline">
                      <a href="/settings/ipfs">Manage IPFS Settings</a>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Help tab content */}
        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle>Help & Resources</CardTitle>
              <CardDescription>Get help with using CryptoEscrow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Onboarding Tour</h3>
                <p className="text-sm text-gray-500">
                  Take a guided tour of CryptoEscrow to learn about its features and how to use them.
                </p>
                <Button onClick={() => setShowOnboarding(true)} className="bg-teal-900 hover:bg-teal-800 text-white">
                  <HelpCircle className="mr-2 h-4 w-4" /> Start Onboarding Tour
                </Button>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Documentation</h3>
                <p className="text-sm text-gray-500">
                  Read our comprehensive documentation to learn more about CryptoEscrow.
                </p>
                <Button variant="outline">View Documentation</Button>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Contact Support</h3>
                <p className="text-sm text-gray-500">Need help? Contact our support team for assistance.</p>
                <Button variant="outline">Contact Support</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
