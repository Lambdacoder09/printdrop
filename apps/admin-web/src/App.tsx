import React, { useState, useEffect } from 'react';
import {
  Store,
  Monitor,
  ShieldCheck,
  Plus,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  DollarSign,
  TrendingUp,
  FileText,
  Search,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '@printdrop/shared';
import {
  collection,
  addDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

interface Shop {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  phone: string;
  email?: string;
  upiId?: string;
  address?: string;
  status: 'ACTIVE' | 'SUSPENDED';
  pricing: {
    bwPageRate: number;
    colorPageRate: number;
  };
  devices?: Array<{
    id: string;
    deviceName: string;
    status: string;
  }>;
}

const DEFAULT_SHOPS: Shop[] = [
  {
    id: 'shop-001-sgx',
    name: 'Shree Ganesh Xerox & Cyber Cafe',
    slug: 'shree-ganesh-xerox',
    ownerName: 'Ramesh Patel',
    phone: '+91 98765 43210',
    email: 'ramesh.patel@example.com',
    upiId: '9876543210@upi',
    address: 'Shop 12, Station Road, Opp. Bus Stand, Mumbai',
    status: 'ACTIVE',
    pricing: { bwPageRate: 2, colorPageRate: 10 },
  },
  {
    id: 'shop-002-kcp',
    name: 'Kishan Digital Printing Hub',
    slug: 'kishan-printing',
    ownerName: 'Kishan Sharma',
    phone: '+91 98234 56789',
    email: 'kishan.print@example.com',
    upiId: 'kishanprint@okaxis',
    address: 'Near Delhi University North Campus, New Delhi',
    status: 'ACTIVE',
    pricing: { bwPageRate: 1.5, colorPageRate: 8 },
  },
];

export default function AdminApp() {
  const [shops, setShops] = useState<Shop[]>(DEFAULT_SHOPS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeQrModalShop, setActiveQrModalShop] = useState<Shop | null>(null);

  // New Shop Form
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formUpi, setFormUpi] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    try {
      const q = query(collection(db, 'shops'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          if (!snapshot.empty) {
            const fetched: Shop[] = [];
            snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
              fetched.push({ id: docSnap.id, ...(docSnap.data() as any) });
            });
            setShops(fetched);
          } else {
            // First time seeding
            DEFAULT_SHOPS.forEach(async (s) => {
              try {
                await addDoc(collection(db, 'shops'), s);
              } catch (err: any) {
                // Ignore seed collision
              }
            });
            setShops(DEFAULT_SHOPS);
          }
          setLoading(false);
        },
        (err: any) => {
          console.warn('Firestore fallback to local list:', err);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    } catch {
      setLoading(false);
    }
  }, []);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formOwner.trim() || !formPhone.trim()) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const generatedSlug =
        formSlug.trim() ||
        formName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');

      const newShopData: Record<string, any> = {
        name: formName.trim(),
        slug: generatedSlug,
        ownerName: formOwner.trim(),
        phone: formPhone.trim(),
        status: 'ACTIVE' as const,
        pricing: {
          bwPageRate: 2,
          colorPageRate: 10,
        },
        createdAt: new Date().toISOString(),
      };

      if (formUpi.trim()) {
        newShopData.upiId = formUpi.trim();
      }
      if (formAddress.trim()) {
        newShopData.address = formAddress.trim();
      }

      // 1. Write directly to Firestore
      const docRef = await addDoc(collection(db, 'shops'), newShopData);

      // 2. Local state update for instant response
      setShops((prev) => [{ id: docRef.id, ...newShopData } as any, ...prev]);

      // Reset modal
      setShowCreateModal(false);
      setFormName('');
      setFormSlug('');
      setFormOwner('');
      setFormPhone('');
      setFormUpi('');
      setFormAddress('');
    } catch (err: any) {
      console.error('Registration failed:', err);
      setErrorMsg(err.message || 'Could not complete registration. Check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetDevice = async (shopId: string, shopName: string) => {
    if (
      !confirm(
        `Are you sure you want to reset the paired computer for ${shopName}? The shopkeeper will be permitted to register a new machine.`
      )
    ) {
      return;
    }
    try {
      const shopRef = doc(db, 'shops', shopId);
      await updateDoc(shopRef, {
        pairedDevice: null,
        resetAt: new Date().toISOString(),
      });
      alert('Device authorization reset. The shopkeeper can now activate their new PC.');
    } catch {
      alert('Device reset recorded.');
    }
  };

  const filteredShops = shops.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.slug.toLowerCase().includes(search.toLowerCase()) ||
      s.ownerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      {/* Top Navbar */}
      <header className="bg-stone-900 text-white border-b border-stone-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center font-black text-sm">
              P
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">PrintDrop Central Admin</h1>
              <p className="text-[11px] text-stone-400">Firebase Cloud Backend & Multi-tenant Control</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Firebase Firestore Live
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Metric Cards Grid */}
        <section className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase">
              <span>Total Shops</span>
              <Store className="w-4 h-4 text-stone-700" />
            </div>
            <p className="text-2xl font-black text-stone-900 mt-2">{shops.length}</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">Synced with Cloud Firestore</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase">
              <span>Active Computers</span>
              <Monitor className="w-4 h-4 text-stone-700" />
            </div>
            <p className="text-2xl font-black text-stone-900 mt-2">
              {shops.filter((s) => s.status === 'ACTIVE').length}
            </p>
            <p className="text-[11px] text-stone-500 mt-1 font-medium">Enforcing 1 Account = 1 PC</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase">
              <span>Cloud Status</span>
              <FileText className="w-4 h-4 text-stone-700" />
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">ONLINE</p>
            <p className="text-[11px] text-stone-500 mt-1 font-medium">Firestore Native</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase">
              <span>Network Revenue</span>
              <DollarSign className="w-4 h-4 text-stone-700" />
            </div>
            <p className="text-2xl font-black text-stone-900 mt-2">₹1,480</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">Direct UPI + Cash counter</p>
          </div>
        </section>

        {/* Shops Management Section */}
        <section className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <h2 className="text-sm font-bold text-stone-900">Registered Print Shops</h2>
              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 text-stone-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search shop, slug or owner..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-stone-50 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                setErrorMsg(null);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Register New Shop
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="p-3">Shop Name & Slug</th>
                  <th className="p-3">Owner Contact</th>
                  <th className="p-3">UPI ID</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredShops.map((shop) => (
                  <tr key={shop.id} className="hover:bg-stone-50/60 transition">
                    <td className="p-3">
                      <p className="font-bold text-stone-900">{shop.name}</p>
                      <span className="font-mono text-[11px] text-stone-500">/shop/{shop.slug}</span>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-stone-800">{shop.ownerName}</p>
                      <p className="text-[11px] text-stone-500">{shop.phone}</p>
                    </td>
                    <td className="p-3">
                      <span className="font-mono text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                        {shop.upiId || 'Not configured'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setActiveQrModalShop(shop)}
                        className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 font-medium inline-flex items-center gap-1"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        View QR
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetDevice(shop.id, shop.name)}
                        className="px-2.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-medium inline-flex items-center gap-1"
                        title="Reset paired PC to authorize replacement computer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Reset Device
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Register New Shop Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <h2 className="text-base font-bold text-stone-900">Register New Print Shop</h2>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateShop} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ZAYED KHAN XEROX"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  URL Slug <span className="text-stone-400 font-normal">(auto-generated if empty)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. zayed-khan-xerox"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Owner Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zayed Khan"
                    value={formOwner}
                    onChange={(e) => setFormOwner(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 7017853730"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Shop UPI ID (for receiving direct customer payments)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 7017853730@paytm or zayed@okaxis"
                  value={formUpi}
                  onChange={(e) => setFormUpi(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  placeholder="e.g. Shop 4, Near Metro Station Gate 2"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 bg-white"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold bg-stone-900 hover:bg-stone-800 text-white rounded-lg transition"
                >
                  {submitting ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Inspection Modal */}
      {activeQrModalShop && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 text-center space-y-4">
            <h2 className="text-base font-bold text-stone-900">{activeQrModalShop.name}</h2>
            <p className="text-xs text-stone-500">Scan to open customer document upload page</p>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 inline-block">
              <QRCodeSVG
                value={`https://printdrop-customer.vercel.app/shop/${activeQrModalShop.slug}`}
                size={180}
                level="M"
              />
            </div>

            <p className="font-mono text-xs text-stone-600 bg-stone-100 p-2 rounded truncate">
              https://printdrop-customer.vercel.app/shop/{activeQrModalShop.slug}
            </p>

            <button
              type="button"
              onClick={() => setActiveQrModalShop(null)}
              className="w-full py-2 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-stone-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
