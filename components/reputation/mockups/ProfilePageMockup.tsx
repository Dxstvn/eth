'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ExternalLink,
  Edit,
  Share2,
} from 'lucide-react'
import { ReputationBadge, ReputationStars } from '../ReputationBadge'
import { TrustScoreWidget } from '../TrustScore'
import { ReputationTimeline } from '../ReputationHistory'

export function ProfilePageMockup() {
  const user = {
    id: '123',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    location: 'San Francisco, CA',
    memberSince: new Date('2024-01-15'),
    bio: 'Experienced real estate investor specializing in commercial properties. Committed to transparent and secure transactions.',
    avatar: '/api/placeholder/150/150',
    reputation: {
      score: 75,
      level: 'gold' as const,
      verified: true,
    },
    stats: {
      totalTransactions: 28,
      totalVolume: '$3.2M',
      avgResponseTime: '45 min',
      successRate: 96.4,
    },
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col items-center md:items-start gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left space-y-2">
                <h1 className="text-2xl font-bold">{user.name}</h1>
                <ReputationBadge
                  score={user.reputation.score}
                  level={user.reputation.level}
                  verified={user.reputation.verified}
                  size="lg"
                />
              </div>
            </div>

            {/* Contact Info and Bio */}
            <div className="flex-1 space-y-4">
              <p className="text-muted-foreground">{user.bio}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{user.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Member since {user.memberSince.toLocaleDateString()}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Public View
                </Button>
              </div>
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-2 gap-4 md:w-64">
              <div className="text-center">
                <p className="text-2xl font-bold">{user.stats.totalTransactions}</p>
                <p className="text-sm text-muted-foreground">Transactions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{user.stats.totalVolume}</p>
                <p className="text-sm text-muted-foreground">Volume</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{user.stats.avgResponseTime}</p>
                <p className="text-sm text-muted-foreground">Avg Response</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{user.stats.successRate}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Score Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TrustScoreWidget
          score={user.reputation.score}
          level={user.reputation.level}
          trend={3}
        />
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ReputationStars score={user.reputation.score} size="lg" />
              <span className="text-sm text-muted-foreground">
                ({Math.round((user.reputation.score / 100) * 5 * 10) / 10}/5)
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Based on 24 reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="outline">Quick Responder</Badge>
              <Badge variant="outline">Trusted Trader</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              +2 more achievements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ReputationTimeline userId={user.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Transaction history will be displayed here...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews">
          <Card>
            <CardHeader>
              <CardTitle>Reviews & Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                User reviews will be displayed here...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>Achievements & Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Achievement collection will be displayed here...
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}