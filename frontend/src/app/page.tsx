'use client'

import {
  ArrowRight, Users, Globe, Shield, Zap,
  CreditCard, BarChart, Lock, Smartphone, ChevronDown,
  ChevronUp, Award, Building, Clock, CheckCircle, Star
} from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'
import { useState } from 'react'

export default function LandingPage() {
  const { user } = useAuth()

  // FAQ State
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index)
  }

  const features = [
    {
      icon: Lock,
      title: 'Institutional Encryption',
      description: 'A dedicated 256-bit SSL encryption for your digital assets ensures you have the highest security standards available in modern banking. Your data is protected by military-grade protocols.'
    },
    {
      icon: Zap,
      title: 'Hyper-Speed Processing',
      description: 'Experience automated transaction fluidity with our proprietary core technology designed to handle thousands of transactions per second without lag.'
    },
    {
      icon: CreditCard,
      title: 'Industry-Low Fees',
      description: 'Maximize your capital efficiency with a transparent fee structure that eliminates hidden costs and reduces overhead on every single trade.'
    },
    {
      icon: Globe,
      title: 'Instant Global Transfers',
      description: 'Move capital across borders in seconds, not days, utilizing our deep liquidity pools and prime banking partnerships for true zero-boundary financial access.'
    },
    {
      icon: BarChart,
      title: 'Direct Bitcoin Investment',
      description: 'Securely buy, sell, and hold Bitcoin directly from your dashboard with real-time market data and institutional-grade custody.'
    },
    {
      icon: Smartphone,
      title: '24/7 Priority Support',
      description: 'Dedicated account managers are available around the clock to provide instant assistance for high-value financial operations.'
    }
  ]

  const faqs = [
    {
      question: "How secure is PrimeTrust compared to traditional banks?",
      answer: "PrimeTrust utilizes military-grade AES-256 encryption and hardware security modules (HSM) that exceed standard banking requirements. Unlike traditional banks relying on legacy infrastructure, we run on a decentralized security mesh that prevents single points of failure."
    },
    {
      question: "What are the global transfer limits for premium accounts?",
      answer: "Premium accounts enjoy significantly higher transfer limits, up to $1M daily for verified institutional clients. Our automated compliance engine ensures swift processing for large-volume transactions."
    },
    {
      question: "How does zero-fee wealth management actually work?",
      answer: "We leverage AI-driven automated rebalancing and tax-loss harvesting to optimize your portfolio. By removing human overhead from routine maintenance, we pass the savings directly to you."
    },
    {
      question: "Is PrimeTrust regulated in my jurisdiction?",
      answer: "PrimeTrust operates in full compliance with global financial regulations, including GDPR, CCPA, and regional banking standards. We hold multiple licenses to operate as a secure payment processor and custodian."
    }
  ]

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/10 supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                PrimeTrust
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-full font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)]"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-muted-foreground hover:text-foreground transition-colors font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-white text-primary-navy px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-white/20"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden bg-[#020817]">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-600/10 blur-[120px] rounded-full" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="animate-fade-in space-y-8">


              <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight text-white">
                The Future of <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]">
                  Secure Digital Banking
                </span>
              </h1>

              <p className="text-xl text-gray-400 max-w-xl leading-relaxed">
                Experience the pinnacle of automated financial freedom with our institutional-grade platform.
                Seamlessly manage assets with 24/7 accessibility and military-grade encryption protocols.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/register"
                  className="group bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] transition-all duration-300 transform hover:-translate-y-1 inline-flex items-center justify-center gap-2"
                >
                  Start Your Financial Journey
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="group border border-white/10 bg-white/5 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/10 hover:border-white/20 transition-all duration-300 backdrop-blur-sm inline-flex items-center justify-center gap-2"
                >
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-1"></div>
                  </div>
                  View Demo
                </Link>
              </div>

              {/* Stats Strip */}
              <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/10">
                <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                  <p className="text-3xl font-bold text-white mb-1">$10B+</p>
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Total Volume</p>
                </div>
                <div className="animate-slide-up" style={{ animationDelay: '200ms' }}>
                  <p className="text-3xl font-bold text-white mb-1">2.4M</p>
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Global Users</p>
                </div>
                <div className="animate-slide-up" style={{ animationDelay: '300ms' }}>
                  <p className="text-3xl font-bold text-green-400 mb-1">99.99%</p>
                  <p className="text-sm text-gray-500 uppercase tracking-wider">Security Uptime</p>
                </div>
              </div>
            </div>

            {/* Right Content - Floating Cards */}
            <div className="relative h-[600px] animate-float hidden lg:block">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-full blur-[60px]" />
              <Image
                src="/images/mockups/hero-cards.png"
                alt="PrimeTrust Modern Banking Cards"
                fill
                className="object-contain drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>



      {/* Premium Features Grid */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#020817]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20 animate-fade-in space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Premium Financial Benefits
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Our suite of high-end fintech tools is designed for global speed and institutional-grade security.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:-translate-y-1 transition-all duration-300 animate-slide-up backdrop-blur-sm relative overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Hover Gradient Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                <div className="w-14 h-14 bg-blue-600/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Split - Journey */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0B1221] relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-fade-in">
              <h2 className="text-4xl font-bold text-white leading-tight">
                Your Journey to <br />
                <span className="text-blue-500">Financial Excellence</span>
              </h2>
              <p className="text-gray-400 text-lg">
                We've streamlined the onboarding process to ensure you can go from zero to fully automated wealth management in less than 5 minutes.
              </p>

              <div className="space-y-6">
                {[
                  { title: 'Create Secure Account', desc: 'Complete our state-of-the-art verification process with zero paperwork. Identity protection guaranteed.' },
                  { title: 'Fund Your Account', desc: 'Seamlessly deposit funds via instant mobile check capture or secure global wire transfers. Your capital is ready to work for you instantly.' },
                  { title: 'Invest & Spend', desc: 'Grow your portfolio with direct Bitcoin investing or manage daily liquidity with your PrimeTrust premium debit card.' }
                ].map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full border border-blue-500/30 flex items-center justify-center bg-blue-500/10 text-blue-400 font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative h-[600px] rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/10 p-4 shadow-2xl animate-float lg:order-last order-first">
              <Image
                src="/images/mockups/dashboard-screeenshot.png"
                alt="PrimeTrust Dashboard"
                fill
                className="object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Security Section (Dark) */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#020817] relative">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-900/50 to-transparent" />

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Enterprise-Grade Security</h2>
            <p className="text-gray-400">PrimeTrust is built on a foundation of regulatory compliance and technological redundancy.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { label: 'SOC2 Type II', sub: 'Certified' },
              { label: 'ISO 27001', sub: 'Standard' },
              { label: 'PCI-DSS', sub: 'Compliant' },
              { label: 'GDPR Ready', sub: 'Global' }
            ].map((cert, i) => (
              <div key={i} className="p-6 rounded-xl bg-white/5 border border-white/10 text-center hover:bg-white/10 transition-colors">
                <Shield className="w-8 h-8 text-blue-500 mx-auto mb-3" />
                <h3 className="text-white font-bold">{cert.label}</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">{cert.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-3 gap-8 text-center border-t border-white/10 pt-16">
            <div>
              <div className="flex justify-center mb-4"><CheckCircle className="text-green-500 w-6 h-6" /></div>
              <h4 className="text-white font-bold mb-2">Cold Storage Vaults</h4>
              <p className="text-gray-500 text-sm">98% of assets held offline in geographically distributed vaults.</p>
            </div>
            <div>
              <div className="flex justify-center mb-4"><CheckCircle className="text-green-500 w-6 h-6" /></div>
              <h4 className="text-white font-bold mb-2">DDoS Mitigation</h4>
              <p className="text-gray-500 text-sm">Enterprise-level protection against high-traffic cyber attacks.</p>
            </div>
            <div>
              <div className="flex justify-center mb-4"><CheckCircle className="text-green-500 w-6 h-6" /></div>
              <h4 className="text-white font-bold mb-2">Asset Insurance</h4>
              <p className="text-gray-500 text-sm">Portfolio held with interest against theft and operational failures.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#050B19]">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-400">Everything you need to know about the PrimeTrust ecosystem.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-white/10 rounded-xl overflow-hidden bg-white/5 backdrop-blur-sm hover:border-white/20 transition-all"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="text-lg font-semibold text-white">{faq.question}</span>
                  {openFaq === index ? (
                    <ChevronUp className="w-5 h-5 text-blue-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                <div
                  className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaq === index ? 'max-h-48 py-4 opacity-100' : 'max-h-0 py-0 opacity-0'
                    }`}
                >
                  <p className="text-gray-400 leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#020817] text-center">
        <div className="max-w-4xl mx-auto bg-gradient-to-b from-blue-900/20 to-transparent p-12 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1/2 bg-blue-500/20 blur-[100px] -z-10" />

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Elevate Your <br /> Financial Future?
          </h2>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Join over 2.4 million institutional and private clients who trust PrimeTrust for their digital banking needs.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className="bg-white text-primary-navy px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] transform hover:-translate-y-1"
            >
              Start Your Financial Journey Today
            </Link>
            <Link
              href="/contact-us"
              className="px-8 py-4 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/10 transition-all"
            >
              Contact Sales
            </Link>
          </div>

          <div className="mt-12 flex justify-center gap-8 text-sm text-gray-500">
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> No hidden fees</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> Secure Onboarding</span>
            <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500" /> 24/7 Access</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#02050e] border-t border-white/5 pt-16 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">P</span>
              </div>
              <span className="text-xl font-bold text-white">PrimeTrust</span>
            </div>
            <div className="flex gap-8 text-gray-400 text-sm">
              <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-white transition-colors">Cookie Policy</Link>
              <Link href="#" className="hover:text-white transition-colors">Legal</Link>
            </div>
            <div className="flex gap-4">
              {/* Social placeholders */}
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                <Globe className="w-4 h-4" />
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                <Shield className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div className="text-center text-gray-600 text-xs border-t border-white/5 pt-8">
            &copy; 2026 PrimeTrust Financial Technologies. All rights reserved. PrimeTrust is a financial technology company, not a bank. Banking services are provided by our partner banks.
          </div>
        </div>
      </footer>
    </div>
  )
}
