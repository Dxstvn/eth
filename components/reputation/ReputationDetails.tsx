'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Shield,
  Star,
  Calculator,
  Gavel,
} from 'lucide-react'
import { ReputationBadge, ReputationLevel } from './ReputationBadge'
import { ReputationHistory } from './ReputationHistory'

interface ReputationDetailsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  userName: string
  score: number
  level: ReputationLevel
  verified: boolean
}

interface ScoreBreakdown {
  category: string
  score: number
  maxScore: number
  icon: React.ElementType
  description: string
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: React.ElementType
  earnedAt?: Date
  progress?: number
}

export function ReputationDetails({
  open,
  onOpenChange,
  userId,
  userName,
  score,
  level,
  verified,
}: ReputationDetailsProps) {
  // Mock data - would come from API
  const scoreBreakdown: ScoreBreakdown[] = [
    {
      category: 'Transactions',
      score: 35,
      maxScore: 40,
      icon: DollarSign,
      description: '28 successful transactions',
    },
    {
      category: 'Dispute Resolution',
      score: 22,
      maxScore: 30,
      icon: Shield,
      description: '2 disputes resolved favorably',
    },
    {
      category: 'Stake & Commitment',
      score: 15,
      maxScore: 20,
      icon: Award,
      description: 'Active validator for 6 months',
    },
    {
      category: 'Community Feedback',
      score: 8,
      maxScore: 10,
      icon: Star,
      description: '4.8/5 average rating',
    },
  ]

  const achievements: Achievement[] = [
    {
      id: '1',
      name: 'First Transaction',
      description: 'Completed your first escrow transaction',
      icon: CheckCircle,
      earnedAt: new Date('2024-01-15'),
    },
    {
      id: '2',
      name: 'Trusted Trader',
      description: 'Complete 10 transactions without disputes',
      icon: Award,
      earnedAt: new Date('2024-06-20'),
    },
    {
      id: '3',
      name: 'Quick Responder',
      description: 'Maintain <1hr response time for 30 days',
      icon: Clock,
      earnedAt: new Date('2024-11-01'),
    },
    {
      id: '4',
      name: 'High Volume',
      description: 'Process over $1M in transactions',
      icon: TrendingUp,
      progress: 75,
    },
  ]

  const nextLevelScore = {
    unverified: 21,
    bronze: 41,
    silver: 61,
    gold: 81,
    platinum: 100,
  }

  const progressToNext = level === 'platinum' 
    ? 100 
    : ((score - (nextLevelScore[level] - 20)) / 20) * 100

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Reputation Details</span>
            <ReputationBadge
              score={score}
              level={level}
              verified={verified}
              interactive={false}
            />
          </DialogTitle>
          <DialogDescription>
            View your complete reputation breakdown and history
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Current Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{score}/100</p>
                    <p className="text-sm text-muted-foreground">
                      Reputation Score
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold capitalize">{level}</p>
                    <p className="text-sm text-muted-foreground">
                      Current Level
                    </p>
                  </div>
                </div>

                {level !== 'platinum' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress to {getNextLevel(level)}</span>
                      <span>{Math.round(progressToNext)}%</span>
                    </div>
                    <Progress value={progressToNext} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {nextLevelScore[level] - score} points needed
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      January 15, 2024
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Total Transactions</p>
                    <p className="text-sm text-muted-foreground">28</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Success Rate</p>
                    <p className="text-sm text-muted-foreground">96.4%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Avg Response Time</p>
                    <p className="text-sm text-muted-foreground">45 minutes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Benefits & Perks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getLevelBenefits(level).map((benefit, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            {scoreBreakdown.map((category) => (
              <Card key={category.category}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      <CardTitle className="text-base">
                        {category.category}
                      </CardTitle>
                    </div>
                    <span className="text-sm font-medium">
                      {category.score}/{category.maxScore}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress
                    value={(category.score / category.maxScore) * 100}
                    className="h-2 mb-2"
                  />
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </CardContent>
              </Card>
            ))}

            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <CardTitle className="text-base">
                    Areas for Improvement
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>• Complete more high-value transactions to increase your transaction score</li>
                  <li>• Maintain faster response times to earn the Quick Responder achievement</li>
                  <li>• Consider becoming a validator to boost your stake score</li>
                </ul>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Dispute Stake Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Current Dispute Stake Rate</span>
                    <Badge variant="outline" className="text-lg font-mono">
                      {getStakePercentage(level)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on your {level} reputation tier
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Example Stake Requirements</h4>
                  <div className="grid gap-2">
                    {[1000, 10000, 50000, 100000].map((amount) => (
                      <div key={amount} className="flex justify-between items-center p-2 rounded bg-muted/50">
                        <span className="text-sm">${amount.toLocaleString()} transaction</span>
                        <span className="font-medium text-sm">
                          ${Math.max(50, amount * getStakePercentage(level) / 100).toLocaleString()} stake
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Dispute History</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Disputes Raised</span>
                      <span className="font-medium">3</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Disputes Won</span>
                      <span className="font-medium text-green-600">2</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Disputes Lost</span>
                      <span className="font-medium text-red-600">1</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Stakes Paid</span>
                      <span className="font-medium">$3,250</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stakes Returned</span>
                      <span className="font-medium text-green-600">$2,150</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stakes Slashed</span>
                      <span className="font-medium text-red-600">$1,100</span>
                    </div>
                  </div>
                </div>

                {level !== 'platinum' && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-sm">
                      Improve your reputation to {getNextLevel(level)} to reduce your dispute stake to {getStakePercentage(getNextLevel(level) as ReputationLevel)}%
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Gavel className="h-5 w-5" />
                  Active Disputes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Gavel className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No active disputes</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <div className="grid gap-4">
              {achievements.map((achievement) => (
                <Card
                  key={achievement.id}
                  className={achievement.earnedAt ? '' : 'opacity-60'}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'h-10 w-10 rounded-full flex items-center justify-center',
                            achievement.earnedAt
                              ? 'bg-green-100'
                              : 'bg-gray-100'
                          )}
                        >
                          <achievement.icon
                            className={cn(
                              'h-5 w-5',
                              achievement.earnedAt
                                ? 'text-green-600'
                                : 'text-gray-400'
                            )}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {achievement.name}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {achievement.description}
                          </p>
                        </div>
                      </div>
                      {achievement.earnedAt ? (
                        <Badge variant="outline" className="text-xs">
                          Earned {achievement.earnedAt.toLocaleDateString()}
                        </Badge>
                      ) : achievement.progress ? (
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {achievement.progress}%
                          </p>
                          <Progress
                            value={achievement.progress}
                            className="h-1 w-20"
                          />
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Locked
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <ScrollArea className="h-[400px]">
              <ReputationHistory userId={userId} />
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

function getNextLevel(currentLevel: ReputationLevel): string {
  const levels = ['unverified', 'bronze', 'silver', 'gold', 'platinum']
  const currentIndex = levels.indexOf(currentLevel)
  return levels[currentIndex + 1] || 'platinum'
}

function getLevelBenefits(level: ReputationLevel): string[] {
  const benefits: Record<ReputationLevel, string[]> = {
    unverified: [
      'Basic platform access',
      'Transaction limit: $10,000',
      'Standard support',
      '10% dispute stake requirement',
    ],
    bronze: [
      'Transaction limit: $50,000',
      'Standard fee rates',
      'Email support',
      'Basic dispute resolution',
      '5% dispute stake requirement',
    ],
    silver: [
      'Transaction limit: $250,000',
      '10% fee discount',
      'Priority email support',
      'Premium dispute resolution',
      '3.5% dispute stake requirement',
    ],
    gold: [
      'Transaction limit: $1,000,000',
      '20% fee discount',
      'Instant transactions available',
      'Dedicated support agent',
      'API access',
      '2.5% dispute stake requirement',
    ],
    platinum: [
      'Unlimited transactions',
      '30% fee discount',
      'White-label options',
      '24/7 phone support',
      'Custom features available',
      '2% dispute stake requirement',
    ],
  }
  return benefits[level]
}

function getStakePercentage(level: ReputationLevel): number {
  const percentages: Record<ReputationLevel, number> = {
    unverified: 10.0,
    bronze: 5.0,
    silver: 3.5,
    gold: 2.5,
    platinum: 2.0,
  }
  return percentages[level]
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ')
}