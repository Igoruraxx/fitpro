import React, { useState } from 'react';
import { PersonalsTable } from '@/components/PersonalsTable';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/DashboardLayout';

interface Personal {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  subscriptionPlan: 'free' | 'pro';
  proSource?: 'payment' | 'courtesy' | 'trial' | null;
  proExpiresAt?: Date | null;
  lastPaymentDate?: Date | null;
  lastPaymentAmount?: string | null;
  lastPaymentId?: string | null;
  clientCount: number;
}

export const AdminAbacatepayPage: React.FC = () => {
  const [personals, setPersonals] = useState<Personal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState<any>({
    planFilter: 'all',
    originFilter: 'all',
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // TODO: Replace with actual tRPC call
  // const { data, isLoading } = trpc.admin.listPersonals.useQuery(filters);

  const handleConvertToCourtesy = async (personalId: number) => {
    try {
      // TODO: Call tRPC mutation
      console.log('Converting personal to courtesy:', personalId);
    } catch (error) {
      console.error('Error converting personal:', error);
    }
  };

  const handleCancelSubscription = async (personalId: number) => {
    if (!confirm('Tem certeza que deseja cancelar a assinatura?')) return;

    try {
      // TODO: Call tRPC mutation
      console.log('Cancelling subscription:', personalId);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  const handleGrantTrial = async (personalId: number) => {
    try {
      // TODO: Call tRPC mutation
      console.log('Granting trial:', personalId);
    } catch (error) {
      console.error('Error granting trial:', error);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Personals</h1>
          <p className="text-gray-600 mt-2">
            Gerenciar planos PRO/FREE, trials, cortesias e pagamentos via AbacatePay
          </p>
        </div>

        <PersonalsTable
          personals={personals}
          isLoading={isLoading}
          onConvertToCourtesy={handleConvertToCourtesy}
          onCancelSubscription={handleCancelSubscription}
          onGrantTrial={handleGrantTrial}
          filters={filters}
          onFiltersChange={setFilters}
        />
      </div>
    </DashboardLayout>
  );
};

export default AdminAbacatepayPage;
