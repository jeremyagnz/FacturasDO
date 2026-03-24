export interface Company {
  id: string;
  rnc: string;
  name: string;
  type: 'FISICA' | 'JURIDICA';
  logo?: string;
  certificate?: string;
  privateKey?: string;
  ownerId: string;
  employeeIds?: string[];
}

export interface Invoice {
  id: string;
  companyId: string;
  ecf: string;
  type: string;
  customerRnc: string;
  customerName: string;
  date: string;
  subtotal: number;
  itbis: number;
  total: number;
  status: 'PENDING' | 'SIGNED' | 'ACCEPTED' | 'REJECTED' | 'CONTINGENCY';
  signedXml?: string;
  trackId?: string;
  dgiiMessage?: string;
  items: Array<{
    description: string;
    quantity: number;
    price: number;
    itbis: number;
  }>;
}

export interface User {
  uid: string;
  email: string;
  name: string;
  role: 'PLATFORM_ADMIN' | 'COMPANY_ADMIN' | 'INVOICE_EDITOR' | 'READ_ONLY';
  activeCompanyId?: string;
  subscriptionId?: string;
  companyIds?: string[];
  ownerId?: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  invoiceLimit: number;
  companyLimit: number;
  features: string[];
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'ACTIVE' | 'active' | 'canceled' | 'past_due' | 'trialing';
  startDate: string;
  endDate: string;
  stripeSubscriptionId?: string;
  invoiceCount: number;
  companyCount: number;
  autoRenew: boolean;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  details?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  companyId?: string;
}

export interface DgiiResponse {
  id: string;
  invoiceId: string;
  timestamp: string;
  status: 'ACCEPTED' | 'REJECTED' | 'ERROR';
  message: string;
  xmlResponse?: string;
}

export interface RevenueMetric {
  id: string;
  date: string;
  amount: number;
  currency: string;
}

export interface Certificate {
  id: string;
  companyId: string;
  expirationDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  thumbprint: string;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  rnc: string;
  email?: string;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  price: number;
  itbis: number; // Percentage (e.g., 18)
  category?: string;
  unit?: string;
}
