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

interface AdminStats {
  totalShops: number;
  activeShops: number;
  totalJobsProcessed: number;
  totalRevenue: number;
  systemHealth: {
    database: string;
    storage: string;
    certificateAuthority: string;
  };
}

export default function AdminApp() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, shopsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/shops'),
      ]);
      const statsData = await statsRes.json();
      const shopsData = await shopsRes.json();
      setStats(statsData);
      setShops(shopsData);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch('/api/admin/shops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          slug: formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          ownerName: formOwner.trim(),
          phone: formPhone.trim(),
          upiId: formUpi.trim(),
          address: formAddress.trim(),
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setFormName('');
        setFormSlug('');
        setFormOwner('');
        setFormPhone('');
        setFormUpi('');
        setFormAddress('');
        fetchData();
      }
    } catch {
      alert('Failed to create shop account');
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
      const res = await fetch(`/api/admin/shops/${shopId}/reset-device`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('Device authorization reset. The shopkeeper can now activate their new PC.');
        fetchData();
      }
    } catch {
      alert('Failed to reset device');
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
              <p className="text-[11px] text-stone-400">Multi-tenant Infrastructure & Security Management</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Certificate Authority Active
            </span>
            <button
              type="button"
              onClick={fetchData}
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition"
              title="Refresh console"
              aria-label="Refresh console"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
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
            <p className="text-2xl font-black text-stone-900 mt-2">{stats?.totalShops ?? '--'}</p>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">All certified counters</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase">
              <span>Active Computers</span>
              <Monitor className="w-4 h-4 text-stone-700" />
            </div>
            <p className="text-2xl font-black text-stone-900 mt-2">{stats?.activeShops ?? '--'}</p>
            <p className="text-[11px] text-stone-500 mt-1 font-medium">Enforcing 1 Account = 1 PC</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase">
              <span>Jobs Processed</span>
              <FileText className="w-4 h-4 text-stone-700" />
            </div>
            <p className="text-2xl font-black text-stone-900 mt-2">{stats?.totalJobsProcessed ?? '--'}</p>
            <p className="text-[11px] text-stone-500 mt-1 font-medium">Auto-expiring object store</p>
          </div>

          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between text-stone-500 text-xs font-semibold uppercase">
              <span>Network Revenue</span>
              <DollarSign className="w-4 h-4 text-stone-700" />
            </div>
            <p className="text-2xl font-black text-stone-900 mt-2">
              ₹{(stats?.totalRevenue ?? 0).toFixed(0)}
            </p>
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
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-lg transition"
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

            <form onSubmit={handleCreateShop} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Shop Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Balaji Xerox & Cyber Point"
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
                  placeholder="e.g. balaji-xerox"
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
                    placeholder="e.g. Vijay Kumar"
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
                    placeholder="e.g. 9811223344"
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
                  placeholder="e.g. 9811223344@paytm or balaji@okaxis"
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
                value={`http://localhost:5173/shop/${activeQrModalShop.slug}`}
                size={180}
                level="M"
              />
            </div>

            <p className="font-mono text-xs text-stone-600 bg-stone-100 p-2 rounded truncate">
              http://localhost:5173/shop/{activeQrModalShop.slug}
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
