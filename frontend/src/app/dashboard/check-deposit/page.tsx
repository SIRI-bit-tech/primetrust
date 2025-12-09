'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import CheckDepositForm from '@/components/CheckDepositForm'
import CheckDepositHistory from '@/components/CheckDepositHistory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileCheck, History } from 'lucide-react'

export default function CheckDepositPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  const handleDepositSuccess = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Check Deposit</h1>
          <p className="text-muted-foreground mt-1">
            Deposit checks instantly using your mobile device
          </p>
        </div>

        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="deposit" className="flex items-center gap-2">
              <FileCheck className="w-4 h-4" />
              New Deposit
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Deposit a Check</CardTitle>
              </CardHeader>
              <CardContent>
                <CheckDepositForm onSuccess={handleDepositSuccess} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <CheckDepositHistory key={refreshKey} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
