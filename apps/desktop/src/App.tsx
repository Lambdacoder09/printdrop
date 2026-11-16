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
import PdfViewerModal from './components/PdfViewerModal';
import ChooseEditorModal from './components/ChooseEditorModal';
import { convertDocumentToPdfUrl } from './utils/documentToPdf';
import { db, parsePageRange, calculateBillablePages } from '@printdrop/shared';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  orderBy,
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
  pageRange?: string;
  note?: string;
  hasContent?: boolean;
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

function getInitialDocHtml(doc: JobDocument, job: any): string {
  const lower = doc.originalName.toLowerCase();
  if (lower.includes('rent') || lower.includes('agreement') || lower.includes('lease')) {
    return `
      <h1 style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 24px; color: #111;">RESIDENTIAL RENTAL AGREEMENT</h1>
      <p>This Rent Agreement is made and executed on this <strong>16th day of November, 2026</strong>, at Jaipur, Rajasthan.</p>
      
      <h3 style="font-size: 13pt; margin-top: 18px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">BETWEEN</h3>
      <p><strong>LANDLORD / FIRST PARTY:</strong><br />
      Shri Rakesh Verma, S/o Late O. P. Verma,<br />
      Address: House No. 12-B, Malviya Nagar Industrial Area, Jaipur, Rajasthan - 302017.<br />
      (Hereinafter called the <em>"LESSOR / LANDLORD"</em>)</p>

      <p><strong>AND</strong></p>

      <p><strong>TENANT / SECOND PARTY:</strong><br />
      Shri ${job?.customerName || 'Aarav Verma'}, S/o Shri Sunil Verma,<br />
      Permanent Address: Sector 14, Pratap Nagar, Sanganer, Jaipur - 302033.<br />
      (Hereinafter called the <em>"LESSEE / TENANT"</em>)</p>

      <h3 style="font-size: 13pt; margin-top: 18px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px;">TERMS AND CONDITIONS</h3>
      <ol style="margin-left: 20px; line-height: 1.8;">
        <li><strong>TENANCY DURATION:</strong> The tenancy period shall commence from 1st December 2026 for an agreed initial period of 11 (Eleven) consecutive months.</li>
        <li><strong>MONTHLY RENT:</strong> The Tenant agrees to pay a monthly rent of <strong>₹16,500/-</strong> (Rupees Sixteen Thousand Five Hundred only) payable in advance on or before the 7th day of each calendar month.</li>
        <li><strong>SECURITY DEPOSIT:</strong> The Tenant has deposited an interest-free refundable security amount of <strong>₹33,000/-</strong> with the Landlord.</li>
        <li><strong>UTILITIES & MAINTENANCE:</strong> Electricity charges, water consumption fees, and monthly apartment society maintenance shall be borne directly by the Tenant as per actual billing.</li>
        <li><strong>TERMINATION:</strong> Either party may terminate this agreement by providing one month's advance written notice or rent in lieu thereof.</li>
      </ol>

      <br /><br />
      <table style="width: 100%; border: none; margin-top: 36px;">
        <tr>
          <td style="border: none; width: 50%; vertical-align: top;">
            <strong>IN WITNESS WHEREOF (LANDLORD):</strong><br /><br /><br />
            _____________________________________<br />
            (Signature & Date)
          </td>
          <td style="border: none; width: 50%; vertical-align: top; text-align: right;">
            <strong>IN WITNESS WHEREOF (TENANT):</strong><br /><br /><br />
            _____________________________________<br />
            (Signature & Date)
          </td>
        </tr>
      </table>
    `;
  }
  return `
    <h1 style="font-size: 18pt; font-weight: bold; margin-bottom: 16px;">${doc.originalName}</h1>
    <p>Document submitted for counter printing and modification.</p>
    <p>You can type directly anywhere on this page, edit existing text, format headings, or insert tables before printing.</p>
  `;
}

