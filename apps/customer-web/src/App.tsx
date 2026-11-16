import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  Printer,
  Trash2,
  QrCode,
  Smartphone,
  Banknote,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '@printdrop/shared';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  onSnapshot,
  DocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';

interface ShopData {
  id: string;
  name: string;
  slug: string;
  phone: string;
  upiId?: string;
  address?: string;
  pricing: {
    bwPageRate: number;
    colorPageRate: number;
    photocopyRate?: number;
    scanningRate?: number;
    laminationRate?: number;
  };
}

const DEFAULT_SHOPS: ShopData[] = [
  {
    id: 'shop-001-sgx',
    name: 'Shree Ganesh Xerox & Cyber Cafe',
    slug: 'shree-ganesh-xerox',
    phone: '+91 98765 43210',
    upiId: '9876543210@upi',
    address: 'Shop 12, Station Road, Opp. Bus Stand, Mumbai',
    pricing: {
      bwPageRate: 2.0,
      colorPageRate: 10.0,
      photocopyRate: 2.0,
      scanningRate: 5.0,
      laminationRate: 20.0,
    },
  },
  {
    id: 'shop-002-kcp',
    name: 'Kishan Digital Printing Hub',
    slug: 'kishan-printing',
    phone: '+91 98234 56789',
    upiId: 'kishanprint@okaxis',
    address: 'Near Delhi University North Campus, New Delhi',
    pricing: {
      bwPageRate: 1.5,
      colorPageRate: 8.0,
      photocopyRate: 1.5,
      scanningRate: 5.0,
      laminationRate: 15.0,
    },
  },
];

interface UploadedDoc {
  file: File;
  colorMode: 'BW' | 'COLOR';
  sides: 'SINGLE' | 'DOUBLE_LONG';
  copies: number;
  pageRange?: string;
  note?: string;
}

interface ActiveJob {
  id: string;
  shopId: string;
  accessCode: string;
  customerName: string;
  status: string;
  totalEstimatedPages: number;
  billingAmount?: number;
  paymentStatus: string;
  documents: Array<{
    id: string;
    originalName: string;
    fileSize: number;
    pageCount: number;
    colorMode: string;
    sides: string;
    copies: number;
    pageRange?: string;
    note?: string;
  }>;
  createdAt: string;
}

