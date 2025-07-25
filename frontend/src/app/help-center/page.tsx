'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Search, MessageCircle, Phone, Mail, FileText } from 'lucide-react'
import Link from 'next/link'

interface FAQItem {
  question: string
  answer: string
  category: string
}

const faqs: FAQItem[] = [
  // Account Management
  {
    question: "How do I create a new account?",
    answer: "To create a new account, click the 'Get Started' button on our homepage and follow the registration process. You'll need to provide your personal information, verify your email, and set up your security preferences.",
    category: "Account Management"
  },
  {
    question: "How do I reset my password?",
    answer: "If you've forgotten your password, click 'Forgot Password' on the login page. We'll send you a secure link to reset your password. Make sure to check your email and spam folder.",
    category: "Account Management"
  },
  {
    question: "How do I update my personal information?",
    answer: "You can update your personal information by going to your Profile page in the dashboard. Click on 'Edit Profile' and make the necessary changes. Some changes may require additional verification.",
    category: "Account Management"
  },
  // Banking Services
  {
    question: "How do I transfer money?",
    answer: "To transfer money, go to the 'Transfer Money' section in your dashboard. Enter the recipient's email address and the amount you want to send. Review the details and confirm the transfer.",
    category: "Banking Services"
  },
  {
    question: "How do I get a virtual card?",
    answer: "You can generate a new virtual card from the 'Virtual Cards' section in your dashboard. Click 'Generate New Card' and your card will be created instantly with a unique card number.",
    category: "Banking Services"
  },
  {
    question: "What are the transfer limits?",
    answer: "Transfer limits vary based on your account type and verification level. Standard accounts have a daily limit of $1,000 and monthly limit of $10,000. Premium accounts have higher limits.",
    category: "Banking Services"
  },
  // Security
  {
    question: "How secure is my account?",
    answer: "Your account is protected by bank-level 256-bit encryption, multi-factor authentication, and real-time fraud monitoring. We also use secure token-based authentication and regular security audits.",
    category: "Security"
  },
  {
    question: "What should I do if I notice suspicious activity?",
    answer: "If you notice any suspicious activity, immediately contact our support team. You can also freeze your account temporarily from the Security settings in your profile.",
    category: "Security"
  },
  {
    question: "How do I enable two-factor authentication?",
    answer: "To enable two-factor authentication, go to your Profile > Security settings. Follow the setup process to link your phone number or authenticator app for additional security.",
    category: "Security"
  },
  // Investments
  {
    question: "How do I start investing?",
    answer: "To start investing, visit the 'Investments' section in your dashboard. You can browse available investment options, view market data, and make your first investment with as little as $10.",
    category: "Investments"
  },
  {
    question: "What investment options are available?",
    answer: "We offer a variety of investment options including stocks, ETFs, and cryptocurrency. Each investment type has different risk levels and potential returns. You can view detailed information for each option.",
    category: "Investments"
  },
  {
    question: "How do I track my investment performance?",
    answer: "You can track your investment performance in real-time through the 'Investments' dashboard. View your portfolio value, individual investment performance, and historical data.",
    category: "Investments"
  },
  // Loans
  {
    question: "How do I apply for a loan?",
    answer: "To apply for a loan, go to the 'Loans' section in your dashboard. Fill out the application form with your personal and financial information. We'll review your application and get back to you within 24 hours.",
    category: "Loans"
  },
  {
    question: "What are the loan requirements?",
    answer: "Loan requirements include being at least 18 years old, having a verified account, and meeting our credit criteria. The specific requirements vary based on the loan amount and type.",
    category: "Loans"
  },
  {
    question: "How do I make loan payments?",
    answer: "You can make loan payments from the 'Loans' section in your dashboard. Select your loan and click 'Make Payment' to pay the minimum amount or pay off the entire balance.",
    category: "Loans"
  },
  // Bills
  {
    question: "How do I add a bill?",
    answer: "To add a bill, go to the 'Pay Bills' section in your dashboard. Click 'Add New Bill' and enter the biller information, account number, amount, and due date. You can also set up recurring payments.",
    category: "Bills"
  },
  {
    question: "Can I set up automatic bill payments?",
    answer: "Yes, you can set up automatic bill payments when adding a new bill. Simply check the 'Recurring Payment' option and select the frequency (monthly, quarterly, or annually).",
    category: "Bills"
  },
  {
    question: "How do I cancel a scheduled bill payment?",
    answer: "To cancel a scheduled bill payment, go to the 'Pay Bills' section and find the bill in your list. Click on the bill and select 'Cancel Payment' if it hasn't been processed yet.",
    category: "Bills"
  }
]

const categories = ["All", "Account Management", "Banking Services", "Security", "Investments", "Loans", "Bills"]

export default function HelpCenterPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [expandedItems, setExpandedItems] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  const filteredFaqs = faqs.filter(faq => {
    const matchesCategory = selectedCategory === "All" || faq.category === selectedCategory
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const toggleItem = (index: number) => {
    setExpandedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-dark to-primary-navy text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Help Center</h1>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto">
              Find answers to your questions and get the support you need
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-dark focus:border-transparent"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-dark text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-semibold text-gray-900">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-600 mt-2">
              {filteredFaqs.length} questions found
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {filteredFaqs.map((faq, index) => (
              <div key={index} className="p-6">
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {faq.question}
                    </h3>
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                      {faq.category}
                    </span>
                  </div>
                  {expandedItems.includes(index) ? (
                    <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0 ml-4" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0 ml-4" />
                  )}
                </button>
                {expandedItems.includes(index) && (
                  <div className="mt-4 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Still Need Help?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Live Chat</h3>
              <p className="text-gray-600 text-sm mb-3">
                Chat with our support team in real-time
              </p>
              <button className="text-primary-dark hover:text-primary-navy font-medium text-sm">
                Start Chat
              </button>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
              <p className="text-gray-600 text-sm mb-3">
                Call us at 1-800-PRIME-TRUST
              </p>
              <p className="text-gray-500 text-xs">
                Available 24/7
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
              <p className="text-gray-600 text-sm mb-3">
                Send us an email for detailed assistance
              </p>
              <a 
                href="mailto:support@primetrust.com" 
                className="text-primary-dark hover:text-primary-navy font-medium text-sm"
              >
                support@primetrust.com
              </a>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Quick Links
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <Link href="/security" className="text-primary-dark hover:text-primary-navy">
              Security Information
            </Link>
            <Link href="/privacy-policy" className="text-primary-dark hover:text-primary-navy">
              Privacy Policy
            </Link>
            <Link href="/contact-us" className="text-primary-dark hover:text-primary-navy">
              Contact Us
            </Link>
            <Link href="/about-us" className="text-primary-dark hover:text-primary-navy">
              About PrimeTrust
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
} 