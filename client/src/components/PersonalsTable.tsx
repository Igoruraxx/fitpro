import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Personal {
  id: number;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  subscriptionPlan: 'free' | 'pro';
  proSource?: 'payment' | 'courtesy' | 'trial' | null;
  proExpiresAt?: Date | null;
  clientCount: number;
}

interface PersonalsTableProps {
  personals: Personal[];
  isLoading: boolean;
  onConvertToCourtesy: (personalId: number) => void;
  onCancelSubscription: (personalId: number) => void;
  onGrantTrial: (personalId: number) => void;
  filters: {
    planFilter: 'all' | 'free' | 'pro';
    originFilter: 'all' | 'payment' | 'courtesy' | 'trial';
    search: string;
    sortBy: 'name' | 'clients' | 'created' | 'expires';
    sortOrder: 'asc' | 'desc';
  };
  onFiltersChange: (filters: PersonalsTableProps['filters']) => void;
}

const getPlanBadgeColor = (plan: 'free' | 'pro', origin?: string | null) => {
  if (plan === 'free') {
    return 'bg-green-100 text-green-800';
  }

  switch (origin) {
    case 'courtesy':
      return 'bg-purple-100 text-purple-800';
    case 'trial':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getOriginLabel = (origin?: string | null) => {
  switch (origin) {
    case 'courtesy':
      return 'Cortesia';
    case 'trial':
      return 'Trial 7 dias';
    default:
      return '—';
  }
};

const getTrialDaysRemaining = (expiresAt?: Date | null) => {
  if (!expiresAt) return null;
  const now = new Date();
  const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysRemaining > 0 ? daysRemaining : 0;
};

export const PersonalsTable: React.FC<PersonalsTableProps> = ({
  personals,
  isLoading,
  onConvertToCourtesy,
  onCancelSubscription,
  onGrantTrial,
  filters,
  onFiltersChange,
}) => {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const handleFilterChange = (key: keyof PersonalsTableProps['filters'], value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div>
            <label className="text-sm font-medium">Buscar</label>
            <Input
              placeholder="Nome ou email..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Plan Filter */}
          <div>
            <label className="text-sm font-medium">Plano</label>
            <Select value={filters.planFilter} onValueChange={(value) => handleFilterChange('planFilter', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Origin Filter */}
          <div>
            <label className="text-sm font-medium">Origem</label>
            <Select value={filters.originFilter} onValueChange={(value) => handleFilterChange('originFilter', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="courtesy">Cortesia</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort By */}
          <div>
            <label className="text-sm font-medium">Ordenar por</label>
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="clients">Clientes</SelectItem>
                <SelectItem value="created">Data criação</SelectItem>
                <SelectItem value="expires">Expiração</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Order */}
          <div>
            <label className="text-sm font-medium">Ordem</label>
            <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="asc">Crescente</SelectItem>
                <SelectItem value="desc">Decrescente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Clientes</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Expiração</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : personals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  Nenhum personal encontrado
                </TableCell>
              </TableRow>
            ) : (
              personals.map((personal) => {
                const daysRemaining = getTrialDaysRemaining(personal.proExpiresAt);
                const isTrialExpiringSoon = personal.proSource === 'trial' && daysRemaining !== null && daysRemaining < 3;

                return (
                  <React.Fragment key={personal.id}>
                    <TableRow className="hover:bg-gray-50">
                      <TableCell className="font-medium">{personal.name}</TableCell>
                      <TableCell className="text-sm text-gray-600">{personal.email}</TableCell>
                      <TableCell className="text-center">{personal.clientCount}</TableCell>
                      <TableCell>
                        <Badge className={getPlanBadgeColor(personal.subscriptionPlan, personal.proSource)}>
                          {personal.subscriptionPlan === 'free' ? 'Free' : 'Pro'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${
                            personal.subscriptionPlan === 'pro'
                              ? getPlanBadgeColor(personal.subscriptionPlan, personal.proSource)
                              : 'bg-gray-50'
                          }`}
                        >
                          {getOriginLabel(personal.proSource)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {personal.proExpiresAt ? (
                          <div className="text-sm">
                            <div>{format(new Date(personal.proExpiresAt), 'dd/MM/yyyy', { locale: ptBR })}</div>
                            {isTrialExpiringSoon && (
                              <div className="text-orange-600 font-semibold text-xs">
                                {daysRemaining} dia{daysRemaining !== 1 ? 's' : ''} restante{daysRemaining !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedRow(expandedRow === personal.id ? null : personal.id)}
                        >
                          {expandedRow === personal.id ? 'Ocultar' : 'Ações'}
                        </Button>
                      </TableCell>
                    </TableRow>

                    {/* Expanded Row with Actions */}
                    {expandedRow === personal.id && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={7}>
                          <div className="space-y-4 py-4">
                            {/* Actions */}
                            <div className="flex gap-2 flex-wrap">
                              {personal.subscriptionPlan === 'free' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onGrantTrial(personal.id)}
                                  >
                                    Conceder Trial
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onConvertToCourtesy(personal.id)}
                                  >
                                    Converter para Cortesia
                                  </Button>
                                </>
                              )}

                              {personal.subscriptionPlan === 'pro' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onCancelSubscription(personal.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Cancelar Assinatura
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onConvertToCourtesy(personal.id)}
                                  >
                                    Converter para Cortesia
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};
