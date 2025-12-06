import React, { useState, useEffect, useRef } from 'react';
import { Save, Printer, FileText, Trash2, Download, PlusCircle, Search, Settings, X, AlertTriangle, CheckCircle } from 'lucide-react';

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';



// Generates PDF from a React component's DOM element using html2canvas and jspdf
const generatePDF = async (elementRef, filename, toast) => {
  const element = elementRef.current;
  if (!element) return;

  try {
    const canvas = await html2canvas(element, { scale: 3, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 1.0);

    const pdf = new jsPDF('p', 'mm', 'a4');

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Use the 3mm margin set in the CSS
    const margin = 3;
    const imgWidth = pdfWidth - (2 * margin);
    const imgHeight = (imgWidth * canvas.height) / canvas.width;

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - position);

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(filename);

    toast({ message: 'Receipt downloaded as PDF!', type: 'success' });
  } catch (error) {
    console.error("PDF Generation Error:", error);
    toast({ message: `Failed to generate PDF: ${error.message || 'Unknown error'}`, type: 'error' });
  }
};


// Converts a number to uppercase digit words (e.g., 14440 -> ONE FOUR FOUR FOUR ZERO)
const numberToDigitWords = (num) => {
  if (num === '' || num === null || isNaN(num) || num === 0) return 'ZERO';
  const words = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const absNum = Math.abs(Math.round(parseFloat(num)));
  return absNum.toString().split('').map(d => words[parseInt(d)] || '').join(' ').toUpperCase();
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/'); // 04/12/2025
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); // 17:54 (24-hour format)
};

// Default template configuration
const DEFAULT_CONFIG = {
  companyName: "RAJDIP GINNING AND PRESSING PVT LTD",
  address: "JUNA BELWANDI KOTHAR ROAD SHRIGONDA\nDIST. AHMEDNAGAR",
  footer: "WB BY ROCKWAY WEIGHBRIDGE TECHNO, PUNE. PH NO: 020-26631444, 9623442386(SERVICE)",
  showCharges: true,
};

const DEFAULT_RECEIPT = {
  id: null,
  rstNo: '14877',
  vehicleNo: 'MH17CV3329',
  customer: 'RAHATA',
  material: 'SARKI',
  supplier: '',
  grossWeight: 22235,
  tareWeight: 7795,
  netWeight: 14440,
  manualNetWeight: false,
  // Use the date and time format seen in the image for defaults: YYYY-MM-DDTHH:MM
  dateTimeIn: new Date(2025, 11, 4, 16, 9).toISOString().slice(0, 16),
  dateTimeOut: new Date(2025, 11, 4, 17, 54).toISOString().slice(0, 16),
  charges: 0, // Image shows 0
  remarks: '',
};

