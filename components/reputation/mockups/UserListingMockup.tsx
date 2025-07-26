'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Search,
  Filter,
  Star,
  Shield,
  TrendingUp,
  Clock,
  DollarSign,
  ChevronRight,
  Users,
} from 'lucide-react'
import { ReputationBadge, ReputationStars, ReputationIndicator } from '../ReputationBadge'

interface User {
  id: string
  name: string
  avatar: string
  reputation: {
    score: number
    level: 'unverified' | 'bronze' | 'silver' | 'gold' | 'platinum'
    verified: boolean
  }
  stats: {
    transactionCount: number
    totalVolume: string
    avgResponseTime: string
    successRate: number
    specialties: string[]
  }
  lastActive: Date
}

export function UserListingMockup() {
  const [minReputation, setMinReputation] = React.useState([40])
  const [selectedLevel, setSelectedLevel] = React.useState<string>('all')
  const [searchQuery, setSearchQuery] = React.useState('')

  // Mock users data
  const users: User[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      avatar: '/api/placeholder/40/40',
      reputation: {
        score: 82,
        level: 'platinum',
        verified: true,
      },
      stats: {
        transactionCount: 45,
        totalVolume: '$5.2M',
        avgResponseTime: '30 min',
        successRate: 98.2,
        specialties: ['Real Estate', 'Commercial Properties'],
      },
      lastActive: new Date('2025-01-20T10:00:00'),
    },
    {
      id: '2',
      name: 'Michael Chen',
      avatar: '/api/placeholder/40/40',
      reputation: {
        score: 68,
        level: 'gold',
        verified: true,
      },
      stats: {
        transactionCount: 23,
        totalVolume: '$2.8M',
        avgResponseTime: '45 min',
        successRate: 95.6,
        specialties: ['Residential', 'Luxury Homes'],
      },
      lastActive: new Date('2025-01-19T15:30:00'),
    },
    {
      id: '3',
      name: 'Emily Rodriguez',
      avatar: '/api/placeholder/40/40',
      reputation: {
        score: 55,
        level: 'silver',
        verified: true,
      },
      stats: {
        transactionCount: 15,
        totalVolume: '$1.2M',
        avgResponseTime: '1 hour',
        successRate: 93.3,
        specialties: ['Vehicles', 'Collectibles'],
      },
      lastActive: new Date('2025-01-18T09:15:00'),
    },
    {
      id: '4',
      name: 'David Kim',
      avatar: '/api/placeholder/40/40',
      reputation: {
        score: 35,
        level: 'bronze',
        verified: false,
      },
      stats: {
        transactionCount: 8,
        totalVolume: '$450K',
        avgResponseTime: '2 hours',
        successRate: 87.5,
        specialties: ['Art', 'Antiques'],
      },
      lastActive: new Date('2025-01-17T14:00:00'),
    },
  ]

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.stats.specialties.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
    const matchesReputation = user.reputation.score >= minReputation[0]
    const matchesLevel = selectedLevel === 'all' || user.reputation.level === selectedLevel
    return matchesSearch && matchesReputation && matchesLevel
  })

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Find Trusted Users</h1>
        <p className="text-muted-foreground mt-1">
          Connect with verified users based on reputation and expertise
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Name or specialty..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Reputation Level */}
              <div className="space-y-2">
                <Label htmlFor="level">Reputation Level</Label>
                <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="platinum">Platinum Only</SelectItem>
                    <SelectItem value="gold">Gold & Above</SelectItem>
                    <SelectItem value="silver">Silver & Above</SelectItem>
                    <SelectItem value="bronze">Bronze & Above</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Minimum Reputation Score */}
              <div className="space-y-2">
                <Label>Minimum Reputation Score</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={minReputation}
                    onValueChange={setMinReputation}
                    min={0}
                    max={100}
                    step={10}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-8">{minReputation[0]}</span>
                </div>
              </div>

              {/* Quick Filters */}
              <div className="space-y-2">
                <Label>Quick Filters</Label>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Verified Only
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Clock className="h-4 w-4 mr-2" />
                    Active Today
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    95%+ Success Rate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Listings */}
        <div className="lg:col-span-3 space-y-4">
          {/* Results Count */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredUsers.length} users
            </p>
            <Select defaultValue="reputation">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reputation">Highest Reputation</SelectItem>
                <SelectItem value="transactions">Most Transactions</SelectItem>
                <SelectItem value="volume">Highest Volume</SelectItem>
                <SelectItem value="active">Recently Active</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* User Cards */}
          {filteredUsers.map((user) => (
            <Card key={user.id} className="hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-6 w-6 text-muted-foreground" />
                    </div>

                    {/* User Info */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{user.name}</h3>
                          <ReputationBadge
                            score={user.reputation.score}
                            level={user.reputation.level}
                            verified={user.reputation.verified}
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <ReputationStars score={user.reputation.score} size="sm" />
                          <span className="text-sm text-muted-foreground">
                            {user.stats.transactionCount} transactions
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {user.stats.successRate}% success rate
                          </span>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Volume</p>
                          <p className="font-medium">{user.stats.totalVolume}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Avg Response</p>
                          <p className="font-medium">{user.stats.avgResponseTime}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Active</p>
                          <p className="font-medium">
                            {getRelativeTime(user.lastActive)}
                          </p>
                        </div>
                        <div className="hidden md:block">
                          <p className="text-muted-foreground">Trust Score</p>
                          <div className="flex items-center gap-1">
                            <ReputationIndicator
                              score={user.reputation.score}
                              level={user.reputation.level}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Specialties */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Specializes in:</span>
                        {user.stats.specialties.map((specialty) => (
                          <Badge key={specialty} variant="outline" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <Button variant="ghost" size="sm">
                    View Profile
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No users found matching your criteria.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setMinReputation([0])
                    setSelectedLevel('all')
                    setSearchQuery('')
                  }}
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mobile Filter Button */}
      <div className="lg:hidden fixed bottom-4 right-4">
        <Button size="lg" className="shadow-lg">
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>
    </div>
  )
}

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}