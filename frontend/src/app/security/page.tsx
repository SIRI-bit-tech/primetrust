'use client'

import { Shield, Lock, Eye, Key, AlertTriangle, CheckCircle, Smartphone, Monitor } from 'lucide-react'

const securityFeatures = [
  {
    icon: Shield,
    title: "256-bit Encryption",
    description: "All data is encrypted using industry-standard 256-bit encryption to ensure your information remains secure and private."
  },
  {
    icon: Lock,
    title: "Multi-Factor Authentication",
    description: "Add an extra layer of security with SMS codes, authenticator apps, or biometric authentication."
  },
  {
    icon: Eye,
    title: "Real-Time Monitoring",
    description: "Our advanced fraud detection system monitors your account 24/7 for any suspicious activity."
  },
  {
    icon: Key,
    title: "Secure Token Authentication",
    description: "We use JWT tokens with automatic refresh to maintain secure sessions without compromising convenience."
  }
]

const securityTips = [
  {
    title: "Use Strong Passwords",
    description: "Create unique passwords with a mix of letters, numbers, and special characters. Never reuse passwords across different accounts.",
    icon: CheckCircle
  },
  {
    title: "Enable Two-Factor Authentication",
    description: "Add an extra layer of protection by enabling 2FA on your account. This prevents unauthorized access even if your password is compromised.",
    icon: CheckCircle
  },
  {
    title: "Monitor Your Account",
    description: "Regularly check your account activity and transaction history. Report any suspicious activity immediately.",
    icon: CheckCircle
  },
  {
    title: "Keep Your Device Secure",
    description: "Use updated antivirus software, keep your operating system current, and avoid accessing your account on public Wi-Fi networks.",
    icon: CheckCircle
  },
  {
    title: "Be Wary of Phishing",
    description: "Never click on suspicious links or provide personal information in response to unsolicited emails or messages.",
    icon: AlertTriangle
  },
  {
    title: "Log Out Properly",
    description: "Always log out of your account when using shared devices and clear your browser cache regularly.",
    icon: CheckCircle
  }
]

const securityMeasures = [
  {
    category: "Data Protection",
    measures: [
      "End-to-end encryption for all data transmission",
      "Secure data centers with 24/7 monitoring",
      "Regular security audits and penetration testing",
      "Compliance with industry security standards"
    ]
  },
  {
    category: "Account Security",
    measures: [
      "Multi-factor authentication options",
      "Session timeout and automatic logout",
      "Failed login attempt monitoring",
      "Account freeze capabilities for suspicious activity"
    ]
  },
  {
    category: "Transaction Security",
    measures: [
      "Real-time fraud detection algorithms",
      "Transaction amount limits and alerts",
      "Secure payment processing protocols",
      "Encrypted communication channels"
    ]
  }
]

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-dark to-primary-navy text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Security</h1>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto">
              Your security is our top priority. Learn about the measures we take to protect your account and data.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Security Features */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Our Security Features
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {securityFeatures.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center hover:shadow-md transition-shadow"
              >
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Security Tips */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Security Best Practices
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {securityTips.map((tip, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mr-4 ${
                    tip.icon === AlertTriangle ? 'bg-yellow-100' : 'bg-green-100'
                  }`}>
                    <tip.icon className={`w-4 h-4 ${
                      tip.icon === AlertTriangle ? 'text-yellow-600' : 'text-green-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      {tip.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {tip.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Measures */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            How We Protect You
          </h2>
          <div className="grid lg:grid-cols-3 gap-8">
            {securityMeasures.map((section, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {section.category}
                </h3>
                <ul className="space-y-3">
                  {section.measures.map((measure, measureIndex) => (
                    <li key={measureIndex} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-600 text-sm">{measure}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Security Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Your Security Status
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-green-900 mb-1">Account Verified</h3>
              <p className="text-green-700 text-sm">Your account is fully verified</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Lock className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-blue-900 mb-1">Encryption Active</h3>
              <p className="text-blue-700 text-sm">All data is encrypted</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Monitor className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-purple-900 mb-1">Monitoring Active</h3>
              <p className="text-purple-700 text-sm">24/7 fraud monitoring</p>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Smartphone className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-semibold text-orange-900 mb-1">2FA Available</h3>
              <p className="text-orange-700 text-sm">Enable for extra security</p>
            </div>
          </div>
        </div>

        {/* Contact Security Team */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-8 border border-red-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-semibold text-red-900 mb-4">
              Report Security Issues
            </h2>
            <p className="text-red-700 mb-6 max-w-2xl mx-auto">
              If you notice any suspicious activity or have security concerns, 
              contact our security team immediately. We take all security reports seriously.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact-us"
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
              >
                Contact Security Team
              </a>
              <a
                href="tel:1-800-PRIME-TRUST"
                className="bg-white text-red-600 px-6 py-3 rounded-lg font-semibold border border-red-600 hover:bg-red-50 transition-colors"
              >
                Emergency Hotline
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 