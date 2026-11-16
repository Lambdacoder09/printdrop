import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  QrCode,
  Settings,
  ShieldCheck,
  RefreshCw,
  Eye,
  Check,
  Volume2,
  VolumeX,
  Plus,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Edit3,
  Table,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DocEditorModal from './components/DocEditorModal';
import SheetEditorModal from './components/SheetEditorModal';
import { db } from '@printdrop/shared';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  QuerySnapshot,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

interface JobDocument {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType?: string;
  pageCount: number;
  previewUrl?: string;
  downloadUrl?: string;
  colorMode: 'BW' | 'COLOR';
  sides: 'SINGLE' | 'DOUBLE_LONG';
  copies: number;
  note?: string;
}

interface Job {
  id: string;
  shopId: string;
  shopSlug?: string;
  accessCode: string;
  customerName: string;
  customerPhone?: string;
  documents: JobDocument[];
  status: 'SUBMITTED' | 'REVIEWING' | 'BILLED' | 'PAID' | 'PRINTING' | 'READY' | 'COMPLETED';
  totalEstimatedPages: number;
  billingAmount?: number;
  paymentMethod?: string;
  paymentStatus: 'PENDING' | 'CONFIRMED';
  notes?: string;
  createdAt: string;
}

interface ShopProfile {
  id: string;
  name: string;
  slug: string;
  phone: string;
  upiId?: string;
  address?: string;
  pricing: {
    bwPageRate: number;
    colorPageRate: number;
    photocopyRate: number;
    scanningRate: number;
    laminationRate: number;
  };
}

const DEFAULT_SHOP: ShopProfile = {
  id: 'shop-001-sgx',
  name: 'Shree Ganesh Xerox & Cyber Cafe',
  slug: 'shree-ganesh-xerox',
  phone: '+91 98765 43210',
  upiId: '9876543210@upi',
  address: 'Shop 12, Station Road, Opp. Bus Stand, Mumbai',
  pricing: {
    bwPageRate: 2,
    colorPageRate: 10,
    photocopyRate: 2,
    scanningRate: 5,
    laminationRate: 20,
  },
};