export default function DesktopApp() {
  const [activeTab, setActiveTab] = useState<'incoming' | 'queue' | 'completed' | 'pricing' | 'poster'>('incoming');
  const [shop, setShop] = useState<ShopProfile>(() => {
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get('shop');
    if (shopParam === 'kishan-printing' || shopParam === 'kishan') {
      return {
        id: 'shop-kishan-printing',
        name: 'Kishan Digital Printing Hub',
        slug: 'kishan-printing',
        phone: '+91 91234 56789',
        upiId: 'kishanprint@okaxis',
        address: 'Main Market, Opp Civil Hospital, Jaipur, Rajasthan',
        pricing: {
          bwPageRate: 2,
          colorPageRate: 10,
          photocopyRate: 2,
          scanningRate: 5,
          laminationRate: 20,
        },
      };
    }
    if (shopParam === 'zayed-khan-xerox' || shopParam === 'zayed') {
      return {
        id: 'shop-zayed-khan',
        name: 'ZAYED KHAN XEROX',
        slug: 'zayed-khan-xerox',
        phone: '7017853730',
        upiId: '7017853730@paytm',
        address: 'Shop 4, Near Metro Gate 2, Delhi',
        pricing: {
          bwPageRate: 2,
          colorPageRate: 10,
          photocopyRate: 2,
          scanningRate: 5,
          laminationRate: 20,
        },
      };
    }
    return DEFAULT_SHOP;
  });
  const [availableShops, setAvailableShops] = useState<ShopProfile[]>([
    DEFAULT_SHOP,
    {
      id: 'shop-zayed-khan',
      name: 'ZAYED KHAN XEROX',
      slug: 'zayed-khan-xerox',
      phone: '7017853730',
      upiId: '7017853730@paytm',
      address: 'Shop 4, Near Metro Gate 2, Delhi',
      pricing: {
        bwPageRate: 2,
        colorPageRate: 10,
        photocopyRate: 2,
        scanningRate: 5,
        laminationRate: 20,
      },
    },
    {
      id: 'shop-kishan-printing',
      name: 'Kishan Digital Printing Hub',
      slug: 'kishan-printing',
      phone: '+91 91234 56789',
      upiId: 'kishanprint@okaxis',
      address: 'Main Market, Opp Civil Hospital, Jaipur, Rajasthan',
      pricing: {
        bwPageRate: 2,
        colorPageRate: 10,
        photocopyRate: 2,
        scanningRate: 5,
        laminationRate: 20,
      },
    },
  ]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customBillAmount, setCustomBillAmount] = useState<string>('');
  const [savingPrice, setSavingPrice] = useState(false);
  const [pricingForm, setPricingForm] = useState(DEFAULT_SHOP.pricing);

  // Hardware Printers & Windows Spooling (pdf-to-printer & electron)
  const [isElectron, setIsElectron] = useState(false);
  const [printers, setPrinters] = useState<Array<{ name: string; isDefault?: boolean }>>([]);
  const [selectedBwPrinter, setSelectedBwPrinter] = useState<string>(() => localStorage.getItem('printdrop_bw_printer') || '');
  const [selectedColorPrinter, setSelectedColorPrinter] = useState<string>(() => localStorage.getItem('printdrop_color_printer') || '');
  const [deviceToken, setDeviceToken] = useState<string>('');
  const [isTestPrinting, setIsTestPrinting] = useState(false);

  // In-Browser Document & Sheet Editors
  const [editingDoc, setEditingDoc] = useState<JobDocument | null>(null);
  const [editingDocBuffer, setEditingDocBuffer] = useState<ArrayBuffer | null>(null);
  const [loadingDocBuffer, setLoadingDocBuffer] = useState(false);
  const [editingSheet, setEditingSheet] = useState<JobDocument | null>(null);
  const [choosingEditorDoc, setChoosingEditorDoc] = useState<JobDocument | null>(null);
  const [viewingPdfDoc, setViewingPdfDoc] = useState<JobDocument | null>(null);

  // Cached blob URLs for uploaded document contents
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

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

  // Real-time Firestore sync for Shops list
  useEffect(() => {
    try {
      const q = query(collection(db, 'shops'));
      const unsub = onSnapshot(q, (snapshot) => {
        const loaded: ShopProfile[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as any;
          loaded.push({
            id: d.id,
            name: data.name || 'Print Shop',
            slug: data.slug || d.id,
            phone: data.phone || '',
            upiId: data.upiId || '',
            address: data.address || '',
            pricing: data.pricing || DEFAULT_SHOP.pricing,
          });
        });
        if (loaded.length > 0) {
          setAvailableShops((prev) => {
            const merged = [...prev];
            loaded.forEach((sh) => {
              const existingIdx = merged.findIndex((m) => m.slug === sh.slug);
              if (existingIdx !== -1) {
                merged[existingIdx] = sh;
              } else {
                merged.push(sh);
              }
            });
            return merged;
          });
        }
      });
      return () => unsub();
    } catch {
      // offline fallback
    }
  }, []);

  // Detect connected physical printers & device token via Electron IPC
  useEffect(() => {
    try {
      const electron = (window as any).require ? (window as any).require('electron') : null;
      if (electron?.ipcRenderer) {
        setIsElectron(true);
        electron.ipcRenderer.invoke('get-printers').then((res: any) => {
          if (res?.success && Array.isArray(res.printers)) {
            setPrinters(res.printers);
            const defaultName = res.printers.find((p: any) => p.isDefault)?.name || res.printers[0]?.name || '';
            setSelectedBwPrinter((prev) => {
              if (prev) return prev;
              if (defaultName) localStorage.setItem('printdrop_bw_printer', defaultName);
              return defaultName;
            });
            setSelectedColorPrinter((prev) => {
              if (prev) return prev;
              if (defaultName) localStorage.setItem('printdrop_color_printer', defaultName);
              return defaultName;
            });
          }
        });

        electron.ipcRenderer.invoke('get-device-token').then((res: any) => {
          if (res?.success && res.tokenData?.token) {
            setDeviceToken(res.tokenData.token);
          } else {
            const generatedToken = 'PD-POS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            setDeviceToken(generatedToken);
            electron.ipcRenderer.invoke('save-device-token', {
              token: generatedToken,
              shopSlug: shop.slug,
              assignedAt: new Date().toISOString(),
            });
          }
        });
      }
    } catch {
      // Browser environment
    }
  }, [shop.slug]);

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

  // Compute suggested bill amount based on job documents & shop pricing (factoring custom page ranges)
  const calculateSuggestedBill = (job: Job) => {
    return job.documents.reduce((total, doc) => {
      const rate = doc.colorMode === 'COLOR' ? shop.pricing.colorPageRate : shop.pricing.bwPageRate;
      const billablePages = calculateBillablePages(doc.pageRange, doc.pageCount || 1, doc.copies || 1);
      return total + billablePages * rate;
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

  // Auto-prefetch document blobs for selected job and convert to PDF
  useEffect(() => {
    if (!selectedJob) return;
    selectedJob.documents.forEach((d) => {
      if (docUrls[d.id]) return;
      (async () => {
        try {
          let fileBlob: Blob | null = null;
          if (d.downloadUrl) {
            const res = await fetch(d.downloadUrl);
            fileBlob = await res.blob();
          } else {
            const chunksRef = collection(db, 'jobs', selectedJob.id, 'files', d.id, 'chunks');
            const snap = await getDocs(query(chunksRef, orderBy('index', 'asc')));
            if (!snap.empty) {
              let fullDataUrl = '';
              snap.forEach((chunkDoc) => {
                fullDataUrl += chunkDoc.data().chunk;
              });
              const res = await fetch(fullDataUrl);
              fileBlob = await res.blob();
            }
          }

          if (fileBlob) {
            const pdfUrl = await convertDocumentToPdfUrl(fileBlob, d.originalName, d.note);
            setDocUrls((prev) => ({ ...prev, [d.id]: pdfUrl }));
          }
        } catch (err) {
          console.warn('Could not prefetch doc:', d.originalName, err);
        }
      })();
    });
  }, [selectedJob?.id]);

  // Fetch raw file Blob from URL or Firestore Chunks
  const getDocumentBlob = async (d: JobDocument): Promise<Blob | null> => {
    if (!selectedJob) return null;
    try {
      if (d.downloadUrl) {
        const res = await fetch(d.downloadUrl);
        return await res.blob();
      }
      const chunksRef = collection(db, 'jobs', selectedJob.id, 'files', d.id, 'chunks');
      const snap = await getDocs(query(chunksRef, orderBy('index', 'asc')));
      if (!snap.empty) {
        let fullDataUrl = '';
        snap.forEach((chunkDoc) => {
          fullDataUrl += chunkDoc.data().chunk;
        });
        const res = await fetch(fullDataUrl);
        return await res.blob();
      }
      return null;
    } catch (err: any) {
      console.warn('Document blob loading notice:', err.message);
      return null;
    }
  };

  const getDocUrl = async (d: JobDocument): Promise<string | null> => {
    if (docUrls[d.id]) return docUrls[d.id];
    if (!selectedJob) return null;

    setLoadingDocId(d.id);
    try {
      const fileBlob = await getDocumentBlob(d);
      if (fileBlob) {
        // Convert any file (Word, Excel, Image, Text, or PDF) to standard PDF for viewing
        const pdfUrl = await convertDocumentToPdfUrl(fileBlob, d.originalName, d.note);
        setDocUrls((prev) => ({ ...prev, [d.id]: pdfUrl }));
        return pdfUrl;
      }
      return null;
    } catch (err: any) {
      console.warn('Document loading notice:', err.message);
      return null;
    } finally {
      setLoadingDocId(null);
    }
  };

  // Convert every document into PDF for viewing in the official viewer
  const handleViewDocument = async (d: JobDocument) => {
    setViewingPdfDoc(d);
    await getDocUrl(d);
  };

  // Ask seller to choose Word or Excel editor
  const handleEditDocument = (d: JobDocument) => {
    setChoosingEditorDoc(d);
  };

  // Windows Direct Hardware Print Handler (using pdf-to-printer & electron IPC)
  const handlePrintDocument = async (d: JobDocument) => {
    setLoadingDocId(d.id);
    try {
      const url = await getDocUrl(d);
      if (!url) {
        alert('Could not load document for printing.');
        return;
      }

      // Check if Electron native print bridge is active
      const electron = (window as any).require ? (window as any).require('electron') : null;
      if (electron?.ipcRenderer) {
        const res = await fetch(url);
        const arrayBuf = await res.arrayBuffer();
        let pdfBytes: any = new Uint8Array(arrayBuf);

        // Slice PDF if custom page range specified by customer (e.g. "1-3, 5")
        const effectiveRange = d.pageRange;
        if (effectiveRange && effectiveRange.trim() && effectiveRange.trim().toLowerCase() !== 'all') {
          try {
            const { PDFDocument } = await import('pdf-lib');
            const sourceDoc = await PDFDocument.load(pdfBytes);
            const totalPages = sourceDoc.getPageCount();
            const targetPages = parsePageRange(effectiveRange, totalPages);
            if (targetPages.length > 0 && targetPages.length < totalPages) {
              const subDoc = await PDFDocument.create();
              const indices = targetPages.map((p) => p - 1).filter((idx) => idx >= 0 && idx < totalPages);
              const copiedPages = await subDoc.copyPages(sourceDoc, indices);
              copiedPages.forEach((cp) => subDoc.addPage(cp));
              pdfBytes = await subDoc.save();
            }
          } catch (sliceErr) {
            console.warn('PDF page slicing note, spooling full document:', sliceErr);
          }
        }

        // Convert bytes to base64 for IPC transfer
        let binary = '';
        const len = pdfBytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(pdfBytes[i]);
        }
        const base64 = window.btoa(binary);

        const targetPrinter = d.colorMode === 'COLOR'
          ? (selectedColorPrinter || printers[0]?.name)
          : (selectedBwPrinter || printers[0]?.name);

        const printRes = await electron.ipcRenderer.invoke('print-pdf-direct', {
          pdfBase64: base64,
          printer: targetPrinter,
          copies: d.copies || 1,
          monochrome: d.colorMode !== 'COLOR',
          pages: effectiveRange && effectiveRange.toLowerCase() !== 'all' ? effectiveRange : undefined,
        });

        if (printRes?.success) {
          alert(`Document successfully sent to printer: ${targetPrinter || 'Default System Printer'}`);
          return;
        } else {
          console.warn('Direct spooler failed, falling back to browser dialog:', printRes?.error);
        }
      }

      // Browser fallback
      const win = window.open(url, '_blank');
      if (win) {
        win.focus();
      }
    } catch (err: any) {
      console.error('Print failure:', err);
      alert('Print error: ' + (err.message || 'Check printer connection'));
    } finally {
      setLoadingDocId(null);
    }
  };

  // Test Print Counter Slip
  const handleTestPrint = async (printerName: string) => {
    setIsTestPrinting(true);
    try {
      const electron = (window as any).require ? (window as any).require('electron') : null;
      if (!electron?.ipcRenderer) {
        alert('Test printing directly to hardware is available in the desktop application.');
        return;
      }
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');
      const testDoc = await PDFDocument.create();
      const page = testDoc.addPage([400, 320]);
      const font = await testDoc.embedFont(StandardFonts.HelveticaBold);
      const regularFont = await testDoc.embedFont(StandardFonts.Helvetica);

      page.drawText('PrintDrop Workstation Test Slip', { x: 30, y: 270, size: 16, font, color: rgb(0.9, 0.4, 0.1) });
      page.drawText(`Shop: ${shop.name}`, { x: 30, y: 235, size: 12, font: regularFont });
      page.drawText(`Printer: ${printerName || 'Default'}`, { x: 30, y: 210, size: 12, font: regularFont });
      page.drawText(`Date: ${new Date().toLocaleString('en-IN')}`, { x: 30, y: 185, size: 10, font: regularFont });
      page.drawText('Spooler Status: Windows Hardware Connected OK!', { x: 30, y: 145, size: 11, font, color: rgb(0.1, 0.6, 0.2) });
      page.drawText('Counter Token: ' + (deviceToken || 'Enrolled'), { x: 30, y: 115, size: 10, font: regularFont });

      const pdfBytes = await testDoc.save();
      let binary = '';
      for (let i = 0; i < pdfBytes.byteLength; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      const base64 = window.btoa(binary);

      const res = await electron.ipcRenderer.invoke('print-pdf-direct', {
        pdfBase64: base64,
        printer: printerName,
        copies: 1,
        monochrome: false,
      });

      if (res?.success) {
        alert(`Test slip printed successfully to ${printerName || 'Default Printer'}!`);
      } else {
        alert(`Test print error: ${res?.error || 'Check printer queue'}`);
      }
    } catch (e: any) {
      alert(`Test print failed: ${e.message}`);
    } finally {
      setIsTestPrinting(false);
    }
  };

  // Save Pricing Settings
  const handleSavePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setShop({ ...shop, pricing: pricingForm });
    alert('Pricing settings saved successfully!');
  };

  const shopJobs = jobs.filter((j) => !j.shopSlug || j.shopSlug === shop.slug || j.shopId === shop.id);
  const incomingJobs = shopJobs.filter((j) => j.status === 'SUBMITTED' || j.status === 'REVIEWING');
  const activeJobs = shopJobs.filter((j) => j.status === 'BILLED' || j.status === 'PAID' || j.status === 'PRINTING' || j.status === 'READY');
  const completedJobs = shopJobs.filter((j) => j.status === 'COMPLETED');

  const displayedJobs =
    activeTab === 'incoming' ? incomingJobs : activeTab === 'queue' ? activeJobs : completedJobs;

  return (
    <div className="flex h-screen bg-stone-100 text-stone-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="no-print w-64 bg-white border-r border-stone-200 flex flex-col justify-between shrink-0 shadow-xs">
        <div>
          {/* Shop Branding & Certificate Pill */}
          <div className="p-4 border-b border-stone-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white font-extrabold flex items-center justify-center text-sm shadow-xs shrink-0">
                P
              </div>
              <div className="overflow-hidden flex-1">
                <select
                  value={shop.slug}
                  onChange={(e) => {
                    const found = availableShops.find((s) => s.slug === e.target.value);
                    if (found) {
                      setShop(found);
                      setPricingForm(found.pricing);
                    }
                  }}
                  className="w-full bg-stone-50 hover:bg-stone-100 border border-stone-300 rounded text-xs font-bold text-stone-900 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer"
                >
                  {availableShops.map((s) => (
                    <option key={s.slug} value={s.slug} className="bg-white text-stone-900">
                      {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-stone-500 mt-0.5">Terminal #01 (Windows)</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <ShieldCheck className="w-3 h-3" />
                Firestore Cloud Real-Time
              </span>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                title={soundEnabled ? 'Mute alert sound' : 'Enable alert sound'}
                aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-500" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
              </button>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-2 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('incoming')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'incoming'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Inbox className="w-4 h-4 text-orange-500" />
                <span>Incoming Jobs</span>
              </div>
              {incomingJobs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-600 text-white shadow-xs">
                  {incomingJobs.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('queue')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Printer className="w-4 h-4 text-blue-600" />
                <span>Active Print Queue</span>
              </div>
              {activeJobs.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200">
                  {activeJobs.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Completed Orders</span>
            </button>

            <div className="pt-3 pb-1 px-3">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Configuration</span>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('poster')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'poster'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <QrCode className="w-4 h-4 text-stone-500" />
              <span>Counter QR Stand</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'pricing'
                  ? 'bg-orange-50 text-orange-700 border border-orange-200 font-bold shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <DollarSign className="w-4 h-4 text-stone-500" />
              <span>Rate Card & Pricing</span>
            </button>
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-stone-200 text-[10px] text-stone-500 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Firebase Cloud Sync</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      {activeTab === 'poster' ? (
        /* Printable Counter QR Stand View */
        <main className="flex-1 bg-stone-100 p-8 overflow-y-auto flex flex-col items-center">
          <div className="print-poster-card max-w-lg w-full bg-white text-stone-950 rounded-2xl p-10 shadow-xl border border-stone-200 text-center space-y-8">
            <div className="space-y-2">
              <span className="poster-subheading text-sm sm:text-base font-black tracking-widest text-orange-600 uppercase">
                Self-Service Document Drop
              </span>
              <h2 className="poster-title text-3xl sm:text-4xl font-black text-stone-900 leading-tight">
                {shop.name}
              </h2>
              <p className="poster-address text-sm sm:text-base text-stone-600 font-medium">
                {shop.address || 'Document Printing & Photocopy Center'}
              </p>
            </div>

            {/* Big QR Code */}
            <div className="qr-container p-6 bg-stone-50 rounded-2xl border border-stone-200 inline-block shadow-xs">
              <QRCodeSVG
                value={`https://printdrop-customer.vercel.app/shop/${shop.slug}`}
                size={260}
                level="H"
                includeMargin={true}
              />
              <p className="poster-qr-hint text-xs sm:text-sm font-semibold text-stone-600 mt-3 uppercase tracking-wider">
                Scan with your phone camera
              </p>
            </div>

            {/* 3 Step Instructions */}
            <div className="steps-grid grid grid-cols-3 gap-3 text-left pt-4 border-t border-stone-200">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="step-num block text-xl font-black text-orange-600 mb-0.5">1</span>
                <p className="step-title text-sm font-black text-stone-950">Scan QR Code</p>
                <p className="step-desc text-xs text-stone-600 mt-0.5 leading-snug">With phone camera</p>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="step-num block text-xl font-black text-orange-600 mb-0.5">2</span>
                <p className="step-title text-sm font-black text-stone-950">Upload Files</p>
                <p className="step-desc text-xs text-stone-600 mt-0.5 leading-snug">PDF, Photos, Docs</p>
              </div>
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="step-num block text-xl font-black text-orange-600 mb-0.5">3</span>
                <p className="step-title text-sm font-black text-stone-950">Show Token</p>
                <p className="step-desc text-xs text-stone-600 mt-0.5 leading-snug">Collect at counter</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="no-print w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <Printer className="w-4 h-4" />
              Print Desk Stand Poster (A4 / Standee)
            </button>
          </div>
        </main>
      ) : activeTab === 'pricing' ? (
        /* Pricing Configuration View */
        <main className="flex-1 bg-stone-100 p-8 overflow-y-auto">
          <div className="max-w-xl mx-auto space-y-6">
            <div>
              <h2 className="text-xl font-bold text-stone-900">Counter Rate Card</h2>
              <p className="text-xs text-stone-500">
                Configure rates per page in Indian Rupees (₹). Used for auto-calculating customer bills.
              </p>
            </div>

            <form onSubmit={handleSavePricing} className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 shadow-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Black & White Print (₹/page)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricingForm.bwPageRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, bwPageRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Color Print (₹/page)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricingForm.colorPageRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, colorPageRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Photocopy / Xerox (₹/page)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={pricingForm.photocopyRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, photocopyRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Document Scanning (₹/doc)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={pricingForm.scanningRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, scanningRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Lamination (₹/sheet)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={pricingForm.laminationRate}
                    onChange={(e) => setPricingForm({ ...pricingForm, laminationRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingPrice}
                  className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
                >
                  {savingPrice ? 'Saving...' : 'Save Rate Card'}
                </button>
              </div>
            </form>

            {/* Workstation Hardware Printers Configuration */}
            <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Printer className="w-4 h-4 text-orange-600" />
                    <span>Physical Printers & Direct Spooling</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Configure hardware printers connected via USB or Local Network.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    isElectron ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-100 text-stone-600 border border-stone-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isElectron ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                    {isElectron ? 'Direct Windows Spooler Active' : 'Web Preview Fallback'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Default Black & White Printer (Laser)
                  </label>
                  <select
                    value={selectedBwPrinter}
                    onChange={(e) => {
                      setSelectedBwPrinter(e.target.value);
                      localStorage.setItem('printdrop_bw_printer', e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none"
                  >
                    {printers.length > 0 ? (
                      printers.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? '(Default)' : ''}
                        </option>
                      ))
                    ) : (
                      <option value="">Default System Printer</option>
                    )}
                  </select>
                  <button
                    type="button"
                    disabled={isTestPrinting}
                    onClick={() => handleTestPrint(selectedBwPrinter)}
                    className="mt-2 text-[11px] font-medium text-orange-600 hover:text-orange-700 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3 h-3" />
                    <span>{isTestPrinting ? 'Printing test slip...' : 'Test Print B&W Slip'}</span>
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Default Color Printer (Inkjet)
                  </label>
                  <select
                    value={selectedColorPrinter}
                    onChange={(e) => {
                      setSelectedColorPrinter(e.target.value);
                      localStorage.setItem('printdrop_color_printer', e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none"
                  >
                    {printers.length > 0 ? (
                      printers.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.isDefault ? '(Default)' : ''}
                        </option>
                      ))
                    ) : (
                      <option value="">Default System Printer</option>
                    )}
                  </select>
                  <button
                    type="button"
                    disabled={isTestPrinting}
                    onClick={() => handleTestPrint(selectedColorPrinter)}
                    className="mt-2 text-[11px] font-medium text-orange-600 hover:text-orange-700 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3 h-3" />
                    <span>{isTestPrinting ? 'Printing test slip...' : 'Test Print Color Slip'}</span>
                  </button>
                </div>
              </div>

              {/* Counter Machine Device Token */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-stone-500">Workstation Machine Token: </span>
                  <span className="font-mono text-orange-600 font-bold">{deviceToken || 'Enrolled in LocalAppData'}</span>
                </div>
                <span className="text-[11px] text-stone-400">Stored at %LOCALAPPDATA%/PrintDrop</span>
              </div>
            </div>
          </div>
        </main>
      ) : (
        /* Jobs List & Job Workspace Split View */
        <div className="flex-1 flex overflow-hidden">
          {/* Middle Column: Jobs Queue List */}
          <section className="w-80 bg-white border-r border-stone-200 flex flex-col shrink-0 shadow-xs">
            <div className="p-3 border-b border-stone-200 bg-stone-50/70 flex items-center justify-between">
              <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                {activeTab === 'incoming'
                  ? 'Incoming Submissions'
                  : activeTab === 'queue'
                  ? 'Active Queue'
                  : 'Completed Archive'}
              </span>
              <span className="text-xs text-stone-500 font-mono font-bold">({displayedJobs.length})</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-stone-100 bg-white">
              {displayedJobs.length === 0 ? (
                <div className="p-8 text-center text-stone-400 space-y-2">
                  <Inbox className="w-8 h-8 mx-auto text-stone-300" />
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
                      className={`w-full p-3.5 text-left transition flex flex-col gap-1.5 cursor-pointer ${
                        isSelected
                          ? 'bg-orange-50/90 border-l-4 border-orange-600 shadow-xs'
                          : 'hover:bg-stone-50/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-black text-orange-600">
                          #{job.accessCode}
                        </span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-stone-900 truncate max-w-[130px]">
                          {job.customerName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-stone-100 text-stone-700 border border-stone-200">
                          {job.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>{job.documents.length} files • {job.totalEstimatedPages} pgs</span>
                        {job.billingAmount && (
                          <span className="font-bold text-emerald-600">₹{job.billingAmount}</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Right Column: Selected Job Details & Action Center */}
          <main className="flex-1 bg-stone-50/60 flex flex-col overflow-y-auto">
            {selectedJob ? (
              <div className="p-6 space-y-6 max-w-3xl">
                {/* Header Card */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-orange-50 border border-orange-200 flex flex-col items-center justify-center shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-orange-600">Token</span>
                      <span className="font-mono text-lg font-black text-orange-600 leading-tight">
                        #{selectedJob.accessCode}
                      </span>
                    </div>

                    <div>
                      <h2 className="text-base font-bold text-stone-900">{selectedJob.customerName}</h2>
                      <p className="text-xs text-stone-500">
                        {selectedJob.customerPhone || 'Walk-in customer'} • Submitted{' '}
                        {new Date(selectedJob.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Status update selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-stone-500">Status:</span>
                    <select
                      value={selectedJob.status}
                      onChange={(e) => handleUpdateStatus(e.target.value as any)}
                      className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-stone-50 border border-stone-300 text-stone-800 focus:bg-white focus:outline-none cursor-pointer"
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
                <section className="p-5 rounded-xl bg-white border border-stone-200 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                        Billing & Payment
                      </h3>
                      <p className="text-xs text-stone-500">
                        Suggested bill: ₹{calculateSuggestedBill(selectedJob).toFixed(2)} based on shop rate card
                      </p>
                    </div>

                    <div className="text-right">
                      {selectedJob.billingAmount ? (
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-xs text-stone-500">Total:</span>
                          <span className="text-2xl font-black text-stone-900">
                            ₹{selectedJob.billingAmount.toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded border border-amber-200">Bill Not Generated</span>
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
                      className="px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500 flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateBill}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
                    >
                      Push Bill & UPI QR to Customer
                    </button>
                  </div>

                  {/* Payment Status Buttons */}
                  {selectedJob.billingAmount && (
                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-stone-500">Payment:</span>
                        {selectedJob.paymentStatus === 'CONFIRMED' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                            Paid via {selectedJob.paymentMethod || 'Direct'}
                          </span>
                        ) : (
                          <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Pending Customer Payment</span>
                        )}
                      </div>

                      {selectedJob.paymentStatus !== 'CONFIRMED' && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment('CASH')}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-xs font-bold rounded-lg transition cursor-pointer"
                          >
                            Mark Cash Received
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirmPayment('DIRECT_UPI')}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs cursor-pointer"
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
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                    Customer Documents ({selectedJob.documents.length})
                  </h3>

                  <div className="space-y-3">
                    {selectedJob.documents.map((doc) => {
                      const lower = doc.originalName.toLowerCase();
                      const isSheet = lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv');
                      return (
                        <div
                          key={doc.id}
                          className="p-4 rounded-xl bg-white border border-stone-200 space-y-3 shadow-xs hover:border-stone-300 transition"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div
                              onClick={() => handleViewDocument(doc)}
                              className="flex items-center gap-3 overflow-hidden cursor-pointer group"
                              title="Click to view document"
                            >
                              <div className="w-10 h-10 rounded-lg bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 shrink-0 group-hover:bg-stone-200 transition">
                                {isSheet ? <Table className="w-5 h-5 text-emerald-600" /> : <FileText className="w-5 h-5 text-blue-600" />}
                              </div>
                              <div className="overflow-hidden">
                                <h4 className="text-xs font-bold text-stone-900 truncate group-hover:text-orange-600 transition">{doc.originalName}</h4>
                                <p className="text-[11px] text-stone-500">
                                  {doc.pageCount} pages • {doc.colorMode === 'COLOR' ? 'Color' : 'Black & White'} • {doc.copies} copy • {doc.sides === 'SINGLE' ? 'Single side' : 'Both sides'}
                                  {doc.pageRange && doc.pageRange.toLowerCase() !== 'all' && (
                                    <span className="ml-1.5 text-orange-600 font-semibold">• Pages: {doc.pageRange}</span>
                                  )}
                                </p>
                              </div>
                            </div>

                            {/* Print, Edit & Preview Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* View / Open converted PDF */}
                              <button
                                type="button"
                                disabled={loadingDocId === doc.id}
                                onClick={() => handleViewDocument(doc)}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                title="Convert and view this document as PDF"
                              >
                                {loadingDocId === doc.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                                )}
                                View (PDF)
                              </button>

                              {/* Edit Document (Ask to choose Word or Excel) */}
                              <button
                                type="button"
                                onClick={() => handleEditDocument(doc)}
                                className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                                title="Open in Word or Excel editor"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                Edit
                              </button>

                              {/* Print Original Document */}
                              <button
                                type="button"
                                disabled={loadingDocId === doc.id}
                                onClick={() => handlePrintDocument(doc)}
                                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                                title="Print customer document"
                              >
                                {loadingDocId === doc.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Printer className="w-3.5 h-3.5" />
                                )}
                                Print
                              </button>
                            </div>
                          </div>

                          {/* Individual document customer note / instruction */}
                          {doc.note && (
                            <div className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                              <span className="font-bold text-amber-700">Customer Note on this file:</span>
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
                  <section className="p-4 rounded-xl bg-white border border-stone-200 shadow-xs">
                    <h4 className="text-xs font-bold text-stone-500 mb-1">Customer Instructions:</h4>
                    <p className="text-xs text-stone-700 italic">"{selectedJob.notes}"</p>
                  </section>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center text-stone-400">
                <p className="text-xs font-medium">Select a job from the queue to view documents and generate bills.</p>
              </div>
            )}
          </main>
        </div>
      )}
      {/* Choose Editor Modal (Ask to open in Word or Excel) */}
      {choosingEditorDoc && (
        <ChooseEditorModal
          documentName={choosingEditorDoc.originalName}
          customerNote={choosingEditorDoc.note}
          onSelectWord={async () => {
            const targetDoc = choosingEditorDoc;
            setChoosingEditorDoc(null);
            if (targetDoc) {
              setEditingDoc(targetDoc);
              setLoadingDocBuffer(true);
              const blob = await getDocumentBlob(targetDoc);
              if (blob) {
                const buf = await blob.arrayBuffer();
                setEditingDocBuffer(buf);
              } else {
                setEditingDocBuffer(null);
              }
              setLoadingDocBuffer(false);
            }
          }}
          onSelectExcel={() => {
            const targetDoc = choosingEditorDoc;
            setChoosingEditorDoc(null);
            setEditingSheet(targetDoc);
          }}
          onClose={() => setChoosingEditorDoc(null)}
        />
      )}

      {/* Official In-Browser PDF Document Viewer Modal */}
      {viewingPdfDoc && (
        <PdfViewerModal
          documentName={viewingPdfDoc.originalName}
          pdfUrl={docUrls[viewingPdfDoc.id] || viewingPdfDoc.downloadUrl || null}
          customerNote={viewingPdfDoc.note}
          isLoading={loadingDocId === viewingPdfDoc.id}
          onClose={() => setViewingPdfDoc(null)}
          onPrint={() => handlePrintDocument(viewingPdfDoc)}
        />
      )}

      {/* In-Browser Word Clone Editor Modal */}
      {editingDoc && (
        <DocEditorModal
          documentName={editingDoc.originalName}
          customerNote={editingDoc.note}
          documentBuffer={editingDocBuffer}
          isLoading={loadingDocBuffer}
          initialContent={getInitialDocHtml(editingDoc, selectedJob)}
          onClose={() => {
            setEditingDoc(null);
            setEditingDocBuffer(null);
          }}
          onSave={(content: string) => {
            console.log('Saved document HTML:', content.length);
            setEditingDoc(null);
            setEditingDocBuffer(null);
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