/**
 * CUSTOM UI COMPONENTS (Toast & Modal)
 */
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
  const Icon = type === 'error' ? AlertTriangle : CheckCircle;

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-xl flex items-center space-x-3 z-[9999] animate-fadeIn`}>
      <Icon size={20} />
      <p className="font-semibold text-sm">{message}</p>
      <button onClick={onClose} className="p-1 -mr-2 rounded-full hover:bg-white/20">
        <X size={16} />
      </button>
    </div>
  );
};

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[9998] backdrop-blur-sm animate-fadeIn">
    <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="text-red-500" size={24} />
          <h4 className="text-lg font-bold text-gray-800">Confirm Action</h4>
        </div>
        <p className="mt-4 text-gray-600 text-sm">{message}</p>
      </div>
      <div className="p-4 bg-gray-50 border-t flex justify-end space-x-3">
        <button onClick={onCancel} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-semibold text-gray-700">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold">Confirm</button>
      </div>
    </div>
  </div>
);


/**
 * RECEIPT TEMPLATE COMPONENT (Forwarded Ref)
 */
const ReceiptTemplate = React.forwardRef(({ data, config }, ref) => {

  // Use Gross Time for the main date display column (as it's the final time on the receipt)
  const dateOut = formatDate(data.dateTimeOut);
  const timeOut = formatTime(data.dateTimeOut);
  const dateIn = formatDate(data.dateTimeIn);
  const timeIn = formatTime(data.dateTimeIn);

  // Styling consistent with the image
  const labelStyle = "w-20 shrink-0 text-sm";
  const colonStyle = "shrink-0 mr-4 text-sm";
  const weightValueStyle = "text-right w-20 font-bold text-base";
  const unitStyle = "ml-1 text-sm";
  const dateLabelStyle = "w-12 shrink-0 text-sm";
  const dateValueStyle = "w-20 shrink-0 text-sm";
  const timeLabelStyle = "ml-4 w-12 shrink-0 text-sm";
  const timeValueStyle = "text-sm";

  // A narrow column for the left side data (e.g., RST NO, MATERIAL)
  const leftColWidth = "w-[240px]";

  // Tailwind classes for right-side alignment offset (moving content away from the edge)
  const vehicleCustomerOffset = "pr-6"; // ~10 spaces
  const dateWordOffset = "pr-4"; // ~7 spaces

  return (
    <div
      ref={ref}
      // Reduced padding to help with vertical fit
      className="p-1 bg-white text-black box-border relative"
      style={{
        // REDUCED: Reduced width for more space on A4 page
        width: '200mm',
        fontFamily: '"Courier Prime", "Courier New", monospace',
        fontSize: '14px',
        lineHeight: '1.3',
        minHeight: '88mm',
        whiteSpace: 'pre-wrap', // Allows \n in the address to work
      }}
    >
      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="text-2xl font-bold tracking-tight uppercase" style={{ letterSpacing: '1px' }}>{config.companyName}</h1>
        {/* Use pre-wrap alignment for the address */}
        <p className="text-xs mt-1 uppercase mx-auto" style={{ lineHeight: '1.2', whiteSpace: 'pre-wrap' }}>{config.address}</p>
      </div>

      {/* Content Grid - Structured to mimic the column alignment of the original image */}
      <div className="flex flex-col">

        {/* Row 1: RST NO / VEHICLE NO */}
        <div className="flex">
          {/* Left Column Data (RST NO) */}
          <div className={`${leftColWidth} shrink-0 flex`}>
            <span className="w-20 shrink-0">RST NO</span>
            <span className="shrink-0 mr-4">:</span>
            <span className="font-bold">{data.rstNo}</span>
          </div>
          {/* Right Column Data (VEHICLE NO) - Apply offset to inner div */}
          <div className="flex-1 flex justify-end">
            <div className={`flex ${vehicleCustomerOffset}`}> {/* Added offset padding */}
              <span className="w-24 shrink-0">VEHICLE NO</span>
              <span className="shrink-0 mr-4">:</span>
              <span className="font-bold uppercase">{data.vehicleNo}</span>
            </div>
          </div>
        </div>

        {/* Row 2: MATERIAL / CUSTOMER */}
        <div className="flex">
          {/* Left Column Data (MATERIAL) */}
          <div className={`${leftColWidth} shrink-0 flex`}>
            <span className="w-20 shrink-0">MATERIAL</span>
            <span className={colonStyle}>:</span>
            <span>{data.material}</span>
          </div>
          {/* Right Column Data (CUSTOMER) - Apply offset to inner div */}
          <div className="flex-1 flex justify-end">
            <div className={`flex ${vehicleCustomerOffset}`}> {/* Added offset padding */}
              <span className="w-24 shrink-0">CUSTOMER</span>
              <span className={colonStyle}>:</span>
              <span>{data.customer}</span>
            </div>
          </div>
        </div>

        {/* Row 3: SUPPLIER / Empty or Date */}
        <div className="flex mb-4">
          {/* Left Column Data (SUPPLIER) */}
          <div className={`${leftColWidth} shrink-0 flex`}>
            <span className="w-20 shrink-0">SUPPLIER</span>
            <span className={colonStyle}>:</span>
            <span>{data.supplier}</span>
          </div>
          {/* Right Column is empty in the original image structure here */}
          <div className="flex-1"></div>
        </div>

        {/* --- WEIGHTS SECTION --- */}
        <div className="border-t border-b border-black border-dashed py-1 space-y-1">

          {/* GROSS Wt / Date Out */}
          <div className="flex">
            {/* Left Column Data (GROSS Wt) */}
            <div className="w-[200px] shrink-0 flex items-baseline">
              <span className={labelStyle}>GROSS Wt</span>
              <span className={colonStyle}>:</span>
              <span className={weightValueStyle}>{data.grossWeight}</span>
              <span className={unitStyle}>kg</span>
            </div>
            {/* Right Column Data (Date Out) - Apply offset to inner div */}
            <div className="flex-1 flex justify-end items-baseline">
              <div className={`flex ${dateWordOffset}`}> {/* Added offset padding */}
                <span className={dateLabelStyle}>Date:</span>
                <span className={dateValueStyle}>{dateOut}</span>
                <span className={timeLabelStyle}>Time:</span>
                <span className={timeValueStyle}>{timeOut}</span>
              </div>
            </div>
          </div>

          {/* TARE Wt / Date In */}
          <div className="flex">
            {/* Left Column Data (TARE Wt) */}
            <div className="w-[200px] shrink-0 flex items-baseline">
              <span className={labelStyle}>TARE Wt</span>
              <span className={colonStyle}>:</span>
              <span className={weightValueStyle}>{data.tareWeight}</span>
              <span className={unitStyle}>kg</span>
            </div>
            {/* Right Column Data (Date In) - Apply offset to inner div */}
            <div className="flex-1 flex justify-end items-baseline">
              <div className={`flex ${dateWordOffset}`}> {/* Added offset padding */}
                <span className={dateLabelStyle}>Date:</span>
                <span className={dateValueStyle}>{dateIn}</span>
                <span className={timeLabelStyle}>Time:</span>
                <span className={timeValueStyle}>{timeIn}</span>
              </div>
            </div>
          </div>

          {/* NET Wt / Weight in Words */}
          <div className="flex items-start pt-1">
            {/* Left Column Data (NET Wt) */}
            <div className="w-[200px] shrink-0 flex items-baseline">
              <span className={labelStyle}>NET Wt</span>
              <span className={colonStyle}>:</span>
              <span className={weightValueStyle}>{data.netWeight}</span>
              <span className={unitStyle}>kg</span>
            </div>
            {/* Right Column Data (Weight in Words) - Apply offset directly */}
            <div className={`flex-1 flex justify-end font-bold text-sm tracking-widest leading-relaxed pt-0 ${dateWordOffset}`}> {/* Added offset padding */}
              {numberToDigitWords(data.netWeight)} KG
            </div>
          </div>
        </div>

        {/* --- CHARGES --- */}
        {config.showCharges && (
          <div className="flex mt-1 border-b border-black border-dashed pb-1">
            <div className="w-[200px] shrink-0 flex">
              <span className="w-24 shrink-0 text-sm">Charges(1):</span>
              <span className="shrink-0 mr-4 text-sm">Rs.</span>
              <span className="font-bold text-sm">{data.charges}</span>
            </div>
            {/* Right column empty */}
            <div className="flex-1"></div>
          </div>
        )}

        {/* --- SIGNATURES --- */}
        <div className="flex mt-3">
          {/* Left Column Data (Operator Sign) */}
          <div className="w-[200px] shrink-0 flex">
            <span className="w-48 border-t border-black border-dotted pt-1 text-sm uppercase">OPERATOR'S SIGNATURE:</span>
          </div>
          {/* Right Column Data (Party Sign) */}
          <div className="flex-1 flex justify-end">
            <span className="w-48 text-right border-t border-black border-dotted pt-1 text-sm uppercase">PARTY'S SIGN:</span>
          </div>
        </div>

        {/* --- FOOTER --- */}
        <div className="mt-2 pt-1 text-center">
          <p className="text-[12px] uppercase" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.2' }}>{config.footer}</p>
          {data.remarks && <p className="text-[10px] mt-1 font-bold">Note: {data.remarks}</p>}
        </div>
      </div>
    </div>
  );
});


/**
 * MAIN COMPONENT (unchanged logic)
 */
export default function App() {
  const [receipt, setReceipt] = useState({ ...DEFAULT_RECEIPT, id: Date.now() });
  const [savedReceipts, setSavedReceipts] = useState([]);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // PDF Export States
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const receiptRef = useRef(null);
  const printContainerRef = useRef(null);

  // Custom Modal/Toast States
  const [toast, setToast] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);

  // 1. Load data on mount
  useEffect(() => {
    const saved = localStorage.getItem('weight_receipts');
    if (saved) setSavedReceipts(JSON.parse(saved));

    const savedConfig = localStorage.getItem('weight_config');
    if (savedConfig) setConfig(JSON.parse(savedConfig));
  }, []);



  // Auto-calculate Net Weight
  useEffect(() => {
    if (!receipt.manualNetWeight) {
      const gross = parseFloat(receipt.grossWeight) || 0;
      const tare = parseFloat(receipt.tareWeight) || 0;
      setReceipt(prev => ({ ...prev, netWeight: gross - tare }));
    }
  }, [receipt.grossWeight, receipt.tareWeight, receipt.manualNetWeight]);

  // Handlers
  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setReceipt(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) : value,
      manualNetWeight: name === 'netWeight' ? true : prev.manualNetWeight
    }));
  };

  const handleSave = () => {
    const newHistory = [...savedReceipts];
    const index = newHistory.findIndex(r => r.id === receipt.id);

    if (index >= 0) {
      newHistory[index] = receipt;
    } else {
      newHistory.unshift({ ...receipt, id: Date.now() });
    }

    setSavedReceipts(newHistory);
    localStorage.setItem('weight_receipts', JSON.stringify(newHistory));
    setToast({ message: 'Receipt Saved!', type: 'success' });
  };

  const handleNew = () => {
    setReceipt({ ...DEFAULT_RECEIPT, id: Date.now() });
  };

  const handleLoad = (r) => {
    setReceipt({ ...r });
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();

    const action = () => {
      const updated = savedReceipts.filter(r => r.id !== id);
      setSavedReceipts(updated);
      localStorage.setItem('weight_receipts', JSON.stringify(updated));
      setToast({ message: 'Receipt deleted.', type: 'success' });
      setShowConfirmModal(false);
    };

    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const handlePrint = () => {
    // Attempt to fix timing issues by ensuring the DOM is settled before printing
    setTimeout(() => {
      window.print();
    }, 10);
  };

  const handleExportPdf = async () => {


    // 1. Show 3-up view for capture (applies 'pdf-capture-active' CSS class)
    setIsExportingPdf(true);

    // Use a promise-based delay to ensure React has rendered the 3-up view and styles are applied
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const filename = `Receipt_${receipt.rstNo || 'NoRST'}_${receipt.vehicleNo || 'NoVehicle'}.pdf`;

      // 2. Capture the entire print container (the 3-up version)
      if (printContainerRef.current) {
        await generatePDF(printContainerRef, filename, setToast);
      }
    } catch (error) {
      console.error("PDF Generation failed after transition:", error);
      setToast({ message: `PDF export failed: ${error.message}`, type: 'error' });
    } finally {
      // 3. Hide 3-up view immediately
      setIsExportingPdf(false);
    }
  };

  // Filter saved list
  const filteredReceipts = savedReceipts.filter(r =>
    r.vehicleNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.rstNo && r.rstNo.toString().includes(searchQuery))
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans text-gray-800">

      {/* LEFT PANEL: EDITOR & LIST */}
      <div className="w-full md:w-5/12 lg:w-4/12 bg-white shadow-xl z-10 flex flex-col h-screen overflow-hidden no-print border-r border-gray-200">

        {/* Header */}
        <div className="p-4 bg-indigo-700 text-white flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <FileText size={20} /> Weight Receipt
            </h1>
            <p className="text-xs text-indigo-200">Generate & Print Truck Receipts</p>
          </div>
          <button onClick={() => setShowConfig(!showConfig)} className="p-2 hover:bg-indigo-600 rounded">
            <Settings size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Config Panel */}
          {showConfig && (
            <div className="bg-gray-50 p-4 border-b border-gray-200 animate-fadeIn">
              <h3 className="font-bold text-sm text-gray-600 mb-2 uppercase">Template Settings</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <label className="block text-gray-500 text-xs">Company Name</label>
                  <input
                    className="w-full border rounded p-1"
                    value={config.companyName}
                    onChange={(e) => {
                      const newConfig = { ...config, companyName: e.target.value };
                      setConfig(newConfig);
                      localStorage.setItem('weight_config', JSON.stringify(newConfig));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs">Address (Use \n for new line)</label>
                  <textarea
                    rows="2"
                    className="w-full border rounded p-1 resize-none"
                    value={config.address}
                    onChange={(e) => {
                      const newConfig = { ...config, address: e.target.value };
                      setConfig(newConfig);
                      localStorage.setItem('weight_config', JSON.stringify(newConfig));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs">Footer (Use \n for new line)</label>
                  <textarea
                    rows="2"
                    className="w-full border rounded p-1 resize-none"
                    value={config.footer}
                    onChange={(e) => {
                      const newConfig = { ...config, footer: e.target.value };
                      setConfig(newConfig);
                      localStorage.setItem('weight_config', JSON.stringify(newConfig));
                    }}
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="showCharges"
                    checked={config.showCharges}
                    onChange={(e) => {
                      const newConfig = { ...config, showCharges: e.target.checked };
                      setConfig(newConfig);
                      localStorage.setItem('weight_config', JSON.stringify(newConfig));
                    }}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="showCharges" className="ml-2 block text-sm text-gray-700">Show Charges Line</label>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="p-4 space-y-4">

            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-gray-700">Ticket Details</h2>
              <div className="flex gap-2">
                <button onClick={handleNew} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded flex items-center gap-1">
                  <PlusCircle size={14} /> New
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Ref / RST No</label>
                <input
                  type="text" name="rstNo" value={receipt.rstNo} onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="12345"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Vehicle No</label>
                <input
                  type="text" name="vehicleNo" value={receipt.vehicleNo} onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="MH-12-AB-1234"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Customer</label>
                <input
                  type="text" name="customer" value={receipt.customer} onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Supplier</label>
                <input
                  type="text" name="supplier" value={receipt.supplier} onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase">Material</label>
              <input
                type="text" name="material" value={receipt.material} onChange={handleInputChange}
                className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-600">Gross (kg)</label>
                  <input
                    type="number" name="grossWeight" value={receipt.grossWeight} onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded p-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600">Tare (kg)</label>
                  <input
                    type="number" name="tareWeight" value={receipt.tareWeight} onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded p-2 font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600">Net (kg)</label>
                  <input
                    type="number" name="netWeight" value={receipt.netWeight} onChange={handleInputChange}
                    className={`w-full border rounded p-2 font-mono text-right font-bold ${receipt.netWeight < 0 ? 'bg-red-50 text-red-600 border-red-300' : 'bg-green-50 text-green-700 border-green-300'}`}
                  />
                </div>
              </div>
              {receipt.netWeight < 0 && (
                <p className="text-xs text-red-500 font-bold text-center">Warning: Net weight is negative</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Date/Time (Tare - In)</label>
                <input
                  type="datetime-local" name="dateTimeIn" value={receipt.dateTimeIn} onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Date/Time (Gross - Out)</label>
                <input
                  type="datetime-local" name="dateTimeOut" value={receipt.dateTimeOut} onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Charges (Rs)</label>
                <input
                  type="number" name="charges" value={receipt.charges} onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">Remarks (Not on receipt)</label>
                <input
                  type="text" name="remarks" value={receipt.remarks} onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded p-2"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 grid grid-cols-3 gap-2">
              <button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded shadow flex justify-center items-center gap-2 text-sm">
                <Save size={18} /> Save
              </button>

              {/* EXPORT PDF BUTTON */}
              <button
                onClick={handleExportPdf}
                className={`text-white py-2 rounded shadow flex justify-center items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700`}
              >
                <Download size={18} />
                Export PDF
              </button>

              <button onClick={handlePrint} className="bg-gray-800 hover:bg-gray-900 text-white py-2 rounded shadow flex justify-center items-center gap-2 text-sm">
                <Printer size={18} /> Print 3-up
              </button>
            </div>

          </div>

          {/* Saved List */}
          <div className="border-t border-gray-200 mt-4">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0">
              <h3 className="font-bold text-sm text-gray-600">Saved History</h3>
              <div className="relative">
                <Search size={14} className="absolute left-2 top-2 text-gray-400" />
                <input
                  className="pl-7 pr-2 py-1 text-xs border rounded w-32 focus:w-48 transition-all"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <ul className="divide-y divide-gray-100">
              {filteredReceipts.map(r => (
                <li key={r.id} onClick={() => handleLoad(r)} className="p-3 hover:bg-indigo-50 cursor-pointer transition-colors group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-sm text-gray-800">#{r.rstNo || '---'} - {r.vehicleNo || 'No Vehicle'}</div>
                      <div className="text-xs text-gray-500">{formatDate(r.dateTimeOut)} • {r.customer}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold">{r.netWeight} kg</div>
                      <button
                        onClick={(e) => handleDelete(r.id, e)}
                        className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {filteredReceipts.length === 0 && (
                <li className="p-4 text-center text-xs text-gray-400 italic">No receipts found</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: PREVIEW */}
      <div className="w-full md:w-7/12 lg:w-8/12 bg-gray-600 p-4 md:p-8 overflow-y-auto flex flex-col items-center justify-start no-print">
        <h2 className="text-white mb-4 text-sm font-semibold opacity-75 uppercase tracking-wider">Live A4 Print Preview (1/3rd Scale)</h2>

        {/* Preview Wrapper - Scaled Down for Viewport */}
        <div className="bg-white shadow-2xl transition-all origin-top transform scale-75 md:scale-90 lg:scale-100">
          <ReceiptTemplate ref={receiptRef} data={receipt} config={config} />
        </div>

        <p className="mt-4 text-gray-300 text-xs max-w-md text-center">
          Note: This preview shows a single receipt. Clicking "Print 3-up" or "Export PDF" will automatically stack 3 copies of this receipt vertically on a single A4 page.
        </p>
      </div>

      {/* PRINT-ONLY CONTAINER (Hidden normally) */}
      <div
        className={`print-only ${isExportingPdf ? 'pdf-capture-active' : 'hidden'}`}
        ref={printContainerRef}
      >
        {/* REMOVED SEPARATORS: Vertical spacing is now handled by CSS 'gap' on a4-page-container */}
        <div className="a4-page-container">
          <div className="receipt-wrapper"><ReceiptTemplate data={receipt} config={config} /></div>
          <div className="receipt-wrapper"><ReceiptTemplate data={receipt} config={config} /></div>
          <div className="receipt-wrapper"><ReceiptTemplate data={receipt} config={config} /></div>
        </div>
      </div>

      {/* CUSTOM MODALS AND TOASTS */}
      {showConfirmModal && confirmAction && (
        <ConfirmModal
          message="Are you sure you want to delete this receipt? This action cannot be undone."
          onConfirm={() => { confirmAction(); setShowConfirmModal(false); }}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* GLOBAL STYLES FOR PRINT & PDF CAPTURE */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap');
        
        /* Utility to hide scrollbar while keeping scrolling functional */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #d1d5db; /* Light gray */
          border-radius: 3px;
        }

        .pdf-capture-active {
            /* Position off-screen during capture */
            position: absolute;
            top: -9999px; 
            left: -9999px;
            display: block !important;
            /* Give it the full printable area dimensions, using 3mm padding */
            width: 210mm; 
            min-height: 297mm;
            padding: 3mm; /* REDUCED PADDING */
            box-sizing: border-box;
            z-index: -10;
            overflow: hidden;
            background: white; /* Ensure white background for PDF */
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 3mm; /* REDUCED MARGIN */
          }
          body {
            background: white;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            /* Ensure the print container overrides the 'hidden' class */
            display: block !important;
            position: relative;
            top: auto;
            left: auto;
            padding: 0;
            margin: 0;
            width: 100%;
            height: auto;
            box-sizing: border-box;
          }
          .a4-page-container {
            width: 100%;
            /* Height: 297mm (A4) - 6mm (3mm top/3mm bottom margin) = 291mm printable area */
            height: 291mm; 
            display: flex;
            flex-direction: column;
            /* NEW: Using gap for clean, consistent vertical spacing */
            gap: 4mm; 
            justify-content: start;
          }
          .receipt-wrapper {
            /* NEW: Calculated height to fit 3 perfectly with 2 gaps of 4mm */
            /* 291mm - 8mm (2*4mm gap) = 283mm. 283mm / 3 = 94.33mm */
            height: 94.33mm; 
            flex-shrink: 0; /* Important: prevents shrinking */
            display: flex;
            flex-direction: column;
            justify-content: start; /* Align to top of wrapper */
            box-sizing: border-box;
            overflow: hidden; /* Prevent content spill */
          }
          /* Removed unused receipt-separator class */
          .receipt-separator {
            display: none !important;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out forwards;
          }
        }
      `}</style>
    </div>
  );
}
