'use client'

import { Shield, Eye, Lock, FileText, Calendar, Users, Database } from 'lucide-react'

const lastUpdated = "December 15, 2024"

const privacySections = [
  {
    title: "Information We Collect",
    icon: Database,
    content: [
      {
        subtitle: "Personal Information",
        items: [
          "Full name and contact information",
          "Date of birth and gender",
          "Social Security Number (for verification)",
          "Address and location data",
          "Phone number and email address"
        ]
      },
      {
        subtitle: "Financial Information",
        items: [
          "Account balances and transaction history",
          "Payment information and banking details",
          "Investment portfolio data",
          "Loan application information",
          "Credit and debit card details"
        ]
      },
      {
        subtitle: "Technical Information",
        items: [
          "IP address and device information",
          "Browser type and version",
          "Operating system details",
          "Usage patterns and preferences",
          "Cookies and tracking data"
        ]
      }
    ]
  },
  {
    title: "How We Use Your Information",
    icon: Eye,
    content: [
      {
        subtitle: "Account Management",
        items: [
          "Process account applications and transactions",
          "Verify your identity and prevent fraud",
          "Provide customer support and services",
          "Send important account notifications",
          "Maintain and improve our services"
        ]
      },
      {
        subtitle: "Security and Compliance",
        items: [
          "Detect and prevent fraudulent activity",
          "Comply with legal and regulatory requirements",
          "Conduct security audits and monitoring",
          "Investigate suspicious transactions",
          "Protect against unauthorized access"
        ]
      },
      {
        subtitle: "Service Improvement",
        items: [
          "Analyze usage patterns to improve services",
          "Develop new features and products",
          "Personalize your banking experience",
          "Conduct research and analytics",
          "Provide relevant recommendations"
        ]
      }
    ]
  },
  {
    title: "Information Sharing",
    icon: Users,
    content: [
      {
        subtitle: "We Do Not Sell Your Data",
        items: [
          "We never sell, rent, or trade your personal information",
          "Your data is not shared with third-party advertisers",
          "We do not use your information for marketing without consent",
          "Your privacy is our top priority"
        ]
      },
      {
        subtitle: "Limited Sharing for Services",
        items: [
          "Share with service providers who assist our operations",
          "Comply with legal requirements and court orders",
          "Protect against fraud and security threats",
          "Process transactions and payments",
          "Provide customer support services"
        ]
      },
      {
        subtitle: "Your Control",
        items: [
          "You can opt out of non-essential communications",
          "Request access to your personal information",
          "Correct inaccurate information",
          "Delete your account and data (with limitations)",
          "Control cookie preferences"
        ]
      }
    ]
  }
]

const dataRetention = [
  {
    category: "Account Information",
    retention: "Retained while account is active and for 7 years after closure",
    reason: "Legal compliance and fraud prevention"
  },
  {
    category: "Transaction Records",
    retention: "Retained for 7 years from transaction date",
    reason: "Tax and regulatory requirements"
  },
  {
    category: "Security Logs",
    retention: "Retained for 2 years",
    reason: "Security monitoring and incident investigation"
  },
  {
    category: "Marketing Data",
    retention: "Retained until you opt out or for 3 years",
    reason: "Marketing and service improvement"
  }
]

const yourRights = [
  {
    title: "Access Your Data",
    description: "Request a copy of all personal information we hold about you",
    icon: FileText
  },
  {
    title: "Correct Information",
    description: "Update or correct any inaccurate personal information",
    icon: FileText
  },
  {
    title: "Delete Your Data",
    description: "Request deletion of your personal information (with limitations)",
    icon: FileText
  },
  {
    title: "Opt Out",
    description: "Opt out of marketing communications and data sharing",
    icon: FileText
  },
  {
    title: "Data Portability",
    description: "Request your data in a portable format",
    icon: FileText
  },
  {
    title: "Lodge Complaints",
    description: "File complaints with relevant data protection authorities",
    icon: FileText
  }
]

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-dark to-primary-navy text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto">
              Learn how we collect, use, and protect your personal information
            </p>
            <div className="mt-6 flex items-center justify-center text-gray-300">
              <Calendar className="w-5 h-5 mr-2" />
              <span>Last updated: {lastUpdated}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Introduction */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Introduction
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            At PrimeTrust, we are committed to protecting your privacy and ensuring the security of your personal information. 
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our banking services.
          </p>
          <p className="text-gray-600 leading-relaxed">
            By using our services, you agree to the collection and use of information in accordance with this policy. 
            We will not use or share your information with anyone except as described in this Privacy Policy.
          </p>
        </div>

        {/* Privacy Sections */}
        {privacySections.map((section, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <section.icon className="w-6 h-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {section.title}
              </h2>
            </div>
            
            <div className="space-y-6">
              {section.content.map((content, contentIndex) => (
                <div key={contentIndex}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {content.subtitle}
                  </h3>
                  <ul className="space-y-2">
                    {content.items.map((item, itemIndex) => (
                      <li key={itemIndex} className="flex items-start">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                        <span className="text-gray-600">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Data Retention */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Data Retention</h2>
          <div className="space-y-4">
            {dataRetention.map((item, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-1">{item.category}</h3>
                <p className="text-gray-600 text-sm mb-1">
                  <span className="font-medium">Retention:</span> {item.retention}
                </p>
                <p className="text-gray-500 text-sm">
                  <span className="font-medium">Reason:</span> {item.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Your Rights */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Rights</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {yourRights.map((right, index) => (
              <div key={index} className="flex items-start">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                  <right.icon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{right.title}</h3>
                  <p className="text-gray-600 text-sm">{right.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Measures */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <Lock className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900">Security Measures</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Data Protection</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• 256-bit encryption for all data transmission</li>
                <li>• Secure data centers with 24/7 monitoring</li>
                <li>• Regular security audits and penetration testing</li>
                <li>• Access controls and authentication requirements</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Employee Training</h3>
              <ul className="space-y-2 text-gray-600 text-sm">
                <li>• Regular privacy and security training</li>
                <li>• Background checks for all employees</li>
                <li>• Confidentiality agreements and policies</li>
                <li>• Limited access to personal information</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-blue-50 rounded-lg p-8 border border-blue-200">
          <h2 className="text-2xl font-semibold text-blue-900 mb-4">Contact Us</h2>
          <p className="text-blue-700 mb-4">
            If you have any questions about this Privacy Policy or our data practices, please contact us:
          </p>
          <div className="space-y-2 text-blue-700">
            <p><strong>Email:</strong> privacy@primetrust.com</p>
            <p><strong>Phone:</strong> 1-800-PRIME-TRUST</p>
            <p><strong>Address:</strong> 123 Financial District, New York, NY 10001</p>
          </div>
          <div className="mt-6">
            <a
              href="/contact-us"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
            >
              Contact Privacy Team
            </a>
          </div>
        </div>
      </div>
    </div>
  )
} 