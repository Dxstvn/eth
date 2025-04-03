import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HeroSection() {
  return (
    <section className="relative py-20 md:py-28 bg-gradient-to-b from-teal-900 to-teal-800 text-white overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('/placeholder.svg?height=800&width=800')] bg-repeat opacity-5"></div>
      </div>

      <div className="container px-4 md:px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col space-y-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl mb-6">
                Secure Real Estate Transactions with Cryptocurrency
              </h1>
              <p className="text-xl text-teal-100 max-w-[600px]">
                Our escrow service provides a secure, transparent platform for real estate transactions using
                cryptocurrency, eliminating fraud and ensuring safe transfers.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-white text-teal-900 hover:bg-teal-100">
                <Link href="/dashboard">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white text-white hover:bg-teal-800">
                <Link href="/learn-more">Learn More</Link>
              </Button>
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-teal-400 flex items-center justify-center text-xs font-medium text-teal-900">
                  JD
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-300 flex items-center justify-center text-xs font-medium text-teal-900">
                  MK
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-200 flex items-center justify-center text-xs font-medium text-teal-900">
                  TS
                </div>
              </div>
              <p className="text-teal-100">Trusted by 1,000+ property investors</p>
            </div>
          </div>

          <div className="relative">
            <div className="relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 shadow-2xl">
              <img
                src="/placeholder.svg?height=600&width=800"
                alt="Real estate transaction dashboard"
                className="rounded-lg w-full"
              />
              <div className="absolute -bottom-6 -right-6 bg-teal-100 text-teal-900 rounded-lg p-4 shadow-lg">
                <p className="font-semibold">Average time saved</p>
                <p className="text-3xl font-bold">14 days</p>
                <p className="text-sm">per transaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