export default function DesktopApp() {
  const [activeTab, setActiveTab] = useState<'incoming' | 'queue' | 'completed' | 'pricing' | 'poster'>('incoming');
  const [shop, setShop] = useState<ShopProfile>(DEFAULT_SHOP);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customBillAmount, setCustomBillAmount] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [pricingForm, setPricingForm] = useState(DEFAULT_SHOP.pricing);

  // In-Browser Document & Sheet Editors
  const [editingDoc, setEditingDoc] = useState<JobDocument | null>(null);
  const [editingSheet, setEditingSheet] = useState<JobDocument | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);

  // Audio tone on new order
  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // Audio not permitted or unavailable
    }
  };

  // Real-time Firestore sync for Jobs
  useEffect(() => {
    try {
      setLoading(true);

      // Listen to all jobs in Cloud Firestore
      const q = query(collection(db, 'jobs'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const fetchedJobs: Job[] = [];
          snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
            fetchedJobs.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });

          // Sort by creation date descending
          fetchedJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

          setJobs((prev) => {
            if (prev.length > 0 && fetchedJobs.length > prev.length) {
              playAlertSound();
            }
            return fetchedJobs;
          });

          setSelectedJob((prev) => {
            if (!prev && fetchedJobs.length > 0) return fetchedJobs[0];
            if (prev) {
              const matched = fetchedJobs.find((j) => j.id === prev.id);
              if (matched) return matched;
            }
            return fetchedJobs[0] || null;
          });

          setLoading(false);
        },
        (err) => {
          console.warn('Firestore jobs listener warning:', err);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch {
      setLoading(false);
    }
  }, [soundEnabled]);

  // Compute suggested bill amount based on job documents & shop pricing
  const calculateSuggestedBill = (job: Job) => {
    return job.documents.reduce((total, doc) => {
      const rate = doc.colorMode === 'COLOR' ? shop.pricing.colorPageRate : shop.pricing.bwPageRate;
      return total + (doc.pageCount || 1) * (doc.copies || 1) * rate;
    }, 0);
  };

  // Push Bill to Customer in Firestore
  const handleGenerateBill = async () => {
    if (!selectedJob) return;
    const amount = customBillAmount ? parseFloat(customBillAmount) : calculateSuggestedBill(selectedJob);

    try {
      const jobRef = doc(db, 'jobs', selectedJob.id);
      await updateDoc(jobRef, {
        billingAmount: amount,
        status: 'BILLED',
        updatedAt: new Date().toISOString(),
      });
      setCustomBillAmount('');
    } catch (err) {
      alert('Failed to send bill to customer');
    }
  };

  // Mark Payment Confirmed in Firestore
  const handleConfirmPayment = async (method: 'CASH' | 'DIRECT_UPI') => {
    if (!selectedJob) return;
    try {
      const jobRef = doc(db, 'jobs', selectedJob.id);
      await updateDoc(jobRef, {
        paymentMethod: method,
        paymentStatus: 'CONFIRMED',
        status: 'PAID',
        updatedAt: new Date().toISOString(),
      });
    } catch {
      alert('Failed to update payment status');
    }
  };

  // Advance Status in Firestore
  const handleUpdateStatus = async (status: Job['status']) => {
    if (!selectedJob) return;
    try {
      const jobRef = doc(db, 'jobs', selectedJob.id);
      await updateDoc(jobRef, {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      alert('Failed to update status');
    }
  };

  // Windows Print Handler
  const handlePrintDocument = (doc: JobDocument) => {
    if (doc.downloadUrl) {
      window.open(doc.downloadUrl, '_blank');
    } else {
      window.print();
    }
  };

  // Save Pricing Settings
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setShop({ ...shop, pricing: pricingForm });
    alert('Pricing settings saved successfully!');
  };

  const incomingJobs = jobs.filter((j) => j.status === 'SUBMITTED' || j.status === 'REVIEWING');
  const activeJobs = jobs.filter((j) => j.status === 'BILLED' || j.status === 'PAID' || j.status === 'PRINTING' || j.status === 'READY');
  const completedJobs = jobs.filter((j) => j.status === 'COMPLETED');

  const displayedJobs =
    activeTab === 'incoming' ? incomingJobs : activeTab === 'queue' ? activeJobs : completedJobs;

  return (
    <div className="flex h-screen bg-stone-950 text-stone-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-stone-900 border-r border-stone-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Shop Branding & Certificate Pill */}
          <div className="p-4 border-b border-stone-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white font-extrabold flex items-center justify-center text-sm shadow-inner">
                P
              </div>
              <div className="overflow-hidden">
                <h1 className="text-sm font-bold text-white truncate">{shop.name}</h1>
                <p className="text-[11px] text-stone-400">Terminal #01 (Windows)</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                Firestore Cloud Real-Time
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-stone-400 hover:text-white p-1"
                title={soundEnabled ? 'Mute alert sound' : 'Enable alert sound'}
                aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-400" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('incoming')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'incoming'
                  ? 'bg-stone-800 text-white border border-stone-700'
                  : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4 text-orange-500" />
                <span>Incoming Jobs</span>
              </div>
              {incomingJobs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-600 text-white">
                  {incomingJobs.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'queue'
                  ? 'bg-stone-800 text-white border border-stone-700'
                  : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-blue-400" />
                <span>Active Print Queue</span>
              </div>
              {activeJobs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-700 text-stone-200">
                  {activeJobs.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'completed'
                  ? 'bg-stone-800 text-white border border-stone-700'
                  : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Completed Orders</span>
            </button>

            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">Configuration</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('poster')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'poster'
                  ? 'bg-stone-800 text-white border border-stone-700'
                  : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
              }`}
            >
              <QrCode className="w-4 h-4 text-stone-400" />
              <span>Counter QR Stand</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'pricing'
                  ? 'bg-stone-800 text-white border border-stone-700'
                  : 'text-stone-400 hover:bg-stone-800/50 hover:text-stone-200'
              }`}
            >
              <DollarSign className="w-4 h-4 text-stone-400" />
              <span>Rate Card & Pricing</span>
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-stone-800 text-[10px] text-stone-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Firebase Cloud Sync</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      {activeTab === 'poster' ? (
        /* Printable Counter QR Stand View */
        <main className="flex-1 bg-stone-900 p-8 overflow-y-auto flex flex-col items-center">
          <div className="max-w-md w-full bg-white text-stone-950 rounded-2xl p-8 shadow-2xl border-4 border-stone-900 text-center space-y-6">
            <div className="space-y-1">
              <span className="text-xs font-black tracking-widest text-orange-600 uppercase">
                Self-Service Document Drop
              </span>
              <h2 className="text-2xl font-black text-stone-900">{shop.name}</h2>
              <p className="text-xs text-stone-500">{shop.address || 'Document Printing & Photocopy Center'}</p>
            </div>

            {/* Big QR Code */}
            <div className="p-4 bg-stone-50 rounded-xl border-2 border-stone-200 inline-block">
              <QRCodeSVG
                value={`https://printdrop-customer.vercel.app/shop/${shop.slug}`}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>

            {/* 3 Step Instructions */}
            <div className="grid grid-cols-3 gap-2 text-left pt-2 border-t border-stone-200">
              <div className="p-2 rounded-lg bg-stone-100">
                <span className="block text-sm font-black text-orange-600">1</span>
                <p className="text-[11px] font-bold text-stone-900">Scan QR Code</p>
                <p className="text-[10px] text-stone-600">With phone camera</p>
              </div>
              <div className="p-2 rounded-lg bg-stone-100">
                <span className="block text-sm font-black text-orange-600">2</span>
                <p className="text-[11px] font-bold text-stone-900">Upload Files</p>
                <p className="text-[10px] text-stone-600">PDF, JPG, Docs</p>
              </div>
              <div className="p-2 rounded-lg bg-stone-100">
                <span className="block text-sm font-black text-orange-600">3</span>
                <p className="text-[11px] font-bold text-stone-900">Show Token</p>
                <p className="text-[10px] text-stone-600">At the counter</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Desk Stand Poster (A4 / Standee)
            </button>
          </div>
        </main>
      ) : activeTab === 'pricing' ? (
        /* Pricing Configuration View */
        <main className="flex-1 bg-stone-900 p-8 overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Counter Rate Card</h2>
              <p className="text-xs text-stone-400">
                Configure rates per page in Indian Rupees (₹). Used for auto-calculating customer bills.
              </p>
            </div>

            <form onSubmit={handleSavePricing} className="bg-stone-850 border border-stone-800 rounded-xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Black & White Print (₹/page)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricingForm.bwPageRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, bwPageRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Color Print (₹/page)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricingForm.colorPageRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, colorPageRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Photocopy / Xerox (₹/page)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricingForm.photocopyRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, photocopyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Document Scanning (₹/doc)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={pricingForm.scanningRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, scanningRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Lamination (₹/sheet)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={pricingForm.laminationRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, laminationRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold rounded-lg transition"
                >
                  {savingPrice ? 'Saving...' : 'Save Rate Card'}
                </button>
              </div>
            </form>
          </div>
        </main>
      ) : (
        /* Jobs List & Job Workspace Split View */
        <div className="flex-1 flex overflow-hidden">
          {/* Middle Column: Jobs Queue List */}
          <section className="w-80 bg-stone-900/50 border-r border-stone-800 flex flex-col shrink-0">
            <div className="p-3 border-b border-stone-800 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">
                {activeTab === 'incoming'
                  ? 'Incoming Submissions'
                  : activeTab === 'queue'
                  ? 'Active Queue'
                  : 'Completed Archive'}
              </span>
              <span className="text-xs text-stone-500 font-mono">({displayedJobs.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-stone-850">
              {displayedJobs.length === 0 ? (
                <div className="p-8 text-center text-stone-500 space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-stone-600" />
                  <p className="text-xs font-medium">No orders in this queue</p>
                </div>
              ) : (
                displayedJobs.map((job) => {
                  const isSelected = selectedJob?.id === job.id;
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedJob(job)}
                      className={`w-full p-3 text-left transition flex flex-col gap-1.5 ${
                        isSelected ? 'bg-stone-800 border-l-4 border-orange-500' : 'hover:bg-stone-850'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-black text-orange-400">
                          #{job.accessCode}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate max-w-[130px]">
                          {job.customerName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold bg-stone-800 text-stone-300 border border-stone-700">
                          {job.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-400">
                        <span>{job.documents.length} files • {job.totalEstimatedPages} pgs</span>
                        {job.billingAmount && (
                          <span className="font-semibold text-emerald-400">₹{job.billingAmount}</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Column: Selected Job Details & Action Center */}
          <main className="flex-1 bg-stone-950 flex flex-col overflow-y-auto">
            {selectedJob ? (
              <div className="p-6 space-y-6 max-w-3xl">
                {/* Header Card */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-stone-900 border border-stone-800">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-orange-950/60 border border-orange-700/50 flex flex-col items-center justify-center">
                      <span className="text-[10px] uppercase font-bold text-orange-400">Token</span>
                      <span className="font-mono text-lg font-black text-orange-400 leading-tight">
                        #{selectedJob.accessCode}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-white">{selectedJob.customerName}</h2>
                      <p className="text-xs text-stone-400">
                        {selectedJob.customerPhone || 'Walk-in customer'} • Submitted{' '}
                        {new Date(selectedJob.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Status update selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">Status:</span>
                    <select
                      value={selectedJob.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as any)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-100"
                    >
                      <option value="SUBMITTED">Submitted</option>
                      <option value="REVIEWING">Reviewing</option>
                      <option value="BILLED">Billed</option>
                      <option value="PAID">Paid</option>
                      <option value="PRINTING">Printing</option>
                      <option value="READY">Ready</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                {/* Billing & Payment Console */}
                <section className="p-5 rounded-xl bg-stone-900 border border-stone-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                        Billing & Payment
                      </h3>
                      <p className="text-xs text-stone-500">
                        Suggested bill: ₹{calculateSuggestedBill(selectedJob).toFixed(2)} based on shop rate card
                      </p>
                    </div>

                    <div className="text-right">
                      {selectedJob.billingAmount ? (
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-xs text-stone-400">Total:</span>
                          <span className="text-2xl font-black text-white">
                            ₹{selectedJob.billingAmount.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-400 font-semibold">Bill Not Generated</span>
                      )}
                    </div>
                  </div>

                  {/* Generate / Push Bill Input */}
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder={`₹${calculateSuggestedBill(selectedJob)} (or enter amount)`}
                      value={customBillAmount}
                      onChange={(e) => setCustomBillAmount(e.target.value)}
                      className="px-3 py-2 bg-stone-950 border border-stone-700 rounded-lg text-xs text-white flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateBill}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition"
                    >
                      Push Bill & UPI QR to Customer
                    </button>
                  </div>

                  {/* Payment Status Buttons */}
                  {selectedJob.billingAmount && (
                    <div className="pt-2 border-t border-stone-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-400">Payment:</span>
                        {selectedJob.paymentStatus === 'CONFIRMED' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800">
                            <Check className="w-3.5 h-3.5" />
                            Paid via {selectedJob.paymentMethod || 'Direct'}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-400 font-medium">Pending Customer Payment</span>
                        )}
                      </div>

                      {selectedJob.paymentStatus !== 'CONFIRMED' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment('CASH')}
                            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold rounded-lg transition"
                          >
                            Mark Cash Received
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment('DIRECT_UPI')}
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold rounded-lg transition"
                          >
                            Mark UPI Received
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Documents List */}
                <section className="space-y-3">
                  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                    Customer Documents ({selectedJob.documents.length})
                  </h3>

                  <div className="space-y-3">
                    {selectedJob.documents.map((doc) => {
                      const lower = doc.originalName.toLowerCase();
                      const isSheet = lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');
                      return (
                        <div
                          key={doc.id}
                          className="p-4 rounded-xl bg-stone-900 border border-stone-800 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center text-stone-400 shrink-0">
                                {isSheet ? <Table className="w-5 h-5 text-emerald-400" /> : <FileText className="w-5 h-5 text-blue-400" />}
                              </div>
                              <div className="overflow-hidden">
                                <h4 className="text-xs font-bold text-white truncate">{doc.originalName}</h4>
                                <p className="text-[11px] text-stone-400">
                                  {doc.pageCount} pages • {doc.colorMode === 'COLOR' ? 'Color' : 'Black & White'} • {doc.copies} copy • {doc.sides === 'SINGLE' ? 'Single side' : 'Both sides'}
                                </p>
                              </div>
                            </div>

                            {/* Print, Edit & Preview Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Open in Word Editor Clone */}
                              <button
                                type="button"
                                onClick={() => setEditingDoc(doc)}
                                className="px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/60 text-blue-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-xs"
                                title="Edit in browser Word clone before printing"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                Edit in Word
                              </button>

                              {/* Open in Excel Editor Clone */}
                              <button
                                type="button"
                                onClick={() => setEditingSheet(doc)}
                                className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 text-xs font-medium rounded-lg transition flex items-center gap-1.5 shadow-xs"
                                title="Edit in browser Excel clone before printing"
                              >
                                <Table className="w-3.5 h-3.5" />
                                Edit in Excel
                              </button>

                              {doc.downloadUrl && (
                                <a
                                  href={doc.downloadUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-lg transition flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  View
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handlePrintDocument(doc)}
                                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-sm"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Print
                              </button>
                            </div>
                          </div>

                          {/* Individual document customer note / instruction */}
                          {doc.note && (
                            <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-lg flex items-center gap-2">
                              <span className="font-semibold text-amber-400">Customer Note on this file:</span>
                              <span>"{doc.note}"</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Customer Notes */}
                {selectedJob.notes && (
                  <section className="p-4 rounded-xl bg-stone-900/60 border border-stone-800">
                    <h4 className="text-xs font-bold text-stone-400 mb-1">Customer Instructions:</h4>
                    <p className="text-xs text-stone-300 italic">"{selectedJob.notes}"</p>
                  </section>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-stone-500">
                <p className="text-xs">Select a job from the queue to view documents and generate bills.</p>
              </div>
            )}
          </main>
        </div>
      )}
      {/* In-Browser Word Clone Editor Modal */}
      {editingDoc && (
        <DocEditorModal
          documentName={editingDoc.originalName}
          customerNote={editingDoc.note}
          initialContent={`<h2 style="text-align: center;">${editingDoc.originalName}</h2><p>Customer Order: <strong>#${selectedJob?.accessCode || ''}</strong> (${selectedJob?.customerName || 'Customer'})</p><p>You can edit text, fix typos, insert tables, format headings, and print directly onto physical paper from here.</p>`}
          onClose={() => setEditingDoc(null)}
          onSave={(updatedHtml: string) => {
            console.log('Saved document HTML:', updatedHtml.length);
            setEditingDoc(null);
          }}
        />
      )}

      {/* In-Browser Excel Clone Spreadsheet Editor Modal */}
      {editingSheet && (
        <SheetEditorModal
          documentName={editingSheet.originalName}
          customerNote={editingSheet.note}
          onClose={() => setEditingSheet(null)}
          onSave={(data: any) => {
            console.log('Saved spreadsheet sheet count:', data?.length);
            setEditingSheet(null);
          }}
        />
      )}
    </div>
  );
}
