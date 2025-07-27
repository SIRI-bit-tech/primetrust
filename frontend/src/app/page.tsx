'use client'

import { ArrowRight, Users, Star, CheckCircle, Lock, Sparkles, Heart, Globe, Award, Clock, DollarSign, Building } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

export default function LandingPage() {
  const { user } = useAuth()

  // Scroll animation hook
  const useScrollAnimation = () => {
    const [isVisible, setIsVisible] = useState(false)
    const elementRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
      const currentElement = elementRef.current
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
      )

      if (currentElement) {
        observer.observe(currentElement)
      }

      return () => {
        if (currentElement) {
          observer.unobserve(currentElement)
        }
      }
    }, [])

    return { isVisible, elementRef }
  }
  const stats = [
    { icon: Users, label: 'Active Users', value: '250K+', suffix: '' },
    { icon: DollarSign, label: 'Transactions', value: '500B+', suffix: '' },
    { icon: Globe, label: 'Countries', value: '45+', suffix: '' },
    { icon: Star, label: 'Satisfaction', value: '98%', suffix: '' }
  ]



  const philosophy = [
    {
      icon: Lock,
      title: 'Trustworthy',
      description: 'Your security is our top priority with bank-level encryption and fraud protection.'
    },
    {
      icon: Sparkles,
      title: 'Innovative',
      description: 'Cutting-edge technology that makes banking simple, fast, and secure.'
    },
    {
      icon: Heart,
      title: 'Personalized',
      description: 'Tailored financial solutions designed to meet your unique needs and goals.'
    }
  ]

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Small Business Owner',
      content: 'PrimeTrust has revolutionized how I manage my business finances. The real-time transfers are a game-changer!',
      rating: 5,
      avatar: 'SJ'
    },
    {
      name: 'Michael Chen',
      role: 'Freelance Developer',
      content: 'The mobile app is incredibly intuitive. I can manage my money on the go without any hassle.',
      rating: 5,
      avatar: 'MC'
    },
    {
      name: 'Emily Rodriguez',
      role: 'Marketing Manager',
      content: 'Security was my biggest concern, but PrimeTrust\'s encryption gives me complete peace of mind.',
      rating: 5,
      avatar: 'ER'
    }
  ]

  const achievements = [
    { icon: Award, title: 'Best Digital Bank 2024', description: 'Recognized by Financial Times' },
    { icon: Building, title: 'ISO 27001 Certified', description: 'Information Security Management' },
    { icon: Globe, title: 'Global Presence', description: 'Serving 45+ countries worldwide' },
    { icon: Clock, title: '99.9% Uptime', description: 'Reliable banking infrastructure' }
  ]

  

  // Animated components
  const AnimatedSection = ({ children, className = "", direction = "up" }: { children: React.ReactNode, className?: string, direction?: "up" | "left" | "right" }) => {
    const { isVisible, elementRef } = useScrollAnimation()
    const baseClass = direction === "up" ? "scroll-animate" : direction === "left" ? "scroll-animate-left" : "scroll-animate-right"
    
    return (
      <div 
        ref={elementRef}
        className={`${baseClass} ${isVisible ? 'visible' : ''} ${className}`}
      >
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">PrimeTrust</h1>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="bg-white text-primary-dark px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-white text-primary-dark px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Dark Background */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-navy via-primary-dark to-blue-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <AnimatedSection direction="up" className="text-white">
              <h1 className="text-5xl md:text-6xl font-bold mb-6">
                Experience Banking Like Never Before with PrimeTrust
          </h1>
              <p className="text-xl text-gray-200 mb-8">
                Discover comprehensive banking solutions that combine cutting-edge technology with traditional security. 
                Manage your finances with confidence and convenience.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
            {user ? (
              <Link
                href="/dashboard"
                    className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
              >
                Go to Dashboard
                    <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                      className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
                >
                      Get Started
                      <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/login"
                      className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white hover:text-primary-dark transition-all duration-300"
                >
                      Learn More
                </Link>
              </>
            )}
              </div>
            </AnimatedSection>
            
            {/* Right Content - Three Cards Mockup */}
            <AnimatedSection direction="left" className="relative">
              <div className="relative w-full h-96">
                <Image
                  src="/images/mockups/hero-cards.png"
                  alt="PrimeTrust Credit Cards"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="stats-section" className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="w-16 h-16 bg-gradient-to-r from-primary-dark to-primary-navy rounded-full flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-8 h-8 text-white" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </div>
                <p className="text-gray-600 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trustworthy, Reliable and Secure Banking Solutions Section - White Background */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content - Dashboard Screenshot */}
            <div className="relative animate-fade-in-left">
              <div className="relative w-full h-96">
                <Image
                  src="/images/mockups/dashboard-screeenshot.png"
                  alt="PrimeTrust Dashboard"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            
            {/* Right Content */}
            <div className="animate-fade-in-right">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                Trustworthy, Reliable and Secure Banking Solutions at PrimeTrust
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                We are committed to providing you with convenient, reliable, and tailored financial services. 
                Our comprehensive banking solutions are designed to meet your unique needs while ensuring 
                the highest level of security and trust.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Bank-Level Security</h3>
                    <p className="text-gray-600">256-bit encryption and multi-factor authentication</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">24/7 Customer Support</h3>
                    <p className="text-gray-600">Round-the-clock assistance whenever you need help</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Real-Time Transactions</h3>
                    <p className="text-gray-600">Instant transfers and real-time balance updates</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Guiding Philosophy Section - White Background */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Our Guiding Philosophy
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explore the four pillars that underpin our online bank and the experience we strive to create for our customers.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {philosophy.map((item, index) => (
              <div key={index} className="text-center p-8 bg-gray-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 animate-fade-in-up" style={{ animationDelay: `${index * 200}ms` }}>
                <div className="w-16 h-16 bg-gradient-to-r from-primary-dark to-primary-navy rounded-full flex items-center justify-center mx-auto mb-6">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {item.title}
                </h3>
                <p className="text-gray-600">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Industry Recognition & Achievements
            </h2>
            <p className="text-xl text-gray-600">
              Trusted by millions and recognized by industry leaders worldwide.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => (
              <div key={index} className="text-center p-6 bg-white rounded-xl shadow-lg animate-fade-in-up" style={{ animationDelay: `${index * 150}ms` }}>
                <div className="w-12 h-12 bg-gradient-to-r from-primary-dark to-primary-navy rounded-full flex items-center justify-center mx-auto mb-4">
                  <achievement.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{achievement.title}</h3>
                <p className="text-gray-600 text-sm">{achievement.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Innovative Approach to Financial Services Section - Dark Background */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-navy via-primary-dark to-blue-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white animate-fade-in-left">
              <h2 className="text-4xl font-bold mb-6">
                Innovative Approach to Financial Services
              </h2>
              <p className="text-xl text-gray-200 mb-8">
                We are committed to providing you with convenient, reliable, and tailored financial services. 
                Our innovative approach combines cutting-edge technology with traditional banking security 
                to deliver an exceptional banking experience.
              </p>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Advanced Technology</h3>
                    <p className="text-gray-300">State-of-the-art banking infrastructure</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Personalized Experience</h3>
                    <p className="text-gray-300">Tailored solutions for your unique needs</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-white">Global Accessibility</h3>
                    <p className="text-gray-300">Bank anywhere, anytime with our mobile app</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Content - Laptop Mockup */}
            <div className="relative animate-fade-in-right">
              <div className="relative w-full h-96">
                <Image
                  src="/images/mockups/laptop-dashbaord.png"
                  alt="PrimeTrust Banking Dashboard"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Our Customers Are Saying Section - White Background */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              What our customers are saying
            </h2>
            <p className="text-xl text-gray-600">
              Hear from our satisfied clients and learn how PrimeTrust has helped them achieve their financial goals.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-8 rounded-xl hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: `${index * 200}ms` }}>
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 italic">
                  &quot;{testimonial.content}&quot;
                </p>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-dark to-primary-navy rounded-full flex items-center justify-center mr-4">
                    <span className="text-white font-semibold text-sm">{testimonial.avatar}</span>
                  </div>
                <div>
                  <p className="font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-gray-500 text-sm">{testimonial.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simplify Your Financial Life Section - Dark Background */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-navy via-primary-dark to-blue-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content - Two Cards Mockup */}
            <div className="relative animate-fade-in-left">
              <div className="relative w-full h-96">
                <Image
                  src="/images/mockups/footer-cards.png"
                  alt="PrimeTrust Credit Cards"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            
            {/* Right Content */}
            <div className="text-white animate-fade-in-right">
              <h2 className="text-4xl font-bold mb-6">
                Simplify Your Financial Life with PrimeTrust
          </h2>
              <p className="text-xl text-gray-200 mb-8">
                Join thousands of customers who trust PrimeTrust to manage their finances. 
                We&apos;re here to be your partner in financial success.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-gray-200">No hidden fees or charges</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-gray-200">Instant account setup</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <span className="text-gray-200">Global money transfers</span>
                </div>
              </div>
              <div>
            {user ? (
              <Link
                href="/dashboard"
                    className="bg-white text-primary-dark px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
              >
                Go to Dashboard
                <ArrowRight className="w-5 h-5" />
              </Link>
            ) : (
              <Link
                href="/register"
                    className="bg-white text-primary-dark px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300 transform hover:scale-105 inline-flex items-center gap-2"
              >
                    Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
            )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">PrimeTrust</h3>
              <p className="text-gray-400">
                Empowering your financial future with secure, innovative banking solutions.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Our Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link href="/about-us" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact-us" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Checking Accounts</li>
                <li>Savings Accounts</li>
                <li>Virtual Cards</li>
                <li>Money Transfers</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/security" className="hover:text-white transition-colors">Security</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
                <li><Link href="/help-center" className="hover:text-white transition-colors">Help Center</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 PrimeTrust. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        
        .animate-fade-in-left {
          animation: fadeInLeft 0.8s ease-out forwards;
        }
        
        .animate-fade-in-right {
          animation: fadeInRight 0.8s ease-out forwards;
        }
        
        .scroll-animate {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.8s ease-out;
        }
        
        .scroll-animate.visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        .scroll-animate-left {
          opacity: 0;
          transform: translateX(-30px);
          transition: all 0.8s ease-out;
        }
        
        .scroll-animate-left.visible {
          opacity: 1;
          transform: translateX(0);
        }
        
        .scroll-animate-right {
          opacity: 0;
          transform: translateX(30px);
          transition: all 0.8s ease-out;
        }
        
        .scroll-animate-right.visible {
          opacity: 1;
          transform: translateX(0);
        }
      `}</style>
    </div>
  )
}
