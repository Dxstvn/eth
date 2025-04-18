"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import Link from "next/link"
import { Wallet } from "lucide-react"
import { useWallet } from "@/context/wallet-context"

export default function SettingsPage() {
  const { isConnected, walletProvider } = useWallet()

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
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your account profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-semibold text-xl">
                  JD
                </div>
                <Button variant="outline">Change Avatar</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" defaultValue="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" defaultValue="Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john.doe@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue="+1 (555) 123-4567" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" defaultValue="Blockchain Properties LLC" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-black hover:bg-gray-800 text-white">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Change Password</h3>
                <div className="space-y-4">
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
                </div>
                <Button variant="outline">Update Password</Button>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-gray-500">Use an authenticator app to generate one-time codes</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Authentication</p>
                    <p className="text-sm text-gray-500">Receive a code via SMS to verify your identity</p>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Session Management</h3>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">You're currently signed in on these devices:</p>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Chrome on Windows</p>
                        <p className="text-xs text-gray-500">Current session • Last active: Just now</p>
                      </div>
                      <Button variant="ghost" size="sm" className="text-gray-500">
                        This Device
                      </Button>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Safari on iPhone</p>
                        <p className="text-xs text-gray-500">Last active: 2 days ago</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-red-600">
                        Sign Out
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Email Notifications</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Transaction Updates</p>
                      <p className="text-sm text-gray-500">Receive updates about your transactions</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Document Notifications</p>
                      <p className="text-sm text-gray-500">Get notified when documents are uploaded or signed</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Payment Confirmations</p>
                      <p className="text-sm text-gray-500">Receive confirmations for payments and transfers</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Marketing & Promotions</p>
                      <p className="text-sm text-gray-500">Receive news, updates, and promotional offers</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Push Notifications</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable Push Notifications</p>
                      <p className="text-sm text-gray-500">Receive notifications on your device</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Transaction Status Changes</p>
                      <p className="text-sm text-gray-500">Get notified when transaction status changes</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Deadline Reminders</p>
                      <p className="text-sm text-gray-500">Receive reminders for upcoming deadlines</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-black hover:bg-gray-800 text-white">Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallet">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Settings</CardTitle>
              <CardDescription>Manage your cryptocurrency wallet settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Connected Wallets</h3>
                <div className="space-y-2">
                  {isConnected ? (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-semibold">
                            {walletProvider === "metamask" ? "M" : "C"}
                          </div>
                          <div>
                            <p className="font-medium">
                              {walletProvider === "metamask" ? "MetaMask" : "Coinbase Wallet"}
                            </p>
                            <p className="text-xs text-gray-500">Connected • Primary</p>
                          </div>
                        </div>
                        <Button asChild variant="outline" size="sm">
                          <Link href="/settings/wallets">Manage</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-6 rounded-md text-center">
                      <p className="text-gray-500 mb-4">No wallets connected yet</p>
                      <Button asChild className="bg-teal-900 hover:bg-teal-800 text-white">
                        <Link href="/settings/wallets">Connect Wallet</Link>
                      </Button>
                    </div>
                  )}
                </div>
                <Button asChild variant="outline">
                  <Link href="/settings/wallets" className="flex items-center">
                    <Wallet className="mr-2 h-4 w-4" /> Manage Wallets
                  </Link>
                </Button>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-lg font-medium">Transaction Settings</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Default Gas Fee</p>
                      <p className="text-sm text-gray-500">Set your preferred gas fee for Ethereum transactions</p>
                    </div>
                    <select className="p-2 border rounded-md">
                      <option value="standard">Standard</option>
                      <option value="fast">Fast</option>
                      <option value="instant">Instant</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Transaction Limits</p>
                      <p className="text-sm text-gray-500">Set daily transaction limits for security</p>
                    </div>
                    <Input type="number" defaultValue="5" className="w-24" />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Require Password for Transactions</p>
                      <p className="text-sm text-gray-500">Add an extra layer of security for transactions</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="bg-black hover:bg-gray-800 text-white">Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ipfs">
          <Card>
            <CardHeader>
              <CardTitle>IPFS Settings</CardTitle>
              <CardDescription>Manage your InterPlanetary File System connection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">IPFS Configuration</h3>
                <p className="text-sm text-gray-500">
                  Configure your connection to a local IPFS node for secure, decentralized file storage.
                </p>
                <Button asChild className="bg-teal-900 hover:bg-teal-800 text-white">
                  <Link href="/settings/ipfs">Manage IPFS Settings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
