/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, Component } from 'react';
import QRCode from 'qrcode';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings, 
  Plus, 
  Search, 
  Bell, 
  LogOut, 
  ChevronRight,
  ChevronDown,
  User as UserIcon,
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Download,
  Filter,
  FileCode,
  ShieldCheck,
  Key,
  QrCode,
  Crown,
  CreditCard,
  Activity,
  BarChart3,
  History,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Check,
  X,
  Trash2,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRScanner from './components/QRScanner';
import { SystemLogs } from './components/SystemLogs';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup,
  signOut, 
  onAuthStateChanged, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  FirebaseUser,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  or,
  documentId,
  onSnapshot,
  getDocs,
  OperationType,
  handleFirestoreError
} from './firebase';
import { Company, Invoice, User, Customer, Plan, Subscription, SystemLog, DgiiResponse, RevenueMetric, Certificate, Product } from './types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200' 
        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ label, value, icon: Icon, trend, color }: { label: string, value: string, icon: any, trend?: string, color: string }) => (
  <div className="glass-card p-6 rounded-2xl flex flex-col gap-4">
    <div className="flex justify-between items-start">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={color.replace('bg-', 'text-')} size={24} />
      </div>
      {trend && (
        <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
          <TrendingUp size={12} /> {trend}
        </span>
      )}
    </div>
    <div>
      <p className="text-sm text-zinc-500 font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-zinc-900 mt-1">{value}</h3>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: Invoice['status'] }) => {
  const configs = {
    PENDING: { color: 'text-amber-600 bg-amber-50', icon: Clock, label: 'Pendiente' },
    SIGNED: { color: 'text-blue-600 bg-blue-50', icon: CheckCircle2, label: 'Firmado' },
    ACCEPTED: { color: 'text-emerald-600 bg-emerald-50', icon: CheckCircle2, label: 'Aceptado' },
    REJECTED: { color: 'text-rose-600 bg-rose-50', icon: AlertCircle, label: 'Rechazado' },
    CONTINGENCY: { color: 'text-orange-600 bg-orange-50', icon: AlertCircle, label: 'Contingencia' },
  };
  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] lg:text-xs font-semibold ${config.color}`}>
      <Icon size={12} className="lg:w-3.5 lg:h-3.5" />
      {config.label}
    </span>
  );
};

const InvoiceItemMobile: React.FC<{ 
  invoice: Invoice; 
  onDownload?: (id: string) => void;
  onDownloadXml?: (invoice: Invoice) => void;
  onSign?: (invoice: Invoice) => void;
}> = ({ invoice, onDownload, onDownloadXml, onSign }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-4 flex flex-col gap-3 hover:bg-zinc-50 transition-all cursor-pointer border-b border-zinc-100" onClick={() => setIsExpanded(!isExpanded)}>
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{invoice.ecf}</span>
            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-medium">{invoice.type}</span>
          </div>
          <span className="text-sm font-bold text-zinc-900 mt-1">{invoice.customerName}</span>
          <span className="text-[10px] text-zinc-500 mt-0.5">RNC: {invoice.customerRnc}</span>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={invoice.status} />
          <span className="text-sm font-bold text-zinc-900">RD$ {(invoice.total || 0).toLocaleString()}</span>
          <span className="text-[10px] text-zinc-500">{new Date(invoice.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
        </div>
      </div>
      
      {isExpanded && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="pt-3 border-t border-zinc-100 flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-zinc-500">Subtotal:</div>
            <div className="text-zinc-900 font-medium text-right">RD$ {(invoice.subtotal || 0).toLocaleString()}</div>
            <div className="text-zinc-500">ITBIS:</div>
            <div className="text-zinc-900 font-medium text-right">RD$ {(invoice.itbis || 0).toLocaleString()}</div>
          </div>
          
          {(invoice.status === 'REJECTED' || invoice.status === 'CONTINGENCY') && invoice.dgiiMessage && (
            <div className="text-[10px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-100">
              {invoice.dgiiMessage}
            </div>
          )}
          
          <div className="flex items-center justify-end gap-2 pt-2">
            {onDownload && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDownload(invoice.id); }}
                className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                title="Descargar PDF"
              >
                <Download size={16} />
              </button>
            )}
            {onDownloadXml && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDownloadXml(invoice); }}
                className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                title="Descargar XML"
              >
                <FileCode size={16} />
              </button>
            )}
            {onSign && invoice.status === 'PENDING' && (
              <button 
                onClick={(e) => { e.stopPropagation(); onSign(invoice); }}
                className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                title="Firmar Factura"
              >
                <ShieldCheck size={16} />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// --- Main App ---

// Error Boundary Component
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorInfo: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorInfo: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    try {
      const info = JSON.parse(error.message);
      return { hasError: true, errorInfo: info };
    } catch {
      return { hasError: true, errorInfo: { error: error.message } };
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle size={40} />
            </div>
            <h2 className="text-2xl font-black text-zinc-900">Algo salió mal</h2>
            <p className="text-zinc-500 font-medium">
              {this.state.errorInfo?.error || "Ocurrió un error inesperado."}
            </p>
            {this.state.errorInfo?.path && (
              <div className="bg-zinc-50 p-4 rounded-2xl text-left">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Detalles Técnicos</p>
                <p className="text-xs font-mono text-zinc-600 mt-1">Ruta: {this.state.errorInfo.path}</p>
                <p className="text-xs font-mono text-zinc-600">Operación: {this.state.errorInfo.operationType}</p>
              </div>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-zinc-200"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

export default function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewCompany, setShowNewCompany] = useState(false);
  const [companyFormData, setCompanyFormData] = useState({ name: '', rnc: '', type: 'JURIDICA' as 'FISICA' | 'JURIDICA' });
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [customerFormData, setCustomerFormData] = useState({
    name: '',
    rnc: '',
    email: ''
  });
  const [productFormData, setProductFormData] = useState({
    name: '',
    price: '',
    itbis: '18',
    category: '',
    unit: 'UNIDAD'
  });
  const [planFormData, setPlanFormData] = useState({
    name: '',
    price: '',
    invoiceLimit: '',
    companyLimit: '',
    features: ''
  });
  const [invoiceFormData, setInvoiceFormData] = useState({
    customerRnc: '',
    customerName: '',
    total: '',
    ecf: '',
    date: '',
    rncEmisor: '',
    razonSocialEmisor: ''
  });
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [userSubscription, setUserSubscription] = useState<Subscription | null>(null);
  const [companyPlan, setCompanyPlan] = useState<Plan | null>(null);
  const [companySubscription, setCompanySubscription] = useState<Subscription | null>(null);

  // Email Auth State
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [emailAuthData, setEmailAuthData] = useState({ email: '', password: '', name: '' });
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleAuthLoading, setGoogleAuthLoading] = useState(false);

  // Owner Panel State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<Subscription[]>([]);
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [dgiiResponses, setDgiiResponses] = useState<DgiiResponse[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState<RevenueMetric[]>([]);
  const [allCertificates, setAllCertificates] = useState<Certificate[]>([]);

  const isAdmin = () => user?.email?.toLowerCase() === 'jeremyagnz@gmail.com';

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const profileUnsubscribeRef = useRef<(() => void) | null>(null);
  const companiesUnsubscribeRef = useRef<(() => void)[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      // Cleanup previous listeners
      if (profileUnsubscribeRef.current) profileUnsubscribeRef.current();
      companiesUnsubscribeRef.current.forEach(unsub => unsub());
      companiesUnsubscribeRef.current = [];
      
      if (firebaseUser) {
        await syncUserProfile(firebaseUser);
      } else {
        // Clear all state
        setUserProfile(null);
        setCompanies([]);
        setActiveCompany(null);
        setInvoices([]);
        setProducts([]);
        setCustomers([]);
        setUserSubscription(null);
        setActivePlan(null);
        setActiveTab('dashboard');
      }
      setLoading(false);
    });
    return () => {
      unsubscribe();
      if (profileUnsubscribeRef.current) profileUnsubscribeRef.current();
      companiesUnsubscribeRef.current.forEach(unsub => unsub());
      companiesUnsubscribeRef.current = [];
    };
  }, []);

  // Sync User Profile & Companies
  const syncUserProfile = async (fbUser: FirebaseUser) => {
    try {
      const userDocRef = doc(db, 'users', fbUser.uid);
      let userDoc = await getDoc(userDocRef);
      
      const isAdminEmail = fbUser.email?.toLowerCase() === 'jeremyagnz@gmail.com';
      
      if (!userDoc.exists()) {
        // Check if invited by email
        let invitedData: User | null = null;
        let invitedDocId: string | null = null;
        let invitedDocRef: any = null;
        
        if (fbUser.email) {
          invitedDocRef = doc(db, 'users', fbUser.email);
          const invitedDoc = await getDoc(invitedDocRef);
          if (invitedDoc.exists()) {
            invitedData = invitedDoc.data() as User;
            invitedDocId = invitedDoc.id;
          }
        }
        
        if (invitedData) {
          // Create the new UID-based document with invited data
          const newProfile = {
            ...invitedData,
            uid: fbUser.uid,
            name: fbUser.displayName || invitedData.name || '',
          };
          
          await setDoc(userDocRef, newProfile);
          
          // Delete the temporary invitation document
          if (invitedDocId !== fbUser.uid && invitedDocRef) {
            await deleteDoc(invitedDocRef);
          }
        } else {
          // New user (not invited)
          const newProfile: User = {
            uid: fbUser.uid,
            email: fbUser.email || '',
            name: fbUser.displayName || '',
            role: isAdminEmail ? 'PLATFORM_ADMIN' : 'COMPANY_ADMIN',
            companyIds: []
          };
          await setDoc(userDocRef, newProfile);
        }
      } else {
        // Update name if it was empty and now we have it
        const currentData = userDoc.data() as User;
        const updates: Partial<User> = {};
        
        if (!currentData.name && fbUser.displayName) {
          updates.name = fbUser.displayName;
        }

        // Check for duplicate email document and merge
        if (fbUser.email) {
          const invitedDocRef = doc(db, 'users', fbUser.email);
          const invitedDoc = await getDoc(invitedDocRef);
          if (invitedDoc.exists() && invitedDoc.id !== fbUser.uid) {
            const invitedData = invitedDoc.data() as User;
            const mergedCompanyIds = Array.from(new Set([...(currentData.companyIds || []), ...(invitedData.companyIds || [])]));
            updates.companyIds = mergedCompanyIds;
            
            // Delete the duplicate document
            await deleteDoc(invitedDocRef);
          }
        }

        if (Object.keys(updates).length > 0) {
          await updateDoc(userDocRef, updates);
        }
      }

      // Real-time listener for profile
      profileUnsubscribeRef.current = onSnapshot(userDocRef, async (docSnap) => {
        if (docSnap.exists()) {
          const profile = docSnap.data() as User;
          
          // Enforce Admin Role
          if (isAdminEmail && profile.role !== 'PLATFORM_ADMIN') {
            await updateDoc(userDocRef, { role: 'PLATFORM_ADMIN' });
            return;
          }
          
          setUserProfile(profile);

          // Fetch Subscription & Plan
          if (profile.subscriptionId) {
            const subDoc = await getDoc(doc(db, 'subscriptions', profile.subscriptionId));
            if (subDoc.exists()) {
              const subData = subDoc.data() as Subscription;
              setUserSubscription(subData);
              const planDoc = await getDoc(doc(db, 'plans', subData.planId));
              if (planDoc.exists()) {
                setActivePlan(planDoc.data() as Plan);
              }
            }
          }

          // Fetch Companies
          companiesUnsubscribeRef.current.forEach(unsub => unsub());
          companiesUnsubscribeRef.current = [];

          if (profile.role === 'PLATFORM_ADMIN') {
            const cq = query(collection(db, 'companies'));
            const unsub = onSnapshot(cq, (snapshot) => {
              const comps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
              setCompanies(comps);
              if (comps.length > 0) {
                setActiveCompany(prev => {
                  if (!prev) return comps[0];
                  return comps.find(c => c.id === prev.id) || comps[0];
                });
              }
            }, (err) => handleFirestoreError(err, OperationType.LIST, 'companies'));
            companiesUnsubscribeRef.current.push(unsub);
          } else {
            // Fetch owned companies
            const ownedQuery = query(collection(db, 'companies'), where('ownerId', '==', fbUser.uid));
            
            let ownedComps: Company[] = [];
            let assignedComps: Record<string, Company> = {};
            
            const updateCompaniesState = () => {
              const allComps = [...ownedComps, ...Object.values(assignedComps)];
              const uniqueComps = Array.from(new Map(allComps.map(c => [c.id, c])).values());
              setCompanies(uniqueComps);
              if (uniqueComps.length > 0) {
                setActiveCompany(prev => {
                  if (!prev) return uniqueComps[0];
                  return uniqueComps.find(c => c.id === prev.id) || uniqueComps[0];
                });
              }
            };

            const unsubOwned = onSnapshot(ownedQuery, (snapshot) => {
              ownedComps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
              updateCompaniesState();
            }, (err) => handleFirestoreError(err, OperationType.LIST, 'companies'));
            companiesUnsubscribeRef.current.push(unsubOwned);

            // Fetch assigned companies individually
            if (profile.companyIds && profile.companyIds.length > 0) {
              profile.companyIds.forEach(companyId => {
                const unsubAssigned = onSnapshot(doc(db, 'companies', companyId), (docSnap) => {
                  if (docSnap.exists()) {
                    assignedComps[companyId] = { id: docSnap.id, ...docSnap.data() } as Company;
                  } else {
                    delete assignedComps[companyId];
                  }
                  updateCompaniesState();
                }, (err) => handleFirestoreError(err, OperationType.GET, `companies/${companyId}`));
                companiesUnsubscribeRef.current.push(unsubAssigned);
              });
            }
          }
        }
      }, (err) => handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`));

    } catch (err) {
      console.error("Profile sync error:", err);
    }
  };

  // Fetch Invoices, Products, Customers for Active Company
  useEffect(() => {
    if (!activeCompany) {
      setInvoices([]);
      setProducts([]);
      setCustomers([]);
      return;
    }

    const invQ = query(collection(db, `companies/${activeCompany.id}/invoices`));
    const invUnsubscribe = onSnapshot(invQ, (snapshot) => {
      const invs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      setInvoices(invs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `companies/${activeCompany.id}/invoices`));

    const prodQ = query(collection(db, 'products'), where('companyId', '==', activeCompany.id));
    const prodUnsubscribe = onSnapshot(prodQ, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));

    const custQ = query(collection(db, `companies/${activeCompany.id}/customers`));
    const custUnsubscribe = onSnapshot(custQ, (snapshot) => {
      const custs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      setCustomers(custs);
    }, (err) => handleFirestoreError(err, OperationType.LIST, `companies/${activeCompany.id}/customers`));

    return () => {
      invUnsubscribe();
      prodUnsubscribe();
      custUnsubscribe();
    };
  }, [activeCompany]);

  // Fetch Active Company's Plan
  useEffect(() => {
    if (!activeCompany) {
      setCompanySubscription(null);
      setCompanyPlan(null);
      return;
    }

    const fetchCompanyPlan = async () => {
      try {
        if (!activeCompany.ownerId) {
          console.warn("activeCompany is missing ownerId");
          setCompanySubscription(null);
          setCompanyPlan(null);
          return;
        }
        const ownerDoc = await getDoc(doc(db, 'users', activeCompany.ownerId));
        if (ownerDoc.exists()) {
          const ownerData = ownerDoc.data() as User;
          if (ownerData.subscriptionId) {
            const subDoc = await getDoc(doc(db, 'subscriptions', ownerData.subscriptionId));
            if (subDoc.exists()) {
              const subData = subDoc.data() as Subscription;
              setCompanySubscription(subData);
              const planDoc = await getDoc(doc(db, 'plans', subData.planId));
              if (planDoc.exists()) {
                setCompanyPlan(planDoc.data() as Plan);
              } else {
                setCompanyPlan(null);
              }
            } else {
              setCompanySubscription(null);
              setCompanyPlan(null);
            }
          } else {
            setCompanySubscription(null);
            setCompanyPlan(null);
          }
        }
      } catch (error) {
        console.error("Error fetching company plan:", error);
      }
    };

    fetchCompanyPlan();
  }, [activeCompany]);

  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      const invoice = invoices.find(inv => inv.id === invoiceId);
      if (!invoice) return;

      const doc = new jsPDF();
      
      // Logo (if available)
      if (activeCompany?.logo) {
        try {
          doc.addImage(activeCompany.logo, 'PNG', 15, 10, 30, 30);
        } catch (e) {
          console.error("Error adding logo:", e);
        }
      }

      // Header
      doc.setFontSize(20);
      doc.text('FACTURA ELECTRÓNICA (e-CF)', 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`e-CF: ${invoice.ecf}`, 190, 30, { align: 'right' });
      doc.text(`Fecha: ${new Date(invoice.date).toLocaleDateString()}`, 190, 35, { align: 'right' });
      
      // Emisor
      doc.setFontSize(12);
      doc.text('Emisor:', 15, 50);
      doc.setFontSize(10);
      doc.text(activeCompany?.name || 'Mi Empresa S.R.L.', 15, 55);
      doc.text(`RNC: ${activeCompany?.rnc || '101000001'}`, 15, 60);
      
      // Cliente
      doc.setFontSize(12);
      doc.text('Cliente:', 120, 50);
      doc.setFontSize(10);
      doc.text(invoice.customerName, 120, 55);
      doc.text(`RNC/Cédula: ${invoice.customerRnc || 'N/A'}`, 120, 60);
      
      // Items Table
      autoTable(doc, {
        startY: 75,
        head: [['Descripción', 'Cant.', 'Precio', 'ITBIS', 'Subtotal']],
        body: (invoice.items || []).map(item => [
          item.description,
          item.quantity.toString(),
          `RD$ ${item.price.toLocaleString()}`,
          `RD$ ${item.itbis.toLocaleString()}`,
          `RD$ ${(item.price * item.quantity + item.itbis).toLocaleString()}`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [20, 20, 20] },
      });
      
      // Totals
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text('Subtotal:', 140, finalY);
      doc.text(`RD$ ${(invoice.subtotal || 0).toLocaleString()}`, 190, finalY, { align: 'right' });
      doc.text('ITBIS:', 140, finalY + 5);
      doc.text(`RD$ ${(invoice.itbis || 0).toLocaleString()}`, 190, finalY + 5, { align: 'right' });
      doc.setFontSize(14);
      doc.text('Total General:', 140, finalY + 15);
      doc.text(`RD$ ${invoice.total.toLocaleString()}`, 190, finalY + 15, { align: 'right' });
      
      // QR Code
      const qrUrl = `https://ecf.dgii.gov.do/ecf/ConsultaTimbre?RncEmisor=${activeCompany?.rnc}&ENCF=${invoice.ecf}&MontoTotal=${invoice.total}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl);
      doc.addImage(qrDataUrl, 'PNG', 15, finalY + 10, 30, 30);
      
      // Footer
      doc.setFontSize(8);
      doc.text('Este documento es una representación impresa de un comprobante fiscal electrónico.', 105, 280, { align: 'center' });
      
      doc.save(`invoice-${invoice.ecf || invoice.id}.pdf`);
      
      console.log(`PDF generated for invoice: ${invoiceId}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF. Por favor, intente de nuevo.');
    }
  };

  const handleLogin = async () => {
    try {
      setAuthError(null);
      setGoogleAuthLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Google login error:", err);
      setAuthError("Error al iniciar sesión con Google. Intenta de nuevo.");
    } finally {
      setGoogleAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authMode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, emailAuthData.email, emailAuthData.password);
        if (emailAuthData.name) {
          await updateProfile(userCredential.user, { displayName: emailAuthData.name });
        }
      } else {
        await signInWithEmailAndPassword(auth, emailAuthData.email, emailAuthData.password);
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      if (err.code === 'auth/email-already-in-use') setAuthError("Este correo ya está registrado. Si usaste Google antes, intenta iniciar sesión con el botón de Google.");
      else if (err.code === 'auth/invalid-credential') setAuthError("Credenciales inválidas.");
      else if (err.code === 'auth/weak-password') setAuthError("La contraseña es muy débil.");
      else if (err.code === 'auth/operation-not-allowed') setAuthError("El inicio de sesión con correo no está habilitado en Firebase. Por favor, actívalo en la consola de Firebase.");
      else setAuthError("Ocurrió un error en la autenticación.");
    }
  };

  const handleResetPassword = async () => {
    if (!emailAuthData.email) {
      setAuthError("Por favor, ingresa tu correo para restablecer la contraseña.");
      return;
    }
    try {
      setAuthError(null);
      await sendPasswordResetEmail(auth, emailAuthData.email);
      alert("Se ha enviado un correo para restablecer tu contraseña.");
    } catch (err: any) {
      console.error("Reset password error:", err);
      if (err.code === 'auth/user-not-found') setAuthError("No se encontró una cuenta con ese correo.");
      else setAuthError("Error al enviar el correo de restablecimiento.");
    }
  };

  const downloadInvoiceXml = async (invoice: Invoice) => {
    try {
      const xmlToDownload = invoice.signedXml || await generateInvoiceXml(invoice);
      const blob = new Blob([xmlToDownload], { type: 'application/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.ecf}${invoice.signedXml ? '-firmado' : ''}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading XML:', error);
      alert('No se pudo descargar el XML de la factura.');
    }
  };

  const generateInvoiceXml = async (invoice: Invoice) => {
    const response = await fetch('/api/invoices/generate-xml', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: invoice.type,
        ecf: invoice.ecf,
        date: invoice.date,
        issuer: {
          rnc: activeCompany?.rnc || '101000001',
          name: activeCompany?.name || 'Mi Empresa S.R.L.',
          address: 'Av. Winston Churchill #123, Santo Domingo',
          phone: '809-555-5555'
        },
        customer: {
          rnc: invoice.customerRnc,
          name: invoice.customerName
        },
        items: (invoice.items || []).map(item => ({
          description: item.description,
          quantity: item.quantity,
          price: item.price,
          itbis: item.itbis
        })),
        totals: {
          subtotal: invoice.subtotal || invoice.total / 1.18,
          itbis: invoice.itbis || invoice.total - (invoice.total / 1.18),
          total: invoice.total
        }
      })
    });

    if (!response.ok) throw new Error('Error al generar XML');
    return await response.text();
  };

  const handleSignInvoice = async (invoice: Invoice) => {
    if (!activeCompany?.certificate || !activeCompany?.privateKey) {
      alert('Por favor, configure su certificado y llave privada en la sección de Configuración.');
      setActiveTab('settings');
      return;
    }

    setIsSigning(true);
    try {
      // 1. Generate XML
      const xml = await generateInvoiceXml(invoice);

      // 2. Sign XML
      const response = await fetch('/api/invoices/sign-xml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          xml,
          certificate: activeCompany.certificate,
          privateKey: activeCompany.privateKey
        })
      });

      if (!response.ok) {
        let errorMessage = 'Error al firmar XML';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If not JSON, use text or default message
          const text = await response.text();
          errorMessage = text || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const signedXml = await response.text();

      // 3. Submit to DGII
      let dgiiStatus: Invoice['status'] = 'SIGNED';
      let trackId = '';
      let dgiiMessage = '';

      try {
        const dgiiResponse = await fetch('/api/dgii/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signedXml })
        });

        if (dgiiResponse.ok) {
          const dgiiData = await dgiiResponse.json();
          dgiiStatus = dgiiData.status;
          trackId = dgiiData.trackId;
          dgiiMessage = dgiiData.message;
        } else {
          dgiiStatus = 'CONTINGENCY';
          try {
            const errorData = await dgiiResponse.json();
            dgiiMessage = errorData.error || errorData.message || 'Error de conexión con DGII. Factura marcada en contingencia.';
          } catch (e) {
            dgiiMessage = 'Error de conexión con DGII. Factura marcada en contingencia.';
          }
        }
      } catch (dgiiErr) {
        console.error('DGII submission error:', dgiiErr);
        dgiiStatus = 'CONTINGENCY';
        dgiiMessage = 'Fallo en el envío a DGII. Factura marcada en contingencia.';
      }

      // 4. Update Firestore
      await updateDoc(doc(db, `companies/${activeCompany.id}/invoices`, invoice.id), {
        status: dgiiStatus,
        signedXml: signedXml,
        trackId: trackId,
        dgiiMessage: dgiiMessage
      });

      logAction(`Factura ${invoice.ecf} firmada y enviada a DGII`, `Estado: ${dgiiStatus}, Mensaje: ${dgiiMessage}`);

      if (dgiiStatus === 'ACCEPTED') {
        alert('Factura aceptada por DGII.');
      } else if (dgiiStatus === 'CONTINGENCY') {
        alert(`Factura en contingencia. ${dgiiMessage}`);
      } else {
        alert(`DGII: ${dgiiMessage}`);
      }
    } catch (error: any) {
      console.error('Error signing invoice:', error);
      logAction(`Error al firmar factura ${invoice.ecf}`, error.message, 'ERROR');
      alert(`Error al firmar la factura: ${error.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  const handleUpdateCompanySettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeCompany) return;

    const formData = new FormData(e.currentTarget);
    const updates = {
      name: formData.get('name') as string,
      rnc: formData.get('rnc') as string,
      certificate: formData.get('certificate') as string,
      privateKey: formData.get('privateKey') as string,
    };

    try {
      await updateDoc(doc(db, 'companies', activeCompany.id), updates);
      logAction(`Configuración de empresa actualizada`, `Empresa: ${updates.name}, RNC: ${updates.rnc}`);
      alert('Configuración actualizada.');
    } catch (err) {
      logAction(`Error al actualizar configuración de empresa`, err instanceof Error ? err.message : String(err), 'ERROR');
      handleFirestoreError(err, OperationType.UPDATE, 'companies');
    }
  };

  const handleSelectPlan = async (plan: Plan) => {
    if (!user) return;
    try {
      const subId = doc(collection(db, 'subscriptions')).id;
      const newSub = {
        id: subId,
        userId: user.uid,
        planId: plan.id,
        status: 'ACTIVE',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        invoiceCount: 0,
        companyCount: 0,
        autoRenew: true
      };
      await setDoc(doc(db, 'subscriptions', subId), newSub);
      await updateDoc(doc(db, 'users', user.uid), { subscriptionId: subId });
      setUserSubscription(newSub as Subscription);
      setActivePlan(plan);
      logAction(`Plan seleccionado: ${plan.name}`, `Suscripción ID: ${subId}`);
      alert(`Plan ${plan.name} activado con éxito!`);
    } catch (error) {
      logAction(`Error al seleccionar plan`, error instanceof Error ? error.message : String(error), 'ERROR');
      handleFirestoreError(error, OperationType.CREATE, 'subscriptions');
    }
  };

  const Pricing = () => (
    <div className="flex flex-col gap-8">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-4xl font-black text-zinc-900 tracking-tight">Planes y Precios</h2>
        <p className="text-zinc-500 mt-4 text-lg">Selecciona el plan que mejor se adapte a las necesidades de tu negocio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {allPlans.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <p className="text-zinc-400 font-bold">No hay planes disponibles en este momento.</p>
            {isAdmin() && (
              <button 
                onClick={initializePlans}
                className="mt-4 bg-zinc-900 text-white px-6 py-2 rounded-xl font-bold text-sm"
              >
                Inicializar Planes
              </button>
            )}
          </div>
        ) : (
          <>
            {allPlans.map((plan) => (
              <motion.div 
                key={plan.id}
                whileHover={{ y: -5 }}
                className={`glass-card rounded-3xl p-8 flex flex-col relative overflow-hidden ${activePlan?.id === plan.id ? 'ring-2 ring-zinc-900' : ''}`}
              >
                {activePlan?.id === plan.id && (
                  <div className="absolute top-0 right-0 bg-zinc-900 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl uppercase tracking-widest">
                    Plan Actual
                  </div>
                )}
                <div className="mb-8">
                  <h3 className="text-xl font-black text-zinc-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-zinc-900">RD$ {plan.price.toLocaleString()}</span>
                    <span className="text-zinc-400 font-bold text-sm">/mes</span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-4 mb-8">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-1 p-0.5 bg-emerald-100 text-emerald-600 rounded-full">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="text-sm text-zinc-600 font-medium leading-tight">{feature}</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={() => handleSelectPlan(plan)}
                  disabled={activePlan?.id === plan.id}
                  className={`w-full py-4 rounded-2xl font-black text-sm transition-all ${
                    activePlan?.id === plan.id 
                    ? 'bg-zinc-100 text-zinc-400 cursor-default' 
                    : 'bg-zinc-900 text-white shadow-xl shadow-zinc-200 hover:scale-[1.02] active:scale-[0.98]'
                  }`}
                >
                  {activePlan?.id === plan.id ? 'Plan Activo' : 'Seleccionar Plan'}
                </button>
              </motion.div>
            ))}
            {isAdmin() && (
              <button 
                onClick={() => {
                  setEditingPlanId(null);
                  setPlanFormData({ name: '', price: '', invoiceLimit: '', companyLimit: '', features: '' });
                  setShowNewPlan(true);
                }}
                className="p-8 border-2 border-dashed border-zinc-200 rounded-3xl flex flex-col items-center justify-center gap-3 text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all min-h-[300px]"
              >
                <Plus size={32} />
                <span className="text-lg font-black">Nuevo Plan</span>
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  const logAction = async (message: string, details?: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'system_logs'), {
        timestamp: new Date().toISOString(),
        level,
        message,
        details: details || '',
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || userProfile?.name || '',
        companyId: activeCompany?.id || ''
      });
    } catch (e) {
      console.error("Failed to log action", e);
    }
  };

  const handleLogout = () => {
    logAction('Usuario cerró sesión');
    signOut(auth);
  };
  
  const initializePlans = async () => {
    console.log("Initializing plans...");
    if (userProfile?.role !== 'PLATFORM_ADMIN' && !isAdmin()) {
      console.warn("Not authorized to initialize plans");
      alert('No tiene permisos para inicializar planes.');
      return;
    }
    
    const plans: Plan[] = [
      { id: 'basic', name: 'Básico', price: 999, invoiceLimit: 50, companyLimit: 1, features: ['50 facturas/mes', '1 empresa', 'Soporte por email'] },
      { id: 'pyme', name: 'PyME', price: 2499, invoiceLimit: 250, companyLimit: 3, features: ['250 facturas/mes', '3 empresas', 'Soporte prioritario'] },
      { id: 'pro', name: 'Pro', price: 4999, invoiceLimit: 1000, companyLimit: 10, features: ['1000 facturas/mes', '10 empresas', 'Soporte 24/7'] },
      { id: 'enterprise', name: 'Enterprise', price: 9999, invoiceLimit: 99999, companyLimit: 99, features: ['Facturas ilimitadas', 'Empresas ilimitadas', 'API Access'] }
    ];

    for (const plan of plans) {
      await setDoc(doc(db, 'plans', plan.id), plan);
    }
    alert('Planes inicializados correctamente.');
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userProfile?.role !== 'PLATFORM_ADMIN') return;
    
    try {
      const id = editingPlanId || planFormData.name.toLowerCase().replace(/\s+/g, '-');
      const newPlan: Plan = {
        id,
        name: planFormData.name,
        price: parseFloat(planFormData.price),
        invoiceLimit: parseInt(planFormData.invoiceLimit),
        companyLimit: parseInt(planFormData.companyLimit),
        features: planFormData.features.split(',').map(f => f.trim())
      };
      await setDoc(doc(db, 'plans', id), newPlan);
      logAction(`${editingPlanId ? 'Plan actualizado' : 'Plan creado'}: ${newPlan.name}`, `Precio: DOP ${newPlan.price}, Límite facturas: ${newPlan.invoiceLimit}`);
      setShowNewPlan(false);
      setEditingPlanId(null);
      setPlanFormData({ name: '', price: '', invoiceLimit: '', companyLimit: '', features: '' });
      alert(editingPlanId ? 'Plan actualizado correctamente.' : 'Plan creado correctamente.');
    } catch (err) {
      logAction(`Error al ${editingPlanId ? 'actualizar' : 'crear'} plan`, err instanceof Error ? err.message : String(err), 'ERROR');
      handleFirestoreError(err, OperationType.CREATE, 'plans');
    }
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile || !activePlan) {
      alert('Debe tener un plan activo para crear empresas.');
      return;
    }

    const ownedCompanies = companies.filter(c => c.ownerId === user.uid);
    if (ownedCompanies.length >= activePlan.companyLimit) {
      alert(`Ha alcanzado el límite de empresas de su plan (${activePlan.companyLimit}). Por favor, mejore su plan.`);
      return;
    }

    try {
      const id = Math.random().toString(36).substring(2, 15);
      const newCompany: Company = {
        id,
        name: companyFormData.name,
        rnc: companyFormData.rnc,
        type: companyFormData.type,
        ownerId: user.uid,
        employeeIds: [user.uid],
        logo: `https://picsum.photos/seed/${id}/200`
      };

      await setDoc(doc(db, 'companies', id), newCompany);
      logAction(`Empresa creada: ${newCompany.name}`, `RNC: ${newCompany.rnc}, Tipo: ${newCompany.type}`);
      setShowNewCompany(false);
      setCompanyFormData({ name: '', rnc: '', type: 'JURIDICA' });
      alert('Empresa creada con éxito.');
    } catch (err) {
      logAction(`Error al crear empresa`, err instanceof Error ? err.message : String(err), 'ERROR');
      handleFirestoreError(err, OperationType.CREATE, 'companies');
    }
  };

  const createDemoCompany = async () => {
    if (!user || !activePlan) {
      alert('Debe tener un plan activo para crear empresas.');
      return;
    }

    // Check limits
    const ownedCompanies = companies.filter(c => c.ownerId === user.uid);
    if (ownedCompanies.length >= activePlan.companyLimit) {
      alert(`Ha alcanzado el límite de empresas de su plan (${activePlan.companyLimit}). Por favor, mejore su plan.`);
      return;
    }

    const id = Math.random().toString(36).substring(7);
    const newCompany: Company = {
      id,
      rnc: '131-12345-6',
      name: 'Mi Empresa Demo S.R.L.',
      type: 'JURIDICA',
      logo: 'https://picsum.photos/seed/company/200',
      ownerId: user.uid
    };
    
    try {
      await setDoc(doc(db, 'companies', id), newCompany);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'companies');
    }
  };

  // Fetch Owner Data
  useEffect(() => {
    if (userProfile?.role !== 'PLATFORM_ADMIN' || activeTab !== 'owner') return;

    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => setAllUsers(s.docs.map(d => d.data() as User)));
    const unsubSubs = onSnapshot(collection(db, 'subscriptions'), (s) => setAllSubscriptions(s.docs.map(d => d.data() as Subscription)));
    const unsubLogs = onSnapshot(collection(db, 'system_logs'), (s) => setSystemLogs(s.docs.map(d => d.data() as SystemLog)));
    const unsubDgii = onSnapshot(collection(db, 'dgii_responses'), (s) => setDgiiResponses(s.docs.map(d => d.data() as DgiiResponse)));
    const unsubMetrics = onSnapshot(collection(db, 'revenue_metrics'), (s) => setRevenueMetrics(s.docs.map(d => d.data() as RevenueMetric)));
    const unsubCerts = onSnapshot(collection(db, 'certificates'), (s) => setAllCertificates(s.docs.map(d => d.data() as Certificate)));

    return () => {
      unsubUsers();
      unsubSubs();
      unsubLogs();
      unsubDgii();
      unsubMetrics();
      unsubCerts();
    };
  }, [userProfile, activeTab]);

  // Fetch Plans (Global)
  useEffect(() => {
    console.log("Setting up plans listener...");
    const unsubPlans = onSnapshot(collection(db, 'plans'), (s) => {
      const plans = s.docs.map(d => d.data() as Plan);
      console.log("Plans fetched:", plans.length);
      setAllPlans(plans);
    }, (err) => {
      console.error("Plans listener error:", err);
    });
    return () => unsubPlans();
  }, []);

  // Auto-initialize plans for admin if empty
  useEffect(() => {
    if (isAdmin() && allPlans.length === 0 && userProfile) {
      console.log("Plans empty, auto-initializing...");
      initializePlans();
    }
  }, [allPlans.length, userProfile, user]);

  const handleCreateInvoice = async () => {
    if (!activeCompany || !companyPlan) {
      alert('Debe tener un plan activo para emitir facturas.');
      return;
    }

    // Check limits
    const currentMonth = new Date().getMonth();
    const monthlyInvoices = invoices.filter(inv => new Date(inv.date).getMonth() === currentMonth);
    if (monthlyInvoices.length >= companyPlan.invoiceLimit) {
      alert(`Ha alcanzado el límite de facturas de su plan (${companyPlan.invoiceLimit}). Por favor, mejore su plan.`);
      return;
    }

    const id = Math.random().toString(36).substring(7);
    const total = parseFloat(invoiceFormData.total) || 0;
    
    const newInvoice: Invoice = {
      id,
      companyId: activeCompany.id,
      ecf: invoiceFormData.ecf || `E310000000${invoices.length + 1}`,
      type: 'FACTURA DE CRÉDITO FISCAL ELECTRÓNICA',
      customerRnc: invoiceFormData.customerRnc,
      customerName: invoiceFormData.customerName,
      date: invoiceFormData.date || new Date().toISOString(),
      subtotal: total / 1.18,
      itbis: total - (total / 1.18),
      total: total,
      status: 'PENDING',
      items: [{
        description: `Factura de ${invoiceFormData.razonSocialEmisor || 'Servicio'}`,
        quantity: 1,
        price: total / 1.18,
        itbis: total - (total / 1.18)
      }]
    };

    try {
      await setDoc(doc(db, `companies/${activeCompany.id}/invoices`, id), newInvoice);
      
      logAction(`Factura ${newInvoice.ecf} creada`, `Cliente: ${newInvoice.customerName}, Total: DOP ${newInvoice.total.toLocaleString()}`);
      
      setShowNewInvoice(false);
      setInvoiceFormData({ 
        customerRnc: '', 
        customerName: '', 
        total: '',
        ecf: '',
        date: '',
        rncEmisor: '',
        razonSocialEmisor: ''
      });
    } catch (err) {
      logAction(`Error al crear factura`, err instanceof Error ? err.message : String(err), 'ERROR');
      handleFirestoreError(err, OperationType.CREATE, `companies/${activeCompany.id}/invoices`);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    try {
      const newProduct = {
        companyId: activeCompany.id,
        name: productFormData.name,
        price: parseFloat(productFormData.price),
        itbis: parseInt(productFormData.itbis),
        category: productFormData.category,
        unit: productFormData.unit
      };
      await addDoc(collection(db, 'products'), newProduct);
      logAction(`Producto creado: ${newProduct.name}`, `Precio: DOP ${newProduct.price}, ITBIS: ${newProduct.itbis}%`);
      setShowNewProduct(false);
      setProductFormData({ name: '', price: '', itbis: '18', category: '', unit: 'UNIDAD' });
    } catch (err) {
      logAction(`Error al crear producto`, err instanceof Error ? err.message : String(err), 'ERROR');
      handleFirestoreError(err, OperationType.CREATE, 'products');
    }
  };

  const handleCreateCustomer = async () => {
    if (!activeCompany) return;
    const id = Math.random().toString(36).substring(7);
    const newCustomer: Customer = {
      id,
      companyId: activeCompany.id,
      name: customerFormData.name,
      rnc: customerFormData.rnc,
      email: customerFormData.email
    };

    try {
      await setDoc(doc(db, `companies/${activeCompany.id}/customers`, id), newCustomer);
      logAction(`Cliente creado: ${newCustomer.name}`, `RNC: ${newCustomer.rnc}, Email: ${newCustomer.email}`);
      setShowNewCustomer(false);
      setCustomerFormData({ name: '', rnc: '', email: '' });
    } catch (err) {
      logAction(`Error al crear cliente`, err instanceof Error ? err.message : String(err), 'ERROR');
      handleFirestoreError(err, OperationType.CREATE, `companies/${activeCompany.id}/customers`);
    }
  };

  const handleQRScan = async (decodedText: string) => {
    setShowQRScanner(false);
    if (!activeCompany) return;
    
    let formData = {
      customerRnc: '',
      customerName: '',
      total: '',
      ecf: '',
      date: '',
      rncEmisor: '',
      razonSocialEmisor: ''
    };
    
    try {
      // Check if it's a URL
      if (decodedText.startsWith('http')) {
        const url = new URL(decodedText);
        const params = new URLSearchParams(url.search);
        
        formData.customerRnc = params.get('RncComprador') || '';
        formData.total = params.get('MontoTotal') || '';
        formData.ecf = params.get('ENCF') || '';
        formData.date = params.get('FechaEmision') || '';
        formData.rncEmisor = params.get('RncEmisor') || '';
        // Note: RazonSocialEmisor is not in the URL parameters
      } else {
        // Fallback to JSON parsing if not a URL
        const parsed = JSON.parse(decodedText);
        formData.customerRnc = parsed.rnc || '';
        formData.customerName = parsed.name || '';
        formData.total = parsed.total ? parsed.total.toString() : '';
        formData.ecf = parsed.ecf || '';
        formData.date = parsed.date || '';
        formData.rncEmisor = parsed.rncEmisor || '';
        formData.razonSocialEmisor = parsed.razonSocialEmisor || '';
      }
    } catch (e) {
      console.error("Error parsing QR data:", e);
      formData.customerName = decodedText.substring(0, 50);
    }

    setInvoiceFormData(formData);
    setShowNewInvoice(true);
  };

  const Dashboard = ({ invoices }: { invoices: Invoice[] }) => {
    const currentMonth = new Date().getMonth();
    const monthlyInvoices = invoices.filter(inv => new Date(inv.date).getMonth() === currentMonth);
    
    const revenue = monthlyInvoices.reduce((acc, inv) => acc + inv.total, 0);
    const issued = monthlyInvoices.length;
    const pending = monthlyInvoices.filter(inv => inv.status === 'PENDING').length;
    const rejected = monthlyInvoices.filter(inv => inv.status === 'REJECTED').length;

    const invoiceLimit = companyPlan?.invoiceLimit || 0;
    const usagePercentage = invoiceLimit > 0 ? (issued / invoiceLimit) * 100 : 0;

    const salesData = [
      { name: 'Lun', sales: 4000 },
      { name: 'Mar', sales: 3000 },
      { name: 'Mié', sales: 2000 },
      { name: 'Jue', sales: 2780 },
      { name: 'Vie', sales: 1890 },
      { name: 'Sáb', sales: 2390 },
      { name: 'Dom', sales: 3490 },
    ];

    const invoiceTypes = [
      { name: 'e-CF', value: 400 },
      { name: 'e-NCF', value: 300 },
    ];
    const COLORS = ['#18181b', '#a1a1aa'];

    return (
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card p-6 rounded-3xl">
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Ingresos Mes</p>
            <p className="text-3xl font-bold text-zinc-900 mt-2">RD$ {revenue.toLocaleString()}</p>
          </div>
          <div className="glass-card p-6 rounded-3xl">
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Emitidas</p>
            <p className="text-3xl font-bold text-zinc-900 mt-2">{issued}</p>
          </div>
          <div className="glass-card p-6 rounded-3xl">
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Pendientes</p>
            <p className="text-3xl font-bold text-zinc-900 mt-2">{pending}</p>
          </div>
          <div className="glass-card p-6 rounded-3xl">
            <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Rechazadas</p>
            <p className="text-3xl font-bold text-zinc-900 mt-2">{rejected}</p>
          </div>
          <div className="glass-card p-6 rounded-3xl flex flex-col justify-between">
            <div>
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Uso del Plan</p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-3xl font-bold text-zinc-900">{issued}</p>
                <p className="text-zinc-400 font-bold text-sm">/ {invoiceLimit}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  className={`h-full ${usagePercentage > 90 ? 'bg-rose-500' : usagePercentage > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </div>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight mt-2">
                {companyPlan?.name || 'Sin Plan'}
              </p>
            </div>
            {usagePercentage >= 80 && (
              <button 
                onClick={() => setActiveTab('pricing')}
                className="mt-4 w-full py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
              >
                Mejorar Plan
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Tendencia de Ventas</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" stroke="#18181b" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-card p-6 rounded-3xl">
            <h3 className="text-lg font-bold text-zinc-900 mb-6">Tipos de Factura</h3>
            <div className="h-64 flex justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={invoiceTypes} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {invoiceTypes.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Products = () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Productos y Servicios</h2>
          <p className="text-zinc-500 text-sm font-medium">Gestiona tu catálogo de productos y servicios.</p>
        </div>
        {canEdit() && (
          <button 
            onClick={() => setShowNewProduct(true)}
            className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all"
          >
            <Plus size={18} />
            Nuevo Producto
          </button>
        )}
      </div>

      <div className="glass-card rounded-3xl overflow-x-auto border border-zinc-100">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-zinc-50/50 border-b border-zinc-100">
              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nombre</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Categoría</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Precio</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">ITBIS</th>
              <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Unidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 font-medium">No hay productos registrados</td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-6 py-4 font-bold text-zinc-900">{product.name}</td>
                  <td className="px-6 py-4 text-zinc-500 font-medium">{product.category}</td>
                  <td className="px-6 py-4 font-black text-zinc-900">RD$ {product.price.toLocaleString()}</td>
                  <td className="px-6 py-4 text-zinc-500 font-medium">{product.itbis}%</td>
                  <td className="px-6 py-4 text-zinc-500 font-medium">{product.unit}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const CompanySwitcher = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="relative">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-2xl px-4 py-2.5 transition-all group"
        >
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center text-white shadow-lg shadow-zinc-200 group-hover:scale-105 transition-all">
            <Building2 size={16} />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Empresa Activa</p>
            <p className="text-sm font-bold text-zinc-900 leading-none max-w-[150px] truncate">{activeCompany?.name || 'Seleccionar...'}</p>
          </div>
          <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-zinc-100 p-3 z-50"
              >
                <div className="space-y-1">
                  {companies.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveCompany(c);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activeCompany?.id === c.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50 text-zinc-600'}`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${activeCompany?.id === c.id ? 'bg-white/20' : 'bg-zinc-100'}`}>
                        <Building2 size={20} />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm truncate">{c.name}</p>
                        <p className={`text-[10px] ${activeCompany?.id === c.id ? 'text-white/60' : 'text-zinc-400'}`}>RNC: {c.rnc}</p>
                      </div>
                      {activeCompany?.id === c.id && <Check size={16} className="ml-auto" />}
                    </button>
                  ))}
                </div>
                
                {userProfile?.role !== 'EMPLOYEE' && (
                  <button 
                    onClick={() => {
                      setShowNewCompany(true);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 mt-2 rounded-2xl border-2 border-dashed border-zinc-100 text-zinc-400 hover:border-zinc-900 hover:text-zinc-900 transition-all"
                  >
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 flex items-center justify-center">
                      <Plus size={20} />
                    </div>
                    <span className="font-bold text-sm">Nueva Empresa</span>
                  </button>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const canEdit = () => {
    if (!userProfile) return false;
    if (userProfile.role === 'PLATFORM_ADMIN') return true;
    if (userProfile.role === 'COMPANY_ADMIN') return true;
    if (userProfile.role === 'INVOICE_EDITOR') return true;
    return false;
  };

  const Team = () => {
    const [employees, setEmployees] = useState<User[]>([]);
    const [showAssign, setShowAssign] = useState(false);
    const [assignEmail, setAssignEmail] = useState('');
    const [assignName, setAssignName] = useState('');
    const [assignRole, setAssignRole] = useState<'INVOICE_EDITOR' | 'READ_ONLY' | 'COMPANY_ADMIN'>('INVOICE_EDITOR');
    const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);

    useEffect(() => {
      if (!user || !userProfile) return;
      let q;
      if (userProfile.role === 'PLATFORM_ADMIN') {
        q = query(collection(db, 'users'));
      } else {
        q = query(collection(db, 'users'), where('ownerId', '==', user.uid));
      }
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
        
        // Deduplicate by email for UI
        const uniqueEmployees = Array.from(new Map(docs.map(e => [e.email, e])).values());
        setEmployees(uniqueEmployees);
        
        // Background migration to merge duplicate documents by email
        const emailGroups = docs.reduce((acc, doc) => {
          if (doc.email) {
            if (!acc[doc.email]) acc[doc.email] = [];
            acc[doc.email].push(doc);
          }
          return acc;
        }, {} as Record<string, User[]>);

        for (const [email, groupData] of Object.entries(emailGroups)) {
          const group = groupData as User[];
          if (group.length > 1) {
            try {
              // Find the primary document (preferably the one with a Firebase UID, which is typically 28 chars and doesn't contain '@')
              let primaryDoc = group.find(d => d.uid.length === 28 && !d.uid.includes('@'));
              if (!primaryDoc) primaryDoc = group.find(d => !d.uid.includes('@'));
              if (!primaryDoc) primaryDoc = group[0];

              const otherDocs = group.filter(d => d.uid !== primaryDoc!.uid);
              
              // Merge companyIds
              let allCompanyIds = new Set(primaryDoc.companyIds || []);
              otherDocs.forEach(d => {
                (d.companyIds || []).forEach(id => allCompanyIds.add(id));
              });

              // Update primary document if needed
              const mergedCompanyIds = Array.from(allCompanyIds);
              if (mergedCompanyIds.length !== (primaryDoc.companyIds || []).length) {
                await updateDoc(doc(db, 'users', primaryDoc.uid), { companyIds: mergedCompanyIds });
              }

              // Delete duplicate documents
              for (const d of otherDocs) {
                await deleteDoc(doc(db, 'users', d.uid));
              }
            } catch (e) {
              console.error("Failed to merge duplicate users for", email, e);
            }
          }
        }
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
      return () => unsubscribe();
    }, [user, userProfile]);

    const handleAssign = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const q = query(collection(db, 'users'), where('email', '==', assignEmail));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const existingDoc = querySnapshot.docs[0];
          const existingData = existingDoc.data() as User;
          const updatedCompanyIds = Array.from(new Set([...(existingData.companyIds || []), ...selectedCompanyIds]));
          
          await updateDoc(existingDoc.ref, {
            companyIds: updatedCompanyIds,
            ownerId: user?.uid
          });
          logAction(`Usuario asignado a empresas`, `Email: ${assignEmail}, Empresas: ${selectedCompanyIds.join(', ')}`);
          alert('Usuario asignado con éxito.');
        } else {
          await setDoc(doc(db, 'users', assignEmail), {
            uid: assignEmail,
            email: assignEmail,
            name: assignName,
            role: assignRole,
            ownerId: user?.uid,
            companyIds: selectedCompanyIds
          });
          logAction(`Usuario creado y asignado`, `Email: ${assignEmail}, Rol: ${assignRole}, Empresas: ${selectedCompanyIds.join(', ')}`);
          alert('Empleado creado y asignado con éxito.');
        }
        
        setShowAssign(false);
        setAssignEmail('');
        setAssignName('');
        setAssignRole('INVOICE_EDITOR');
        setSelectedCompanyIds([]);
      } catch (err) {
        logAction(`Error al asignar usuario`, err instanceof Error ? err.message : String(err), 'ERROR');
        handleFirestoreError(err, OperationType.WRITE, 'users');
      }
    };

    return (
      <div className="flex flex-col gap-6 lg:gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900">Mi Equipo</h2>
            <p className="text-xs lg:text-sm text-zinc-500 mt-1">Gestiona y asigna los empleados que trabajan en tus empresas.</p>
          </div>
          <button 
            onClick={() => setShowAssign(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all"
          >
            <Plus size={18} /> Asignar Empleado
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
          {employees.map(emp => (
            <motion.div 
              key={emp.uid}
              whileHover={{ y: -2 }}
              className="glass-card p-5 lg:p-6 rounded-3xl border border-zinc-100 flex flex-col gap-5 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-zinc-900 rounded-full flex items-center justify-center text-white font-bold text-lg lg:text-xl shrink-0 shadow-inner">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-zinc-900 text-sm lg:text-base truncate">{emp.name}</h4>
                    <p className="text-xs text-zinc-500 truncate">{emp.email}</p>
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      emp.role === 'COMPANY_ADMIN' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 
                      emp.role === 'INVOICE_EDITOR' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                      'bg-zinc-100 text-zinc-600 border border-zinc-200'
                    }`}>
                      {emp.role === 'COMPANY_ADMIN' ? 'Administrador' : emp.role === 'INVOICE_EDITOR' ? 'Editor' : 'Solo Lectura'}
                    </span>
                  </div>
                </div>
                {(userProfile?.role === 'PLATFORM_ADMIN' || userProfile?.role === 'COMPANY_ADMIN') && (
                  <button 
                    onClick={async () => {
                      if (confirm(`¿Eliminar a ${emp.name}?`)) {
                        try {
                          await deleteDoc(doc(db, 'users', emp.uid));
                        } catch (err) {
                          handleFirestoreError(err, OperationType.DELETE, `users/${emp.uid}`);
                        }
                      }
                    }}
                    className="p-2 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                    title="Eliminar empleado"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              
              <div className="pt-4 border-t border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Empresas Asignadas</p>
                <div className="flex flex-wrap gap-1.5">
                  {emp.companyIds && emp.companyIds.length > 0 ? (
                    emp.companyIds.map(cid => {
                      const comp = companies.find(c => c.id === cid);
                      return comp ? (
                        <span key={cid} className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-medium shadow-sm">
                          {comp.name}
                        </span>
                      ) : null;
                    })
                  ) : (
                    <span className="text-xs text-zinc-400 italic bg-zinc-50 px-2 py-1 rounded-md border border-zinc-100">Ninguna empresa asignada</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {employees.length === 0 && (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-zinc-300 shadow-sm">
              <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-zinc-400" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900">Aún no hay empleados</h3>
              <p className="text-sm text-zinc-500 mt-2 max-w-sm">
                Empieza a construir tu equipo asignando empleados a tus empresas para que puedan colaborar.
              </p>
              <button 
                onClick={() => setShowAssign(true)}
                className="mt-6 flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all shadow-md"
              >
                <Plus size={16} /> Asignar Primer Empleado
              </button>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showAssign && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAssign(false)}
                className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-zinc-100"
              >
                <div className="p-5 sm:p-6 border-b border-zinc-100 flex justify-between items-center shrink-0 bg-white">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-zinc-900">Asignar Empleado</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Añade un nuevo miembro a tu equipo</p>
                  </div>
                  <button onClick={() => setShowAssign(false)} className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="overflow-y-auto p-5 sm:p-6 bg-zinc-50/30">
                  <form id="assign-form" onSubmit={handleAssign} className="space-y-6">
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 ml-1">Nombre Completo</label>
                        <input 
                          type="text" required value={assignName} onChange={(e) => setAssignName(e.target.value)}
                          placeholder="Ej. Juan Pérez"
                          className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all outline-none shadow-sm placeholder:text-zinc-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 ml-1">Correo Electrónico</label>
                        <input 
                          type="email" required value={assignEmail} onChange={(e) => setAssignEmail(e.target.value)}
                          placeholder="juan@ejemplo.com"
                          className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all outline-none shadow-sm placeholder:text-zinc-400"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-700 ml-1">Rol en el Sistema</label>
                        <div className="relative">
                          <select 
                            value={assignRole} onChange={(e) => setAssignRole(e.target.value as any)}
                            className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all outline-none appearance-none shadow-sm font-medium text-zinc-700"
                          >
                            <option value="INVOICE_EDITOR">Editor de Facturas (Puede crear y editar)</option>
                            <option value="READ_ONLY">Solo Lectura (Ver reportes y facturas)</option>
                            <option value="COMPANY_ADMIN">Administrador (Control total)</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-zinc-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                          </div>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-bold text-zinc-700 ml-1">Empresas a las que tendrá acceso</label>
                          <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                            {selectedCompanyIds.length} seleccionadas
                          </span>
                        </div>
                        {companies.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {companies.map(c => (
                              <label key={c.id} className={`flex items-start gap-3 p-3.5 rounded-xl cursor-pointer border transition-all ${selectedCompanyIds.includes(c.id) ? 'bg-zinc-900 border-zinc-900 shadow-md' : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'}`}>
                                <div className="pt-0.5">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedCompanyIds.includes(c.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) setSelectedCompanyIds([...selectedCompanyIds, c.id]);
                                      else setSelectedCompanyIds(selectedCompanyIds.filter(id => id !== c.id));
                                    }}
                                    className={`w-4 h-4 rounded border-zinc-300 focus:ring-zinc-900 transition-colors ${selectedCompanyIds.includes(c.id) ? 'text-white border-transparent bg-white/20' : 'text-zinc-900'}`}
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-sm font-bold truncate transition-colors ${selectedCompanyIds.includes(c.id) ? 'text-white' : 'text-zinc-900'}`}>{c.name}</p>
                                  <p className={`text-[10px] truncate transition-colors ${selectedCompanyIds.includes(c.id) ? 'text-zinc-300' : 'text-zinc-500'}`}>RNC: {c.rnc}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
                            <div className="w-5 h-5 shrink-0 mt-0.5">
                              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <p>No tienes empresas registradas. Debes crear una empresa primero para poder asignar empleados.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </form>
                </div>
                
                <div className="p-5 sm:p-6 border-t border-zinc-100 bg-white shrink-0 flex justify-end gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowAssign(false)}
                    className="px-5 py-2.5 text-sm font-bold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    form="assign-form"
                    disabled={selectedCompanyIds.length === 0 || !assignName || !assignEmail}
                    className="px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-bold text-sm shadow-md hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                  >
                    <Users size={16} />
                    Guardar Empleado
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const Reports = () => (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Reportes Fiscales</h2>
        <p className="text-zinc-500 text-sm font-medium">Genera tus reportes 606 y 607 para la DGII.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card p-8 rounded-3xl border border-zinc-100 flex flex-col gap-6"
        >
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-900 mb-2">Reporte 606</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Formato de Envío de Compras de Bienes y Servicios.</p>
          </div>
          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/reports/606', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rnc: activeCompany?.rnc, period: new Date().toISOString().slice(0, 7).replace('-', '') })
                });
                if (!res.ok) throw new Error('Error al generar reporte');
                const data = await res.json();
                alert(`Reporte 606 generado: ${data.reportId}`);
              } catch (err: any) {
                alert(`Error: ${err.message}`);
              }
            }}
            className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Generar 606
          </button>
        </motion.div>

        <motion.div 
          whileHover={{ y: -5 }}
          className="glass-card p-8 rounded-3xl border border-zinc-100 flex flex-col gap-6"
        >
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <BarChart3 size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-zinc-900 mb-2">Reporte 607</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">Formato de Envío de Ventas de Bienes y Servicios.</p>
          </div>
          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/reports/607', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rnc: activeCompany?.rnc, period: new Date().toISOString().slice(0, 7).replace('-', '') })
                });
                if (!res.ok) throw new Error('Error al generar reporte');
                const data = await res.json();
                alert(`Reporte 607 generado: ${data.reportId}`);
              } catch (err: any) {
                alert(`Error: ${err.message}`);
              }
            }}
            className="w-full py-3 bg-zinc-900 text-white rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Generar 607
          </button>
        </motion.div>
      </div>
    </div>
  );

  const OwnerPanel = () => {
    const [ownerSubTab, setOwnerSubTab] = useState('customers');

    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900">Panel de Control SaaS</h2>
            <p className="text-zinc-500 mt-1">Gestión administrativa del sistema</p>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            <button onClick={() => setOwnerSubTab('customers')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${ownerSubTab === 'customers' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-100'}`}>Usuarios</button>
            <button onClick={() => setOwnerSubTab('subscriptions')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${ownerSubTab === 'subscriptions' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-100'}`}>Suscripciones</button>
            <button onClick={() => setOwnerSubTab('plans')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${ownerSubTab === 'plans' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-100'}`}>Planes</button>
            <button onClick={() => setOwnerSubTab('logs')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${ownerSubTab === 'logs' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-100'}`}>Logs</button>
            <button onClick={() => setOwnerSubTab('dgii')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${ownerSubTab === 'dgii' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-100'}`}>DGII</button>
            <button onClick={() => setOwnerSubTab('revenue')} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${ownerSubTab === 'revenue' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-500 hover:bg-zinc-100'}`}>Métricas</button>
          </div>
        </div>

        {ownerSubTab === 'plans' && (
          <div className="flex justify-end">
            <button 
              onClick={() => setShowNewPlan(true)}
              className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-zinc-200 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} /> Nuevo Plan
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Usuarios Totales" value={allUsers.length.toString()} icon={Users} color="bg-blue-500" />
          <StatCard label="Suscripciones Activas" value={allSubscriptions.filter(s => s.status === 'active').length.toString()} icon={CreditCard} color="bg-emerald-500" />
          <StatCard label="Ingresos Mensuales" value={`RD$ ${revenueMetrics.reduce((acc, m) => acc + m.amount, 0).toLocaleString()}`} icon={TrendingUp} color="bg-indigo-500" />
        </div>

        <div className="glass-card rounded-3xl overflow-hidden">
          {ownerSubTab === 'customers' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Usuario</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Rol</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Suscripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {allUsers.map((u, idx) => (
                    <tr key={u.uid || `user-${idx}`} className="hover:bg-zinc-50 transition-all">
                      <td className="px-6 py-4 font-bold text-zinc-900">{u.name}</td>
                      <td className="px-6 py-4 text-zinc-500">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${u.role === 'PLATFORM_ADMIN' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500'}`}>{u.role}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">{u.subscriptionId || 'Ninguna'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ownerSubTab === 'plans' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {allPlans.map((p, idx) => (
                  <div key={p.id || `plan-${idx}`} className="p-6 border border-zinc-100 rounded-2xl bg-zinc-50 flex flex-col gap-4 group hover:border-zinc-900 transition-all">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-zinc-900">{p.name}</h4>
                      <span className="text-xs font-bold text-zinc-400">RD$ {p.price.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-zinc-500 flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> {p.invoiceLimit} Facturas</p>
                      <p className="text-xs text-zinc-500 flex items-center gap-2"><CheckCircle size={12} className="text-emerald-500" /> {p.companyLimit} Empresas</p>
                    </div>
                    <button 
                      onClick={() => {
                        setEditingPlanId(p.id);
                        setPlanFormData({
                          name: p.name,
                          price: p.price.toString(),
                          invoiceLimit: p.invoiceLimit.toString(),
                          companyLimit: p.companyLimit.toString(),
                          features: p.features.join(', ')
                        });
                        setShowNewPlan(true);
                      }}
                      className="mt-auto w-full py-2 bg-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all"
                    >
                      Editar Plan
                    </button>
                  </div>
                ))}
                
                <button 
                  onClick={() => {
                    setEditingPlanId(null);
                    setPlanFormData({ name: '', price: '', invoiceLimit: '', companyLimit: '', features: '' });
                    setShowNewPlan(true);
                  }}
                  className="p-6 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-zinc-900 hover:border-zinc-900 transition-all min-h-[160px]"
                >
                  <Plus size={24} />
                  <span className="text-xs font-bold">Nuevo Plan</span>
                </button>

                {allPlans.length === 0 && (
                  <button 
                    onClick={initializePlans}
                    className="p-6 border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-emerald-600 hover:border-emerald-600 transition-all min-h-[160px]"
                  >
                    <History size={24} />
                    <span className="text-xs font-bold">Inicializar Planes Default</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {ownerSubTab === 'logs' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Fecha</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nivel</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Mensaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {systemLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((l, idx) => (
                    <tr key={l.id || `log-${idx}`} className="hover:bg-zinc-50 transition-all">
                      <td className="px-6 py-4 text-xs text-zinc-500">{new Date(l.timestamp).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${l.level === 'ERROR' ? 'bg-rose-50 text-rose-600' : l.level === 'WARN' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>{l.level}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-900">{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {ownerSubTab === 'dgii' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-100">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Factura</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Mensaje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {dgiiResponses.map((r, idx) => (
                    <tr key={r.id || `dgii-${idx}`} className="hover:bg-zinc-50 transition-all">
                      <td className="px-6 py-4 font-bold text-zinc-900">{r.invoiceId}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${r.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{r.status}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-500">{r.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = searchTerm === '' || 
      invoice.ecf.toLowerCase().includes(searchTerm.toLowerCase()) || 
      invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customerRnc.includes(searchTerm);
      
    const matchesClient = filterClient === '' || invoice.customerName.toLowerCase().includes(filterClient.toLowerCase()) || invoice.customerRnc.includes(filterClient);
    const matchesStatus = filterStatus === '' || invoice.status === filterStatus;
    
    let matchesDate = true;
    if (filterDateFrom) {
      matchesDate = matchesDate && new Date(invoice.date) >= new Date(filterDateFrom);
    }
    if (filterDateTo) {
      matchesDate = matchesDate && new Date(invoice.date) <= new Date(filterDateTo + 'T23:59:59');
    }

    return matchesSearch && matchesClient && matchesStatus && matchesDate;
  });

  const handleExportInvoices = () => {
    if (filteredInvoices.length === 0) {
      alert('No hay facturas para exportar.');
      return;
    }

    const headers = ['e-CF', 'Cliente', 'RNC Cliente', 'Fecha', 'Subtotal', 'ITBIS', 'Total', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...filteredInvoices.map(inv => [
        inv.ecf,
        `"${inv.customerName}"`,
        inv.customerRnc,
        new Date(inv.date).toLocaleDateString(),
        inv.subtotal,
        inv.itbis,
        inv.total,
        inv.status
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `facturas-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-zinc-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-50 p-6 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full glass-card p-8 lg:p-10 rounded-3xl text-center flex flex-col gap-6"
        >
          <div className="flex justify-center">
            <div className="p-4 bg-zinc-900 rounded-2xl shadow-xl">
              <FileText className="text-white" size={40} />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">
              Factura<span className="text-red-600">D</span><span className="text-blue-600">O</span>
            </h1>
            <p className="text-zinc-500 mt-2">SaaS de Facturación Electrónica para República Dominicana</p>
          </div>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4 text-left">
            {authMode === 'signup' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required
                  value={emailAuthData.name}
                  onChange={(e) => setEmailAuthData({...emailAuthData, name: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all"
                  placeholder="Tu nombre"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
              <input 
                type="email" 
                required
                value={emailAuthData.email}
                onChange={(e) => setEmailAuthData({...emailAuthData, email: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all"
                placeholder="ejemplo@correo.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest ml-1">Contraseña</label>
              <input 
                type="password" 
                required
                value={emailAuthData.password}
                onChange={(e) => setEmailAuthData({...emailAuthData, password: e.target.value})}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all"
                placeholder="••••••••"
              />
              {authMode === 'login' && (
                <div className="flex justify-end pr-1 mt-1">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-widest transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}
            </div>

            {authError && (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-rose-500 bg-rose-50 p-3 rounded-xl border border-rose-100">
                  {authError}
                </p>
                {authError.includes("consola de Firebase") && (
                  <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-[10px] text-zinc-500 leading-relaxed">
                    <p className="font-bold text-zinc-900 mb-1">Cómo habilitar el inicio de sesión:</p>
                    <ol className="list-decimal ml-3 flex flex-col gap-1">
                      <li>Ve a la <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Consola de Firebase</a>.</li>
                      <li>Entra en <b>Authentication</b> &gt; <b>Sign-in method</b>.</li>
                      <li>Haz clic en <b>Add new provider</b> y elige <b>Email/Password</b>.</li>
                      <li>Activa el primer interruptor (Habilitar) y dale a <b>Guardar</b>.</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit"
              className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </button>
          </form>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-200" />
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">O continuar con</span>
            <div className="flex-1 h-px bg-zinc-200" />
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleLogin}
              disabled={googleAuthLoading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 py-3.5 rounded-2xl font-semibold text-zinc-700 hover:bg-zinc-50 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {googleAuthLoading ? (
                <svg className="animate-spin w-5 h-5 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              )}
              {googleAuthLoading ? 'Cargando...' : 'Google'}
            </button>
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-all"
            >
              {authMode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
          
          <p className="text-[10px] text-zinc-400">
            Al continuar, aceptas nuestros términos y condiciones de servicio.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col lg:flex-row bg-zinc-50 overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:flex w-72 bg-white border-r border-zinc-200 flex-col p-6">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="p-2 bg-zinc-900 rounded-lg">
            <FileText className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Factura<span className="text-red-600">D</span><span className="text-blue-600">O</span>
          </span>
        </div>

        <nav className="flex-1 flex flex-col gap-2">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <SidebarItem icon={FileText} label="Facturas" active={activeTab === 'invoices'} onClick={() => setActiveTab('invoices')} />
          <SidebarItem icon={Users} label="Clientes" active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
          <SidebarItem icon={Plus} label="Productos" active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
          <SidebarItem icon={BarChart3} label="Reportes" active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} />
          {(userProfile?.role === 'COMPANY_ADMIN' || userProfile?.role === 'PLATFORM_ADMIN') && (
            <SidebarItem icon={Users} label="Equipo" active={activeTab === 'team'} onClick={() => setActiveTab('team')} />
          )}
          <SidebarItem icon={CreditCard} label="Planes" active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} />
          <SidebarItem icon={Settings} label="Configuración" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          {(userProfile?.role === 'PLATFORM_ADMIN' || userProfile?.role === 'COMPANY_ADMIN') && (
            <SidebarItem icon={History} label="Logs del Sistema" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          )}
          {userProfile?.role === 'PLATFORM_ADMIN' && (
            <SidebarItem icon={Crown} label="Panel Owner" active={activeTab === 'owner'} onClick={() => setActiveTab('owner')} />
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-zinc-100 relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={`w-full flex items-center gap-3 p-2 rounded-2xl transition-all duration-200 group ${showUserMenu ? 'bg-zinc-100' : 'hover:bg-zinc-50'}`}
          >
            <div className="relative">
              <img 
                src={user.photoURL || ''} 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm group-hover:border-zinc-200 transition-all" 
                alt="Profile" 
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold text-zinc-900 truncate">{user.displayName}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Mi Cuenta</p>
            </div>
            <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-300 ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute bottom-full left-0 w-full mb-2 bg-white rounded-2xl shadow-2xl border border-zinc-100 p-2 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-zinc-50 mb-1">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Sesión iniciada como</p>
                    <p className="text-sm font-bold text-zinc-900 truncate">{user.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveTab('settings');
                      setShowUserMenu(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 rounded-xl transition-all"
                  >
                    <Settings size={18} />
                    Configuración
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all mt-1"
                  >
                    <LogOut size={18} />
                    Cerrar Sesión
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-zinc-900/60 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl z-50 flex flex-col p-6 lg:hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3 px-2">
                  <div className="p-2 bg-zinc-900 rounded-lg">
                    <FileText className="text-white" size={24} />
                  </div>
                  <span className="text-xl font-bold tracking-tight">
                    Factura<span className="text-rose-600">D</span><span className="text-blue-600">O</span>
                  </span>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-zinc-400 hover:bg-zinc-100 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 flex flex-col gap-2 overflow-y-auto">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={FileText} label="Facturas" active={activeTab === 'invoices'} onClick={() => { setActiveTab('invoices'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={Users} label="Clientes" active={activeTab === 'customers'} onClick={() => { setActiveTab('customers'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={Plus} label="Productos" active={activeTab === 'products'} onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={BarChart3} label="Reportes" active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} />
                {(userProfile?.role === 'COMPANY_ADMIN' || userProfile?.role === 'PLATFORM_ADMIN') && (
                  <SidebarItem icon={Users} label="Equipo" active={activeTab === 'team'} onClick={() => { setActiveTab('team'); setIsSidebarOpen(false); }} />
                )}
                <SidebarItem icon={CreditCard} label="Planes" active={activeTab === 'pricing'} onClick={() => { setActiveTab('pricing'); setIsSidebarOpen(false); }} />
                <SidebarItem icon={Settings} label="Configuración" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} />
                {(userProfile?.role === 'PLATFORM_ADMIN' || userProfile?.role === 'COMPANY_ADMIN') && (
                  <SidebarItem icon={History} label="Logs del Sistema" active={activeTab === 'logs'} onClick={() => { setActiveTab('logs'); setIsSidebarOpen(false); }} />
                )}
                {userProfile?.role === 'PLATFORM_ADMIN' && (
                  <SidebarItem icon={Crown} label="Panel Owner" active={activeTab === 'owner'} onClick={() => { setActiveTab('owner'); setIsSidebarOpen(false); }} />
                )}
              </nav>

              <div className="mt-auto pt-6 border-t border-zinc-100">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <LogOut size={18} />
                  Cerrar Sesión
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pb-20 lg:pb-0">
        {/* Header */}
        <header className="h-16 lg:h-20 bg-white border-b border-zinc-200 px-4 lg:px-8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 lg:gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl transition-all"
              >
                <Menu size={24} />
              </button>
              <div className="hidden lg:flex p-2 bg-zinc-900 rounded-lg">
                <FileText className="text-white" size={18} />
              </div>
              <CompanySwitcher />
            </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <div className="relative hidden lg:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar facturas..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-zinc-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-zinc-900 transition-all"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 lg:p-2.5 text-zinc-500 hover:bg-zinc-100 rounded-xl relative transition-all"
              >
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setShowNotifications(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-zinc-100 z-50 overflow-hidden"
                    >
                      <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                        <h3 className="font-bold text-zinc-900">Notificaciones</h3>
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-full">1 nueva</span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        <div className="p-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors cursor-pointer relative">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                          <p className="text-sm font-medium text-zinc-900">¡Bienvenido a FacturaDO!</p>
                          <p className="text-xs text-zinc-500 mt-1">Configura tu empresa para empezar a emitir facturas electrónicas.</p>
                          <p className="text-[10px] text-zinc-400 mt-2 font-medium">Hace 5 minutos</p>
                        </div>
                        <div className="p-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors cursor-pointer opacity-70">
                          <p className="text-sm font-medium text-zinc-900">Actualización de sistema</p>
                          <p className="text-xs text-zinc-500 mt-1">Hemos mejorado la velocidad de conexión con DGII.</p>
                          <p className="text-[10px] text-zinc-400 mt-2 font-medium">Ayer</p>
                        </div>
                      </div>
                      <div className="p-3 bg-zinc-50 text-center border-t border-zinc-100">
                        <button 
                          onClick={() => setShowNotifications(false)}
                          className="text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                        >
                          Marcar todas como leídas
                        </button>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <button 
              onClick={() => setShowQRScanner(true)}
              className="hidden lg:flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-50 transition-all"
            >
              <QrCode size={18} />
              Escanear QR
            </button>
            {canEdit() && (
              <button 
                onClick={() => setShowNewInvoice(true)}
                className="hidden lg:flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-zinc-200 hover:scale-105 active:scale-95 transition-all"
              >
                <Plus size={18} />
                Nueva Factura
              </button>
            )}
            <div className="lg:hidden relative">
               <button 
                 onClick={() => setShowUserMenu(!showUserMenu)}
                 className="flex items-center"
               >
                 <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-zinc-200" alt="Profile" />
               </button>

               <AnimatePresence>
                 {showUserMenu && (
                   <>
                     <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                     <motion.div
                       initial={{ opacity: 0, scale: 0.95, y: 10 }}
                       animate={{ opacity: 1, scale: 1, y: 0 }}
                       exit={{ opacity: 0, scale: 0.95, y: 10 }}
                       className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-zinc-100 p-2 z-50 overflow-hidden"
                     >
                       <div className="px-4 py-3 border-b border-zinc-50 mb-1">
                         <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Usuario</p>
                         <p className="text-sm font-bold text-zinc-900 truncate">{user.displayName}</p>
                       </div>
                       <button 
                         onClick={() => {
                           setActiveTab('settings');
                           setShowUserMenu(false);
                         }}
                         className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 rounded-xl transition-all"
                       >
                         <Settings size={18} />
                         Configuración
                       </button>
                       <button 
                         onClick={handleLogout}
                         className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 rounded-xl transition-all mt-1"
                       >
                         <LogOut size={18} />
                         Cerrar Sesión
                       </button>
                     </motion.div>
                   </>
                 )}
               </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'owner' && isAdmin() && (
              <motion.div 
                key="owner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <OwnerPanel />
              </motion.div>
            )}

            {activeTab === 'pricing' && (
              <motion.div 
                key="pricing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Pricing />
              </motion.div>
            )}

            {activeTab === 'products' && (
              <motion.div 
                key="products"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Products />
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Reports />
              </motion.div>
            )}

            {activeTab === 'team' && (userProfile?.role === 'COMPANY_ADMIN' || userProfile?.role === 'PLATFORM_ADMIN') && (
              <motion.div 
                key="team"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Team />
              </motion.div>
            )}

            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6 lg:gap-8"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-zinc-900">Dashboard</h2>
                    <p className="text-xs lg:text-sm text-zinc-500 mt-1">Resumen de actividad</p>
                  </div>
                  <button 
                    onClick={handleExportInvoices}
                    className="hidden lg:flex items-center gap-2 text-sm font-bold text-zinc-600 bg-white border border-zinc-200 px-4 py-2 rounded-xl hover:bg-zinc-50 transition-all"
                  >
                    <Download size={16} /> Exportar
                  </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                  <StatCard label="FacturaDO" value={`RD$ ${invoices.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()}`} icon={TrendingUp} trend="+12%" color="bg-emerald-500" />
                  <StatCard label="Emitidas" value={invoices.length.toString()} icon={FileText} trend="+5" color="bg-blue-500" />
                  <StatCard label="Pendientes" value={invoices.filter(i => i.status === 'PENDING').length.toString()} icon={Clock} color="bg-amber-500" />
                  <StatCard label="Rechazadas" value={invoices.filter(i => i.status === 'REJECTED').length.toString()} icon={AlertCircle} color="bg-rose-500" />
                </div>

                {/* Recent Invoices Table / List */}
                <div className="glass-card rounded-3xl overflow-hidden">
                  <div className="p-5 lg:p-6 border-b border-zinc-100 flex justify-between items-center">
                    <h3 className="font-bold text-zinc-900">Facturas Recientes</h3>
                    <button onClick={() => setActiveTab('invoices')} className="text-xs lg:text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-all">Ver todas</button>
                  </div>
                  
                  {/* Mobile List */}
                  <div className="lg:hidden divide-y divide-zinc-100">
                    {filteredInvoices.slice(0, 5).map((invoice) => (
                      <InvoiceItemMobile 
                        key={invoice.id} 
                        invoice={invoice} 
                        onDownload={handleDownloadPdf}
                        onDownloadXml={downloadInvoiceXml}
                        onSign={handleSignInvoice}
                      />
                    ))}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-zinc-50/50 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          <th className="px-6 py-4">e-CF / NCF</th>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4">Fecha</th>
                          <th className="px-6 py-4">Total</th>
                          <th className="px-6 py-4">Estado</th>
                          <th className="px-6 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filteredInvoices.slice(0, 5).map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-zinc-50/50 transition-all group">
                            <td className="px-6 py-4">
                              <p className="font-bold text-zinc-900">{invoice.ecf}</p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">{invoice.type}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-zinc-700">{invoice.customerName}</p>
                              <p className="text-xs text-zinc-400">{invoice.customerRnc}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-500">
                              {new Date(invoice.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-zinc-900">RD$ {invoice.total.toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={invoice.status} />
                              {(invoice.status === 'REJECTED' || invoice.status === 'CONTINGENCY') && invoice.dgiiMessage && (
                                <p className="text-[10px] text-rose-500 mt-1.5 max-w-[200px] leading-tight" title={invoice.dgiiMessage}>
                                  {invoice.dgiiMessage}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                               <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                 {invoice.status === 'PENDING' && (
                                   <button 
                                     onClick={() => handleSignInvoice(invoice)}
                                     disabled={isSigning}
                                     className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-all"
                                     title="Firmar Factura"
                                   >
                                     <ShieldCheck size={18} />
                                   </button>
                                 )}
                                 <button 
                                   onClick={() => downloadInvoiceXml(invoice)}
                                   className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg transition-all"
                                   title="Descargar XML"
                                 >
                                   <FileCode size={18} />
                                 </button>
                                 <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg transition-all">
                                   <ChevronRight size={18} />
                                 </button>
                               </div>
                             </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredInvoices.length === 0 && (
                    <div className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-zinc-50 rounded-full">
                          <FileText className="text-zinc-300" size={32} />
                        </div>
                        <p className="text-zinc-400 font-medium">No se encontraron facturas</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'invoices' && (
              <motion.div 
                key="invoices"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-8"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                  <div>
                    <h2 className="text-3xl font-bold text-zinc-900">Facturas</h2>
                    <p className="text-zinc-500 mt-1">Listado completo de documentos fiscales electrónicos</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Mobile Search */}
                    <div className="relative lg:hidden w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar facturas..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-white border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-sm w-full focus:ring-2 focus:ring-zinc-900 transition-all"
                      />
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                      <button 
                        onClick={() => setShowQRScanner(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-bold text-zinc-600 bg-white border border-zinc-200 px-4 py-2.5 rounded-xl hover:bg-zinc-50 transition-all lg:hidden"
                      >
                        <QrCode size={16} /> Escanear
                      </button>
                      <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all ${showFilters ? 'bg-zinc-900 text-white' : 'text-zinc-600 bg-white border border-zinc-200 hover:bg-zinc-50'}`}
                      >
                        <Filter size={16} /> Filtrar
                      </button>
                      <button 
                        onClick={handleExportInvoices}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-sm font-bold text-zinc-600 bg-white border border-zinc-200 px-4 py-2.5 rounded-xl hover:bg-zinc-50 transition-all"
                      >
                        <Download size={16} /> Exportar
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="glass-card rounded-3xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cliente o RNC</label>
                          <input 
                            type="text" 
                            placeholder="Nombre o RNC..."
                            value={filterClient}
                            onChange={(e) => setFilterClient(e.target.value)}
                            className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" 
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estado</label>
                          <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-zinc-900 transition-all"
                          >
                            <option value="">Todos los estados</option>
                            <option value="PENDING">Pendiente</option>
                            <option value="SIGNED">Firmada</option>
                            <option value="SENT">Enviada</option>
                            <option value="ACCEPTED">Aceptada</option>
                            <option value="REJECTED">Rechazada</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Fecha Desde</label>
                          <input 
                            type="date" 
                            value={filterDateFrom}
                            onChange={(e) => setFilterDateFrom(e.target.value)}
                            className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" 
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Fecha Hasta</label>
                          <input 
                            type="date" 
                            value={filterDateTo}
                            onChange={(e) => setFilterDateTo(e.target.value)}
                            className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" 
                          />
                        </div>
                        <div className="md:col-span-4 flex justify-end">
                          <button 
                            onClick={() => {
                              setFilterClient('');
                              setFilterStatus('');
                              setFilterDateFrom('');
                              setFilterDateTo('');
                              setSearchTerm('');
                            }}
                            className="text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-all"
                          >
                            Limpiar Filtros
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="glass-card rounded-3xl overflow-hidden">
                  {/* Mobile List */}
                  <div className="lg:hidden divide-y divide-zinc-100">
                    {filteredInvoices.map((invoice) => (
                      <InvoiceItemMobile 
                        key={invoice.id} 
                        invoice={invoice} 
                        onDownload={handleDownloadPdf}
                        onDownloadXml={downloadInvoiceXml}
                        onSign={handleSignInvoice}
                      />
                    ))}
                    {filteredInvoices.length === 0 && (
                      <div className="p-12 text-center">
                        <p className="text-zinc-400 font-medium">No se encontraron facturas</p>
                      </div>
                    )}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-zinc-50/50 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                          <th className="px-6 py-4">e-CF / NCF</th>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4">Fecha</th>
                          <th className="px-6 py-4">Total</th>
                          <th className="px-6 py-4">Estado</th>
                          <th className="px-6 py-4">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {filteredInvoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-zinc-50/50 transition-all group">
                            <td className="px-6 py-4">
                              <p className="font-bold text-zinc-900">{invoice.ecf}</p>
                              <p className="text-[10px] text-zinc-400 mt-0.5">{invoice.type}</p>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-medium text-zinc-700">{invoice.customerName}</p>
                              <p className="text-xs text-zinc-400">{invoice.customerRnc}</p>
                            </td>
                            <td className="px-6 py-4 text-sm text-zinc-500">
                              {new Date(invoice.date).toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-zinc-900">RD$ {invoice.total.toLocaleString()}</p>
                            </td>
                            <td className="px-6 py-4">
                              <StatusBadge status={invoice.status} />
                              {(invoice.status === 'REJECTED' || invoice.status === 'CONTINGENCY') && invoice.dgiiMessage && (
                                <p className="text-[10px] text-rose-500 mt-1.5 max-w-[200px] leading-tight" title={invoice.dgiiMessage}>
                                  {invoice.dgiiMessage}
                                </p>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                {invoice.status === 'PENDING' && (
                                  <button 
                                    onClick={() => handleSignInvoice(invoice)}
                                    disabled={isSigning}
                                    className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-white rounded-lg transition-all"
                                    title="Firmar Factura"
                                  >
                                    <ShieldCheck size={16} />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDownloadPdf(invoice.id)}
                                  className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg transition-all"
                                  title="Descargar PDF"
                                >
                                  <Download size={16} />
                                </button>
                                <button 
                                  onClick={() => downloadInvoiceXml(invoice)}
                                  className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg transition-all"
                                  title="Descargar XML"
                                >
                                  <FileCode size={16} />
                                </button>
                                <button className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white rounded-lg transition-all">
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredInvoices.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <p className="text-zinc-400 font-medium">No se encontraron facturas</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'customers' && (
              <motion.div 
                key="customers"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-8"
              >
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-3xl font-bold text-zinc-900">Clientes</h2>
                    <p className="text-zinc-500 mt-1">Directorio de clientes registrados</p>
                  </div>
                  {canEdit() && (
                    <button 
                      onClick={() => setShowNewCustomer(true)}
                      className="flex items-center gap-2 bg-zinc-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-zinc-200 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus size={18} /> Nuevo Cliente
                    </button>
                  )}
                </div>

                <div className="glass-card rounded-3xl overflow-x-auto border border-zinc-100">
                  <table className="w-full text-left min-w-[600px]">
                    <thead>
                      <tr className="bg-zinc-50/50 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Nombre</th>
                        <th className="px-6 py-4">RNC</th>
                        <th className="px-6 py-4">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {customers.map((customer) => (
                        <tr key={customer.id} className="hover:bg-zinc-50/50 transition-all">
                          <td className="px-6 py-4 font-bold text-zinc-900">{customer.name}</td>
                          <td className="px-6 py-4 text-zinc-700">{customer.rnc}</td>
                          <td className="px-6 py-4 text-zinc-500">{customer.email || 'N/A'}</td>
                        </tr>
                      ))}
                      {customers.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-12 text-center text-zinc-400 font-medium">
                            No se encontraron clientes
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-8"
              >
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900">Configuración</h2>
                  <p className="text-zinc-500 mt-1">Gestiona tu cuenta y preferencias</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="glass-card rounded-3xl p-6 lg:p-8">
                      <h3 className="font-bold text-zinc-900 mb-6">Perfil de Usuario</h3>
                      <div className="flex items-center gap-6 mb-8">
                        <img src={user.photoURL || ''} className="w-20 h-20 rounded-full border-4 border-zinc-100" alt="Profile" />
                        <div>
                          <p className="text-xl font-bold text-zinc-900">{user.displayName}</p>
                          <p className="text-zinc-500">{user.email}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nombre Completo</label>
                          <input type="text" defaultValue={user.displayName || ''} className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Correo Electrónico</label>
                          <input type="email" defaultValue={user.email || ''} disabled className="bg-zinc-100 border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-500 cursor-not-allowed" />
                        </div>
                      </div>
                    </div>

                    <div className="glass-card rounded-3xl p-6 lg:p-8">
                      <h3 className="font-bold text-zinc-900 mb-6">Empresa Activa</h3>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nombre de la Empresa</label>
                          <input type="text" defaultValue={activeCompany?.name || ''} className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">RNC</label>
                          <input type="text" defaultValue={activeCompany?.rnc || ''} className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div className="glass-card rounded-3xl p-6 lg:p-8">
                      <h3 className="font-bold text-zinc-900 mb-4">Ayuda</h3>
                      <p className="text-sm text-zinc-500 mb-6">¿Necesitas asistencia con tu facturación electrónica?</p>
                      <button className="w-full py-3 rounded-xl font-bold border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-all">
                        Contactar Soporte
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (userProfile?.role === 'PLATFORM_ADMIN' || userProfile?.role === 'COMPANY_ADMIN') && (
              <motion.div 
                key="logs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-8"
              >
                <SystemLogs companyId={activeCompany?.id} isAdmin={isAdmin()} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* New Plan Modal */}
      <AnimatePresence>
        {showNewPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewPlan(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{editingPlanId ? 'Editar Plan' : 'Nuevo Plan'}</h3>
                  <p className="text-zinc-500 text-sm font-medium">{editingPlanId ? 'Modifica los detalles del plan.' : 'Crea un nuevo plan de suscripción.'}</p>
                </div>
                <button onClick={() => setShowNewPlan(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-all">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>
              <form onSubmit={handleCreatePlan} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nombre del Plan</label>
                    <input 
                      type="text" 
                      required
                      value={planFormData.name}
                      onChange={(e) => setPlanFormData({...planFormData, name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                      placeholder="Ej: Plan Avanzado"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Precio (RD$)</label>
                      <input 
                        type="number" 
                        required
                        value={planFormData.price}
                        onChange={(e) => setPlanFormData({...planFormData, price: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Límite Facturas</label>
                      <input 
                        type="number" 
                        required
                        value={planFormData.invoiceLimit}
                        onChange={(e) => setPlanFormData({...planFormData, invoiceLimit: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                        placeholder="500"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Límite Empresas</label>
                    <input 
                      type="number" 
                      required
                      value={planFormData.companyLimit}
                      onChange={(e) => setPlanFormData({...planFormData, companyLimit: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Características (separadas por coma)</label>
                    <textarea 
                      required
                      value={planFormData.features}
                      onChange={(e) => setPlanFormData({...planFormData, features: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all h-24 resize-none"
                      placeholder="Ej: Soporte 24/7, API Access, Reportes Avanzados"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {editingPlanId ? 'Guardar Cambios' : 'Crear Plan'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNewProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewProduct(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Nuevo Producto</h3>
                  <p className="text-zinc-500 text-sm font-medium">Registra un nuevo producto o servicio.</p>
                </div>
                <button onClick={() => setShowNewProduct(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-all">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>
              <form onSubmit={handleCreateProduct} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nombre del Producto</label>
                    <input 
                      type="text" 
                      required
                      value={productFormData.name}
                      onChange={(e) => setProductFormData({...productFormData, name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                      placeholder="Ej: Servicio de Consultoría"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Precio (RD$)</label>
                      <input 
                        type="number" 
                        required
                        value={productFormData.price}
                        onChange={(e) => setProductFormData({...productFormData, price: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">ITBIS (%)</label>
                      <select 
                        value={productFormData.itbis}
                        onChange={(e) => setProductFormData({...productFormData, itbis: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                      >
                        <option value="18">18%</option>
                        <option value="16">16%</option>
                        <option value="0">Exento (0%)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Categoría</label>
                      <input 
                        type="text" 
                        value={productFormData.category}
                        onChange={(e) => setProductFormData({...productFormData, category: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                        placeholder="Ej: Servicios"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Unidad</label>
                      <select 
                        value={productFormData.unit}
                        onChange={(e) => setProductFormData({...productFormData, unit: e.target.value})}
                        className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                      >
                        <option value="UNIDAD">Unidad</option>
                        <option value="HORA">Hora</option>
                        <option value="SERVICIO">Servicio</option>
                        <option value="MES">Mes</option>
                      </select>
                    </div>
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Guardar Producto
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* New Customer Modal */}
      <AnimatePresence>
        {showNewCustomer && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewCustomer(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 lg:p-8 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-zinc-900">Nuevo Cliente</h3>
                  <p className="text-zinc-500 text-xs lg:text-sm">Registrar nuevo contacto</p>
                </div>
                <button 
                  onClick={() => setShowNewCustomer(false)}
                  className="p-2 hover:bg-zinc-100 rounded-xl transition-all"
                >
                  <Plus className="rotate-45 text-zinc-400" size={24} />
                </button>
              </div>
              
              <div className="p-6 lg:p-8 flex flex-col gap-4 lg:gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nombre</label>
                  <input 
                    type="text" 
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData({...customerFormData, name: e.target.value})}
                    className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">RNC / Cédula</label>
                  <input 
                    type="text" 
                    value={customerFormData.rnc}
                    onChange={(e) => setCustomerFormData({...customerFormData, rnc: e.target.value})}
                    className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" 
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email</label>
                  <input 
                    type="email" 
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({...customerFormData, email: e.target.value})}
                    className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" 
                  />
                </div>
              </div>

              <div className="p-6 lg:p-8 bg-zinc-50 flex gap-3">
                <button 
                  onClick={() => setShowNewCustomer(false)}
                  className="flex-1 py-3 lg:py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCreateCustomer}
                  className="flex-1 bg-zinc-900 text-white py-3 lg:py-4 rounded-2xl font-bold shadow-lg shadow-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Guardar Cliente
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNewCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewCompany(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                <h3 className="text-2xl font-black text-zinc-900 tracking-tight">Nueva Empresa</h3>
                <button onClick={() => setShowNewCompany(false)} className="p-2 hover:bg-zinc-100 rounded-xl transition-all">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>
              <form onSubmit={handleCreateCompany} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nombre de la Empresa</label>
                    <input 
                      type="text" required value={companyFormData.name} onChange={(e) => setCompanyFormData({...companyFormData, name: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">RNC</label>
                    <input 
                      type="text" required value={companyFormData.rnc} onChange={(e) => setCompanyFormData({...companyFormData, rnc: e.target.value})}
                      className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-zinc-900 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Contribuyente</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        type="button" 
                        onClick={() => setCompanyFormData({...companyFormData, type: 'FISICA'})}
                        className={`py-4 rounded-2xl font-bold text-sm transition-all ${companyFormData.type === 'FISICA' ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'}`}
                      >
                        Persona Física
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setCompanyFormData({...companyFormData, type: 'JURIDICA'})}
                        className={`py-4 rounded-2xl font-bold text-sm transition-all ${companyFormData.type === 'JURIDICA' ? 'bg-zinc-900 text-white' : 'bg-zinc-50 text-zinc-500 hover:bg-zinc-100'}`}
                      >
                        Persona Jurídica
                      </button>
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl shadow-zinc-200">
                  Crear Empresa
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNewInvoice && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewInvoice(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 100 }}
              className="relative w-full max-w-xl bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 lg:p-8 border-b border-zinc-100 flex justify-between items-center">
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-zinc-900">Nueva Factura</h3>
                  <p className="text-zinc-500 text-xs lg:text-sm">Emisión de comprobante fiscal</p>
                </div>
                <button 
                  onClick={() => setShowNewInvoice(false)}
                  className="p-2 hover:bg-zinc-100 rounded-xl transition-all"
                >
                  <Plus className="rotate-45 text-zinc-400" size={24} />
                </button>
              </div>
              
              <div className="p-6 lg:p-8 flex flex-col gap-4 lg:gap-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">RNC Emisor</label>
                    <input 
                      type="text" 
                      value={invoiceFormData.rncEmisor}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, rncEmisor: e.target.value})}
                      className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">e-NCF</label>
                    <input 
                      type="text" 
                      value={invoiceFormData.ecf}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, ecf: e.target.value})}
                      className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">RNC Cliente</label>
                    <input 
                      type="text" 
                      placeholder="101-00000-1" 
                      value={invoiceFormData.customerRnc}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, customerRnc: e.target.value})}
                      className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" 
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nombre Cliente</label>
                    <input 
                      type="text" 
                      placeholder="Nombre o Razón Social" 
                      value={invoiceFormData.customerName}
                      onChange={(e) => setInvoiceFormData({...invoiceFormData, customerName: e.target.value})}
                      className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-zinc-900 transition-all" 
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Monto Total (RD$)</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    value={invoiceFormData.total}
                    onChange={(e) => setInvoiceFormData({...invoiceFormData, total: e.target.value})}
                    className="bg-zinc-50 border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-zinc-900 transition-all" 
                  />
                </div>
                <div className="p-4 bg-zinc-50 rounded-2xl border border-dashed border-zinc-200 text-center">
                  <p className="text-[10px] text-zinc-400">La secuencia e-CF se generará automáticamente al firmar.</p>
                </div>
              </div>

              <div className="p-6 lg:p-8 bg-zinc-50 flex gap-3">
                <button 
                  onClick={() => setShowNewInvoice(false)}
                  className="flex-1 py-3 lg:py-4 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 transition-all"
                >
                  Cancelar
                </button>
                {canEdit() && (
                  <button 
                    onClick={handleCreateInvoice}
                    className="flex-1 bg-zinc-900 text-white py-3 lg:py-4 rounded-2xl font-bold shadow-lg shadow-zinc-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Emitir y Firmar
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 py-3 flex justify-between items-center z-40">
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-zinc-900' : 'text-zinc-400'}`}>
          <LayoutDashboard size={20} />
          <span className="text-[10px] font-bold">Inicio</span>
        </button>
        <button onClick={() => setActiveTab('invoices')} className={`flex flex-col items-center gap-1 ${activeTab === 'invoices' ? 'text-zinc-900' : 'text-zinc-400'}`}>
          <FileText size={20} />
          <span className="text-[10px] font-bold">Facturas</span>
        </button>
        {canEdit() && (
          <div className="relative -top-6">
            <button 
              onClick={() => setShowNewInvoice(true)}
              className="bg-zinc-900 text-white p-4 rounded-2xl shadow-lg shadow-zinc-300 active:scale-95 transition-all"
            >
              <Plus size={24} />
            </button>
          </div>
        )}
        <button onClick={() => setActiveTab('customers')} className={`flex flex-col items-center gap-1 ${activeTab === 'customers' ? 'text-zinc-900' : 'text-zinc-400'}`}>
          <Users size={20} />
          <span className="text-[10px] font-bold">Clientes</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 ${activeTab === 'settings' ? 'text-zinc-900' : 'text-zinc-400'}`}>
          <Settings size={20} />
          <span className="text-[10px] font-bold">Ajustes</span>
        </button>
      </nav>
      {/* QR Scanner Modal */}
      <AnimatePresence>
        {showQRScanner && (
          <QRScanner 
            onScan={handleQRScan} 
            onClose={() => setShowQRScanner(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