export default function App() {
  const [shop, setShop] = useState<ShopData | null>(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [shopError, setShopError] = useState<string | null>(null);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [stagedFiles, setStagedFiles] = useState<UploadedDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active Job tracking
  const [currentJob, setCurrentJob] = useState<ActiveJob | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Extract shop slug from path (e.g. /shop/shree-ganesh-xerox or /shop/zayed-khan-xerox)
  const getSlugFromUrl = () => {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const shopIndex = parts.indexOf('shop');
    if (shopIndex !== -1 && parts[shopIndex + 1]) {
      return parts[shopIndex + 1];
    }
    return 'shree-ganesh-xerox';
  };

  const slug = getSlugFromUrl();

  // Load shop details from Cloud Firestore
  useEffect(() => {
    async function fetchShop() {
      try {
        setLoadingShop(true);
        const q = query(collection(db, 'shops'), where('slug', '==', slug));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docData = snap.docs[0];
          setShop({ id: docData.id, ...(docData.data() as any) });
          setShopError(null);
        } else {
          // Check default sample shops
          const fallback = DEFAULT_SHOPS.find((s) => s.slug === slug);
          if (fallback) {
            setShop(fallback);
            setShopError(null);
          } else {
            setShopError(`Shop "${slug}" not found in system.`);
          }
        }
      } catch (err: any) {
        console.warn('Firestore shop lookup warning, using fallback:', err);
        const fallback = DEFAULT_SHOPS.find((s) => s.slug === slug) || DEFAULT_SHOPS[0];
        setShop(fallback);
      } finally {
        setLoadingShop(false);
      }
    }
    fetchShop();
  }, [slug]);

  // Real-time listener for current job updates
  useEffect(() => {
    if (!currentJob?.id) return;

    const jobDocRef = doc(db, 'jobs', currentJob.id);
    const unsubscribe = onSnapshot(jobDocRef, (docSnap: DocumentSnapshot<DocumentData>) => {
      if (docSnap.exists()) {
        setCurrentJob({ id: docSnap.id, ...(docSnap.data() as any) });
      }
    });

    return () => unsubscribe();
  }, [currentJob?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const newItems: UploadedDoc[] = filesArray.map((file) => ({
      file,
      colorMode: 'BW',
      sides: 'SINGLE',
      copies: 1,
      pageRange: 'All',
    }));
    setStagedFiles((prev) => [...prev, ...newItems]);
    e.target.value = '';
  };

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const updateFileOption = (
    index: number,
    field: keyof UploadedDoc,
    value: any
  ) => {
    setStagedFiles((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setSubmitError('Please enter your name.');
      return;
    }
    if (stagedFiles.length === 0) {
      setSubmitError('Please select at least one document to print.');
      return;
    }
    if (!shop) {
      setSubmitError('Print shop counter is not loaded.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setUploadStatus('Preparing documents...');

      const accessCode = Math.floor(1000 + Math.random() * 9000).toString();

      const trimmedName = customerName.trim();
      const trimmedPhone = customerPhone.trim();
      const trimmedNotes = notes.trim();

      const jobDocRef = doc(collection(db, 'jobs'));
      const jobId = jobDocRef.id;

      const docsList: any[] = [];
      const CHUNK_SIZE = 450000;

      for (let i = 0; i < stagedFiles.length; i++) {
        const item = stagedFiles[i];
        setUploadStatus(`Uploading ${i + 1}/${stagedFiles.length}: ${item.file.name}...`);

        const docId = `doc-${Date.now()}-${i}`;
        const dataUrl = await readFileAsDataUrl(item.file);
        const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);

        const chunkPromises = [];
        for (let c = 0; c < totalChunks; c++) {
          const chunkData = dataUrl.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
          chunkPromises.push(
            setDoc(doc(db, 'jobs', jobId, 'files', docId, 'chunks', c.toString()), {
              chunk: chunkData,
              index: c,
            })
          );
        }
        await Promise.all(chunkPromises);

        const docItem: Record<string, any> = {
          id: docId,
          originalName: item.file.name,
          fileSize: item.file.size,
          mimeType: item.file.type || 'application/pdf',
          pageCount: 1,
          colorMode: item.colorMode,
          sides: item.sides,
          copies: item.copies,
          pageRange: item.pageRange?.trim() || 'All',
          hasContent: true,
        };
        if (item.note?.trim()) {
          docItem.note = item.note.trim();
        }
        docsList.push(docItem);
      }

      setUploadStatus('Finalizing order for counter...');

      const newJobData: Record<string, any> = {
        shopId: shop.id,
        shopSlug: shop.slug,
        accessCode,
        customerName: trimmedName,
        status: 'SUBMITTED',
        totalEstimatedPages: stagedFiles.reduce((sum, f) => sum + f.copies, 0),
        documents: docsList,
        paymentStatus: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (trimmedPhone) {
        newJobData.customerPhone = trimmedPhone;
      }
      if (trimmedNotes) {
        newJobData.notes = trimmedNotes;
      }

      // 1. Write job to Cloud Firestore
      await setDoc(jobDocRef, newJobData);

      setCurrentJob({ id: jobId, ...newJobData } as ActiveJob);
    } catch (err: any) {
      setSubmitError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadStatus('');
    }
  };

  const copyAccessCode = () => {
    if (!currentJob) return;
    navigator.clipboard.writeText(currentJob.accessCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getStatusStepIndex = (status: string) => {
    const steps = ['SUBMITTED', 'REVIEWING', 'BILLED', 'PAID', 'PRINTING', 'READY', 'COMPLETED'];
    const idx = steps.indexOf(status);
    return idx === -1 ? 0 : idx;
  };

  // Generate UPI URI
  const getUpiUri = () => {
    if (!shop?.upiId || !currentJob?.billingAmount) return '';
    const note = encodeURIComponent(`PrintDrop Bill #${currentJob.accessCode}`);
    const name = encodeURIComponent(shop.name);
    return `upi://pay?pa=${shop.upiId}&pn=${name}&am=${currentJob.billingAmount.toFixed(2)}&cu=INR&tn=${note}`;
  };

  if (loadingShop) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-stone-600">
          <RefreshCw className="w-6 h-6 animate-spin text-stone-800" />
          <p className="text-sm font-medium">Connecting to print shop counter...</p>
        </div>
      </main>
    );
  }

  if (shopError || !shop) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-stone-200 p-6 text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-stone-900 mb-1">Print Shop Not Found</h1>
          <p className="text-sm text-stone-600 mb-4">{shopError || 'Invalid shop QR code.'}</p>
          <a
            href="/shop/shree-ganesh-xerox"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition"
          >
            Open Demo Shop Counter
          </a>
        </div>
      </main>
    );
  }

  const upiUri = getUpiUri();

  return (
    <div className="min-h-screen flex flex-col bg-stone-100">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-stone-900 text-white flex items-center justify-center font-bold text-base">
              P
            </div>
            <div>
              <h1 className="text-sm font-bold text-stone-900 leading-tight">{shop.name}</h1>
              <p className="text-xs text-stone-500">{shop.address || 'Document Print & Xerox Counter'}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Counter Online
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto p-4">
        {!currentJob ? (
          /* Upload View */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Shop Pricing Card */}
            <section className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs">
              <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
                Counter Printing Rates
              </h2>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-stone-600">B&W Print:</span>
                  <span className="font-semibold text-stone-900">₹{shop.pricing.bwPageRate}/page</span>
                </div>
                <div className="flex justify-between p-2 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-stone-600">Color Print:</span>
                  <span className="font-semibold text-stone-900">₹{shop.pricing.colorPageRate}/page</span>
                </div>
              </div>
            </section>

            {/* Customer Information */}
            <section className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">1. Customer Details</h2>
              <div>
                <label htmlFor="customerName" className="block text-xs font-medium text-stone-700 mb-1">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:border-stone-900 bg-white"
                />
              </div>

              <div>
                <label htmlFor="customerPhone" className="block text-xs font-medium text-stone-700 mb-1">
                  Mobile Number (Optional)
                </label>
                <input
                  id="customerPhone"
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 focus:border-stone-900 bg-white"
                />
              </div>
            </section>

            {/* Document Upload Area */}
            <section className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-stone-900">2. Select Documents</h2>
                <span className="text-xs text-stone-500">PDF, JPG, PNG, DOCX</span>
              </div>

              <label
                htmlFor="fileInput"
                className="border-2 border-dashed border-stone-300 hover:border-stone-500 rounded-xl p-6 flex flex-col items-center justify-center text-center transition bg-stone-50/50 hover:bg-stone-50 group"
              >
                <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 group-hover:bg-stone-900 group-hover:text-white transition mb-2">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-medium text-stone-900">Tap to select files from phone or PC</p>
                <p className="text-xs text-stone-500 mt-0.5">Supports multiple files simultaneously</p>
                <input
                  id="fileInput"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Staged Files List */}
              {stagedFiles.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-semibold text-stone-600">
                    Selected Files ({stagedFiles.length})
                  </h3>
                  {stagedFiles.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-stone-200 bg-stone-50 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="w-4 h-4 text-stone-700 shrink-0" />
                          <span className="text-xs font-semibold text-stone-900 truncate">
                            {item.file.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeStagedFile(idx)}
                          className="text-stone-400 hover:text-red-600 p-1"
                          aria-label={`Remove file ${item.file.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Options per file */}
                      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-200">
                        <div>
                          <label className="block text-[10px] text-stone-500 mb-0.5 font-medium">Color</label>
                          <select
                            value={item.colorMode}
                            onChange={(e) =>
                              updateFileOption(idx, 'colorMode', e.target.value)
                            }
                            className="w-full text-xs p-1.5 rounded border border-stone-300 bg-white"
                          >
                            <option value="BW">Black & White</option>
                            <option value="COLOR">Full Color</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-stone-500 mb-0.5 font-medium">Sides</label>
                          <select
                            value={item.sides}
                            onChange={(e) =>
                              updateFileOption(idx, 'sides', e.target.value)
                            }
                            className="w-full text-xs p-1.5 rounded border border-stone-300 bg-white"
                          >
                            <option value="SINGLE">Single Sided</option>
                            <option value="DOUBLE_LONG">Both Sides</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-stone-500 mb-0.5 font-medium">Copies</label>
                          <input
                            type="number"
                            min="1"
                            max="50"
                            value={item.copies}
                            onChange={(e) =>
                              updateFileOption(idx, 'copies', Math.max(1, parseInt(e.target.value) || 1))
                            }
                            className="w-full text-xs p-1.5 rounded border border-stone-300 bg-white"
                          />
                        </div>
                      </div>

                      {/* Custom note / instruction per file */}
                      <div>
                        <input
                          type="text"
                          placeholder="Note for this file (e.g. pages 1 to 5 only, fit to page, landscape)..."
                          value={item.note || ''}
                          onChange={(e) => updateFileOption(idx, 'note', e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 rounded border border-stone-200 bg-white placeholder-stone-400 focus:border-stone-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Special Instructions */}
            <section className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs">
              <label htmlFor="notes" className="block text-xs font-semibold text-stone-900 mb-1">
                Print Instructions for Shopkeeper (Optional)
              </label>
              <textarea
                id="notes"
                rows={2}
                placeholder="e.g. Only print first 5 pages, landscape mode, stamp paper, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:border-stone-900 bg-white"
              />
            </section>

            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || stagedFiles.length === 0}
              className="w-full py-3.5 px-4 rounded-xl font-semibold text-sm bg-stone-900 hover:bg-stone-800 active:scale-[0.99] text-white flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{uploadStatus || 'Sending to Counter...'}</span>
                </>
              ) : (
                <>
                  Send {stagedFiles.length} {stagedFiles.length === 1 ? 'Document' : 'Documents'} to Counter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Privacy note */}
            <p className="text-center text-[11px] text-stone-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-600" />
              Files are temporarily stored and automatically deleted after printing.
            </p>
          </form>
        ) : (
          /* Live Order Tracking View */
          <div className="space-y-4">
            {/* Counter Token Card */}
            <section className="bg-white rounded-xl p-5 border border-stone-200 text-center shadow-xs">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Counter Identification Token
              </span>
              <div className="my-2 flex items-center justify-center gap-2">
                <span className="font-mono text-4xl font-extrabold text-stone-900 tracking-wider">
                  #{currentJob.accessCode}
                </span>
                <button
                  type="button"
                  onClick={copyAccessCode}
                  className="p-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 text-stone-600"
                  title="Copy token code"
                  aria-label="Copy token code"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-stone-600">
                Show this token #{currentJob.accessCode} to the shopkeeper at the counter.
              </p>
            </section>

            {/* Live Status Pipeline */}
            <section className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Live Job Status
                </h2>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Firestore Real-Time
                </span>
              </div>

              {/* Progress Steps */}
              <div className="space-y-2 pt-1">
                {[
                  { key: 'SUBMITTED', title: 'Submitted to Shop', desc: 'Shop counter received your documents' },
                  { key: 'BILLED', title: 'Bill Generated', desc: 'Shopkeeper calculated printing pages' },
                  { key: 'PAID', title: 'Payment Confirmed', desc: 'Cash or UPI payment verified' },
                  { key: 'PRINTING', title: 'Printing on Machine', desc: 'Printers are actively processing' },
                  { key: 'READY', title: 'Ready for Collection', desc: 'Collect printouts from the counter' },
                ].map((step, idx) => {
                  const currentIdx = getStatusStepIndex(currentJob.status);
                  const isDone = currentIdx >= idx;
                  const isCurrent = currentJob.status === step.key;

                  return (
                    <div
                      key={step.key}
                      className={`flex items-start gap-3 p-2.5 rounded-lg transition ${
                        isCurrent
                          ? 'bg-amber-50 border border-amber-200'
                          : isDone
                          ? 'bg-stone-50'
                          : 'opacity-40'
                      }`}
                    >
                      <div className="mt-0.5">
                        {isDone ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-stone-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-stone-900 leading-tight">{step.title}</p>
                        <p className="text-[11px] text-stone-500 mt-0.5">{step.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Bill & UPI Payment Card */}
            {currentJob.billingAmount && currentJob.billingAmount > 0 && (
              <section className="bg-white rounded-xl p-5 border border-stone-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Total Counter Bill</h2>
                    <p className="text-xs text-stone-500">
                      Calculated for {currentJob.totalEstimatedPages} total pages
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-stone-900">
                      ₹{currentJob.billingAmount.toFixed(2)}
                    </span>
                    <div>
                      {currentJob.paymentStatus === 'CONFIRMED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Check className="w-3 h-3" /> Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Payment Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* If Not Paid: Show Direct UPI Options & Cash Option */}
                {currentJob.paymentStatus !== 'CONFIRMED' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-stone-700">Choose Payment Method:</p>

                    {/* Direct UPI Option */}
                    {shop.upiId && upiUri ? (
                      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center space-y-3">
                        <div className="flex items-center justify-center gap-1 text-xs font-medium text-stone-700">
                          <QrCode className="w-4 h-4 text-stone-900" />
                          <span>Scan with Google Pay, PhonePe, Paytm, or BHIM</span>
                        </div>

                        <div className="inline-block p-2 bg-white rounded-lg border border-stone-200 shadow-xs">
                          <QRCodeSVG value={upiUri} size={150} level="M" />
                        </div>

                        <div>
                          <a
                            href={upiUri}
                            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition"
                          >
                            <Smartphone className="w-4 h-4" />
                            Open UPI App to Pay ₹{currentJob.billingAmount.toFixed(2)}
                          </a>
                        </div>
                      </div>
                    ) : null}

                    {/* Cash Counter Option */}
                    <div className="p-3 rounded-lg border border-stone-200 flex items-center justify-between bg-stone-50">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-stone-700" />
                        <div>
                          <p className="text-xs font-semibold text-stone-900">Pay Cash at Counter</p>
                          <p className="text-[11px] text-stone-500">Give cash directly to the shopkeeper</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Submitted Documents Details */}
            <section className="bg-white rounded-xl p-4 border border-stone-200 shadow-xs space-y-2">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Submitted Documents ({currentJob.documents.length})
              </h3>
              <div className="divide-y divide-stone-100">
                {currentJob.documents.map((doc) => (
                  <div key={doc.id} className="py-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-stone-500 shrink-0" />
                        <span className="font-medium text-stone-800 truncate">{doc.originalName}</span>
                      </div>
                      <span className="text-stone-500 shrink-0 ml-2">
                        {doc.colorMode === 'COLOR' ? 'Color' : 'B&W'} • {doc.copies} copy
                      </span>
                    </div>
                    {doc.note && (
                      <div className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        Instruction: {doc.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* New Order Button */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setCurrentJob(null);
                  setStagedFiles([]);
                  setCustomerName('');
                  setNotes('');
                }}
                className="text-xs text-stone-600 hover:text-stone-900 underline py-2"
              >
                Upload more documents for another order
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
