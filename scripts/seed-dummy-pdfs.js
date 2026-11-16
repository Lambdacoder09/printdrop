const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  projectId: 'studio-9707564164-423fc',
  appId: '1:381915458042:web:144b0864e15e421d5d9c43',
  storageBucket: 'studio-9707564164-423fc.firebasestorage.app',
  apiKey: 'AIzaSyDnnZ7jU6G-3adpx_psQk1lRzq1PlkdVHw',
  authDomain: 'studio-9707564164-423fc.firebaseapp.com',
  messagingSenderId: '381915458042',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Helper to create Offer Letter PDF
async function createOfferLetterPdf(candidateName, position, salary) {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page 1
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page1.getSize();

  // Header banner
  page1.drawRectangle({
    x: 0,
    y: height - 80,
    width: width,
    height: 80,
    color: rgb(0.12, 0.23, 0.54), // Royal Blue
  });

  page1.drawText('INFOTECH GLOBAL SOLUTIONS PVT LTD', {
    x: 40,
    y: height - 45,
    size: 16,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page1.drawText('Registered Office: Cyber City Phase 2, Gurugram, Haryana - 122002', {
    x: 40,
    y: height - 65,
    size: 9,
    font: fontRegular,
    color: rgb(0.85, 0.9, 1),
  });

  // Date & Reference
  page1.drawText('CONFIDENTIAL & PRIVATE', {
    x: 40,
    y: height - 110,
    size: 10,
    font: fontBold,
    color: rgb(0.8, 0.1, 0.1),
  });

  page1.drawText(`Date: 16 November 2026`, {
    x: 40,
    y: height - 125,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page1.drawText(`Ref No: IGS/HR/OFFER/2026/8941`, {
    x: 40,
    y: height - 140,
    size: 10,
    font: fontRegular,
    color: rgb(0.2, 0.2, 0.2),
  });

  page1.drawText(`To,\nMr./Ms. ${candidateName},\nSubject: Formal Offer of Employment`, {
    x: 40,
    y: height - 175,
    size: 11,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
    lineHeight: 16,
  });

  const letterBody = [
    `Dear ${candidateName},`,
    '',
    `Following our recent technical evaluation and interviews, we are delighted to offer you`,
    `the position of ${position} at InfoTech Global Solutions Pvt Ltd.`,
    '',
    `We were thoroughly impressed by your credentials, domain knowledge, and dedication.`,
    `We believe your expertise will play a pivotal role in accelerating our technology roadmap.`,
    '',
    `1. ROLE & COMMENCEMENT DATE:`,
    `You are requested to join our Technology Center on or before 1st December 2026.`,
    `Your standard working hours will be 9:30 AM to 6:30 PM, Monday through Friday.`,
    '',
    `2. COMPENSATION & EMOLUMENTS:`,
    `Your Annual Cost to Company (CTC) will be INR ${salary} per annum.`,
    `A detailed breakdown of basic pay, HRA, special allowance, and retirement benefits`,
    `is annexed in Schedule-A attached on the following page.`,
    '',
    `3. PROBATION & PERFORMANCE REVIEW:`,
    `You will be on probation for an initial duration of three (3) months. Upon successful`,
    `completion of your probationary review, your role will be formally confirmed in writing.`,
  ];

  let textY = height - 240;
  for (const line of letterBody) {
    if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('Dear')) {
      page1.drawText(line, { x: 40, y: textY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    } else {
      page1.drawText(line, { x: 40, y: textY, size: 10, font: fontRegular, color: rgb(0.25, 0.25, 0.25) });
    }
    textY -= 16;
  }

  // Footer
  page1.drawText('Page 1 of 2 - InfoTech Global Solutions Confidential', {
    x: 180,
    y: 30,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Page 2: Compensation Schedule
  const page2 = pdfDoc.addPage([595.28, 841.89]);

  page2.drawText('SCHEDULE-A: COMPENSATION & SALARY BREAKUP', {
    x: 40,
    y: height - 50,
    size: 13,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.54),
  });

  page2.drawText(`Candidate: ${candidateName} | Designation: ${position}`, {
    x: 40,
    y: height - 70,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Table header
  page2.drawRectangle({
    x: 40,
    y: height - 110,
    width: width - 80,
    height: 25,
    color: rgb(0.9, 0.93, 0.98),
  });

  page2.drawText('SALARY COMPONENT', { x: 50, y: height - 102, size: 9, font: fontBold, color: rgb(0.1, 0.2, 0.4) });
  page2.drawText('MONTHLY (INR)', { x: 320, y: height - 102, size: 9, font: fontBold, color: rgb(0.1, 0.2, 0.4) });
  page2.drawText('ANNUAL (INR)', { x: 440, y: height - 102, size: 9, font: fontBold, color: rgb(0.1, 0.2, 0.4) });

  const tableRows = [
    ['Basic Salary', '45,000.00', '5,40,000.00'],
    ['House Rent Allowance (HRA)', '22,500.00', '2,70,000.00'],
    ['Special Allowance', '15,000.00', '1,80,000.00'],
    ['Statutory Bonus', '3,500.00', '42,000.00'],
    ['Employer PF Contribution', '4,000.00', '48,000.00'],
    ['TOTAL COST TO COMPANY (CTC)', '90,000.00', '10,80,000.00'],
  ];

  let rowY = height - 135;
  for (const row of tableRows) {
    const isTotal = row[0].startsWith('TOTAL');
    if (isTotal) {
      page2.drawRectangle({ x: 40, y: rowY - 5, width: width - 80, height: 22, color: rgb(0.95, 0.95, 0.95) });
    }
    page2.drawText(row[0], { x: 50, y: rowY, size: 9, font: isTotal ? fontBold : fontRegular, color: rgb(0.1, 0.1, 0.1) });
    page2.drawText(row[1], { x: 320, y: rowY, size: 9, font: isTotal ? fontBold : fontRegular, color: rgb(0.1, 0.1, 0.1) });
    page2.drawText(row[2], { x: 440, y: rowY, size: 9, font: isTotal ? fontBold : fontRegular, color: rgb(0.1, 0.1, 0.1) });
    rowY -= 22;
  }

  // Signatures
  page2.drawText('For InfoTech Global Solutions Pvt Ltd', { x: 40, y: 150, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page2.drawText('Authorized HR Signatory', { x: 40, y: 100, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

  page2.drawText('Accepted & Confirmed by Employee', { x: 340, y: 150, size: 10, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page2.drawText(`Signature: ______________________`, { x: 340, y: 100, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  page2.drawText(`Date: __________________________`, { x: 340, y: 80, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

  page2.drawText('Page 2 of 2 - InfoTech Global Solutions Confidential', {
    x: 180,
    y: 30,
    size: 9,
    font: fontRegular,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

// Helper to create Certificate/Marksheet PDF
async function createCertificatePdf(studentName, rollNumber, courseName) {
  const pdfDoc = await PDFDocument.create();
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const page = pdfDoc.addPage([841.89, 595.28]); // A4 Landscape
  const { width, height } = page.getSize();

  // Double border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: width - 40,
    height: height - 40,
    borderColor: rgb(0.7, 0.5, 0.1), // Gold
    borderWidth: 3,
  });

  page.drawRectangle({
    x: 26,
    y: 26,
    width: width - 52,
    height: height - 52,
    borderColor: rgb(0.15, 0.25, 0.45), // Navy
    borderWidth: 1,
  });

  page.drawText('BOARD OF TECHNICAL EDUCATION & HIGHER ACADEMICS', {
    x: 170,
    y: height - 70,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.54),
  });

  page.drawText('PROVISIONAL CERTIFICATE OF MERIT & COMPLETION', {
    x: 210,
    y: height - 95,
    size: 13,
    font: fontBold,
    color: rgb(0.7, 0.45, 0.05),
  });

  page.drawText('This is to certify that', {
    x: 350,
    y: height - 145,
    size: 12,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText(studentName.toUpperCase(), {
    x: 280,
    y: height - 180,
    size: 22,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  page.drawText(`Roll No: ${rollNumber} | Registration ID: REG-2026-${Math.floor(10000 + Math.random() * 90000)}`, {
    x: 260,
    y: height - 210,
    size: 11,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4),
  });

  page.drawText(
    `has successfully fulfilled all curriculum requirements and passed the comprehensive examinations in`,
    { x: 130, y: height - 250, size: 12, font: fontRegular, color: rgb(0.2, 0.2, 0.2) }
  );

  page.drawText(courseName, {
    x: 250,
    y: height - 280,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.23, 0.54),
  });

  page.drawText('with First Class Distinction (Grade Point Average: 9.42 / 10.0)', {
    x: 225,
    y: height - 310,
    size: 12,
    font: fontBold,
    color: rgb(0.15, 0.6, 0.25),
  });

  // Signatures
  page.drawText('Prof. R. K. Agrawal', { x: 80, y: 90, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Head of Examinations', { x: 80, y: 72, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

  page.drawText('Dr. S. N. Bannerjee', { x: 620, y: 90, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
  page.drawText('Vice Chancellor / Director', { x: 620, y: 72, size: 9, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

  return await pdfDoc.save();
}

async function uploadPdfChunks(jobId, docId, pdfBytes) {
  const base64 = Buffer.from(pdfBytes).toString('base64');
  const dataUrl = `data:application/pdf;base64,${base64}`;
  const CHUNK_SIZE = 450000;
  const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);

  console.log(`Uploading doc ${docId}: size ${pdfBytes.length} bytes, chunks: ${totalChunks}`);

  for (let c = 0; c < totalChunks; c++) {
    const chunkData = dataUrl.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);
    await setDoc(doc(db, 'jobs', jobId, 'files', docId, 'chunks', c.toString()), {
      chunk: chunkData,
      index: c,
    });
  }
}

async function seed() {
  console.log('--- Generating Dummy PDF Orders for Production Testing ---');

  const orders = [
    {
      shopSlug: 'kishan-printing',
      shopId: 'shop-002-kcp',
      customerName: 'Rahul Sharma',
      customerPhone: '+91 98765 12345',
      accessCode: '4821',
      notes: 'Please print color on thick paper (85 GSM) for the salary schedule.',
      docs: [
        {
          name: 'Employment_Offer_Letter_Rahul_Sharma.pdf',
          type: 'offer',
          copies: 2,
          colorMode: 'COLOR',
          sides: 'DOUBLE_LONG',
          note: 'Double sided, portrait, 2 copies',
        },
      ],
    },
    {
      shopSlug: 'kishan-printing',
      shopId: 'shop-002-kcp',
      customerName: 'Priya Patel',
      customerPhone: '+91 98234 88776',
      accessCode: '7294',
      notes: 'Need high-gloss color print for certificate verification tomorrow.',
      docs: [
        {
          name: 'Provisional_Merit_Certificate_Priya_Patel.pdf',
          type: 'certificate',
          copies: 1,
          colorMode: 'COLOR',
          sides: 'SINGLE',
          note: 'Single side, high quality landscape color print',
        },
      ],
    },
    {
      shopSlug: 'shree-ganesh-xerox',
      shopId: 'shop-001-sgx',
      customerName: 'Mohd Amir Khan',
      customerPhone: '+91 91234 56789',
      accessCode: '3519',
      notes: 'Black & white photocopy, standard A4 paper.',
      docs: [
        {
          name: 'Official_Offer_Agreement_Mohd_Amir.pdf',
          type: 'offer',
          copies: 3,
          colorMode: 'BW',
          sides: 'SINGLE',
          note: '3 copies Black and white',
        },
      ],
    },
  ];

  for (const o of orders) {
    const jobDocRef = doc(db, 'jobs', `prod-test-${Date.now()}-${o.accessCode}`);
    const jobId = jobDocRef.id;

    const docItems = [];

    for (let i = 0; i < o.docs.length; i++) {
      const d = o.docs[i];
      const docId = `doc-${Date.now()}-${i}`;

      let pdfBytes;
      if (d.type === 'offer') {
        pdfBytes = await createOfferLetterPdf(o.customerName, 'Senior Full-Stack Engineer', '10,80,000');
      } else {
        pdfBytes = await createCertificatePdf(o.customerName, `2026/CS/${o.accessCode}`, 'Bachelor of Technology (Computer Science & AI)');
      }

      await uploadPdfChunks(jobId, docId, pdfBytes);

      docItems.push({
        id: docId,
        originalName: d.name,
        fileSize: pdfBytes.length,
        mimeType: 'application/pdf',
        pageCount: d.type === 'offer' ? 2 : 1,
        colorMode: d.colorMode,
        sides: d.sides,
        copies: d.copies,
        note: d.note,
        hasContent: true,
      });
    }

    const jobData = {
      shopId: o.shopId,
      shopSlug: o.shopSlug,
      accessCode: o.accessCode,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      status: 'SUBMITTED',
      totalEstimatedPages: docItems.reduce((sum, d) => sum + d.copies * d.pageCount, 0),
      documents: docItems,
      paymentStatus: 'PENDING',
      notes: o.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(jobDocRef, jobData);
    console.log(`✅ Created Order #${o.accessCode} for ${o.customerName} at shop ${o.shopSlug}`);
  }

  console.log('--- All Dummy PDFs successfully injected into Production Firestore! ---');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed Error:', err);
  process.exit(1);
});
