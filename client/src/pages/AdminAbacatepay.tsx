import React, { useState, useMemo } from 'react';
import { PersonalsTable } from '@/components/PersonalsTable';
import DashboardLayout from '@/components/DashboardLayout';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export const AdminAbacatepayPage: React.FC = () => {
  const [filters, setFilters] = useState<any>({
    planFilter: 'all',
    originFilter: 'all',
    search: '',
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const { data: personalsData, isLoading, refetch } = trpc.admin.listPersonals.useQuery(filters);

  const convertToCourtesyMutation = trpc.admin.convertToProCourtesy.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao converter para cortesia: ' + error.message);
    },
  });

  const cancelSubscriptionMutation = trpc.admin.cancelProSubscription.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao cancelar assinatura: ' + error.message);
    },
  });

  const grantTrialMutation = trpc.admin.grantTrial.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error('Erro ao conceder trial: ' + error.message);
    },
  });

  const handleConvertToCourtesy = async (personalId: number) => {
    convertToCourtesyMutation.mutate({ personalId });
  };

  const handleCancelSubscription = async (personalId: number) => {
    if (!confirm('Tem certeza que deseja cancelar a assinatura?')) return;
    cancelSubscriptionMutation.mutate({ personalId });
  };

  const handleGrantTrial = async (personalId: number) => {
    grantTrialMutation.mutate({ personalId });
  };

  const personals = useMemo(() => {
    if (!personalsData) return [];
    return personalsData.map((p: any) => ({
      ...p,
      subscriptionPlan: p.plan,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      proExpiresAt: p.expiresAt ? new Date(p.expiresAt) : null,
    }));
  }, [personalsData]);

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
