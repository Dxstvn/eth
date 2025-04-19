"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useWallet } from "@/context/wallet-context"
import { useOnboarding } from "@/context/onboarding-context"
import { useAuth } from "@/context/auth-context"
import Link from "next/link"

export default function SettingsPage() {
  const { isConnected, walletProvider } = useWallet()
  const { setShowOnboarding } = useOnboarding()
  const { user, isDemoAccount } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")

  // Extract user information from Google account
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [initials, setInitials] = useState("")

  useEffect(() => {
    if (user && !isDemoAccount) {
      // Parse name from Google account
      const displayName = user.displayName || ""
      const nameParts = displayName.split(" ")

      if (nameParts.length > 0) {
        setFirstName(nameParts[0])
        setInitials(nameParts[0].charAt(0))

        if (nameParts.length > 1) {
          setLastName(nameParts.slice(1).join(" "))
          setInitials((prev) => prev + nameParts[nameParts.length - 1].charAt(0))
        }
      }

      // Set email from Google account
      setEmail(user.email || "")
    } else if (isDemoAccount) {
      // Demo account data
      setFirstName("John")
      setLastName("Doe")
      setEmail("john.doe@example.com")
      setInitials("JD")
    }
  }, [user, isDemoAccount])

  const renderTabContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Profile Information</h2>
                  <p className="text-sm text-neutral-500 mb-6">Update your account profile information</p>

                  <div className="flex items-center mb-6">
                    <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-semibold text-xl mr-4">
                      {initials}
                    </div>
                    <Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
                      Change Avatar
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <label htmlFor="first-name" className="block text-sm font-medium">
                        First Name
                      </label>
                      <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="last-name" className="block text-sm font-medium">
                        Last Name
                      </label>
                      <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-medium">
                        Email
                      </label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        readOnly={!isDemoAccount} // Make email read-only for non-demo accounts
                        className={!isDemoAccount ? "bg-gray-50" : ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="phone" className="block text-sm font-medium">
                        Phone Number
                      </label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={isDemoAccount ? "+1 (555) 123-4567" : "Add your phone number"}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 mb-6">
                    <label htmlFor="company" className="block text-sm font-medium">
                      Company
                    </label>
                    <Input
                      id="company"
                      placeholder={isDemoAccount ? "Blockchain Properties LLC" : "Add your company name"}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button className="bg-teal-900 hover:bg-teal-800 text-white">Save Changes</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      case "security":
        return (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Security Settings</h2>
                  <p className="text-sm text-neutral-500 mb-6">Manage your account security settings</p>

                  <div className="space-y-6 mb-8">
                    <h3 className="text-lg font-medium">Change Password</h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="current-password" className="block text-sm font-medium">
                          Current Password
                        </label>
                        <Input id="current-password" type="password" />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="new-password" className="block text-sm font-medium">
                          New Password
                        </label>
                        <Input id="new-password" type="password" />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="confirm-password" className="block text-sm font-medium">
                          Confirm New Password
                        </label>
                        <Input id="confirm-password" type="password" />
                      </div>

                      <div>
                        <Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50">
                          Update Password
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-6">
                    <h3 className="text-lg font-medium">Two-Factor Authentication</h3>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">Authenticator App</p>
                        <p className="text-sm text-neutral-500">Use an authenticator app to generate one-time codes</p>
                      </div>
                      <Switch />
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">SMS Authentication</p>
                        <p className="text-sm text-neutral-500">Receive a code via SMS to verify your identity</p>
                      </div>
                      <Switch />
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="text-lg font-medium">Session Management</h3>
                    <p className="text-sm text-neutral-500">You're currently signed in on these devices</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      case "notifications":
        return (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Notification Preferences</h2>
                  <p className="text-sm text-neutral-500 mb-6">Manage how you receive notifications</p>

                  <div className="space-y-6 mb-8">
                    <h3 className="text-lg font-medium">Email Notifications</h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">Transaction Updates</p>
                          <p className="text-sm text-neutral-500">Receive updates about your transactions</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">Document Notifications</p>
                          <p className="text-sm text-neutral-500">Get notified when documents are uploaded or signed</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">Payment Confirmations</p>
                          <p className="text-sm text-neutral-500">Receive confirmations for payments and transfers</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">Marketing & Promotions</p>
                          <p className="text-sm text-neutral-500">Receive news, updates, and promotional offers</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-6">
                    <h3 className="text-lg font-medium">Push Notifications</h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">Enable Push Notifications</p>
                          <p className="text-sm text-neutral-500">Receive notifications on your device</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">Transaction Status Changes</p>
                          <p className="text-sm text-neutral-500">Get notified when transaction status changes</p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">Deadline Reminders</p>
                          <p className="text-sm text-neutral-500">Receive reminders for upcoming deadlines</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button className="bg-teal-900 hover:bg-teal-800 text-white">Save Preferences</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      case "wallet":
        return (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Wallet Settings</h2>
                  <p className="text-sm text-neutral-500 mb-6">Manage your cryptocurrency wallet settings</p>

                  <div className="space-y-6 mb-8">
                    <h3 className="text-lg font-medium">Connected Wallets</h3>

                    {isDemoAccount ? (
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center">
                          <div className="w-10 h-10 flex items-center justify-center mr-3">
                            <CoinbaseIcon className="h-10 w-10" />
                          </div>
                          <div>
                            <p className="font-medium">Coinbase Wallet</p>
                            <p className="text-xs text-neutral-500">Connected • Primary</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed rounded-lg">
                        <p className="text-neutral-500 mb-4">You don't have any wallets connected yet.</p>
                      </div>
                    )}

                    <div>
                      <Button variant="outline" className="flex items-center" asChild>
                        <Link href="/settings/wallets">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-2"
                          >
                            <rect width="20" height="14" x="2" y="5" rx="2" />
                            <line x1="2" x2="22" y1="10" y2="10" />
                          </svg>
                          Manage Wallets
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <div className="border-t pt-6 space-y-6">
                    <h3 className="text-lg font-medium">Transaction Settings</h3>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div>
                          <p className="font-medium">Default Gas Fee</p>
                          <p className="text-sm text-neutral-500">
                            Set your preferred gas fee for Ethereum transactions
                          </p>
                        </div>
                        <select className="p-2 border rounded-md w-full">
                          <option>Standard</option>
                          <option>Fast</option>
                          <option>Instant</option>
                          <option>Custom</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div>
                          <p className="font-medium">Transaction Limits</p>
                          <p className="text-sm text-neutral-500">Set daily transaction limits for security</p>
                        </div>
                        <Input type="number" defaultValue="5" />
                      </div>

                      <div className="flex items-center justify-between py-2">
                        <div>
                          <p className="font-medium">Require Password for Transactions</p>
                          <p className="text-sm text-neutral-500">Add an extra layer of security for transactions</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button className="bg-teal-900 hover:bg-teal-800 text-white">Save Settings</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      case "ipfs":
        return (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">IPFS Settings</h2>
                  <p className="text-sm text-neutral-500 mb-6">Manage your InterPlanetary File System connection</p>

                  <div className="space-y-6 mb-8">
                    <h3 className="text-lg font-medium">IPFS Configuration</h3>

                    <p className="text-sm text-neutral-600 mb-4">
                      Configure your connection to a local IPFS node for secure, decentralized file storage.
                    </p>

                    <Button variant="outline" className="border-teal-200 text-teal-700 hover:bg-teal-50" asChild>
                      <Link href="/settings/ipfs">Manage IPFS Settings</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      case "help":
        return (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Help & Resources</h2>
                  <p className="text-sm text-neutral-500 mb-6">Get help with using CryptoEscrow</p>

                  <div className="space-y-4 mb-8">
                    <h3 className="text-lg font-medium">Onboarding Tour</h3>
                    <p className="text-sm text-neutral-600">
                      Take a guided tour of CryptoEscrow to learn about its features and how to use them.
                    </p>
                    <Button
                      onClick={() => setShowOnboarding(true)}
                      className="bg-teal-900 hover:bg-teal-800 text-white"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-2"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                        <path d="M12 17h.01" />
                      </svg>
                      Start Onboarding Tour
                    </Button>
                  </div>

                  <div className="border-t pt-6 space-y-4 mb-8">
                    <h3 className="text-lg font-medium">Documentation</h3>
                    <p className="text-sm text-neutral-600">
                      Read our comprehensive documentation to learn more about CryptoEscrow.
                    </p>
                    <Button variant="outline">View Documentation</Button>
                  </div>

                  <div className="border-t pt-6 space-y-4">
                    <h3 className="text-lg font-medium">Contact Support</h3>
                    <p className="text-sm text-neutral-600">Need help? Contact our support team for assistance.</p>
                    <Button variant="outline">Contact Support</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500">Manage your account settings and preferences</p>
      </div>

      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "profile" ? "border-b-2 border-teal-900 text-teal-900" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "security"
                ? "border-b-2 border-teal-900 text-teal-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("security")}
          >
            Security
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "notifications"
                ? "border-b-2 border-teal-900 text-teal-900"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("notifications")}
          >
            Notifications
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "wallet" ? "border-b-2 border-teal-900 text-teal-900" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("wallet")}
          >
            Wallet
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "ipfs" ? "border-b-2 border-teal-900 text-teal-900" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("ipfs")}
          >
            IPFS
          </button>
          <button
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === "help" ? "border-b-2 border-teal-900 text-teal-900" : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("help")}
          >
            Help
          </button>
        </div>
      </div>

      {renderTabContent()}
    </div>
  )
}

// Import the CoinbaseIcon component
import { CoinbaseIcon } from "@/components/icons/coinbase-icon"
