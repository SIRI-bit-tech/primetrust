'use client'

import { Users, Target, Award, Globe, TrendingUp, Heart, Shield, Zap } from 'lucide-react'

const companyStats = [
  {
    number: "1M+",
    label: "Active Customers",
    icon: Users
  },
  {
    number: "$50B+",
    label: "Assets Under Management",
    icon: TrendingUp
  },
  {
    number: "99.9%",
    label: "Uptime",
    icon: Shield
  },
  {
    number: "24/7",
    label: "Customer Support",
    icon: Heart
  }
]

const values = [
  {
    icon: Shield,
    title: "Security First",
    description: "We prioritize the security of your financial data above everything else, using industry-leading encryption and security measures."
  },
  {
    icon: Users,
    title: "Customer Centric",
    description: "Our customers are at the heart of everything we do. We build products and services that truly serve their needs."
  },
  {
    icon: Zap,
    title: "Innovation",
    description: "We continuously innovate to provide cutting-edge banking solutions that make managing your money easier and more efficient."
  },
  {
    icon: Globe,
    title: "Accessibility",
    description: "We believe financial services should be accessible to everyone, regardless of their background or location."
  }
]

const milestones = [
  {
    year: "2020",
    title: "Company Founded",
    description: "PrimeTrust was founded with a vision to revolutionize digital banking and make financial services more accessible."
  },
  {
    year: "2021",
    title: "First 100,000 Customers",
    description: "Reached our first major milestone with 100,000 active customers using our platform."
  },
  {
    year: "2022",
    title: "Investment Platform Launch",
    description: "Expanded our services to include investment options, allowing customers to grow their wealth."
  },
  {
    year: "2023",
    title: "Mobile App Launch",
    description: "Launched our award-winning mobile app, providing banking services on the go."
  },
  {
    year: "2024",
    title: "1 Million Customers",
    description: "Celebrated reaching 1 million active customers and expanded our service offerings."
  }
]

const team = [
  {
    name: "Sarah Johnson",
    role: "Chief Executive Officer",
    bio: "Former VP at Goldman Sachs with 15+ years in fintech. Passionate about making banking accessible to everyone.",
    image: "/api/placeholder/150/150"
  },
  {
    name: "Michael Chen",
    role: "Chief Technology Officer",
    bio: "Ex-Google engineer with expertise in scalable systems and security. Leads our technology innovation efforts.",
    image: "/api/placeholder/150/150"
  },
  {
    name: "Emily Rodriguez",
    role: "Chief Financial Officer",
    bio: "CPA with 12+ years in financial services. Ensures our financial stability and regulatory compliance.",
    image: "/api/placeholder/150/150"
  },
  {
    name: "David Thompson",
    role: "Chief Security Officer",
    bio: "Cybersecurity expert with background in military intelligence. Protects our customers' data and assets.",
    image: "/api/placeholder/150/150"
  }
]

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-dark to-primary-navy text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">About PrimeTrust</h1>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto">
              We&apos;re on a mission to make banking more accessible, secure, and user-friendly for everyone. 
              Join us in building the future of financial services.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Mission Statement */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-12">
          <div className="text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Target className="w-10 h-10 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Mission</h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
              To democratize financial services by providing secure, accessible, and innovative banking solutions 
              that empower individuals and businesses to achieve their financial goals. We believe everyone deserves 
              access to modern banking tools that make managing money simple, transparent, and rewarding.
            </p>
          </div>
        </div>

        {/* Company Stats */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {companyStats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-2">{stat.number}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Values */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Values</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <value.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{value.title}</h3>
                    <p className="text-gray-600">{value.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Company History */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Our Journey</h2>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-blue-200"></div>
            
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div key={index} className="relative flex items-start">
                  {/* Timeline dot */}
                  <div className="absolute left-6 w-4 h-4 bg-blue-600 rounded-full border-4 border-white shadow-sm"></div>
                  
                  <div className="ml-16 bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-lg font-bold text-blue-600 mr-3">{milestone.year}</span>
                      <h3 className="text-xl font-semibold text-gray-900">{milestone.title}</h3>
                    </div>
                    <p className="text-gray-600">{milestone.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Leadership Team */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Leadership Team</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center"
              >
                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-blue-600 font-medium mb-3">{member.role}</p>
                <p className="text-gray-600 text-sm">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Awards & Recognition */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Awards & Recognition</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Best Digital Bank 2024</h3>
                <p className="text-gray-600 text-sm">Financial Technology Awards</p>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Top Security Innovation</h3>
                <p className="text-gray-600 text-sm">Cybersecurity Excellence Awards</p>
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Customer Satisfaction</h3>
                <p className="text-gray-600 text-sm">JD Power Banking Study</p>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-primary-dark to-primary-navy rounded-lg p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Join the Future of Banking</h2>
          <p className="text-xl text-gray-200 mb-6 max-w-2xl mx-auto">
            Experience the difference that modern, secure, and user-friendly banking can make in your financial life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register"
              className="bg-white text-primary-dark px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Get Started Today
            </a>
            <a
              href="/contact-us"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-primary-dark transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 