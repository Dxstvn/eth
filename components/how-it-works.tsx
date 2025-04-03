import { FileCheck, LockKeyhole, UserCheck } from "lucide-react"

export default function HowItWorks() {
  return (
    <section className="py-20 bg-teal-50">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">How It Works</h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
            Our platform simplifies the complex process of real estate transactions with cryptocurrency.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connection line */}
          <div className="absolute top-24 left-1/2 h-[calc(100%-6rem)] w-0.5 bg-teal-200 -translate-x-1/2 hidden md:block"></div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
            {/* Step 1 */}
            <div className="relative md:text-right">
              <div className="md:absolute md:right-0 md:translate-x-1/2 z-10 bg-white w-12 h-12 rounded-full border-2 border-teal-200 flex items-center justify-center mb-4 md:mb-0">
                <span className="text-teal-700 font-bold">1</span>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex md:justify-end mb-4">
                  <LockKeyhole className="h-10 w-10 text-teal-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Contract-Based Escrow</h3>
                <p className="text-muted-foreground">
                  When a buyer and seller agree on a property sale, they deposit funds (crypto) into a smart
                  contract-controlled escrow account.
                </p>
              </div>
            </div>

            <div className="md:mt-32"></div>

            {/* Step 2 */}
            <div className="md:mt-32"></div>

            <div className="relative">
              <div className="md:absolute md:left-0 md:-translate-x-1/2 z-10 bg-white w-12 h-12 rounded-full border-2 border-teal-200 flex items-center justify-center mb-4 md:mb-0">
                <span className="text-teal-700 font-bold">2</span>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="mb-4">
                  <UserCheck className="h-10 w-10 text-teal-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Verification & Compliance</h3>
                <p className="text-muted-foreground">
                  The platform verifies the identity of both parties (KYC/AML compliance) and ensures the property's
                  legal standing.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative md:text-right">
              <div className="md:absolute md:right-0 md:translate-x-1/2 z-10 bg-white w-12 h-12 rounded-full border-2 border-teal-200 flex items-center justify-center mb-4 md:mb-0">
                <span className="text-teal-700 font-bold">3</span>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="flex md:justify-end mb-4">
                  <FileCheck className="h-10 w-10 text-teal-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Secure Fund Release</h3>
                <p className="text-muted-foreground">
                  Upon successful property transfer and legal approvals, the escrow releases funds to the seller
                  automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

