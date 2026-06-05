
"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Package, 
  Truck, 
  BarChart3, 
  User,
  LogOut,
  Leaf,
  ChevronRight,
  Users,
  Box,
  Tag,
  Anchor,
  Navigation,
  Upload,
  ArrowLeft,
  Loader2,
  Trash2,
  Search,
  FileText,
  Plus,
  FileCheck,
  Sparkles,
  Paperclip,
  MapPin,
  Ship,
  FileSignature,
  Mail,
  Check,
  Calendar as CalendarIcon,
  Save,
  Edit2,
  CheckSquare,
  Square,
  MoreVertical,
  X,
  Split,
  Copy,
  Printer,
  Download,
  FileSpreadsheet,
  RefreshCcw,
  ChevronDown,
  ChevronLeft,
  Bell,
  HelpCircle,
  Filter,
  Info,
  Scissors,
  TrendingUp,
  AlertCircle,
  History,
  Clock,
  ClipboardCheck,
  PackageCheck,
  Camera,
  Image as ImageIcon,
  LayoutGrid,
  Signature
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableFooter
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogClose,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  collection, 
  doc, 
  setDoc,
  getDocs,
  writeBatch, 
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  addDoc,
  updateDoc,
  getDoc,
  where
} from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { extractContractData } from '@/ai/flows/extract-contract-flow';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

type ViewState = 'dashboard' | 'configuration' | 'customer-mapping' | 'material-mapping' | 'port-of-loading' | 'port-of-destination' | 'loading-advice' | 'contract-details' | 'cutting-order' | 'edit-cutting-orders' | 'bookings' | 'trips';

type CuttingOrderStatus = 'EMPTY' | 'PENDING' | 'ONGOING' | 'DEPART';
type LoadingAdviceWorkflowStage = 'LA_CREATED' | 'COS_CREATED' | 'READY_FOR_BOOKING' | 'BOOKINGS_CREATED';

const CUTTING_ORDER_STATUS_OPTIONS: CuttingOrderStatus[] = ['EMPTY', 'PENDING', 'ONGOING', 'DEPART'];

const normalizeCuttingOrderStatus = (value: any): CuttingOrderStatus => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'DEPART') return 'DEPART';
  if (normalized === 'ONGOING' || normalized === 'IN-PROCESS' || normalized === 'IN_PROCESS' || normalized === 'AVAILABLE' || normalized === 'READY' || normalized === 'LOADED') {
    return 'ONGOING';
  }
  if (normalized === 'PENDING') return 'PENDING';
  if (normalized === 'EMPTY') return 'EMPTY';
  return 'EMPTY';
};

const getCuttingOrderStatusLabel = (status: CuttingOrderStatus) => {
  switch (status) {
    case 'EMPTY':
      return 'Empty';
    case 'PENDING':
      return 'Pending';
    case 'ONGOING':
      return 'Ongoing';
    case 'DEPART':
      return 'Depart';
    default:
      return 'Empty';
  }
};

const getCuttingOrderStatusClassName = (status: CuttingOrderStatus) => {
  switch (status) {
    case 'EMPTY':
      return 'border-slate-200 bg-slate-50 text-slate-500';
    case 'PENDING':
      return 'border-red-200 bg-red-50 text-red-600';
    case 'ONGOING':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'DEPART':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-500';
  }
};

const getNextCuttingOrderStatus = (status: CuttingOrderStatus): CuttingOrderStatus => {
  const currentIndex = CUTTING_ORDER_STATUS_OPTIONS.indexOf(normalizeCuttingOrderStatus(status));
  return CUTTING_ORDER_STATUS_OPTIONS[(currentIndex + 1) % CUTTING_ORDER_STATUS_OPTIONS.length];
};

const normalizeLoadingAdviceWorkflowStage = (value: any): LoadingAdviceWorkflowStage => {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'BOOKINGS_CREATED') return 'BOOKINGS_CREATED';
  if (normalized === 'READY_FOR_BOOKING') return 'READY_FOR_BOOKING';
  if (normalized === 'COS_CREATED') return 'COS_CREATED';
  return 'LA_CREATED';
};

const getLoadingAdviceWorkflowStageLabel = (stage: LoadingAdviceWorkflowStage) => {
  switch (stage) {
    case 'LA_CREATED':
      return 'LA Created';
    case 'COS_CREATED':
      return 'Cutting Orders Created';
    case 'READY_FOR_BOOKING':
      return 'Ready for Booking';
    case 'BOOKINGS_CREATED':
      return 'Booking Created';
    default:
      return 'LA Created';
  }
};

const getLoadingAdviceWorkflowStageClassName = (stage: LoadingAdviceWorkflowStage) => {
  switch (stage) {
    case 'LA_CREATED':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    case 'COS_CREATED':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'READY_FOR_BOOKING':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'BOOKINGS_CREATED':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
};

interface TripRow {
  id: string;
  ps: string;
  containerNo: string;
  vanNo: string;
  sealNo: string;
  atwStatus: 'Y' | 'N';
  atwReleased: string;
  pmNo: string;
  driverName: string;
  signature: 'Pending' | 'Signed';
  dateWithdrawn: string;
}

interface TransferInspectionState {
  inboundDriverName: string;
  outboundDriverName: string;
  temperature: boolean;
  noLeaks: boolean;
  checkDrainPlug: boolean;
  noOdor: boolean;
  photos: string[];
}

interface CORow {
  id: string;
  ps: string;
  pod: string;
  status: 'PENDING' | 'DEPART';
  cutOffDate: string;
  etd: string;
  taskDate: string;
  sku: string;
  palletization: string;
  containerNo: string;
  shippingLine: string;
  bookingNo: string;
  atwStatus: 'PENDING' | 'READY' | 'LOADED';
}

type ShippingDocType =
  | 'Shipping Instruction'
  | "Mate's Receipt"
  | 'Packing List';

type ShippingDocAction = 'generate' | 'upload' | 'view' | 'download';

interface ShippingDocDraft {
  title: string;
  referenceNo: string;
  issueDate: string;
  preparedBy: string;
  recipient: string;
  body: string;
  shipperName: string;
  shipperAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  notifyPartyName: string;
  notifyPartyAddress: string;
  releaseText: string;
  bookingReference: string;
  freightTerm: string;
  vesselName: string;
  voyageNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  shippingMarks: string;
  description: string;
  cartons: string;
  volume: string;
  grossWeight: string;
  exporter: string;
  exporterAddress: string;
  soldTo: string;
  soldToAddress: string;
  vesselVoyage: string;
  departureDate: string;
  destination: string;
  termsOfDelivery: string;
}

interface PalletItem {
  packType: string;
  qty: string;
  skuNo: string;
}

interface LARow {
  id: string;
  farm: string;
  pol: string;
  pod: string;
  shippingLine: string;
  cutOffDate: string;
  etd: string;
  totalVans: number;
  sku: string;
  palletization: string;
}

interface BookingRowItem {
  id: string;
  laId?: string;
  shippingLine: string;
  vesselName: string;
  pod: string;
  bookingNumber: string;
  attachmentUrl?: string;
}

interface LoadingAdviceListRow {
  id: string;
  contractId: string;
  itemId: string;
  weekNumber: string;
  customerName: string;
  workflowStage: LoadingAdviceWorkflowStage;
  farm: string;
  pol: string;
  pod: string;
  shippingLine: string;
  cutOffDate: string;
  etd: string;
  totalVans: string;
  sku: string;
  palletization: string;
}

interface CuttingOrderListRow {
  id: string;
  contractId: string;
  customerName: string;
  weekNumber: string;
  ps: string;
  shippingLine: string;
  bookingNo: string;
  containerNo: string;
  atwStatus: string;
  status: CuttingOrderStatus;
  pod: string;
  cutOffDate: string;
  etd: string;
  sku: string;
  palletization: string;
}

interface BookingListRow {
  id: string;
  batchId: string;
  laId: string;
  bookingNumber: string;
  shippingLine: string;
  vesselName: string;
  pod: string;
  customerName: string;
  weekNumber: string;
}

interface DRRow {
  id: string;
  destination: string;
  packType: string;
  classValue: string;
  quantity: string;
  totalBoxes: string;
  noPallets: string;
  totalDestination: string;
}

interface COSRow {
  id: string;
  ps: string;
  shippingLine: string;
  bookingNumber: string;
  containerNo: string;
  atwStatus: 'PENDING' | 'READY' | 'LOADED';
  pod: string;
  cutOffDate: string;
  etd: string;
  sku: string;
  palletization: string;
}

export default function MyProduceDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const db = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isCosModalOpen, setIsCosModalOpen] = useState(false);
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [tripStatusFilter, setTripStatusFilter] = useState<'all' | 'shipped'>('all');
  const [selectedCuttingOrderKeys, setSelectedCuttingOrderKeys] = useState<string[]>([]);
  const [isBulkCuttingStatusModalOpen, setIsBulkCuttingStatusModalOpen] = useState(false);
  const [bulkCuttingStatus, setBulkCuttingStatus] = useState<CuttingOrderStatus>('EMPTY');
  const [isEditCuttingOrderModalOpen, setIsEditCuttingOrderModalOpen] = useState(false);
  const [selectedCuttingOrderForEdit, setSelectedCuttingOrderForEdit] = useState<CuttingOrderListRow | null>(null);
  const [cuttingOrderEditDraft, setCuttingOrderEditDraft] = useState<{
    ps: string;
    pod: string;
    cutOffDate: string;
    etd: string;
    sku: string;
    palletization: string;
    atwStatus: string;
    status: CuttingOrderStatus;
  }>({
    ps: '',
    pod: '',
    cutOffDate: '',
    etd: '',
    sku: '',
    palletization: '',
    atwStatus: '',
    status: 'EMPTY',
  });
  
  // Modals State
  const [isNewLAOpen, setIsNewLAOpen] = useState(false);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDrModalOpen, setIsDrModalOpen] = useState(false);
  const [selectedTripForTransfer, setSelectedTripForTransfer] = useState<any>(null);
  const [transferInspection, setTransferInspection] = useState<TransferInspectionState>({
    inboundDriverName: '',
    outboundDriverName: '',
    temperature: false,
    noLeaks: false,
    checkDrainPlug: false,
    noOdor: false,
    photos: [],
  });
  const transferPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedTripIds, setExpandedTripIds] = useState<string[]>([]);
  const [isShippingDocsModalOpen, setIsShippingDocsModalOpen] = useState(false);
  const [isShippingDocEditorOpen, setIsShippingDocEditorOpen] = useState(false);
  const [isShippingDocUploadOpen, setIsShippingDocUploadOpen] = useState(false);
  const [selectedTripForDocs, setSelectedTripForDocs] = useState<any>(null);
  const [selectedShippingDocType, setSelectedShippingDocType] = useState<ShippingDocType>('Shipping Instruction');
  const [selectedShippingDocUploadType, setSelectedShippingDocUploadType] = useState<string>('');
  const [selectedShippingDocFile, setSelectedShippingDocFile] = useState<File | null>(null);
  const [vlsSavedTripIds, setVlsSavedTripIds] = useState<string[]>([]);
  const [isSavingVls, setIsSavingVls] = useState(false);
  const [shippingDocDraft, setShippingDocDraft] = useState<ShippingDocDraft>({
    title: 'Shipping Instruction',
    referenceNo: '',
    issueDate: format(new Date(), 'yyyy-MM-dd'),
    preparedBy: 'Operations Team',
    recipient: 'Carrier / Terminal',
    body: 'This shipping document is a draft preview. Edit the fields and body content as needed before export.',
    shipperName: '',
    shipperAddress: '',
    consigneeName: '',
    consigneeAddress: '',
    notifyPartyName: '',
    notifyPartyAddress: '',
    releaseText: '',
    bookingReference: '',
    freightTerm: '',
    vesselName: '',
    voyageNo: '',
    portOfLoading: '',
    portOfDischarge: '',
    shippingMarks: '',
    description: '',
    cartons: '',
    volume: '',
    grossWeight: '',
    exporter: '',
    exporterAddress: '',
    soldTo: '',
    soldToAddress: '',
    vesselVoyage: '',
    departureDate: '',
    destination: '',
    termsOfDelivery: '',
  });

  const viewToPath = (view: ViewState) => {
    switch (view) {
      case 'trips':
        return '/myproduce/trip';
      case 'bookings':
        return '/myproduce/bookings';
      case 'loading-advice':
        return '/myproduce/loading-advice';
      case 'cutting-order':
        return '/myproduce/cutting-orders';
      case 'configuration':
        return '/myproduce/configuration';
      default:
        return '/myproduce';
    }
  };

  const pathToView = (path: string): ViewState => {
    const slug = path.split('/')[2] || '';
    switch (slug) {
      case 'trip':
      case 'trips':
        return 'trips';
      case 'bookings':
        return 'bookings';
      case 'loading-advice':
        return 'loading-advice';
      case 'cutting-orders':
      case 'cutting-order':
        return 'cutting-order';
      case 'configuration':
        return 'configuration';
      default:
        return 'dashboard';
    }
  };

  const navigateToView = (view: ViewState) => {
    setActiveView(view);
    router.push(viewToPath(view));
  };

  useEffect(() => {
    const nextView = pathToView(pathname);
    if (nextView !== activeView) {
      setActiveView(nextView);
    }
  }, [pathname, activeView]);

  // Loading Advice State
  const [isExtracting, setIsExtracting] = useState(false);
  const [aiText, setAiText] = useState('');
  const [newLAHeader, setNewLAHeader] = useState({
    customerName: '',
    weekNumber: '',
    senderEmail: '',
    subject: ''
  });
  const getNewLAHeaderDefaults = () => ({
    customerName: customerFilter !== 'all' ? customerFilter : '',
    weekNumber: weekFilter !== 'all' ? weekFilter : '',
    senderEmail: '',
    subject: ''
  });
  const createEmptyLARow = (): LARow => ({
    id: Math.random().toString(36).substr(2, 9),
    farm: '',
    pol: '',
    pod: '',
    shippingLine: '',
    cutOffDate: '',
    etd: '',
    totalVans: 0,
    sku: '',
    palletization: '',
  });
  const [laRows, setLaRows] = useState<LARow[]>([createEmptyLARow()]);

  // Booking State
  const createEmptyBookingRow = (): BookingRowItem => ({
    id: Math.random().toString(36).substr(2, 9),
    laId: '',
    shippingLine: '',
    vesselName: '',
    pod: '',
    bookingNumber: '',
    attachmentUrl: ''
  });
  const [bookingHeader, setBookingHeader] = useState({
    laId: '',
    customerName: '',
    weekNumber: '',
    receivedAt: format(new Date(), 'yyyy-MM-dd')
  });
  const [bookingRows, setBookingRows] = useState<BookingRowItem[]>([createEmptyBookingRow()]);
  const [isFinalizingLoadingAdvice, setIsFinalizingLoadingAdvice] = useState(false);
  const createEmptyCOSRow = (ps = '1', pod = ''): COSRow => ({
    id: Math.random().toString(36).substr(2, 9),
    ps,
    shippingLine: '',
    bookingNumber: '',
    containerNo: '',
    atwStatus: 'PENDING',
    pod,
    cutOffDate: '',
    etd: '',
    sku: '',
    palletization: 'Palletized',
  });
  const normalizePalletization = (value: any) =>
    String(value || '').toLowerCase().includes('non') ? 'Non-Palletized' : 'Palletized';
  const [cosRows, setCosRows] = useState<COSRow[]>([createEmptyCOSRow()]);
  const [cosHeader, setCosHeader] = useState({
    customerName: '',
    weekNumber: '',
    pod: '',
    laId: '',
  });

  const createEmptyDRRow = (): DRRow => ({
    id: Math.random().toString(36).substr(2, 9),
    destination: '',
    packType: '',
    classValue: '',
    quantity: '',
    totalBoxes: '',
    noPallets: '',
    totalDestination: '',
  });
  const [drRows, setDrRows] = useState<DRRow[]>([createEmptyDRRow()]);
  const [drHeader, setDrHeader] = useState({
    datePrepared: format(new Date(), 'yyyy-MM-dd'),
    customer: '',
    packingStationNo: '',
    vanNo: '',
    hauler: '',
    tripNo: '',
    truckNo: '',
    trailerChassisNo: '',
    plateNo: '',
    waybillNo: '',
    sealNo: '',
    shippingLine: '',
    vesselName: '',
    voyage: '',
    portOfLoading: '',
    remarks: '',
    operationalTimeline: {
      vanArrivalAtPs: '',
      startOfLoading: '',
      finishedLoading: '',
      vanDeparture: '',
      wharfArrival: '',
      startUnloading: '',
      finishUnloading: '',
    }
  });
  const [drVerification, setDrVerification] = useState({
    preparedBy: { name: 'D.G. REYES', role: 'PACKING STATION FOREMAN', signatureDataUrl: '' },
    checkedBy: { name: 'EDCEL OBRADO', role: 'QAD - INSPECTOR' },
    approvedBy: { name: 'RS PALADIO', role: 'PACKING STATION OVERSEER' },
    receivedBy: { name: 'IAN BINAYA', role: 'HAULER REPRESENTATIVE' }
  });
  const [isSavingDr, setIsSavingDr] = useState(false);

  // VLS Specific State
  const [isVlsModalOpen, setIsVlsModalOpen] = useState(false);
  const [isPalletDetailsModalOpen, setIsPalletDetailsModalOpen] = useState(false);
  const [selectedPalletIndex, setSelectedPalletIndex] = useState<string | null>(null);
  const [vlsType, setVlsType] = useState<'palletized' | 'non-palletized'>('palletized');
  const [isPreparedByModalOpen, setIsPreparedByModalOpen] = useState(false);
  const [preparedBySignatureTarget, setPreparedBySignatureTarget] = useState<'vls' | 'dr'>('vls');
  const preparedByCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const preparedByDrawingRef = useRef(false);
  const preparedByLastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [vlsManifest, setVlsManifest] = useState({
    datePrepared: format(new Date(), 'yyyy-MM-dd'),
    waybillNo: '',
    hauler: '',
    truckNo: '',
    plateNo: '',
    tripNo: '',
    vanNo: '',
    sealNo: '',
    gensetNo: '',
    tempSetting: ''
  });
  
  const [palletsData, setPalletsData] = useState<{[key: string]: PalletItem[]}>({});
  const [floorLoadData, setFloorLoadData] = useState<{[key: string]: PalletItem[]}>({});
  const [currentPalletRows, setCurrentPalletRows] = useState<PalletItem[]>([{ packType: '', qty: '', skuNo: '' }]);
  
  const [verificationData, setVerificationData] = useState({
    preparedBy: { name: 'D.G. REYES', role: 'PACKING STATION FOREMAN', signatureDataUrl: '' },
    checkedBy: { name: 'EDCEL OBRADO', role: 'QAD - INSPECTOR' },
    approvedBy: { name: 'RS PALADIO', role: 'PACKING STATION OVERSEER' },
    receivedBy: { name: 'IAN BINAYA', role: 'HAULER REPRESENTATIVE' }
  });
  
  // Trip Batch State
  const [tripStep, setTripStep] = useState<1 | 2>(1);
  const [newTripHeader, setNewTripHeader] = useState({ 
    customerName: '', 
    weekNumber: '',
    bookingNo: '',
    bookingBatchId: '',
    laId: '',
    shippingLine: '',
    vessel: '',
    pod: ''
  });
  const [tripRows, setTripRows] = useState<TripRow[]>([{
    id: Math.random().toString(36).substr(2, 9),
    ps: '1', containerNo: '', vanNo: '', sealNo: '',
    atwStatus: 'Y', atwReleased: format(new Date(), 'yyyy-MM-dd'),
    pmNo: '', driverName: '', signature: 'Pending',
    dateWithdrawn: format(new Date(), 'yyyy-MM-dd')
  }]);
  const [bindCoRows, setBindCoRows] = useState<CORow[]>([]);

  useEffect(() => {
    if (!isNewLAOpen) return;
    setAiText('');
    setNewLAHeader(getNewLAHeaderDefaults());
    setLaRows([createEmptyLARow()]);
  }, [isNewLAOpen]);

  useEffect(() => {
    if (!isDrModalOpen) return;
    const savedDr = selectedTripForTransfer?.deliveryReceipt || {};
    const savedTimeline = savedDr.operationalTimeline || {};
    const savedRows = Array.isArray(savedDr.rows) && savedDr.rows.length > 0 ? savedDr.rows : null;
    setDrHeader({
      datePrepared: savedDr.datePrepared || format(new Date(), 'yyyy-MM-dd'),
      customer: savedDr.customer || selectedTripForTransfer?.customerName || '',
      packingStationNo: savedDr.packingStationNo || selectedTripForTransfer?.ps || selectedTripForTransfer?.pmNo || '',
      vanNo: savedDr.vanNo || selectedTripForTransfer?.vanNo || '',
      hauler: savedDr.hauler || '',
      tripNo: savedDr.tripNo || selectedTripForTransfer?.tripId || '',
      truckNo: savedDr.truckNo || '',
      trailerChassisNo: savedDr.trailerChassisNo || '',
      plateNo: savedDr.plateNo || '',
      waybillNo: savedDr.waybillNo || '',
      sealNo: savedDr.sealNo || selectedTripForTransfer?.sealNo || '',
      shippingLine: savedDr.shippingLine || selectedTripForTransfer?.shippingLine || '',
      vesselName: savedDr.vesselName || selectedTripForTransfer?.vessel || '',
      voyage: savedDr.voyage || '',
      portOfLoading: savedDr.portOfLoading || '',
      remarks: savedDr.remarks || '',
      operationalTimeline: {
        vanArrivalAtPs: savedTimeline.vanArrivalAtPs || '',
        startOfLoading: savedTimeline.startOfLoading || '',
        finishedLoading: savedTimeline.finishedLoading || '',
        vanDeparture: savedTimeline.vanDeparture || '',
        wharfArrival: savedTimeline.wharfArrival || '',
        startUnloading: savedTimeline.startUnloading || '',
        finishUnloading: savedTimeline.finishUnloading || '',
      }
    });
    setDrRows(
      savedRows
        ? savedRows.map((row: any) => ({
            id: row.id || Math.random().toString(36).substr(2, 9),
            destination: row.destination || '',
            packType: row.packType || '',
            classValue: row.classValue || '',
            quantity: row.quantity || '',
            totalBoxes: row.totalBoxes || '',
            noPallets: row.noPallets || '',
            totalDestination: row.totalDestination || '',
          }))
        : [createEmptyDRRow()]
    );
    setDrVerification({
      preparedBy: {
        name: savedDr.preparedBy?.name || 'D.G. REYES',
        role: savedDr.preparedBy?.role || 'PACKING STATION FOREMAN',
        signatureDataUrl: savedDr.preparedBy?.signatureDataUrl || '',
      },
      checkedBy: {
        name: savedDr.checkedBy?.name || 'EDCEL OBRADO',
        role: savedDr.checkedBy?.role || 'QAD - INSPECTOR',
      },
      approvedBy: {
        name: savedDr.approvedBy?.name || 'RS PALADIO',
        role: savedDr.approvedBy?.role || 'PACKING STATION OVERSEER',
      },
      receivedBy: {
        name: savedDr.receivedBy?.name || 'IAN BINAYA',
        role: savedDr.receivedBy?.role || 'HAULER REPRESENTATIVE',
      },
    });
  }, [isDrModalOpen, selectedTripForTransfer]);

  // Firestore Collections
  const CUSTOMER_PATH = 'app_configuration/customer_mapping/customer_saving';
  const POD_PATH = 'app_configuration/pod_mapping/pod_saving';
  const POL_PATH = 'app_configuration/pol_mapping/pol_saving';
  const CONTRACT_PATH = 'app_data/contracts/contract_saving';
  const BOOKING_PATH = 'app_data/bookings/booking_saving';
  const TRIP_PATH = 'app_data/trips/trip_saving';

  const customerMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, CUSTOMER_PATH), orderBy('Customer', 'asc'));
  }, [db]);
  
  const podMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, POD_PATH), orderBy('portName', 'asc'));
  }, [db]);

  const polMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, POL_PATH), orderBy('portName', 'asc'));
  }, [db]);

  const contractsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, CONTRACT_PATH), orderBy('receivedAt', 'desc'));
  }, [db]);

  const bookingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, BOOKING_PATH), orderBy('receivedAt', 'desc'));
  }, [db]);

  const tripsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, TRIP_PATH), orderBy('updatedAt', 'desc'));
  }, [db]);

  const { data: customerMappings } = useCollection(customerMappingsQuery);
  const { data: podMappings } = useCollection(podMappingsQuery);
  const { data: polMappings } = useCollection(polMappingsQuery);
  const { data: contracts, loading: contractsLoading } = useCollection(contractsQuery);
  const { data: bookings, loading: bookingsLoading } = useCollection(bookingsQuery);
  const { data: trips } = useCollection(tripsQuery);

  const weekOptions = useMemo(() => {
    const options = [];
    for (let i = 1; i <= 52; i++) options.push(i.toString());
    return options;
  }, []);

  const formatDisplayDate = (value: any) => {
    if (!value) return '--';
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return format(parsed, 'yyyy-MM-dd');
      }
      return value;
    }
    if (value?.toDate) {
      return format(value.toDate(), 'yyyy-MM-dd');
    }
    return '--';
  };

  const loadingAdviceRows = useMemo<LoadingAdviceListRow[]>(() => {
    const rows: LoadingAdviceListRow[] = [];

    (contracts || []).forEach((contract: any) => {
      const contractItems = Array.isArray(contract.items) && contract.items.length > 0
        ? contract.items
        : [{
            itemId: contract.id,
            farm: contract.farm,
            pol: contract.pol,
            pod: contract.pod,
            shippingLine: contract.shippingLine,
            cutOffDate: contract.cutOffDate,
            etd: contract.etd,
            totalVans: contract.totalVans,
            sku: Array.isArray(contract.selectedSKUs) && contract.selectedSKUs.length > 0 ? contract.selectedSKUs[0] : contract.sku,
            palletization: contract.palletizedType,
          }];

      contractItems.forEach((item: any, index: number) => {
        rows.push({
          id: item.itemId || `${contract.id}-${index}`,
          contractId: contract.id,
          itemId: item.itemId || `${contract.id}-${index}`,
          weekNumber: String(contract.weekNumber || '--'),
          customerName: contract.customerName || '--',
          workflowStage: normalizeLoadingAdviceWorkflowStage(contract.workflowStage),
          farm: item.farm || contract.farm || '--',
          pol: item.pol || contract.pol || '--',
          pod: item.pod || contract.pod || '--',
          shippingLine: item.shippingLine || contract.shippingLine || '--',
          cutOffDate: formatDisplayDate(item.cutOffDate || contract.cutOffDate),
          etd: formatDisplayDate(item.etd || contract.etd),
          totalVans: String(item.totalVans ?? contract.totalVans ?? '--'),
          sku: item.sku || Array.isArray(contract.selectedSKUs) && contract.selectedSKUs.length > 0 ? contract.selectedSKUs[0] : '--',
          palletization: item.palletization || contract.palletizedType || '--',
        });
      });
    });

    return rows;
  }, [contracts]);

  const cuttingOrderRows = useMemo<CuttingOrderListRow[]>(() => {
    const rows: CuttingOrderListRow[] = [];

    (contracts || []).forEach((contract: any) => {
      const contractItems = Array.isArray(contract.cuttingOrders) && contract.cuttingOrders.length > 0
        ? contract.cuttingOrders
        : Array.isArray(contract.items) && contract.items.length > 0
          ? contract.items
          : [{
              itemId: contract.id,
              ps: '1',
              shippingLine: contract.shippingLine,
              bookingNo: contract.bookingNo,
              containerNo: '',
              atwStatus: 'PENDING',
              pod: contract.pod,
              cutOffDate: contract.cutOffDate,
              etd: contract.etd,
              sku: Array.isArray(contract.selectedSKUs) && contract.selectedSKUs.length > 0 ? contract.selectedSKUs[0] : contract.sku,
              palletization: contract.palletizedType,
            }];

      contractItems.forEach((item: any, index: number) => {
        rows.push({
          id: item.itemId || item.id || `${contract.id}-${index}`,
          contractId: contract.id,
          customerName: contract.customerName || '--',
          weekNumber: String(contract.weekNumber || '--'),
          ps: String(item.ps || index + 1),
          shippingLine: item.shippingLine || contract.shippingLine || '--',
          bookingNo: item.bookingNo || contract.bookingNo || '--',
          containerNo: item.containerNo || '--',
          atwStatus: item.atwStatus || 'PENDING',
          status: normalizeCuttingOrderStatus(item.status || item.atwStatus),
          pod: item.pod || contract.pod || '--',
          cutOffDate: formatDisplayDate(item.cutOffDate || contract.cutOffDate),
          etd: formatDisplayDate(item.etd || contract.etd),
          sku: item.sku || contract.sku || '--',
          palletization: item.palletization || contract.palletizedType || '--',
        });
      });
    });

    return rows;
  }, [contracts]);

  const cuttingOrderStatusCounts = useMemo(() => {
    return {
      active: cuttingOrderRows.filter((row) => row.status !== 'EMPTY' && row.status !== 'DEPART').length,
      depart: cuttingOrderRows.filter((row) => row.status === 'DEPART').length,
      total: cuttingOrderRows.length,
    };
  }, [cuttingOrderRows]);

  const totalTonnageScheduled = useMemo(() => {
    return cuttingOrderRows.reduce((acc, row: any) => acc + (Number(row.totalVans ?? row.qty ?? 0) || 0), 0);
  }, [cuttingOrderRows]);

  const filteredCuttingOrderRows = useMemo(() => {
    return cuttingOrderRows.filter((row) => {
      const matchesWeek = weekFilter === 'all' || row.weekNumber === weekFilter;
      const matchesCustomer = customerFilter === 'all' || row.customerName === customerFilter;
      return matchesWeek && matchesCustomer;
    });
  }, [cuttingOrderRows, weekFilter, customerFilter]);

  const cuttingOrderRowKey = (row: CuttingOrderListRow) => `${row.contractId}:${row.id}`;

  const selectedFilteredCuttingOrderRows = useMemo(() => {
    return filteredCuttingOrderRows.filter((row) => selectedCuttingOrderKeys.includes(cuttingOrderRowKey(row)));
  }, [filteredCuttingOrderRows, selectedCuttingOrderKeys]);

  const allFilteredCuttingOrdersSelected = filteredCuttingOrderRows.length > 0 && selectedFilteredCuttingOrderRows.length === filteredCuttingOrderRows.length;
  const someFilteredCuttingOrdersSelected = selectedFilteredCuttingOrderRows.length > 0 && !allFilteredCuttingOrdersSelected;

  const selectedContract = useMemo(() => {
    return (contracts || []).find((contract: any) => contract.id === selectedContractId) || null;
  }, [contracts, selectedContractId]);

  const selectedLoadingAdviceRow = useMemo(() => {
    if (!selectedContractId) return null;
    return loadingAdviceRows.find((row) => row.contractId === selectedContractId) || null;
  }, [loadingAdviceRows, selectedContractId]);

  const drTotalBoxes = useMemo(() => {
    return drRows.reduce((acc, row) => {
      const quantity = Number(row.quantity) || 0;
      const totalBoxes = Number(row.totalBoxes) || 0;
      return acc + (quantity || totalBoxes);
    }, 0);
  }, [drRows]);

  const bookingListRows = useMemo<BookingListRow[]>(() => {
    const rows: BookingListRow[] = [];

    (bookings || []).forEach((batch: any) => {
      const batchRows = Array.isArray(batch.items) && batch.items.length > 0
        ? batch.items
        : Array.isArray(batch.rows) && batch.rows.length > 0
          ? batch.rows
          : [{
              bookingNumber: batch.bookingNumber,
              laId: batch.laId,
              shippingLine: batch.shippingLine,
              vesselName: batch.vesselName,
              pod: batch.pod,
            }];

      batchRows.forEach((row: any, index: number) => {
        rows.push({
          id: row.bookingId || row.id || `${batch.id}-${index}`,
          batchId: batch.id,
          laId: row.laId || batch.laId || '',
          bookingNumber: row.bookingNumber || '--',
          shippingLine: row.shippingLine || batch.shippingLine || '--',
          vesselName: row.vesselName || batch.vesselName || '--',
          pod: row.pod || batch.pod || '--',
          customerName: batch.customerName || '--',
          weekNumber: String(batch.weekNumber || '--'),
        });
      });
    });

    return rows;
  }, [bookings]);

  const bookingNumberOptions = useMemo(() => {
    const uniqueNumbers = new Set<string>();
    bookingListRows.forEach((row) => {
      if (row.bookingNumber && row.bookingNumber !== '--') {
        uniqueNumbers.add(row.bookingNumber);
      }
    });
    return Array.from(uniqueNumbers).sort((a, b) => a.localeCompare(b));
  }, [bookingListRows]);

  const filteredBookingRows = useMemo(() => {
    return bookingListRows.filter((row) => {
      const matchesWeek = weekFilter === 'all' || row.weekNumber === weekFilter;
      const matchesCustomer = customerFilter === 'all' || row.customerName === customerFilter;
      return matchesWeek && matchesCustomer;
    });
  }, [bookingListRows, weekFilter, customerFilter]);

  const bookingShippingLineOptions = useMemo(() => {
    return Array.from(
      new Set(
        (bookings || [])
          .flatMap((batch: any) => [batch.shippingLine, ...(Array.isArray(batch.items) ? batch.items.map((item: any) => item.shippingLine) : [])])
          .filter(Boolean)
      )
    ) as string[];
  }, [bookings]);

  const bookingVesselOptions = useMemo(() => {
    return Array.from(
      new Set(
        (bookings || [])
          .flatMap((batch: any) => [batch.vesselName, ...(Array.isArray(batch.items) ? batch.items.map((item: any) => item.vesselName) : [])])
          .filter(Boolean)
      )
    ) as string[];
  }, [bookings]);

  const containerNumberOptions = useMemo(() => {
    return Array.from(
      new Set(
        (trips || [])
          .flatMap((trip: any) => {
            const containers = Array.isArray(trip?.items)
              ? trip.items.map((item: any) => item?.containerNo)
              : [];
            return [trip?.containerNo, ...containers];
          })
          .filter(Boolean)
      )
    ) as string[];
  }, [trips]);

  const filteredLoadingAdviceRows = useMemo(() => {
    return loadingAdviceRows.filter((row) => {
      const matchesWeek = weekFilter === 'all' || row.weekNumber === weekFilter;
      const matchesCustomer = customerFilter === 'all' || row.customerName === customerFilter;
      return matchesWeek && matchesCustomer;
    });
  }, [loadingAdviceRows, weekFilter, customerFilter]);

  const readyLoadingAdviceOptions = useMemo(() => {
    return (contracts || []).filter((contract: any) => {
      const stage = normalizeLoadingAdviceWorkflowStage(contract.workflowStage);
      return stage === 'READY_FOR_BOOKING' || stage === 'BOOKINGS_CREATED';
    });
  }, [contracts]);

  const readyForBookingLoadingAdviceRows = useMemo(() => {
    return (contracts || [])
      .filter((contract: any) => {
        const stage = normalizeLoadingAdviceWorkflowStage(contract.workflowStage);
        return stage === 'READY_FOR_BOOKING' || stage === 'BOOKINGS_CREATED';
      })
      .map((contract: any) => ({
        id: contract.id,
        contractId: contract.contractId || contract.id,
        customerName: contract.customerName || '--',
        weekNumber: String(contract.weekNumber || '--'),
        shippingLine: contract.shippingLine || '--',
        pod: contract.pod || '--',
        totalVans: String(contract.totalVans ?? '--'),
        workflowStage: normalizeLoadingAdviceWorkflowStage(contract.workflowStage),
      }));
  }, [contracts]);

  const selectedCosSourceRows = useMemo(() => {
    if (!selectedContract) return [];
    if (Array.isArray(selectedContract.cuttingOrders) && selectedContract.cuttingOrders.length > 0) {
      return selectedContract.cuttingOrders;
    }
    if (Array.isArray(selectedContract.items) && selectedContract.items.length > 0) {
      return selectedContract.items;
    }
    return [];
  }, [selectedContract]);

  const filteredTrips = useMemo(() => {
    return (trips || []).filter((trip: any) => {
      const tripStatus = String(trip?.status || 'ACTIVE').toUpperCase();
      const matchesStatus =
        tripStatusFilter === 'all' ||
        (tripStatusFilter === 'shipped' && (tripStatus === 'DEPART' || tripStatus === 'SHIPPED'));
      return matchesStatus;
    });
  }, [trips, tripStatusFilter]);

  useEffect(() => {
    setVlsSavedTripIds(
      Array.isArray(trips)
        ? trips
            .filter((trip: any) => Boolean(trip?.vlsCreated || trip?.vlsManifest))
            .map((trip: any) => trip.id)
        : []
    );
  }, [trips]);

  const cosAllocationRows = useMemo(() => {
    if (Array.isArray(selectedContract?.items) && selectedContract.items.length > 0) {
      return selectedContract.items;
    }
    return selectedCosSourceRows;
  }, [selectedContract, selectedCosSourceRows]);

  const cosSummary = useMemo(() => {
    const summary: Record<string, { allocated: number; total: number }> = {};
    cosAllocationRows.forEach((row: any) => {
      const pod = row.pod || 'UNKNOWN';
      const total = Number(row.totalVans ?? row.total ?? 0);
      if (!summary[pod]) {
        summary[pod] = { allocated: 0, total: 0 };
      }
      summary[pod].total += total;
    });

    cosRows.forEach((row) => {
      const pod = row.pod || 'UNKNOWN';
      if (!summary[pod]) {
        summary[pod] = { allocated: 0, total: 0 };
      }
      summary[pod].allocated += 1;
    });

    return Object.entries(summary).map(([pod, value]) => ({
      pod,
      allocated: value.allocated,
      total: value.total,
    }));
  }, [cosAllocationRows, cosRows]);

  const totalCosAllocation = useMemo(() => {
    return cosRows.length;
  }, [cosRows]);

  const openCosModal = (sourceContract: any = selectedLoadingAdviceRow || selectedContract) => {
    const sourceContractId = sourceContract?.contractId || sourceContract?.laId || sourceContract?.id || '';
    const resolvedContract =
      (sourceContract?.cuttingOrders ? sourceContract : null) ||
      (sourceContractId ? (contracts || []).find((contract: any) => contract.id === sourceContractId) : null) ||
      selectedLoadingAdviceRow ||
      selectedContract ||
      (filteredLoadingAdviceRows.length === 1 ? filteredLoadingAdviceRows[0] : null);

    if (!resolvedContract) {
      toast({
        variant: 'destructive',
        title: 'Select an LA',
        description: 'Please select a loading advice record first.',
      });
      return;
    }

    const savedRows = Array.isArray(resolvedContract.cuttingOrders) && resolvedContract.cuttingOrders.length > 0
      ? resolvedContract.cuttingOrders
      : Array.isArray(resolvedContract.items) && resolvedContract.items.length > 0
        ? resolvedContract.items
        : [];
    const totalRows = Math.max(Number(resolvedContract.totalVans || 0) || savedRows.length || 1, savedRows.length || 1);
    const sourceRows = Array.from({ length: totalRows }, (_, index) => savedRows[index] || null);
    const sourcePod =
      resolvedContract.pod ||
      sourceRows.find((row: any) => row?.pod)?.pod ||
      '';
    setCosHeader({
      customerName: resolvedContract.customerName || '',
      weekNumber: String(resolvedContract.weekNumber || ''),
      pod: sourcePod,
      laId: resolvedContract.contractId || resolvedContract.id,
    });
    setCosRows(
      sourceRows.map((row: any, index: number) =>
        row
          ? {
              id: row.id || row.itemId || Math.random().toString(36).substr(2, 9),
              ps: String(row.ps || index + 1),
              shippingLine: row.shippingLine || resolvedContract.shippingLine || '',
              bookingNumber: row.bookingNumber || '',
              containerNo: row.containerNo || '',
              atwStatus: (row.atwStatus || 'PENDING') as 'PENDING' | 'READY' | 'LOADED',
              pod: row.pod || sourcePod || '',
              cutOffDate: row.cutOffDate || resolvedContract.cutOffDate || '',
              etd: row.etd || resolvedContract.etd || '',
              sku: row.sku || (Array.isArray(resolvedContract.selectedSKUs) ? resolvedContract.selectedSKUs[0] : '') || '',
              palletization: row.palletization || resolvedContract.palletizedType || 'Palletized',
            }
          : createEmptyCOSRow(String(index + 1), sourcePod)
      )
    );
    setIsCosModalOpen(true);
  };

  const openBookingBatchModal = (sourceContract: any = null) => {
    const sourceContractId = sourceContract?.id || sourceContract?.contractId || sourceContract?.laId || '';
    const resolvedContract =
      (sourceContract?.cuttingOrders ? sourceContract : null) ||
      (sourceContractId ? (contracts || []).find((contract: any) => contract.id === sourceContractId) : null) ||
      selectedContract ||
      readyLoadingAdviceOptions[0] ||
      null;

    if (resolvedContract) {
      const stage = normalizeLoadingAdviceWorkflowStage(resolvedContract.workflowStage);
      if (stage !== 'READY_FOR_BOOKING' && stage !== 'BOOKINGS_CREATED') {
        toast({
          variant: 'destructive',
          title: 'LA not ready',
          description: 'Finalize the cutting orders first and mark the loading advice as ready for booking.',
        });
        return;
      }
    }

    if (!resolvedContract) {
      toast({
        variant: 'destructive',
        title: 'No approved loading advice',
        description: 'Please finalize a loading advice before creating bookings.',
      });
      return;
    }

    setBookingHeader({
      laId: resolvedContract?.contractId || resolvedContract?.id || '',
      customerName: resolvedContract?.customerName || '',
      weekNumber: String(resolvedContract?.weekNumber || ''),
      receivedAt: format(new Date(), 'yyyy-MM-dd'),
    });
    setBookingRows([{
      ...createEmptyBookingRow(),
      laId: resolvedContract?.contractId || resolvedContract?.id || '',
    }]);
    setIsNewBookingOpen(true);
  };

  const handleBookingLaSelection = (laId: string) => {
    const selectedLa = (contracts || []).find((contract: any) => contract.id === laId);
    setBookingHeader((current) => ({
      ...current,
      laId,
      customerName: selectedLa?.customerName || '',
      weekNumber: String(selectedLa?.weekNumber || ''),
    }));
    setBookingRows((current) => current.map((row) => ({ ...row, laId })));
  };

  const handleFinalizeLoadingAdviceForBooking = async (sourceContract: any = selectedContract || selectedLoadingAdviceRow) => {
    if (!db) return;

    const sourceContractId = sourceContract?.contractId || sourceContract?.laId || sourceContract?.id || '';
    const resolvedContract =
      (sourceContract?.cuttingOrders ? sourceContract : null) ||
      (sourceContractId ? (contracts || []).find((contract: any) => contract.id === sourceContractId) : null) ||
      selectedContract ||
      (selectedContractId ? (contracts || []).find((contract: any) => contract.id === selectedContractId) : null);

    if (!resolvedContract) {
      toast({
        variant: 'destructive',
        title: 'Select a loading advice',
        description: 'Please select a loading advice record first.',
      });
      return;
    }

    const cuttingOrders = Array.isArray(resolvedContract.cuttingOrders) ? resolvedContract.cuttingOrders : [];
    if (cuttingOrders.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No cutting orders found',
        description: 'Create at least one cutting order before finalizing the loading advice.',
      });
      return;
    }

    try {
      setIsFinalizingLoadingAdvice(true);
      await updateDoc(doc(db, CONTRACT_PATH, resolvedContract.id), {
        workflowStage: 'READY_FOR_BOOKING',
        status: 'active',
        cuttingOrdersFinalizedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: 'Loading Advice Finalized',
        description: 'The loading advice is now ready for booking.',
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Finalize Failed', description: err.message });
    } finally {
      setIsFinalizingLoadingAdvice(false);
    }
  };

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  const openDrModal = () => {
    if (!selectedTripForTransfer) {
      toast({ variant: 'destructive', title: 'Select a trip', description: 'Please choose a trip before creating a DR.' });
      return;
    }
    setIsTransferModalOpen(false);
    setIsDrModalOpen(true);
  };

  // AI Extraction Logic
  const handleExtract = async () => {
    if (!aiText.trim()) return;
    setIsExtracting(true);
    try {
      const result = await extractContractData({ text: aiText });
      if (result) {
        setNewLAHeader({
          ...newLAHeader,
          customerName: result.header.customerName || '',
          weekNumber: result.header.weekNumber || '',
          senderEmail: result.header.senderEmail || '',
          subject: result.header.subject || ''
        });
        setLaRows(result.items.map(item => ({
          id: Math.random().toString(36).substr(2, 9),
          farm: result.header.farm || '',
          pol: result.header.pol || '',
          pod: item.pod || '',
          shippingLine: item.shippingLines || '',
          cutOffDate: item.etd || '',
          etd: item.etd || '',
          totalVans: item.total || 0,
          sku: item.customerContractNumber || item.specs || '',
          palletization: item.palletized || '',
        })));
        toast({ title: "Extraction Complete", description: "Successfully parsed contract details." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Extraction Failed", description: err.message });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveLA = async () => {
    if (!db) return;
    if (!newLAHeader.customerName || !newLAHeader.weekNumber) {
      toast({ variant: "destructive", title: "Validation Error", description: "Customer and Week Number are required." });
      return;
    }

    try {
      const contractId = `LA-${Date.now()}`;
      const normalizedRows = laRows.map((row, index) => ({
        itemId: row.id || `${contractId}-${index}`,
        farm: row.farm || '',
        pol: row.pol || '',
        pod: row.pod || '',
        shippingLine: row.shippingLine || '',
        cutOffDate: row.cutOffDate || '',
        etd: row.etd || '',
        totalVans: Number(row.totalVans || 0),
        sku: row.sku || '',
        palletization: row.palletization || '',
      }));
      const totalVans = normalizedRows.reduce((acc, row) => acc + row.totalVans, 0);

      await setDoc(doc(db, CONTRACT_PATH, contractId), {
        contractId,
        ...newLAHeader,
        status: 'pending',
        workflowStage: 'LA_CREATED',
        receivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        totalVans,
        itemCount: normalizedRows.length,
        farm: normalizedRows[0]?.farm || '',
        pol: normalizedRows[0]?.pol || '',
        pod: normalizedRows[0]?.pod || '',
        shippingLine: normalizedRows[0]?.shippingLine || '',
        cutOffDate: normalizedRows[0]?.cutOffDate || '',
        etd: normalizedRows[0]?.etd || '',
        palletizedType: normalizedRows[0]?.palletization || '',
        selectedSKUs: normalizedRows.filter(row => row.sku).map(row => row.sku),
        items: normalizedRows,
      });

      const existingItems = await getDocs(collection(db, `${CONTRACT_PATH}/${contractId}/items`));
      const batch = writeBatch(db);
      existingItems.docs.forEach((snapshot) => batch.delete(snapshot.ref));
      normalizedRows.forEach((row) => {
        const itemRef = doc(collection(db, `${CONTRACT_PATH}/${contractId}/items`));
        batch.set(itemRef, { ...row, itemId: itemRef.id, updatedAt: serverTimestamp() });
      });
      await batch.commit();

      toast({ title: "Loading Advice Saved", description: "New LA batch successfully recorded." });
      setIsNewLAOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error Saving", description: err.message });
    }
  };

  const handleSaveBooking = async () => {
    if (!db) return;
    if (!bookingHeader.laId || !bookingHeader.customerName || !bookingHeader.weekNumber) {
      toast({ variant: "destructive", title: "Validation Error", description: "Loading Advice, Customer, and Week No are required." });
      return;
    }

    const sourceContract = (contracts || []).find((contract: any) => contract.id === bookingHeader.laId);
    const sourceStage = normalizeLoadingAdviceWorkflowStage(sourceContract?.workflowStage);
    if (!sourceContract || (sourceStage !== 'READY_FOR_BOOKING' && sourceStage !== 'BOOKINGS_CREATED')) {
      toast({
        variant: 'destructive',
        title: 'LA not ready',
        description: 'Please finalize the loading advice before creating bookings.',
      });
      return;
    }

    try {
      const batchId = `BOOK-${Date.now()}`;
      const normalizedRows = bookingRows.map((row, index) => ({
        bookingId: row.id || `${batchId}-${index}`,
        laId: row.laId || bookingHeader.laId || '',
        bookingNumber: row.bookingNumber || '',
        shippingLine: row.shippingLine || '',
        vesselName: row.vesselName || '',
        pod: row.pod || '',
        attachmentUrl: row.attachmentUrl || '',
      }));
      const bookingDocRef = doc(db, BOOKING_PATH, batchId);
      const contractRef = doc(db, CONTRACT_PATH, bookingHeader.laId);
      await setDoc(bookingDocRef, {
        batchId,
        ...bookingHeader,
        laId: bookingHeader.laId || normalizedRows[0]?.laId || '',
        workflowStage: 'BOOKINGS_CREATED',
        totalBookings: normalizedRows.length,
        receivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        bookingNumber: normalizedRows[0]?.bookingNumber || '',
        bookingNumbers: Array.from(new Set(normalizedRows.map((row) => row.bookingNumber).filter(Boolean))),
        items: normalizedRows,
        shippingLine: normalizedRows[0]?.shippingLine || '',
        vesselName: normalizedRows[0]?.vesselName || '',
        pod: normalizedRows[0]?.pod || '',
      });

      const batch = writeBatch(db);
      normalizedRows.forEach(row => {
        const rowRef = doc(collection(db, `${BOOKING_PATH}/${batchId}/rows`));
        batch.set(rowRef, { ...row, bookingId: rowRef.id, updatedAt: serverTimestamp() });
      });
      batch.update(contractRef, {
        workflowStage: 'BOOKINGS_CREATED',
        bookingBatchIds: [...new Set([...(Array.isArray(sourceContract.bookingBatchIds) ? sourceContract.bookingBatchIds : []), batchId])],
        bookingNumbers: Array.from(
          new Set([
            ...(Array.isArray(sourceContract.bookingNumbers) ? sourceContract.bookingNumbers : []),
            ...normalizedRows.map((row) => row.bookingNumber).filter(Boolean),
          ])
        ),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();

      toast({ title: "Booking Saved", description: "New booking batch recorded." });
      setIsNewBookingOpen(false);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error Saving", description: err.message });
    }
  };

  const handleSaveCOS = async () => {
    if (!db || !selectedContract) return;
    try {
      const normalizedRows = cosRows.map((row, index) => ({
        itemId: row.id || `${selectedContract.id}-cos-${index}`,
        ps: row.ps || String(index + 1),
        shippingLine: row.shippingLine || '',
        bookingNumber: row.bookingNumber || '',
        containerNo: row.containerNo || '',
        atwStatus: row.atwStatus || 'PENDING',
        pod: row.pod || '',
        cutOffDate: row.cutOffDate || '',
        etd: row.etd || '',
        sku: row.sku || '',
        palletization: normalizePalletization(row.palletization),
      }));

      const batch = writeBatch(db);
      const existingCosDocs = await getDocs(collection(db, `${CONTRACT_PATH}/${selectedContract.id}/cutting_orders`));
      existingCosDocs.docs.forEach((snapshot) => batch.delete(snapshot.ref));

      normalizedRows.forEach((row) => {
        const rowRef = doc(collection(db, `${CONTRACT_PATH}/${selectedContract.id}/cutting_orders`));
        batch.set(rowRef, { ...row, bookingId: rowRef.id, updatedAt: serverTimestamp() });
      });

      batch.update(doc(db, CONTRACT_PATH, selectedContract.id), {
        cuttingOrders: normalizedRows,
        cuttingOrderTotal: normalizedRows.length,
        cuttingOrdersUpdatedAt: serverTimestamp(),
        workflowStage: 'COS_CREATED',
        status: 'active',
      });

      await batch.commit();

      toast({
        title: 'COS Saved',
        description: `Cutting orders for ${selectedContract.contractId || selectedContract.id} were saved successfully.`,
      });
      setIsCosModalOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error Saving COS', description: err.message });
    }
  };

  const addLARow = () => setLaRows([...laRows, createEmptyLARow()]);
  const addBookingRow = () => setBookingRows([...bookingRows, createEmptyBookingRow()]);

  const addTripRow = () => {
    setTripRows([...tripRows, {
      id: Math.random().toString(36).substr(2, 9),
      ps: (tripRows.length + 1).toString(),
      containerNo: '', vanNo: '', sealNo: '',
      atwStatus: 'Y', atwReleased: format(new Date(), 'yyyy-MM-dd'),
      pmNo: '', driverName: '', signature: 'Pending',
      dateWithdrawn: format(new Date(), 'yyyy-MM-dd')
    }]);
  };

  const updateTripRow = (id: string, updates: Partial<TripRow>) => {
    setTripRows(tripRows.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeTripRow = (id: string) => {
    if (tripRows.length > 1) setTripRows(tripRows.filter(r => r.id !== id));
  };

  const handleNextTripStep = () => {
    if (!newTripHeader.customerName || !newTripHeader.weekNumber || !newTripHeader.pod) {
      toast({ variant: "destructive", title: "Missing Header", description: "Please complete the customer, week, and POD details." });
      return;
    }
    
    const mockItems: CORow[] = [{
      id: `MOCK-${Date.now()}-1`,
      ps: '1',
    pod: newTripHeader.pod || 'SHA',
      status: 'PENDING',
      cutOffDate: format(new Date(), 'yyyy-MM-dd'),
      etd: format(new Date(), 'yyyy-MM-dd'),
      taskDate: format(new Date(), 'yyyy-MM-dd'),
      sku: 'SKU-001',
      palletization: 'PALLETIZE',
      containerNo: '',
      shippingLine: newTripHeader.shippingLine || '',
      bookingNo: newTripHeader.bookingNo || '',
      atwStatus: 'PENDING'
    }];

    setBindCoRows(mockItems);
    setTripStep(2);
  };

  const handleSubmitTripBatch = async () => {
    if (!db) return;
    try {
      const normalizedCuttingOrders = bindCoRows.map((row, index) => ({
        itemId: row.id || `CO-${Date.now()}-${index}`,
        ps: row.ps || String(index + 1),
        pod: row.pod || newTripHeader.pod || '',
        status: normalizeCuttingOrderStatus(row.status),
        cutOffDate: row.cutOffDate || '',
        etd: row.etd || '',
        taskDate: row.taskDate || '',
        sku: row.sku || '',
        palletization: row.palletization || '',
        containerNo: row.containerNo || '',
        shippingLine: row.shippingLine || newTripHeader.shippingLine || '',
        bookingNo: row.bookingNo || newTripHeader.bookingNo || '',
        bookingBatchId: newTripHeader.bookingBatchId || '',
        laId: newTripHeader.laId || '',
        atwStatus: row.atwStatus || 'PENDING',
      }));

      const batch = writeBatch(db);
      tripRows.forEach((row, index) => {
        const uniqueId = `TRIP-${Date.now()}-${index}`;
        const docRef = doc(db, TRIP_PATH, uniqueId);
        batch.set(docRef, {
          tripId: uniqueId,
          laId: newTripHeader.laId || '',
          bookingNo: newTripHeader.bookingNo || '',
          bookingBatchId: newTripHeader.bookingBatchId || '',
          bookingNumbers: newTripHeader.bookingNo ? [newTripHeader.bookingNo] : [],
          vanNo: row.vanNo,
          pmNo: row.pmNo,
          containerNo: row.containerNo,
          sealNo: row.sealNo,
          driver: row.driverName,
          dateAtwReleased: row.atwReleased,
          dateWithdrawn: row.dateWithdrawn,
          customerName: newTripHeader.customerName,
          weekNumber: newTripHeader.weekNumber,
          shippingLine: newTripHeader.shippingLine,
          pod: newTripHeader.pod,
          status: 'ACTIVE',
          workflowStage: 'TRIP_CREATED',
          cuttingOrders: normalizedCuttingOrders,
          cuttingOrderTotal: normalizedCuttingOrders.length,
          updatedAt: serverTimestamp()
        });

        normalizedCuttingOrders.forEach((cuttingOrder) => {
          const cuttingOrderRef = doc(collection(db, `${TRIP_PATH}/${uniqueId}/cutting_orders`));
          batch.set(cuttingOrderRef, {
            ...cuttingOrder,
            itemId: cuttingOrderRef.id,
            tripId: uniqueId,
            updatedAt: serverTimestamp(),
          });
        });
      });
      await batch.commit();
      toast({ title: "Trips Created", description: "Successfully logged new trip batch." });
      setIsNewTripOpen(false);
      setTripStep(1);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const updateTripStatus = async (
    trip: any,
    nextStatus: 'DEPART' | 'SHIPPED',
    options: { updateCuttingOrders?: boolean; title: string; description: string }
  ) => {
    if (!db) return;

    try {
      const batch = writeBatch(db);
      const tripRef = doc(db, TRIP_PATH, trip.id);
      const payload: any = {
        status: nextStatus,
        workflowStage: nextStatus === 'SHIPPED' ? 'VESSEL_MARKED_SHIPPED' : 'CONTAINER_DEPARTED',
        updatedAt: serverTimestamp(),
      };

      if (options.updateCuttingOrders) {
        const updatedCuttingOrders = Array.isArray(trip?.cuttingOrders)
          ? trip.cuttingOrders.map((row: any) => ({
              ...row,
              status: nextStatus,
            }))
          : [];

        payload.cuttingOrders = updatedCuttingOrders;
        payload.cuttingOrdersUpdatedAt = serverTimestamp();

        const cuttingOrderDocs = await getDocs(collection(db, `${TRIP_PATH}/${trip.id}/cutting_orders`));
        cuttingOrderDocs.docs.forEach((snapshot) => {
          batch.update(snapshot.ref, {
            status: nextStatus,
            updatedAt: serverTimestamp(),
          });
        });
      }

      batch.update(tripRef, payload);
      await batch.commit();

      toast({
        title: options.title,
        description: options.description,
      });
      setTripStatusFilter('shipped');
    } catch (err: any) {
      toast({ variant: 'destructive', title: `${options.title} Failed`, description: err.message });
    }
  };

  const handleDispatchTrip = async (trip: any) => {
    await updateTripStatus(trip, 'DEPART', {
      updateCuttingOrders: true,
      title: 'Dispatched',
      description: 'All associated cutting orders were moved to DEPART.',
    });
  };

  const handleShipTrip = async (trip: any) => {
    await updateTripStatus(trip, 'SHIPPED', {
      updateCuttingOrders: false,
      title: 'Shipped',
      description: 'Trip status updated to SHIPPED.',
    });
  };

  const toggleTripExpanded = (tripId: string) => {
    setExpandedTripIds((current) =>
      current.includes(tripId) ? current.filter((id) => id !== tripId) : [...current, tripId]
    );
  };

  const getTripCuttingOrders = (trip: any) => {
    return Array.isArray(trip?.cuttingOrders) && trip.cuttingOrders.length > 0
      ? trip.cuttingOrders
      : [];
  };

  const getNextTripOrderStatus = (status: string) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'PENDING') return 'IN-PROCESS';
    if (normalized === 'IN-PROCESS') return 'AVAILABLE';
    if (normalized === 'AVAILABLE') return 'DEPART';
    return 'PENDING';
  };

  const persistCuttingOrderContractRows = async (contractId: string, rows: CuttingOrderListRow[]) => {
    if (!db) return;

    const normalizedRows = rows.map((item) => ({
      itemId: item.id,
      ps: item.ps,
      shippingLine: item.shippingLine,
      bookingNo: item.bookingNo,
      containerNo: item.containerNo,
      atwStatus: item.atwStatus,
      status: item.status,
      pod: item.pod,
      cutOffDate: item.cutOffDate,
      etd: item.etd,
      sku: item.sku,
      palletization: item.palletization,
    }));

    const batch = writeBatch(db);
    const contractRef = doc(db, CONTRACT_PATH, contractId);

    batch.update(contractRef, {
      cuttingOrders: normalizedRows,
      cuttingOrdersUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const existingRows = await getDocs(collection(db, `${CONTRACT_PATH}/${contractId}/cutting_orders`));
    existingRows.docs.forEach((snapshot) => batch.delete(snapshot.ref));

    normalizedRows.forEach((item) => {
      const rowRef = doc(collection(db, `${CONTRACT_PATH}/${contractId}/cutting_orders`));
      batch.set(rowRef, {
        ...item,
        itemId: rowRef.id,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  };

  const handleChangeTripOrderStatus = async (trip: any, order: any) => {
    const nextStatus = getNextTripOrderStatus(order.status);
    const updatedOrders = getTripCuttingOrders(trip).map((item: any) =>
      (item.itemId || item.id) === (order.itemId || order.id)
        ? { ...item, status: nextStatus }
        : item
    );

    try {
      if (db) {
        const batch = writeBatch(db);
        const tripRef = doc(db, TRIP_PATH, trip.id);
        batch.update(tripRef, {
          cuttingOrders: updatedOrders,
          cuttingOrdersUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const rowQuery = await getDocs(collection(db, `${TRIP_PATH}/${trip.id}/cutting_orders`));
        rowQuery.docs.forEach((snapshot) => {
          const snapshotData = snapshot.data() as any;
          if ((snapshotData.itemId || snapshotData.id) === (order.itemId || order.id)) {
            batch.update(snapshot.ref, {
              status: nextStatus,
              updatedAt: serverTimestamp(),
            });
          }
        });

        await batch.commit();
      }

      toast({
        title: 'Status Updated',
        description: `Associated cutting order moved to ${nextStatus}.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    }
  };

  const openEditCuttingOrderModal = (row: CuttingOrderListRow) => {
    setSelectedCuttingOrderForEdit(row);
    setCuttingOrderEditDraft({
      ps: row.ps || '',
      pod: row.pod || '',
      cutOffDate: row.cutOffDate || '',
      etd: row.etd || '',
      sku: row.sku || '',
      palletization: row.palletization || '',
      atwStatus: row.atwStatus || 'PENDING',
      status: normalizeCuttingOrderStatus(row.status),
    });
    setIsEditCuttingOrderModalOpen(true);
  };

  const handleSaveCuttingOrderEdit = async () => {
    if (!selectedCuttingOrderForEdit) return;

    try {
      const updatedRows = cuttingOrderRows.map((item) =>
        item.contractId === selectedCuttingOrderForEdit.contractId && item.id === selectedCuttingOrderForEdit.id
          ? {
              ...item,
              ps: cuttingOrderEditDraft.ps,
              pod: cuttingOrderEditDraft.pod,
              cutOffDate: cuttingOrderEditDraft.cutOffDate,
              etd: cuttingOrderEditDraft.etd,
              sku: cuttingOrderEditDraft.sku,
              palletization: cuttingOrderEditDraft.palletization,
              atwStatus: cuttingOrderEditDraft.atwStatus as CuttingOrderListRow['atwStatus'],
              status: normalizeCuttingOrderStatus(cuttingOrderEditDraft.status),
            }
          : item
      );

      await persistCuttingOrderContractRows(
        selectedCuttingOrderForEdit.contractId,
        updatedRows.filter((item) => item.contractId === selectedCuttingOrderForEdit.contractId)
      );

      toast({
        title: 'Cutting Order Updated',
        description: 'The cutting order details were saved successfully.',
      });
      setIsEditCuttingOrderModalOpen(false);
      setSelectedCuttingOrderForEdit(null);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: err.message });
    }
  };

  const openBulkCuttingStatusModal = () => {
    if (selectedFilteredCuttingOrderRows.length === 0) return;
    setBulkCuttingStatus(selectedFilteredCuttingOrderRows[0]?.status || 'EMPTY');
    setIsBulkCuttingStatusModalOpen(true);
  };

  const handleSaveBulkCuttingStatus = async () => {
    if (selectedFilteredCuttingOrderRows.length === 0) return;

    try {
      const affectedContractIds = Array.from(new Set(selectedFilteredCuttingOrderRows.map((row) => row.contractId)));

      for (const contractId of affectedContractIds) {
        const rowsForContract = cuttingOrderRows
          .map((item) =>
            selectedCuttingOrderKeys.includes(cuttingOrderRowKey(item))
              ? { ...item, status: bulkCuttingStatus }
              : item
          )
          .filter((item) => item.contractId === contractId);

        await persistCuttingOrderContractRows(contractId, rowsForContract);
      }

      toast({
        title: 'Status Updated',
        description: `Updated ${selectedFilteredCuttingOrderRows.length} cutting order${selectedFilteredCuttingOrderRows.length > 1 ? 's' : ''}.`,
      });
      setIsBulkCuttingStatusModalOpen(false);
      setSelectedCuttingOrderKeys([]);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Bulk Update Failed', description: err.message });
    }
  };

  const closeTransferModal = (preserveTrip = false) => {
    setIsTransferModalOpen(false);
    if (!preserveTrip) {
      setSelectedTripForTransfer(null);
    }
    setTransferInspection({
      inboundDriverName: '',
      outboundDriverName: '',
      temperature: false,
      noLeaks: false,
      checkDrainPlug: false,
      noOdor: false,
      photos: [],
    });
  };

  const handleTransferPhotoPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) return;

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No images selected',
        description: 'Please choose an image file to attach.',
      });
      return;
    }

    const readFileAsDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        reader.readAsDataURL(file);
      });

    try {
      const nextPhotos = await Promise.all(imageFiles.map(readFileAsDataUrl));
      setTransferInspection((current) => {
        const mergedPhotos = [...current.photos, ...nextPhotos].slice(0, 5);
        return { ...current, photos: mergedPhotos };
      });

      toast({
        title: 'Photo added',
        description: imageFiles.length === 1 ? '1 image attached to the transfer form.' : `${imageFiles.length} images attached to the transfer form.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err?.message || 'Unable to read the selected image.',
      });
    }
  };

  const handleSaveTransfer = async () => {
    if (!db || !selectedTripForTransfer) return;

    try {
      const tripRef = doc(db, TRIP_PATH, selectedTripForTransfer.id);
      const payload = {
        transferInspection: {
          ...transferInspection,
        },
        transferPhotos: transferInspection.photos,
        workflowStage: 'TRANSFER_COMPLETED',
        updatedAt: serverTimestamp(),
      };

      await setDoc(tripRef, payload, { merge: true });

      toast({
        title: 'Manifest Saved',
        description: 'Transfer inspection data has been recorded.',
      });
      closeTransferModal();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    }
  };

  useEffect(() => {
    if (!isTransferModalOpen || !selectedTripForTransfer) return;
    const savedInspection = selectedTripForTransfer.transferInspection || {};
    setTransferInspection({
      inboundDriverName: savedInspection.inboundDriverName || selectedTripForTransfer.driver || '',
      outboundDriverName: savedInspection.outboundDriverName || '',
      temperature: Boolean(savedInspection.temperature),
      noLeaks: Boolean(savedInspection.noLeaks),
      checkDrainPlug: Boolean(savedInspection.checkDrainPlug),
      noOdor: Boolean(savedInspection.noOdor),
      photos: Array.isArray(savedInspection.photos)
        ? savedInspection.photos
        : Array.isArray(selectedTripForTransfer.transferPhotos)
          ? selectedTripForTransfer.transferPhotos
          : [],
    });
  }, [isTransferModalOpen, selectedTripForTransfer]);

  useEffect(() => {
    if (!isPreparedByModalOpen) return;

    const signatureDataUrl =
      preparedBySignatureTarget === 'dr'
        ? drVerification.preparedBy.signatureDataUrl
        : verificationData.preparedBy.signatureDataUrl;
    const raf = requestAnimationFrame(() => {
      const canvas = preparedByCanvasRef.current;
      if (!canvas) return;

      const context = canvas.getContext('2d');
      if (!context) return;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 520;
      canvas.height = rect.height || 180;

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);

      if (!signatureDataUrl) return;

      const image = new Image();
      image.onload = () => {
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      image.src = signatureDataUrl;
    });

    return () => cancelAnimationFrame(raf);
  }, [
    isPreparedByModalOpen,
    preparedBySignatureTarget,
    verificationData.preparedBy.signatureDataUrl,
    drVerification.preparedBy.signatureDataUrl,
  ]);

  const getPreparedByCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = preparedByCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const startPreparedBySignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = preparedByCanvasRef.current;
    const point = getPreparedByCanvasPoint(event);
    const context = canvas?.getContext('2d');
    if (!canvas || !context || !point) return;

    preparedByDrawingRef.current = true;
    preparedByLastPointRef.current = point;
    canvas.setPointerCapture(event.pointerId);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = '#064e3b';
    context.lineWidth = 3;
  };

  const drawPreparedBySignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!preparedByDrawingRef.current) return;
    const canvas = preparedByCanvasRef.current;
    const context = canvas?.getContext('2d');
    const currentPoint = getPreparedByCanvasPoint(event);
    const previousPoint = preparedByLastPointRef.current;
    if (!canvas || !context || !currentPoint || !previousPoint) return;

    context.beginPath();
    context.moveTo(previousPoint.x, previousPoint.y);
    context.lineTo(currentPoint.x, currentPoint.y);
    context.stroke();
    preparedByLastPointRef.current = currentPoint;
  };

  const endPreparedBySignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = preparedByCanvasRef.current;
    if (canvas) {
      try {
        canvas.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore if the pointer was already released.
      }
    }
    preparedByDrawingRef.current = false;
    preparedByLastPointRef.current = null;
  };

  const clearPreparedBySignature = () => {
    const canvas = preparedByCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (preparedBySignatureTarget === 'dr') {
      setDrVerification((current) => ({
        ...current,
        preparedBy: {
          ...current.preparedBy,
          signatureDataUrl: '',
        },
      }));
      return;
    }

    setVerificationData((current) => ({
      ...current,
      preparedBy: {
        ...current.preparedBy,
        signatureDataUrl: '',
      },
    }));
  };

  const savePreparedBySignature = () => {
    const canvas = preparedByCanvasRef.current;
    const signatureDataUrl = canvas ? canvas.toDataURL('image/png') : '';
    if (preparedBySignatureTarget === 'dr') {
      setDrVerification((current) => ({
        ...current,
        preparedBy: {
          ...current.preparedBy,
          signatureDataUrl,
        },
      }));
    } else {
      setVerificationData((current) => ({
        ...current,
        preparedBy: {
          ...current.preparedBy,
          signatureDataUrl,
        },
      }));
    }
    setIsPreparedByModalOpen(false);
  };

  const openPreparedBySignatureModal = (target: 'vls' | 'dr') => {
    setPreparedBySignatureTarget(target);
    setIsPreparedByModalOpen(true);
  };

  const openShippingDocs = (trip: any) => {
    setSelectedTripForDocs(trip);
    setIsShippingDocsModalOpen(true);
  };

  const openShippingDocUpload = (docType: string) => {
    setSelectedShippingDocUploadType(docType);
    setSelectedShippingDocFile(null);
    setIsShippingDocUploadOpen(true);
  };

  const closeShippingDocsModal = () => {
    setIsShippingDocsModalOpen(false);
    setIsShippingDocEditorOpen(false);
    setIsShippingDocUploadOpen(false);
    setSelectedTripForDocs(null);
  };

  const handleSaveShippingDocUpload = () => {
    if (!selectedShippingDocFile) {
      toast({
        variant: 'destructive',
        title: 'Select a file',
        description: 'Please choose a document to upload first.',
      });
      return;
    }

    const uploadEntry = {
      fileName: selectedShippingDocFile.name,
      fileType: selectedShippingDocFile.type,
      uploadedAt: new Date().toISOString(),
    };

    setSelectedTripForDocs((current: any) =>
      current
        ? {
            ...current,
            shippingDocUploads: {
              ...(current.shippingDocUploads || {}),
              [selectedShippingDocUploadType]: uploadEntry,
            },
          }
        : current
    );

    if (db && selectedTripForDocs?.id) {
      setDoc(
        doc(db, TRIP_PATH, selectedTripForDocs.id),
        {
          shippingDocUploads: {
            ...(selectedTripForDocs.shippingDocUploads || {}),
            [selectedShippingDocUploadType]: uploadEntry,
          },
          workflowStage: 'DOCUMENTS_UPLOADED',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ).catch((err: any) => {
        toast({ variant: 'destructive', title: 'Upload Failed', description: err.message });
      });
    }

    setIsShippingDocUploadOpen(false);
    toast({
      title: 'Upload saved',
      description: `${selectedShippingDocUploadType} attached successfully.`,
    });
  };

  const openShippingDocEditor = (docType: ShippingDocType) => {
    setSelectedShippingDocType(docType);
    const savedDraft = selectedTripForDocs?.shippingDocumentDrafts?.[docType] || {};
    const baseDraft: ShippingDocDraft = {
      title: docType,
      referenceNo: selectedTripForDocs?.tripId || selectedTripForDocs?.id || '',
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      preparedBy: selectedTripForDocs?.driver || 'Operations Team',
      recipient: selectedTripForDocs?.customerName || 'Carrier / Terminal',
      body: `Editable draft for ${docType}. Use this area to prepare the document before printing or exporting.`,
      shipperName: '',
      shipperAddress: '',
      consigneeName: '',
      consigneeAddress: '',
      notifyPartyName: '',
      notifyPartyAddress: '',
      releaseText: '',
      bookingReference: '',
      freightTerm: '',
      vesselName: selectedTripForDocs?.shippingLine || '',
      voyageNo: selectedTripForDocs?.tripId || '',
      portOfLoading: selectedTripForDocs?.pod || '',
      portOfDischarge: selectedTripForDocs?.pod || '',
      shippingMarks: '',
      description: '',
      cartons: '',
      volume: '',
      grossWeight: '',
      exporter: '',
      exporterAddress: '',
      soldTo: '',
      soldToAddress: '',
      vesselVoyage: '',
      departureDate: format(new Date(), 'yyyy-MM-dd'),
      destination: selectedTripForDocs?.pod || '',
      termsOfDelivery: '',
    };

    if (docType === 'Shipping Instruction') {
      setShippingDocDraft({
        ...baseDraft,
        shipperName: 'TAGUM AGRICULTURAL DEVELOPMENT CO., INC.',
        shipperAddress: 'Purok 18 A.O. Florendo, City of Panabo, Davao del Norte, Philippines 8105',
        consigneeName: selectedTripForDocs?.customerName || 'SHANGHAI GOODFARMER BANANA CO., LTD.',
        consigneeAddress: 'Room 1211, Building 2, No. 1800, Xinyang Road, Fengxian District, Shanghai, P.R. China',
        notifyPartyName: selectedTripForDocs?.customerName || 'SHANGHAI GOODFARMER BANANA CO., LTD.',
        notifyPartyAddress: 'Room 1211, Building 2, No. 1800, Xinyang Road, Fengxian District, Shanghai, P.R. China',
        releaseText: 'BL TYPE RELEASE',
        bookingReference: selectedTripForDocs?.bookingNo || '',
        freightTerm: 'Freight Collect',
        vesselName: selectedTripForDocs?.vessel || selectedTripForDocs?.shippingLine || 'SITC HANSHIN',
        voyageNo: selectedTripForDocs?.vanNo || 'V-2611N',
        portOfLoading: selectedTripForDocs?.shippingLine || 'DAWAO, KTC',
        portOfDischarge: selectedTripForDocs?.pod || 'SHANGHAI, CHINA',
        shippingMarks: 'GOODFARMER',
        description: 'Fresh Cavendish Bananas',
        cartons: '13,860',
        volume: '450',
        grossWeight: '200,970.00',
        ...savedDraft,
      });
      setIsShippingDocEditorOpen(true);
      return;
    }

    if (docType === "Mate's Receipt") {
      setShippingDocDraft({
        ...baseDraft,
        shipperName: 'SHANGHAI GOODFARMER BANANA CO., LTD.',
        shipperAddress: 'Room 1211, Building 2, No. 1800, Xinyang Road, Fengxian District, Shanghai, P.R. China',
        consigneeName: 'SITC HANSHIN V-2611N',
        consigneeAddress: '',
        notifyPartyName: 'SHANGHAI, CHINA',
        notifyPartyAddress: '',
        destination: 'SHANGHAI, CHINA',
        shippingMarks: 'GOODFARMER',
        description: 'Fresh Cavendish Bananas',
        cartons: '13,860',
        volume: '450',
        grossWeight: '200,970.00',
        ...savedDraft,
      });
      setIsShippingDocEditorOpen(true);
      return;
    }

    setShippingDocDraft({
      ...baseDraft,
      exporter: 'TAGUM AGRICULTURAL DEVELOPMENT COMPANY INC.',
      exporterAddress: 'Purok 18 A.O. Florendo, City of Panabo, Davao del Norte, Philippines 8105',
      soldTo: selectedTripForDocs?.customerName || 'SHANGHAI GOODFARMER BANANA CO., LTD.',
      soldToAddress: 'Room 1211, Building 2, No.1800, Xinyang Road, Fengxian District, Shanghai, P.R. China',
      vesselVoyage: `${selectedTripForDocs?.shippingLine || 'MV SITC HANSHIN'} ${selectedTripForDocs?.voyage || selectedTripForDocs?.tripId || 'V-2611N'}`,
      departureDate: format(new Date(), 'yyyy-MM-dd'),
      portOfLoading: selectedTripForDocs?.pod || 'KTC WHARF',
      portOfDischarge: selectedTripForDocs?.pod || 'SHANGHAI, CHINA',
      termsOfDelivery: 'FREE ON BOARD',
      shippingMarks: 'GOODFARMER',
      description: 'FRESH CAVENDISH BANANAS',
      cartons: '13,860',
      volume: '450',
      grossWeight: '200,970.00',
      ...savedDraft,
    });
    setIsShippingDocEditorOpen(true);
  };

  const hasExistingVls = Boolean(
    selectedTripForTransfer?.vlsCreated ||
      selectedTripForTransfer?.vlsManifest ||
      (selectedTripForTransfer?.id && vlsSavedTripIds.includes(selectedTripForTransfer.id))
  );
  const hasExistingDr = Boolean(selectedTripForTransfer?.deliveryReceipt);

  const handleSaveVls = async () => {
    if (!db || !selectedTripForTransfer) return;

    try {
      setIsSavingVls(true);
      const tripRef = doc(db, TRIP_PATH, selectedTripForTransfer.id);
      await setDoc(
        tripRef,
        {
          vlsCreated: true,
          vlsManifest: {
            ...vlsManifest,
            vlsType,
          },
          workflowStage: 'VLS_SAVED',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSelectedTripForTransfer((current: any) =>
        current
          ? {
              ...current,
              vlsCreated: true,
              vlsManifest: {
                ...vlsManifest,
                vlsType,
              },
            }
          : current
      );
      setVlsSavedTripIds((current) =>
        current.includes(selectedTripForTransfer.id) ? current : [...current, selectedTripForTransfer.id]
      );

      toast({
        title: 'VLS Saved',
        description: 'Van Loading Summary has been linked to this trip.',
      });
      setIsVlsModalOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setIsSavingVls(false);
    }
  };

  const handleSaveShippingDocDraft = async () => {
    if (!db || !selectedTripForDocs) {
      toast({
        variant: 'destructive',
        title: 'Select a trip',
        description: 'Please choose a trip before saving document drafts.',
      });
      return;
    }

    try {
      const nextDrafts = {
        ...(selectedTripForDocs.shippingDocumentDrafts || {}),
        [selectedShippingDocType]: shippingDocDraft,
      };

      await setDoc(
        doc(db, TRIP_PATH, selectedTripForDocs.id),
        {
          shippingDocumentDrafts: nextDrafts,
          workflowStage: 'DOCUMENT_DRAFT_SAVED',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSelectedTripForDocs((current: any) =>
        current
          ? {
              ...current,
              shippingDocumentDrafts: nextDrafts,
            }
          : current
      );

      toast({
        title: 'Draft saved',
        description: `${selectedShippingDocType} draft updated for the selected trip.`,
      });
      setIsShippingDocEditorOpen(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Draft save failed', description: err.message });
    }
  };

  const handleSaveDr = async (finalize = false) => {
    if (!db || !selectedTripForTransfer) return;

    try {
      setIsSavingDr(true);
      const tripRef = doc(db, TRIP_PATH, selectedTripForTransfer.id);
      const payload = {
        deliveryReceipt: {
          datePrepared: drHeader.datePrepared,
          customer: drHeader.customer,
          packingStationNo: drHeader.packingStationNo,
          vanNo: drHeader.vanNo,
          hauler: drHeader.hauler,
          tripNo: drHeader.tripNo,
          truckNo: drHeader.truckNo,
          trailerChassisNo: drHeader.trailerChassisNo,
          plateNo: drHeader.plateNo,
          waybillNo: drHeader.waybillNo,
          sealNo: drHeader.sealNo,
          shippingLine: drHeader.shippingLine,
          vesselName: drHeader.vesselName,
          voyage: drHeader.voyage,
          portOfLoading: drHeader.portOfLoading,
          remarks: drHeader.remarks,
          operationalTimeline: drHeader.operationalTimeline,
          rows: drRows,
          verification: drVerification,
          status: finalize ? 'FINALIZED' : 'DRAFT',
        },
        workflowStage: finalize ? 'DR_FINALIZED' : 'DR_DRAFT_SAVED',
        updatedAt: serverTimestamp(),
      };

      await setDoc(tripRef, payload, { merge: true });

      setSelectedTripForTransfer((current: any) =>
        current
          ? {
              ...current,
              deliveryReceipt: payload.deliveryReceipt,
            }
          : current
      );

      toast({
        title: finalize ? 'DR Created' : 'Draft Saved',
        description: finalize
          ? 'Delivery receipt form has been saved and finalized.'
          : 'Delivery receipt draft has been saved.',
      });
      if (finalize) {
        setIsDrModalOpen(false);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setIsSavingDr(false);
    }
  };

  const handleUpdateCuttingOrderStatus = async (row: CuttingOrderListRow, nextStatus: CuttingOrderStatus) => {
    const updatedRows = cuttingOrderRows.map((item) =>
      item.id === row.id && item.contractId === row.contractId
        ? { ...item, status: normalizeCuttingOrderStatus(nextStatus) }
        : item
    );

    try {
      if (db) {
        const contractRows = updatedRows.filter((item) => item.contractId === row.contractId);
        const batch = writeBatch(db);
        const contractRef = doc(db, CONTRACT_PATH, row.contractId);
        batch.update(contractRef, {
          cuttingOrders: contractRows.map((item) => ({
            itemId: item.id,
            ps: item.ps,
            shippingLine: item.shippingLine,
            bookingNo: item.bookingNo,
            containerNo: item.containerNo,
            atwStatus: item.atwStatus,
            status: item.status,
            pod: item.pod,
            cutOffDate: item.cutOffDate,
            etd: item.etd,
            sku: item.sku,
            palletization: item.palletization,
          })),
          cuttingOrdersUpdatedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const existingRows = await getDocs(collection(db, `${CONTRACT_PATH}/${row.contractId}/cutting_orders`));
        existingRows.docs.forEach((snapshot) => batch.delete(snapshot.ref));
        contractRows.forEach((item) => {
          const rowRef = doc(collection(db, `${CONTRACT_PATH}/${row.contractId}/cutting_orders`));
          batch.set(rowRef, {
            itemId: rowRef.id,
            ps: item.ps,
            shippingLine: item.shippingLine,
            bookingNo: item.bookingNo,
            containerNo: item.containerNo,
            atwStatus: item.atwStatus,
            status: item.status,
            pod: item.pod,
            cutOffDate: item.cutOffDate,
            etd: item.etd,
            sku: item.sku,
            palletization: item.palletization,
            updatedAt: serverTimestamp(),
          });
        });
        await batch.commit();
      }

      toast({
        title: 'Status Updated',
        description: `Cutting order moved to ${getCuttingOrderStatusLabel(normalizeCuttingOrderStatus(nextStatus))}.`,
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Status Update Failed', description: err.message });
    }
  };

  const handleChangeCuttingOrderStatus = async (row: CuttingOrderListRow) => {
    const nextStatus = getNextCuttingOrderStatus(row.status);
    await handleUpdateCuttingOrderStatus(row, nextStatus);
  };

  const shippingDocRows: Array<{
    label: string;
    actions: ShippingDocAction[];
    docType?: ShippingDocType;
  }> = [
    { label: 'Shipping Instruction', actions: ['generate'], docType: 'Shipping Instruction' },
    { label: 'Export Declaration', actions: ['upload'] },
    { label: 'Bill of Lading', actions: ['upload'] },
    { label: 'Inspector Report of Loading', actions: ['upload'] },
    { label: 'Certificate of Origin', actions: ['upload'] },
    { label: "Mate's Receipt", actions: ['generate'], docType: "Mate's Receipt" },
    { label: 'Packing List', actions: ['generate', 'view', 'download'], docType: 'Packing List' },
    { label: 'Phytosanitary Certificate', actions: ['upload'] },
    { label: 'SAP Export', actions: ['download'] },
  ];

  const handleOpenPalletDetails = (index: string) => {
    setSelectedPalletIndex(index);
    const existingData = vlsType === 'palletized' ? palletsData[index] : floorLoadData[index];
    setCurrentPalletRows(existingData || [{ packType: '', qty: '', skuNo: '' }]);
    setIsPalletDetailsModalOpen(true);
  };

  const handleSavePalletDetails = () => {
    if (selectedPalletIndex !== null) {
      const filteredRows = currentPalletRows
        .filter((r) => r.packType && r.qty)
        .map((r) => ({
          ...r,
          skuNo: r.packType,
        }));
      if (vlsType === 'palletized') {
        setPalletsData({ ...palletsData, [selectedPalletIndex]: filteredRows });
      } else {
        setFloorLoadData({ ...floorLoadData, [selectedPalletIndex]: filteredRows });
      }
      setIsPalletDetailsModalOpen(false);
    }
  };

  const getAggregatedSummary = () => {
    const data = vlsType === 'palletized' ? palletsData : floorLoadData;
    const summary: { [key: string]: number } = {};
    Object.values(data).flat().forEach(item => {
      const key = item.skuNo || item.packType;
      if (key) {
        summary[key] = (summary[key] || 0) + (parseInt(item.qty) || 0);
      }
    });
    return Object.entries(summary).map(([packType, qty]) => ({ packType, qty }));
  };

  const renderCuttingOrdersView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-4">
        <Select value={weekFilter} onValueChange={setWeekFilter}>
          <SelectTrigger className="w-[300px] h-12 bg-white"><SelectValue placeholder="Select Week Number" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Weeks</SelectItem>{weekOptions.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent>
        </Select>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[300px] h-12 bg-white"><SelectValue placeholder="Select Customer" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Customers</SelectItem>{customerMappings?.map((c: any) => (<SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>))}</SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-4 text-gray-400">
          <Bell className="h-5 w-5 cursor-pointer" />
          <HelpCircle className="h-5 w-5 cursor-pointer" />
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center"><User className="h-4 w-4" /></div>
            COORDINATOR
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
            <span>Operations</span><ChevronRight className="h-3 w-3 mx-1" /><span>Cutting Orders</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900">Cutting Orders</h1>
          <p className="text-sm text-gray-500 max-w-xl">Manage and monitor production cutting requirements and inventory allocations.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-10 px-6 font-bold uppercase text-xs tracking-widest border-gray-200" onClick={() => navigateToView('trips')}>Create/View Trips</Button>
          <Button variant="outline" className="h-10 px-6 font-bold uppercase text-xs tracking-widest border-gray-200" onClick={() => navigateToView('bookings')}>Create/View Bookings</Button>
          <Button className="h-10 px-6 bg-anflocor-green text-white font-bold uppercase text-xs tracking-widest gap-2" onClick={() => {
            const sourceContract = selectedContract || contracts?.[0] || null;
            if (sourceContract) {
              setSelectedContractId(sourceContract.id);
              openCosModal(sourceContract);
            } else {
              toast({ variant: 'destructive', title: 'No Loading Advice', description: 'Please create a loading advice record first.' });
            }
          }}>
            <Plus className="h-4 w-4" /> New Cutting Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-white border-none shadow-sm relative overflow-hidden h-[140px]">
          <div className="p-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 block mb-3">ACTIVE ORDERS</span>
            <span className="text-5xl font-black text-gray-900">{cuttingOrderStatusCounts.active}</span>
            <p className="text-[10px] text-emerald-700 font-bold mt-3">+8% from last week</p>
          </div>
        </Card>
        <Card className="bg-white border-none shadow-sm relative overflow-hidden h-[140px]">
          <div className="p-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 block mb-3">TONNAGE SCHEDULED</span>
            <span className="text-5xl font-black text-gray-900">{totalTonnageScheduled.toLocaleString()} kg</span>
            <p className="text-[10px] text-gray-500 font-bold mt-3">Capacity Utilization: 82%</p>
          </div>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">RECENT CUTTING ORDERS</h3>
          <div className="flex gap-2">
            <Button variant="outline" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-gray-100 gap-2"><Filter className="h-3 w-3" /> FILTER</Button>
            {selectedFilteredCuttingOrderRows.length > 0 && (
              <Button
                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-2 bg-emerald-700 text-white hover:bg-emerald-800"
                onClick={openBulkCuttingStatusModal}
              >
                <RefreshCcw className="h-3 w-3" />
                Change Status ({selectedFilteredCuttingOrderRows.length})
              </Button>
            )}
          </div>
        </div>
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="w-12 text-center">
                <Checkbox
                  checked={
                    allFilteredCuttingOrdersSelected
                      ? true
                      : someFilteredCuttingOrdersSelected
                        ? 'indeterminate'
                        : false
                  }
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedCuttingOrderKeys(filteredCuttingOrderRows.map((row) => cuttingOrderRowKey(row)));
                    } else {
                      setSelectedCuttingOrderKeys([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">PS</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">Shipping Line</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">Booking No</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">Container No</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">ATW Status</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">POD</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">Cut-Off Date</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">ETD</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">SKU</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">Palletization</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">Status</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-right text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCuttingOrderRows.map((row) => (
              <TableRow key={`${row.contractId}-${row.id}`} className="h-16 hover:bg-gray-50/50">
                <TableCell className="text-center">
                  <Checkbox
                    checked={selectedCuttingOrderKeys.includes(cuttingOrderRowKey(row))}
                    onCheckedChange={(checked) => {
                      setSelectedCuttingOrderKeys((current) =>
                        checked
                          ? [...new Set([...current, cuttingOrderRowKey(row)])]
                          : current.filter((key) => key !== cuttingOrderRowKey(row))
                      );
                    }}
                  />
                </TableCell>
                <TableCell className="font-bold text-xs">{row.ps}</TableCell>
                <TableCell className="text-xs font-bold uppercase">{row.shippingLine}</TableCell>
                <TableCell className="text-xs text-gray-500 font-semibold">{row.bookingNo}</TableCell>
                <TableCell className="font-bold text-xs">{row.containerNo}</TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-bold uppercase tracking-wider text-[10px]',
                      row.atwStatus === 'PENDING'
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : row.atwStatus === 'READY'
                          ? 'border-amber-200 bg-amber-50 text-amber-600'
                          : row.atwStatus === 'LOADED'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                    )}
                  >
                    {row.atwStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs uppercase">{row.pod}</TableCell>
                <TableCell className="text-xs text-gray-500">{row.cutOffDate}</TableCell>
                <TableCell className="text-xs text-gray-500">{row.etd}</TableCell>
                <TableCell className="text-xs font-bold">{row.sku}</TableCell>
                <TableCell className="text-xs">{row.palletization}</TableCell>
                <TableCell className="text-center">
                  <Select
                    value={normalizeCuttingOrderStatus(row.status)}
                    onValueChange={(value) => handleUpdateCuttingOrderStatus(row, value as CuttingOrderStatus)}
                  >
                    <SelectTrigger
                      className={cn(
                        'h-8 w-[130px] rounded-full border px-3 text-[10px] font-bold uppercase tracking-wider shadow-sm',
                        getCuttingOrderStatusClassName(normalizeCuttingOrderStatus(row.status))
                      )}
                    >
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPTY">Empty</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ONGOING">Ongoing</SelectItem>
                      <SelectItem value="DEPART">Depart</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-gray-400">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        className="gap-3 py-2.5 cursor-pointer font-medium"
                        onClick={() => openEditCuttingOrderModal(row)}
                      >
                        <FileText className="h-4 w-4 text-gray-500" /> Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between border-t px-5 py-4 text-sm text-gray-500">
          <div>
            Showing <span className="font-semibold text-gray-900">1-4</span> of <span className="font-semibold text-gray-900">{filteredCuttingOrderRows.length}</span> cutting orders
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
            <Button className="h-8 w-8 bg-emerald-700 text-white hover:bg-emerald-800">1</Button>
            <Button variant="outline" className="h-8 w-8">2</Button>
            <Button variant="outline" className="h-8 w-8">3</Button>
            <Button variant="outline" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderShippingDocFields = () => {
    if (selectedShippingDocType === 'Shipping Instruction') {
      return (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Shipping Instruction Fields</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Shipper</Label>
              <Input value={shippingDocDraft.shipperName} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, shipperName: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Booking Reference</Label>
              <Input value={shippingDocDraft.bookingReference} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, bookingReference: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Shipper Address</Label>
              <Textarea value={shippingDocDraft.shipperAddress} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, shipperAddress: e.target.value })} className="min-h-20 bg-slate-50 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Consignee</Label>
              <Input value={shippingDocDraft.consigneeName} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, consigneeName: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Notify Party</Label>
              <Input value={shippingDocDraft.notifyPartyName} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, notifyPartyName: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Consignee Address</Label>
              <Textarea value={shippingDocDraft.consigneeAddress} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, consigneeAddress: e.target.value })} className="min-h-20 bg-slate-50 text-sm" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Notify Party Address</Label>
              <Textarea value={shippingDocDraft.notifyPartyAddress} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, notifyPartyAddress: e.target.value })} className="min-h-20 bg-slate-50 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Vessel</Label>
              <Input value={shippingDocDraft.vesselName} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, vesselName: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Voyage</Label>
              <Input value={shippingDocDraft.voyageNo} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, voyageNo: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Port of Loading</Label>
              <Input value={shippingDocDraft.portOfLoading} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, portOfLoading: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Port of Discharge</Label>
              <Input value={shippingDocDraft.portOfDischarge} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, portOfDischarge: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Freight Term</Label>
              <Input value={shippingDocDraft.freightTerm} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, freightTerm: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Release Text</Label>
              <Input value={shippingDocDraft.releaseText} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, releaseText: e.target.value })} className="h-10 bg-slate-50" />
            </div>
          </div>
        </div>
      );
    }

    if (selectedShippingDocType === "Mate's Receipt") {
      return (
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Mate's Receipt Fields</div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Date</Label>
              <Input type="date" value={shippingDocDraft.issueDate} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, issueDate: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Vessel</Label>
              <Input value={shippingDocDraft.consigneeName} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, consigneeName: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Consignee / Shipper</Label>
              <Textarea value={shippingDocDraft.shipperAddress} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, shipperAddress: e.target.value })} className="min-h-20 bg-slate-50 text-sm" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Destination</Label>
              <Input value={shippingDocDraft.destination} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, destination: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Shipping Marks</Label>
              <Input value={shippingDocDraft.shippingMarks} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, shippingMarks: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Description</Label>
              <Input value={shippingDocDraft.description} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, description: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">No. of Cartons</Label>
              <Input value={shippingDocDraft.cartons} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, cartons: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Volume (m3)</Label>
              <Input value={shippingDocDraft.volume} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, volume: e.target.value })} className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Gross Weight</Label>
              <Input value={shippingDocDraft.grossWeight} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, grossWeight: e.target.value })} className="h-10 bg-slate-50" />
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Packing List Fields</div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase text-slate-400">Exporter</Label>
            <Input value={shippingDocDraft.exporter} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, exporter: e.target.value })} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase text-slate-400">Date</Label>
            <Input type="date" value={shippingDocDraft.departureDate} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, departureDate: e.target.value })} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[9px] font-black uppercase text-slate-400">Exporter Address</Label>
            <Textarea value={shippingDocDraft.exporterAddress} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, exporterAddress: e.target.value })} className="min-h-20 bg-slate-50 text-sm" />
          </div>
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase text-slate-400">Sold To</Label>
            <Input value={shippingDocDraft.soldTo} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, soldTo: e.target.value })} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase text-slate-400">Terms of Delivery</Label>
            <Input value={shippingDocDraft.termsOfDelivery} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, termsOfDelivery: e.target.value })} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[9px] font-black uppercase text-slate-400">Sold To Address</Label>
            <Textarea value={shippingDocDraft.soldToAddress} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, soldToAddress: e.target.value })} className="min-h-20 bg-slate-50 text-sm" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[9px] font-black uppercase text-slate-400">Vessel & Voyage</Label>
            <Input value={shippingDocDraft.vesselVoyage} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, vesselVoyage: e.target.value })} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase text-slate-400">Port of Loading</Label>
            <Input value={shippingDocDraft.portOfLoading} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, portOfLoading: e.target.value })} className="h-10 bg-slate-50" />
          </div>
          <div className="space-y-2">
            <Label className="text-[9px] font-black uppercase text-slate-400">Port of Discharge</Label>
            <Input value={shippingDocDraft.portOfDischarge} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, portOfDischarge: e.target.value })} className="h-10 bg-slate-50" />
          </div>
        </div>
      </div>
    );
  };

  const renderShippingDocPreview = () => {
    if (selectedShippingDocType === 'Shipping Instruction') {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mx-auto max-w-[760px] border-2 border-slate-300 bg-white">
            <div className="border-b border-slate-300 bg-slate-50 py-2 text-center text-[15px] font-bold uppercase tracking-[0.16em] text-slate-700">
              Shipping Instruction
            </div>
            <div className="grid grid-cols-2">
              <div className="border-r border-slate-300 p-0 text-[10px]">
                <div className="border-b border-slate-300 bg-yellow-50 px-2 py-1 font-bold uppercase text-slate-700">Shipper</div>
                <div className="px-2 py-2">
                  <div className="font-bold text-red-600">{shippingDocDraft.shipperName}</div>
                  <div className="whitespace-pre-wrap">{shippingDocDraft.shipperAddress}</div>
                </div>
                <div className="border-y border-slate-300 bg-yellow-50 px-2 py-1 font-bold uppercase text-slate-700">Consignee</div>
                <div className="px-2 py-2">
                  <div className="font-bold text-red-600">{shippingDocDraft.consigneeName}</div>
                  <div className="whitespace-pre-wrap">{shippingDocDraft.consigneeAddress}</div>
                </div>
                <div className="border-y border-slate-300 bg-yellow-50 px-2 py-1 font-bold uppercase text-slate-700">Notify Party</div>
                <div className="px-2 py-2">
                  <div className="font-bold text-red-600">{shippingDocDraft.notifyPartyName}</div>
                  <div className="whitespace-pre-wrap">{shippingDocDraft.notifyPartyAddress}</div>
                </div>
              </div>
              <div className="p-0 text-[10px]">
                <div className="grid grid-cols-2">
                  <div className="border-b border-r border-slate-300 bg-yellow-50 px-2 py-1 font-bold uppercase">BL Type Release</div>
                  <div className="border-b border-slate-300 px-2 py-1 font-bold text-red-600">{shippingDocDraft.releaseText}</div>
                  <div className="border-b border-r border-slate-300 bg-yellow-50 px-2 py-1 font-bold uppercase">Booking Reference</div>
                  <div className="border-b border-slate-300 px-2 py-1">{shippingDocDraft.bookingReference}</div>
                  <div className="border-b border-r border-slate-300 bg-yellow-50 px-2 py-1 font-bold uppercase">Freight Term</div>
                  <div className="border-b border-slate-300 px-2 py-1 font-bold text-red-600">{shippingDocDraft.freightTerm}</div>
                </div>
                <div className="p-2 text-[10px]">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-bold uppercase text-slate-500">Vessel: </span>{shippingDocDraft.vesselName}</div>
                    <div><span className="font-bold uppercase text-slate-500">Voyage: </span>{shippingDocDraft.voyageNo}</div>
                    <div><span className="font-bold uppercase text-slate-500">Port of Loading: </span>{shippingDocDraft.portOfLoading}</div>
                    <div><span className="font-bold uppercase text-slate-500">Port of Discharge: </span>{shippingDocDraft.portOfDischarge}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-slate-300">
              <table className="w-full border-collapse text-[10px]">
                <thead className="bg-slate-50">
                  <tr>
                    {['Container No.', 'Seal No.', 'No. of Pcs.', 'Description', 'Gross Weight', 'Measurement'].map((head) => (
                      <th key={head} className="border-r border-slate-300 px-2 py-1 text-left font-bold uppercase">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((idx) => (
                    <tr key={idx}>
                      <td className="border-r border-t border-slate-300 px-2 py-1">{selectedTripForDocs?.containerNo || `SEKU ${idx}`}</td>
                      <td className="border-r border-t border-slate-300 px-2 py-1">{selectedTripForDocs?.sealNo || '--'}</td>
                      <td className="border-r border-t border-slate-300 px-2 py-1">1540</td>
                      <td className="border-r border-t border-slate-300 px-2 py-1">{shippingDocDraft.description}</td>
                      <td className="border-r border-t border-slate-300 px-2 py-1">{shippingDocDraft.grossWeight}</td>
                      <td className="border-t border-slate-300 px-2 py-1">50.000</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (selectedShippingDocType === "Mate's Receipt") {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mx-auto max-w-[720px] bg-white p-6">
            <div className="text-center text-3xl font-black uppercase tracking-[0.2em] text-slate-900">Mate's Receipt</div>
            <div className="mt-8 border-t border-slate-400 pt-4 text-center text-lg font-medium">{shippingDocDraft.issueDate}</div>
            <div className="mt-8 grid grid-cols-[170px_1fr] gap-4 text-[12px]">
              <div className="font-bold leading-6">
                Received on board of commanded by consignnment to Shipper
              </div>
              <div className="space-y-2">
                <div className="border-b border-slate-400 pb-1 font-bold">{shippingDocDraft.consigneeName}</div>
                <div className="border-b border-slate-400 pb-1">{shippingDocDraft.consigneeAddress}</div>
                <div className="border-b border-slate-400 pb-1">Destination: {shippingDocDraft.destination}</div>
              </div>
            </div>
            <div className="mt-8 overflow-hidden border border-slate-400">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-slate-50">
                    {['Shipping Marks', 'Description', 'No. of Cartons/Crates', 'Volume (m3)', 'Gr. Weight (Kilos)'].map((head) => (
                      <th key={head} className="border-r border-slate-400 px-2 py-2 text-left font-bold">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="h-44">
                    <td className="border-r border-t border-slate-400 px-2 py-2 align-middle text-center">{shippingDocDraft.shippingMarks}</td>
                    <td className="border-r border-t border-slate-400 px-2 py-2 align-middle text-center">{shippingDocDraft.description}</td>
                    <td className="border-r border-t border-slate-400 px-2 py-2 align-middle text-right">{shippingDocDraft.cartons}</td>
                    <td className="border-r border-t border-slate-400 px-2 py-2 align-middle text-right">{shippingDocDraft.volume}</td>
                    <td className="border-t border-slate-400 px-2 py-2 align-middle text-right">{shippingDocDraft.grossWeight}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mx-auto max-w-[780px] bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-4xl font-black uppercase tracking-[0.2em] text-sky-700">TADECO</div>
              <div className="text-[12px] text-slate-500">Tagum Agricultural Development Company Inc.</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black uppercase tracking-[0.18em] text-slate-900">Packing List</div>
              <div className="mt-2 text-[12px]">
                <div><span className="font-bold">Date:</span> {shippingDocDraft.departureDate}</div>
                <div><span className="font-bold">Invoice No.:</span> {shippingDocDraft.referenceNo || 'GF00553'}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-0 border border-slate-400 text-[11px]">
            <div className="border-r border-slate-400 p-2">
              <div><span className="font-bold">Exporter:</span> {shippingDocDraft.exporter}</div>
              <div className="mt-1 whitespace-pre-wrap">{shippingDocDraft.exporterAddress}</div>
              <div className="mt-3"><span className="font-bold">Sold to:</span> {shippingDocDraft.soldTo}</div>
              <div className="mt-1 whitespace-pre-wrap">{shippingDocDraft.soldToAddress}</div>
            </div>
            <div className="p-2">
              <div><span className="font-bold">Vessel & Voyage:</span> {shippingDocDraft.vesselVoyage}</div>
              <div className="mt-1"><span className="font-bold">Departure Date:</span> {shippingDocDraft.departureDate}</div>
              <div className="mt-1"><span className="font-bold">Port of Loading:</span> {shippingDocDraft.portOfLoading}</div>
              <div className="mt-1"><span className="font-bold">Port of Discharge:</span> {shippingDocDraft.portOfDischarge}</div>
              <div className="mt-1"><span className="font-bold">Terms of Delivery:</span> {shippingDocDraft.termsOfDelivery}</div>
            </div>
          </div>
          <div className="mt-4 overflow-hidden border border-slate-400">
            <table className="w-full border-collapse text-[11px]">
              <thead className="bg-slate-50">
                <tr>
                  {['Container #', 'Marks / Brands', 'Type of Packages', 'Commodity', 'Quantity (Cartons)', 'Gross Weight (Kg)', 'Net Weight (Kg)'].map((head) => (
                    <th key={head} className="border-r border-slate-400 px-2 py-2 text-left font-bold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map((row) => (
                  <tr key={row}>
                    <td className="border-r border-t border-slate-400 px-2 py-2">{selectedTripForDocs?.containerNo || `SEKU ${row}`}</td>
                    <td className="border-r border-t border-slate-400 px-2 py-2">{shippingDocDraft.shippingMarks}</td>
                    <td className="border-r border-t border-slate-400 px-2 py-2">RH A</td>
                    <td className="border-r border-t border-slate-400 px-2 py-2">{shippingDocDraft.description}</td>
                    <td className="border-r border-t border-slate-400 px-2 py-2 text-right">{shippingDocDraft.cartons}</td>
                    <td className="border-r border-t border-slate-400 px-2 py-2 text-right">{shippingDocDraft.grossWeight}</td>
                    <td className="border-t border-slate-400 px-2 py-2 text-right">187,110.00</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderTripsView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-4">
        <Select value={weekFilter} onValueChange={setWeekFilter}>
          <SelectTrigger className="w-[300px] h-12 bg-white"><SelectValue placeholder="Select Week Number" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Weeks</SelectItem>{weekOptions.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent>
        </Select>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[300px] h-12 bg-white"><SelectValue placeholder="Select Customer" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Customers</SelectItem>{customerMappings?.map((c: any) => (<SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>))}</SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-4 text-gray-400">
          <Bell className="h-5 w-5 cursor-pointer" />
          <HelpCircle className="h-5 w-5 cursor-pointer" />
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center"><User className="h-4 w-4" /></div>
            COORDINATOR
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
            <span>Logistics</span><ChevronRight className="h-3 w-3 mx-1" /><span>Trips</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900">Trips</h1>
        </div>
        <div className="flex gap-3">
          {tripStatusFilter === 'shipped' && (
            <Button
              variant="outline"
              className="h-10 px-4 border-emerald-200 bg-emerald-50 text-emerald-700 font-bold uppercase text-xs tracking-widest gap-2"
              onClick={() => setTripStatusFilter('all')}
            >
              <Filter className="h-3.5 w-3.5" />
              Status: Shipped
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          {tripStatusFilter === 'all' && (
            <Button
              variant="outline"
              className="h-10 px-4 border-gray-200 bg-white text-gray-700 font-bold uppercase text-xs tracking-widest gap-2"
              onClick={() => setTripStatusFilter('shipped')}
            >
              <Filter className="h-3.5 w-3.5" />
              Filters
            </Button>
          )}
          <Button variant="outline" className="h-10 px-6 font-bold uppercase text-xs tracking-widest border-gray-200">CREATE/VIEW TRIPS</Button>
          <Button
            className="h-10 px-6 bg-anflocor-green text-white font-bold uppercase text-xs tracking-widest gap-2"
            onClick={() => {
              setTripStep(1);
              setNewTripHeader({
                customerName: '',
                weekNumber: '',
                bookingNo: '',
                bookingBatchId: '',
                laId: '',
                shippingLine: '',
                vessel: '',
                pod: '',
              });
              setTripRows([{
                id: Math.random().toString(36).substr(2, 9),
                ps: '1',
                containerNo: '',
                vanNo: '',
                sealNo: '',
                atwStatus: 'Y',
                atwReleased: format(new Date(), 'yyyy-MM-dd'),
                pmNo: '',
                driverName: '',
                signature: 'Pending',
                dateWithdrawn: format(new Date(), 'yyyy-MM-dd'),
              }]);
              setBindCoRows([]);
              setIsNewTripOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> NEW TRIP
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-white border-none shadow-sm relative overflow-hidden h-[180px]">
          <div className="p-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 block mb-4">ACTIVE TRIPS</span>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black text-gray-900">{filteredTrips.length}</span>
              <div className="flex items-center gap-1 text-green-500 font-bold text-xs mb-2">
                <TrendingUp className="h-3 w-3" /> +12%
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-2">Currently in transit or processing</p>
          </div>
          <Truck className="absolute bottom-4 right-4 h-24 w-24 text-gray-50 opacity-10 -rotate-12" />
        </Card>
        <Card className="bg-white border-none shadow-sm relative overflow-hidden h-[180px]">
          <div className="p-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 block mb-4">TRIPS PENDING</span>
            <span className="text-5xl font-black text-gray-900">28</span>
            <p className="text-[10px] text-gray-400 font-bold mt-4">Updated 5m ago</p>
          </div>
          <Clock className="absolute bottom-4 right-4 h-24 w-24 text-gray-50 opacity-10" />
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">RECENT TRIP MANIFESTS</h3>
          <div className="flex gap-2">
            <Button variant="outline" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-gray-100 gap-2"><Filter className="h-3 w-3" /> FILTER</Button>
            <Button variant="outline" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-gray-100 gap-2"><Download className="h-3 w-3" /> EXPORT</Button>
          </div>
        </div>
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="w-10 text-center"></TableHead>
              <TableHead className="w-12 text-center"><Checkbox /></TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">VAN NO.</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">PM NO.</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">CONTAINER NO.</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">SEAL NO.</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">DRIVER</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">DATE ATW RELEASED</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-center text-gray-400">STATUS</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-right text-gray-400">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTrips.map((t: any) => (
              <React.Fragment key={t.id}>
              <TableRow className="h-16 hover:bg-gray-50/50">
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500"
                    onClick={() => toggleTripExpanded(t.id)}
                  >
                    {expandedTripIds.includes(t.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                </TableCell>
                <TableCell className="text-center"><Checkbox /></TableCell>
                <TableCell className="font-bold">{t.vanNo}</TableCell>
                <TableCell className="text-xs text-gray-400">{t.pmNo}</TableCell>
                <TableCell className="font-bold">{t.containerNo}</TableCell>
                <TableCell className="text-xs">{t.sealNo}</TableCell>
                <TableCell className="font-bold text-xs uppercase">{t.driver}</TableCell>
                <TableCell className="text-[10px] text-gray-400">{t.dateAtwReleased}</TableCell>
                <TableCell className="text-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-bold uppercase tracking-wider cursor-pointer',
                            String(t.status || 'ACTIVE').toUpperCase() === 'SHIPPED'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : String(t.status || 'ACTIVE').toUpperCase() === 'DEPART'
                                ? 'border-blue-200 bg-blue-50 text-blue-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                          )}
                        >
                          {String(t.status || 'ACTIVE').toUpperCase()}
                        </Badge>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-48">
                      {String(t.status || 'ACTIVE').toUpperCase() === 'DEPART' ? (
                        <DropdownMenuItem
                          className="gap-3 py-2.5 cursor-pointer font-medium"
                          onClick={() => handleShipTrip(t)}
                        >
                          <Check className="h-4 w-4 text-gray-500" /> Mark as Shipped
                        </DropdownMenuItem>
                      ) : String(t.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? (
                        <DropdownMenuItem
                          className="gap-3 py-2.5 cursor-pointer font-medium"
                          onClick={() => handleDispatchTrip(t)}
                        >
                          <Truck className="h-4 w-4 text-gray-500" /> Mark as Dispatched
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem disabled className="gap-3 py-2.5 font-medium">
                          No actions available
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-gray-400">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        className="gap-3 py-2.5 cursor-pointer font-medium"
                        onClick={() => {
                          const currentStatus = String(t.status || 'ACTIVE').toUpperCase();
                          if (currentStatus === 'DEPART') {
                            handleShipTrip(t);
                          } else {
                            handleDispatchTrip(t);
                          }
                        }}
                      >
                        {String(t.status || 'ACTIVE').toUpperCase() === 'DEPART' ? (
                          <>
                            <Check className="h-4 w-4 text-gray-500" /> Mark as Shipped
                          </>
                        ) : (
                          <>
                            <Truck className="h-4 w-4 text-gray-500" /> Mark as Dispatched
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="gap-3 py-2.5 cursor-pointer font-medium"
                        onSelect={(e) => {
                          setSelectedTripForTransfer(t);
                          requestAnimationFrame(() => setIsTransferModalOpen(true));
                        }}
                      >
                        <Truck className="h-4 w-4 text-gray-500" /> Edit Transfer
                      </DropdownMenuItem>
                      {/* <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer font-medium">
                        <FileText className="h-4 w-4 text-gray-500" /> Check Docs
                      </DropdownMenuItem> */}
                      <DropdownMenuItem
                        className="gap-3 py-2.5 cursor-pointer font-medium"
                        onSelect={() => {
                          setSelectedTripForDocs(t);
                          requestAnimationFrame(() => setIsShippingDocsModalOpen(true));
                        }}
                      >
                        <FileText className="h-4 w-4 text-gray-500" /> Shipping Docs
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              {expandedTripIds.includes(t.id) && (
                <TableRow className="bg-slate-50/60">
                  <TableCell colSpan={10} className="p-4">
                    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Associated Cutting Orders</div>
                        <Button variant="outline" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-gray-200 gap-2">
                          <Settings className="h-3.5 w-3.5" />
                          Actions
                        </Button>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="w-10 text-center"></TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-500">Customer</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-500">SKU</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-500">Quantity</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-500">Booking No.</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-500">Week No.</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-500">ATW Status</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-500">Vessel</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-500">ETD</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-500">Cut Off</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-slate-500">Status</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-right text-slate-500">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getTripCuttingOrders(t).length > 0 ? getTripCuttingOrders(t).map((order: any, idx: number) => (
                              <TableRow key={order.itemId || order.id || idx} className="hover:bg-slate-50">
                                <TableCell className="text-center"><Checkbox /></TableCell>
                                <TableCell className="text-xs text-slate-700">{t.customerName || '--'}</TableCell>
                                <TableCell className="text-xs font-semibold">{order.sku || '--'}</TableCell>
                                <TableCell className="text-xs">{order.total || order.qty || '1,200'}</TableCell>
                                <TableCell className="text-xs">{order.bookingNo || '--'}</TableCell>
                                <TableCell className="text-xs">{t.weekNumber || '--'}</TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'font-bold uppercase tracking-wider text-[10px]',
                                      String(order.atwStatus || 'PENDING').toUpperCase() === 'LOADED'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                        : String(order.atwStatus || 'PENDING').toUpperCase() === 'READY'
                                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                                          : 'border-red-200 bg-red-50 text-red-600'
                                    )}
                                  >
                                    {String(order.atwStatus || 'PENDING').toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs">{order.vessel || t.shippingLine || '--'}</TableCell>
                                <TableCell className="text-xs">{order.etd || '--'}</TableCell>
                                <TableCell className="text-xs">{order.cutOffDate || '--'}</TableCell>
                                <TableCell className="text-center">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'font-bold uppercase tracking-wider text-[10px]',
                                      getCuttingOrderStatusClassName(normalizeCuttingOrderStatus(order.status))
                                    )}
                                  >
                                    {getCuttingOrderStatusLabel(normalizeCuttingOrderStatus(order.status))}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="text-gray-400">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer font-medium" onClick={() => handleChangeTripOrderStatus(t, order)}>
                                        <RefreshCcw className="h-4 w-4 text-gray-500" /> Change Status
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer font-medium" onClick={() => toast({ title: 'Export queued', description: 'Associated cutting order export is ready.' })}>
                                        <Download className="h-4 w-4 text-gray-500" /> Export Details
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            )) : (
                              <TableRow>
                                <TableCell colSpan={12} className="py-8 text-center text-sm text-slate-500">No associated cutting orders found for this trip.</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={isBulkCuttingStatusModalOpen}
        onOpenChange={(open) => {
          setIsBulkCuttingStatusModalOpen(open);
          if (!open) {
            setBulkCuttingStatus('EMPTY');
          }
        }}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-6 border-b flex justify-between items-center">
            <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Change Cutting Status</DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => setIsBulkCuttingStatusModalOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-6 space-y-4">
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              {selectedFilteredCuttingOrderRows.length} cutting order{selectedFilteredCuttingOrderRows.length > 1 ? 's' : ''} selected.
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">Status</Label>
              <Select value={bulkCuttingStatus} onValueChange={(value) => setBulkCuttingStatus(value as CuttingOrderStatus)}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPTY">Empty</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ONGOING">Ongoing</SelectItem>
                  <SelectItem value="DEPART">Depart</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsBulkCuttingStatusModalOpen(false)} className="text-[10px] font-black uppercase">Cancel</Button>
            <Button className="bg-anflocor-green hover:bg-anflocor-green/90 text-white text-[10px] font-black uppercase h-10 px-6" onClick={handleSaveBulkCuttingStatus}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditCuttingOrderModalOpen}
        onOpenChange={(open) => {
          setIsEditCuttingOrderModalOpen(open);
          if (!open) {
            setSelectedCuttingOrderForEdit(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-6 border-b flex justify-between items-center">
            <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">Edit Cutting Order</DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => setIsEditCuttingOrderModalOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">PS</Label>
              <Input
                className="h-11 bg-white"
                value={cuttingOrderEditDraft.ps}
                onChange={(e) => setCuttingOrderEditDraft((current) => ({ ...current, ps: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">POD</Label>
              <Input
                className="h-11 bg-white"
                value={cuttingOrderEditDraft.pod}
                onChange={(e) => setCuttingOrderEditDraft((current) => ({ ...current, pod: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">Cut-Off Date</Label>
              <Input
                className="h-11 bg-white"
                value={cuttingOrderEditDraft.cutOffDate}
                onChange={(e) => setCuttingOrderEditDraft((current) => ({ ...current, cutOffDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">ETD</Label>
              <Input
                className="h-11 bg-white"
                value={cuttingOrderEditDraft.etd}
                onChange={(e) => setCuttingOrderEditDraft((current) => ({ ...current, etd: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">SKU</Label>
              <Input
                className="h-11 bg-white"
                value={cuttingOrderEditDraft.sku}
                onChange={(e) => setCuttingOrderEditDraft((current) => ({ ...current, sku: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">Palletization</Label>
              <Input
                className="h-11 bg-white"
                value={cuttingOrderEditDraft.palletization}
                onChange={(e) => setCuttingOrderEditDraft((current) => ({ ...current, palletization: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">ATW Status</Label>
              <Select
                value={cuttingOrderEditDraft.atwStatus}
                onValueChange={(value) => setCuttingOrderEditDraft((current) => ({ ...current, atwStatus: value }))}
              >
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="Select ATW Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">PENDING</SelectItem>
                  <SelectItem value="READY">READY</SelectItem>
                  <SelectItem value="LOADED">LOADED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-gray-400">Status</Label>
              <Select
                value={cuttingOrderEditDraft.status}
                onValueChange={(value) => setCuttingOrderEditDraft((current) => ({ ...current, status: value as CuttingOrderStatus }))}
              >
              <SelectTrigger className="h-11 bg-white">
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="EMPTY">Empty</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="ONGOING">Ongoing</SelectItem>
                  <SelectItem value="DEPART">Depart</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>
          <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsEditCuttingOrderModalOpen(false)} className="text-[10px] font-black uppercase">Cancel</Button>
            <Button className="bg-anflocor-green hover:bg-anflocor-green/90 text-white text-[10px] font-black uppercase h-10 px-6" onClick={handleSaveCuttingOrderEdit}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Start Transfer Modal */}
      <Dialog
        open={isTransferModalOpen}
        onOpenChange={(open) => {
          setIsTransferModalOpen(open);
          if (!open) {
            setSelectedTripForTransfer(null);
            setTransferInspection({
              inboundDriverName: '',
              outboundDriverName: '',
              temperature: false,
              noLeaks: false,
              checkDrainPlug: false,
              noOdor: false,
              photos: [],
            });
          }
        }}
      >
        <DialogContent className="max-w-[700px] p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-6 flex justify-between items-center border-b">
            <DialogTitle className="text-xl font-bold text-gray-900 tracking-tight">
              Edit Transfer - {selectedTripForTransfer?.vanNo || 'N/A'}
            </DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => closeTransferModal()}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="p-8 grid grid-cols-2 gap-10">
            <div className="space-y-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">INBOUND DRIVER NAME</Label>
                <Input
                  placeholder="Enter driver name"
                  className="h-11 bg-gray-50/50 border-gray-200"
                  value={transferInspection.inboundDriverName}
                  onChange={(e) => setTransferInspection({ ...transferInspection, inboundDriverName: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">INSPECTION CHECKLIST</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="temp"
                      className="border-gray-300"
                      checked={transferInspection.temperature}
                      onCheckedChange={(checked) =>
                        setTransferInspection({ ...transferInspection, temperature: Boolean(checked) })
                      }
                    />
                    <label htmlFor="temp" className="text-sm font-medium text-gray-600">Temperature</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="leaks"
                      className="border-gray-300"
                      checked={transferInspection.noLeaks}
                      onCheckedChange={(checked) =>
                        setTransferInspection({ ...transferInspection, noLeaks: Boolean(checked) })
                      }
                    />
                    <label htmlFor="leaks" className="text-sm font-medium text-gray-600">No Leaks</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="drain"
                      className="border-gray-300"
                      checked={transferInspection.checkDrainPlug}
                      onCheckedChange={(checked) =>
                        setTransferInspection({ ...transferInspection, checkDrainPlug: Boolean(checked) })
                      }
                    />
                    <label htmlFor="drain" className="text-sm font-medium text-gray-600">Check Drain Plug</label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="odor"
                      className="border-gray-300"
                      checked={transferInspection.noOdor}
                      onCheckedChange={(checked) =>
                        setTransferInspection({ ...transferInspection, noOdor: Boolean(checked) })
                      }
                    />
                    <label htmlFor="odor" className="text-sm font-medium text-gray-600">No Odor</label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OUTBOUND DRIVER NAME</Label>
                <Input
                  placeholder="Enter driver name"
                  className="h-11 bg-gray-50/50 border-gray-200"
                  value={transferInspection.outboundDriverName}
                  onChange={(e) => setTransferInspection({ ...transferInspection, outboundDriverName: e.target.value })}
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DOCUMENT ACTIONS</Label>
                <div className="flex gap-4">
                  <Button 
                    className="flex-1 h-12 bg-black text-white font-bold text-xs uppercase tracking-widest gap-2"
                    onClick={() => { closeTransferModal(true); setIsVlsModalOpen(true); }}
                  >
                    <Plus className="h-4 w-4" /> {hasExistingVls ? 'EDIT VLS' : 'CREATE VLS'}
                  </Button>
                  <Button variant="outline" className="flex-1 h-12 border-gray-200 font-bold text-xs uppercase tracking-widest gap-2" onClick={openDrModal}>
                    <Plus className="h-4 w-4" /> {hasExistingDr ? 'EDIT DR' : 'CREATE DR'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PHOTO CONFIRMATION</Label>
              <div className="grid grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => transferPhotoInputRef.current?.click()}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Camera className="h-6 w-6 text-gray-400" />
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-tighter">UPLOAD</span>
                </button>
                {Array.from({ length: 4 }).map((_, i) => {
                  const photoUrl = transferInspection.photos[i];
                  return (
                    <div key={i} className="aspect-square rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden">
                      {photoUrl ? (
                        <img src={photoUrl} alt={`Transfer upload ${i + 1}`} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-gray-200" />
                      )}
                    </div>
                  );
                })}
              </div>
              <input
                ref={transferPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleTransferPhotoPick}
              />
              <p className="text-[10px] font-medium text-gray-400">Up to 5 photos can be uploaded for loading verification.</p>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50 border-t flex justify-end">
            <Button 
              className="h-12 px-12 bg-anflocor-green hover:bg-anflocor-green/90 text-white font-black text-xs tracking-widest gap-3 shadow-lg uppercase" 
              onClick={handleSaveTransfer}
            >
              <Truck className="h-4 w-4" /> SAVE
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderContent = () => {
    if (activeView === 'dashboard') {
      return (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center space-x-2 mb-6"><div className="h-8 w-1 bg-anflocor-green rounded-full" /><h2 className="text-xl font-bold text-gray-800">Production Overview</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border-l-4 border-l-indigo-700"><CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Pending manifests</CardDescription></CardHeader><CardContent><p className="text-3xl font-black text-gray-900">{contracts?.filter((c: any) => c.status === 'pending').length || 0}</p></CardContent></Card>
            <Card className="bg-white border-l-4 border-l-emerald-600"><CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Active Bookings</CardDescription></CardHeader><CardContent><p className="text-3xl font-black text-gray-900">{bookings?.length || 0}</p></CardContent></Card>
            <Card className="bg-white border-l-4 border-l-amber-600"><CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Active Trips</CardDescription></CardHeader><CardContent><p className="text-3xl font-black text-gray-900">{trips?.length || 0}</p></CardContent></Card>
          </div>
        </section>
      );
    }
    if (activeView === 'loading-advice') return renderLoadingAdviceView();
    if (activeView === 'cutting-order') return renderCuttingOrdersView();
    if (activeView === 'bookings') return renderBookingsView();
    if (activeView === 'trips') return renderTripsView();
    return <div className="p-12 text-center text-gray-400">View implementation pending.</div>;
  };

  const renderLoadingAdviceView = () => (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f3f5f9] -m-8 p-4 md:p-6 lg:p-8 text-slate-900 animate-in fade-in duration-500">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[220px] flex-1 max-w-[300px]">
            <Select value={weekFilter} onValueChange={setWeekFilter}>
              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white text-sm shadow-sm">
                <SelectValue placeholder="Select Week Number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weeks</SelectItem>
                {weekOptions.map((week) => (
                  <SelectItem key={week} value={week}>
                    {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[220px] flex-1 max-w-[300px]">
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white text-sm shadow-sm">
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customerMappings?.map((customer: any) => (
                  <SelectItem key={customer.id} value={customer.Customer}>
                    {customer.Customer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto flex items-center gap-4 text-slate-600">
            <Bell className="h-4 w-4 cursor-pointer" />
            <HelpCircle className="h-4 w-4 cursor-pointer" />
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm">
                <User className="h-4 w-4" />
              </div>
              COORDINATOR
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span>Logistics</span>
              <ChevronRight className="h-3 w-3" />
              <span>Loading Advice</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-950">
              Loading Advice
            </h1>
          </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="h-10 rounded-sm border-slate-300 bg-white px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700 shadow-sm"
            onClick={() => openBookingBatchModal(selectedContract)}
          >
            CREATE/VIEW BOOKINGS
          </Button>
            <Button
              variant="outline"
              className="h-10 rounded-sm border-slate-300 bg-white px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700 shadow-sm"
              onClick={() => openCosModal(selectedLoadingAdviceRow || selectedContract || filteredLoadingAdviceRows[0] || null)}
            >
              CREATE/VIEW COS
            </Button>
            <Button
              className="h-10 rounded-sm bg-slate-950 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-sm hover:bg-slate-800"
              onClick={() => handleFinalizeLoadingAdviceForBooking(selectedContract || filteredLoadingAdviceRows[0] || null)}
              disabled={isFinalizingLoadingAdvice || !selectedContract}
            >
              {isFinalizingLoadingAdvice ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              READY FOR BOOKING
            </Button>
            <Button
              className="h-10 rounded-sm bg-emerald-700 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-sm hover:bg-emerald-800"
              onClick={() => setIsNewLAOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              NEW LA
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 md:px-5">
            <h2 className="text-sm font-bold text-slate-950">Recent Loading Advice Manifests</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-8 rounded-sm border-slate-300 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                <Filter className="mr-2 h-3.5 w-3.5" />
                Filter
              </Button>
              <Button variant="outline" className="h-8 rounded-sm border-slate-300 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                <Download className="mr-2 h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-100/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Week No.</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Farm</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Port of Loading</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Port of Destination</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Shipping Line</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Cut-Off Date</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">ETD</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Total Vans</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">SKU</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Palletization</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Workflow</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contractsLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="h-56 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700/50" />
                  </TableCell>
                </TableRow>
              ) : filteredLoadingAdviceRows.length > 0 ? (
                filteredLoadingAdviceRows.map((row) => (
                  <TableRow
                    key={row.id}
                    onClick={() => setSelectedContractId(row.contractId)}
                    className={cn(
                      'h-14 cursor-pointer hover:bg-slate-50',
                      selectedContractId === row.contractId && 'bg-emerald-50/70 ring-1 ring-inset ring-emerald-200'
                    )}
                  >
                    <TableCell className="px-3 py-3 font-semibold text-slate-900">{row.weekNumber}</TableCell>
                    <TableCell className="px-3 py-3 text-sm font-medium text-slate-700">{row.farm}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.pol}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.pod}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.shippingLine}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.cutOffDate}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.etd}</TableCell>
                    <TableCell className="px-3 py-3 text-sm font-semibold text-slate-900">{row.totalVans}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.sku}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.palletization}</TableCell>
                    <TableCell className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-bold uppercase tracking-wider text-[10px]',
                          getLoadingAdviceWorkflowStageClassName(row.workflowStage)
                        )}
                      >
                        {getLoadingAdviceWorkflowStageLabel(row.workflowStage)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={11} className="h-56 text-center text-sm text-slate-500">
                    No loading advice manifests match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );

  const renderBookingsView = () => (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f3f5f9] -m-8 p-4 md:p-6 lg:p-8 text-slate-900 animate-in fade-in duration-500">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-[220px] flex-1 max-w-[300px]">
            <Select value={weekFilter} onValueChange={setWeekFilter}>
              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white text-sm shadow-sm">
                <SelectValue placeholder="Select Week Number" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Weeks</SelectItem>
                {weekOptions.map((week) => (
                  <SelectItem key={week} value={week}>
                    {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-[220px] flex-1 max-w-[300px]">
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white text-sm shadow-sm">
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                {customerMappings?.map((customer: any) => (
                  <SelectItem key={customer.id} value={customer.Customer}>
                    {customer.Customer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="ml-auto flex items-center gap-4 text-slate-600">
            <Bell className="h-4 w-4 cursor-pointer" />
            <HelpCircle className="h-4 w-4 cursor-pointer" />
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white shadow-sm">
                <User className="h-4 w-4" />
              </div>
              COORDINATOR
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              <span>Logistics</span>
              <ChevronRight className="h-3 w-3" />
              <span>Bookings</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-950">
              Bookings
            </h1>
          </div>

          <Button
            className="h-10 rounded-sm bg-emerald-700 px-4 text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-sm hover:bg-emerald-800"
            onClick={() => openBookingBatchModal()}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>

        <Card className="overflow-hidden border-emerald-200 bg-emerald-50/60 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-200 px-4 py-3 md:px-5">
            <div>
              <h2 className="text-sm font-bold text-slate-950">Ready for Booking</h2>
              <p className="text-[11px] text-slate-600">Approved Loading Advice records waiting to be turned into bookings.</p>
            </div>
            <Badge variant="outline" className="border-emerald-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              {readyForBookingLoadingAdviceRows.length} Approved
            </Badge>
          </div>

          <Table>
            <TableHeader className="bg-white/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">LA No</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Customer</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Week No.</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Shipping Line</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">POD</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Workflow</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyForBookingLoadingAdviceRows.length > 0 ? (
                readyForBookingLoadingAdviceRows.map((row) => (
                  <TableRow key={row.id} className="h-14 bg-white hover:bg-emerald-50/70">
                    <TableCell className="px-3 py-3 font-semibold text-slate-900">{row.contractId}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.customerName}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.weekNumber}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.shippingLine}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.pod}</TableCell>
                    <TableCell className="px-3 py-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          'font-bold uppercase tracking-wider text-[10px]',
                          getLoadingAdviceWorkflowStageClassName(row.workflowStage)
                        )}
                      >
                        {getLoadingAdviceWorkflowStageLabel(row.workflowStage)}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <Button
                        className="h-8 rounded-sm bg-emerald-700 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white hover:bg-emerald-800"
                        onClick={() => openBookingBatchModal((contracts || []).find((contract: any) => contract.id === row.id) || null)}
                      >
                        Create Booking
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-sm text-slate-500">
                    No approved Loading Advice is ready for booking yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card className="relative overflow-hidden border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Active Bookings</div>
              <div className="mt-2 flex items-end gap-2">
                <div className="text-4xl font-black text-slate-950">{bookingListRows.length}</div>
                <div className="pb-1 text-[10px] font-bold text-emerald-600">+12%</div>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Currently in transit or processing</p>
            </CardContent>
            <Ship className="absolute bottom-3 right-3 h-20 w-20 text-slate-100" />
          </Card>
          <Card className="relative overflow-hidden border-slate-200 bg-white shadow-sm">
            <CardContent className="p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Containers Pending</div>
              <div className="mt-2 flex items-end gap-2">
                <div className="text-4xl font-black text-slate-950">{Math.max(filteredBookingRows.length - 0, 0)}</div>
                <div className="pb-1 text-[10px] font-bold text-red-600">Critical</div>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Awaiting port assignment</p>
            </CardContent>
            <Box className="absolute bottom-3 right-3 h-20 w-20 text-slate-100" />
          </Card>
        </div>

        <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 md:px-5">
            <h2 className="text-sm font-bold text-slate-950">Recent Booking Manifests</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-8 rounded-sm border-slate-300 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                <Filter className="mr-2 h-3.5 w-3.5" />
                Filter
              </Button>
              <Button variant="outline" className="h-8 rounded-sm border-slate-300 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
                <Download className="mr-2 h-3.5 w-3.5" />
                Export
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader className="bg-slate-100/80">
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Booking No</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Shipping Line</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Vessel</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">POD</TableHead>
                <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookingsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-56 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700/50" />
                  </TableCell>
                </TableRow>
              ) : filteredBookingRows.length > 0 ? (
                filteredBookingRows.map((row) => (
                  <TableRow key={row.id} className="h-14 hover:bg-slate-50">
                    <TableCell className="px-3 py-3 font-semibold text-emerald-700">{row.bookingNumber}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.shippingLine}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.vesselName}</TableCell>
                    <TableCell className="px-3 py-3 text-sm text-slate-700">{row.pod}</TableCell>
                    <TableCell className="px-3 py-3 text-right">
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-50">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-56 text-center text-sm text-slate-500">
                    No booking manifests found for the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50/50">
      <aside className="w-64 bg-anflocor-green text-white flex flex-col shrink-0 shadow-xl no-print">
        <div className="p-6 flex items-center space-x-3 border-b border-white/10"><div className="bg-white/10 p-2 rounded-lg"><Leaf className="h-6 w-6" /></div><span className="text-xl font-bold tracking-tighter">myProduce</span></div>
        <nav className="flex-1 p-4 space-y-1">
          <Button variant="ghost" onClick={() => navigateToView('dashboard')} className={cn("w-full justify-start text-white hover:bg-white/10", activeView === 'dashboard' && "bg-white/10")}><LayoutDashboard className="mr-3 h-5 w-5" />Dashboard</Button>
          <Button variant="ghost" onClick={() => navigateToView('loading-advice')} className={cn("w-full justify-start text-white hover:bg-white/10", activeView === 'loading-advice' && "bg-white/10")}><FileCheck className="mr-3 h-5 w-5" />Loading Advice</Button>
          <Button variant="ghost" onClick={() => navigateToView('bookings')} className={cn("w-full justify-start text-white hover:bg-white/10", activeView === 'bookings' && "bg-white/10")}><Ship className="mr-3 h-5 w-5" />Bookings</Button>
          <Button variant="ghost" onClick={() => navigateToView('cutting-order')} className={cn("w-full justify-start text-white hover:bg-white/10", activeView === 'cutting-order' && "bg-white/10")}><Scissors className="mr-3 h-5 w-5" />Cutting Orders</Button>
          <Button variant="ghost" onClick={() => navigateToView('trips')} className={cn("w-full justify-start text-white hover:bg-white/10", activeView === 'trips' && "bg-white/10")}><Truck className="mr-3 h-5 w-5" />Trips</Button>
        </nav>
        <div className="p-4 border-t border-white/10"><Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-white/70 hover:text-red-400"><LogOut className="mr-3 h-5 w-5" />Sign Out</Button></div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <div className="flex justify-end mb-4"><div className="flex items-center space-x-3 text-sm text-gray-400 font-medium"><User className="h-4 w-4" /><span>{user?.email} (Admin)</span></div></div>
        {renderContent()}
      </main>

      {/* NEW LOADING ADVICE MODAL */}
      <Dialog open={isNewLAOpen} onOpenChange={setIsNewLAOpen}>
        <DialogContent className="max-w-[1500px] w-[96vw] h-[92vh] p-0 overflow-hidden border-slate-200 bg-white">
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black text-slate-950">New Loading Advice</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Info className="h-4 w-4" />
                  <span>Multiple entries added here will be linked under a single transaction ID.</span>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-6 px-6 py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Customer</Label>
                    <Select value={newLAHeader.customerName} onValueChange={(v) => setNewLAHeader({ ...newLAHeader, customerName: v })}>
                      <SelectTrigger className="h-11 rounded-sm border-slate-300 bg-white text-sm shadow-sm">
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerMappings?.map((c: any) => (
                          <SelectItem key={c.id} value={c.Customer}>
                            {c.Customer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Week No</Label>
                    <Select value={newLAHeader.weekNumber} onValueChange={(v) => setNewLAHeader({ ...newLAHeader, weekNumber: v })}>
                      <SelectTrigger className="h-11 rounded-sm border-slate-300 bg-white text-sm shadow-sm">
                        <SelectValue placeholder="Select Week" />
                      </SelectTrigger>
                      <SelectContent>
                        {weekOptions.map((week) => (
                          <SelectItem key={week} value={week}>
                            {week}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-sm border border-slate-200 bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-100/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Farm</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Port of Loading</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Port of Destination</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Shipping Line</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Cut-Off Date</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">ETD</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Total Vans</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">SKU</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Palletization</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {laRows.map((row) => (
                        <TableRow key={row.id} className="hover:bg-transparent">
                          <TableCell className="px-3 py-3 align-top">
                            <Select value={row.farm} onValueChange={(v) => setLaRows(laRows.map((r) => (r.id === row.id ? { ...r, farm: v } : r)))}>
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Anflocor">Anflocor</SelectItem>
                                <SelectItem value="TADECO">TADECO</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select value={row.pol} onValueChange={(v) => setLaRows(laRows.map((r) => (r.id === row.id ? { ...r, pol: v } : r)))}>
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {polMappings?.map((p: any) => (
                                  <SelectItem key={p.id} value={p.portName}>
                                    {p.portName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select value={row.pod} onValueChange={(v) => setLaRows(laRows.map((r) => (r.id === row.id ? { ...r, pod: v } : r)))}>
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="City/Port" />
                              </SelectTrigger>
                              <SelectContent>
                                {podMappings?.map((p: any) => (
                                  <SelectItem key={p.id} value={p.portName}>
                                    {p.portName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Input
                              value={row.shippingLine}
                              onChange={(e) => setLaRows(laRows.map((r) => (r.id === row.id ? { ...r, shippingLine: e.target.value } : r)))}
                              placeholder="Select"
                              className="h-10 rounded-sm border-slate-300 bg-white shadow-sm"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Input
                              type="date"
                              value={row.cutOffDate}
                              onChange={(e) => setLaRows(laRows.map((r) => (r.id === row.id ? { ...r, cutOffDate: e.target.value } : r)))}
                              className="h-10 rounded-sm border-slate-300 bg-white shadow-sm text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Input
                              type="date"
                              value={row.etd}
                              onChange={(e) => setLaRows(laRows.map((r) => (r.id === row.id ? { ...r, etd: e.target.value } : r)))}
                              className="h-10 rounded-sm border-slate-300 bg-white shadow-sm text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Input
                              type="number"
                              value={row.totalVans}
                              onChange={(e) => setLaRows(laRows.map((r) => (r.id === row.id ? { ...r, totalVans: parseInt(e.target.value, 10) || 0 } : r)))}
                              className="h-10 rounded-sm border-slate-300 bg-white shadow-sm font-semibold"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Input
                              value={row.sku}
                              onChange={(e) => setLaRows(laRows.map((r) => (r.id === row.id ? { ...r, sku: e.target.value } : r)))}
                              placeholder="SKU Code"
                              className="h-10 rounded-sm border-slate-300 bg-white shadow-sm"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select value={row.palletization} onValueChange={(v) => setLaRows(laRows.map((r) => (r.id === row.id ? { ...r, palletization: v } : r)))}>
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Palletized">Palletized</SelectItem>
                                <SelectItem value="Non-Palletized">Non-Palletized</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => setLaRows(laRows.filter((r) => r.id !== row.id))}
                              disabled={laRows.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="border-t border-slate-200 px-4 py-3">
                    <Button variant="ghost" className="h-9 px-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" onClick={addLARow}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Row
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
                {laRows.reduce((acc, row) => acc + (Number(row.totalVans) || 0), 0)} TOTAL VANS
              </Badge>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setIsNewLAOpen(false)} className="px-6 text-sm font-semibold text-slate-600">
                  Cancel
                </Button>
                <Button className="h-10 rounded-sm bg-emerald-700 px-6 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-sm hover:bg-emerald-800" onClick={handleSaveLA}>
                  Submit Batch
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NEW BOOKING MODAL */}
      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogContent className="max-w-[1500px] w-[96vw] h-[92vh] p-0 overflow-hidden border-slate-200 bg-white">
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div className="space-y-1">
                <DialogTitle className="text-2xl font-black text-slate-950">New Booking Batch</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Info className="h-4 w-4" />
                  <span>Please ensure all manifest details match the physical Bill of Lading for verification.</span>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-6 px-6 py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Loading Advice</Label>
                    <Select value={bookingHeader.laId} onValueChange={handleBookingLaSelection}>
                      <SelectTrigger className="h-11 rounded-sm border-slate-300 bg-white text-sm shadow-sm">
                        <SelectValue placeholder="Select approved loading advice" />
                      </SelectTrigger>
                      <SelectContent>
                        {readyLoadingAdviceOptions.length > 0 ? (
                          readyLoadingAdviceOptions.map((contract: any) => (
                            <SelectItem key={contract.id} value={contract.id}>
                              {contract.contractId || contract.id} - {contract.customerName || 'Customer'} - Week {contract.weekNumber || '--'}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__none__" disabled>
                            No approved loading advice available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Customer</Label>
                    <Select
                      value={bookingHeader.customerName}
                      onValueChange={(v) => setBookingHeader({ ...bookingHeader, customerName: v })}
                      disabled={!bookingHeader.laId}
                    >
                      <SelectTrigger className="h-11 rounded-sm border-slate-300 bg-white text-sm shadow-sm">
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerMappings?.map((c: any) => (
                          <SelectItem key={c.id} value={c.Customer}>
                            {c.Customer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Week No</Label>
                    <Input
                      value={bookingHeader.weekNumber}
                      onChange={(e) => setBookingHeader({ ...bookingHeader, weekNumber: e.target.value })}
                      className="h-11 rounded-sm border-slate-300 bg-white shadow-sm"
                      disabled={!bookingHeader.laId}
                    />
                  </div>
                </div>

                <div className="rounded-sm border border-slate-200 bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-100/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12 px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">#</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Booking No.</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Shipping Line</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Vessel</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">POD</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Attachments</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookingRows.map((row, index) => (
                        <TableRow key={row.id} className="hover:bg-transparent">
                          <TableCell className="px-3 py-3 align-top text-sm font-bold text-slate-500">{index + 1}</TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Input
                              placeholder="Enter #"
                              className="h-10 rounded-sm border-slate-300 bg-white shadow-sm"
                              value={row.bookingNumber}
                              onChange={(e) => setBookingRows(bookingRows.map((r) => (r.id === row.id ? { ...r, bookingNumber: e.target.value.toUpperCase() } : r)))}
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select value={row.shippingLine} onValueChange={(v) => setBookingRows(bookingRows.map((r) => (r.id === row.id ? { ...r, shippingLine: v } : r)))}>
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {bookingShippingLineOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select value={row.vesselName} onValueChange={(v) => setBookingRows(bookingRows.map((r) => (r.id === row.id ? { ...r, vesselName: v } : r)))}>
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {bookingVesselOptions.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select value={row.pod} onValueChange={(v) => setBookingRows(bookingRows.map((r) => (r.id === row.id ? { ...r, pod: v } : r)))}>
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Port" />
                              </SelectTrigger>
                              <SelectContent>
                                {podMappings?.map((p: any) => (
                                  <SelectItem key={p.id} value={p.portName}>
                                    {p.portName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Button
                              variant="outline"
                              className="h-10 w-full rounded-sm border-dashed border-slate-300 bg-white px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700 shadow-sm hover:bg-emerald-50"
                              onClick={() => {
                                const value = window.prompt('Enter an attachment reference or URL', row.attachmentUrl || '');
                                if (value !== null) {
                                  setBookingRows(bookingRows.map((r) => (r.id === row.id ? { ...r, attachmentUrl: value } : r)));
                                }
                              }}
                            >
                              <Upload className="mr-2 h-3.5 w-3.5" />
                              {row.attachmentUrl ? 'Attached' : 'Upload'}
                            </Button>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() => setBookingRows(bookingRows.filter((r) => r.id !== row.id))}
                              disabled={bookingRows.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="border-t border-slate-200 px-4 py-3">
                    <Button variant="ghost" className="h-9 px-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800" onClick={addBookingRow}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Row
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                System audit: action will be logged under UID-4412
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setIsNewBookingOpen(false)} className="h-10 rounded-sm border-slate-300 px-6 text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
                  Cancel
                </Button>
                <Button className="h-10 rounded-sm bg-emerald-700 px-6 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-sm hover:bg-emerald-800" onClick={handleSaveBooking}>
                  Submit Batch
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* COS MODAL */}
      <Dialog open={isCosModalOpen} onOpenChange={setIsCosModalOpen}>
        <DialogContent className="max-w-[1500px] w-[96vw] h-[92vh] p-0 overflow-hidden border-slate-200 bg-white">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <Scissors className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-2xl font-black text-slate-950">Edit COs for this LA</DialogTitle>
                  <div className="text-sm text-slate-500">
                    Batch entry for Cutting Orders linked to Loading Advice: <span className="font-semibold text-slate-900">{cosHeader.laId || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 px-6 py-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Customer</Label>
                    <Select
                      value={cosHeader.customerName}
                      onValueChange={(value) => setCosHeader({ ...cosHeader, customerName: value })}
                    >
                      <SelectTrigger className="h-11 rounded-sm border-slate-300 bg-white shadow-sm">
                        <SelectValue placeholder="Select Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customerMappings?.map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.Customer}>
                            {customer.Customer}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Week No</Label>
                    <Input
                      value={cosHeader.weekNumber}
                      onChange={(e) => setCosHeader({ ...cosHeader, weekNumber: e.target.value })}
                      className="h-11 rounded-sm border-slate-300 bg-white shadow-sm"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">POD</Label>
                    <Select
                      value={cosHeader.pod}
                      onValueChange={(value) => {
                        setCosHeader({ ...cosHeader, pod: value });
                        setCosRows((rows) => rows.map((row) => ({ ...row, pod: row.pod || value })));
                      }}
                    >
                      <SelectTrigger className="h-11 rounded-sm border-slate-300 bg-white shadow-sm">
                        <SelectValue placeholder="Select POD" />
                      </SelectTrigger>
                      <SelectContent>
                        {podMappings?.map((pod: any) => (
                          <SelectItem key={pod.id} value={pod.portName}>
                            {pod.portName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-sm border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                  <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Containers Allocated</div>
                  <div className="flex flex-wrap items-stretch justify-between gap-4">
                    <div className="flex flex-wrap gap-3">
                      {cosSummary.length > 0 ? (
                        cosSummary.slice(0, 3).map((item) => (
                          <Card key={item.pod} className="min-w-[140px] rounded-sm border-slate-200 bg-white shadow-sm">
                            <CardContent className="p-4">
                              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-300">{item.pod}</div>
                              <div className="mt-1 text-xl font-black text-slate-900">
                                {item.allocated}/{item.total || 0}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <Card className="min-w-[140px] rounded-sm border-slate-200 bg-white shadow-sm">
                          <CardContent className="p-4">
                            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-300">{cosHeader.pod || 'POD'}</div>
                            <div className="mt-1 text-xl font-black text-slate-900">0/0</div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    <div className="ml-auto rounded-sm bg-black px-5 py-4 text-white shadow-sm">
                      <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">Total Allocation</div>
                      <div className="mt-1 text-lg font-black">
                        Total for week {cosHeader.weekNumber || '--'}: {totalCosAllocation}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-sm border border-slate-200 bg-white shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-100/80">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12 px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">#</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">PS</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Shipping Line</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Booking No</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Container No</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">ATW Status</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">POD</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Cut-Off Date</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">ETD</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">SKU</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Palletization</TableHead>
                        <TableHead className="px-3 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cosRows.map((row, index) => (
                        <TableRow key={row.id} className="h-14 hover:bg-transparent">
                          <TableCell className="px-3 py-3 align-top text-sm font-bold text-slate-500">{index + 1}</TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Input
                              value={row.ps}
                              onChange={(e) => setCosRows(cosRows.map((r) => (r.id === row.id ? { ...r, ps: e.target.value } : r)))}
                              className="h-10 rounded-sm border-slate-300 bg-white shadow-sm"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select value={row.shippingLine} onValueChange={(v) => setCosRows(cosRows.map((r) => (r.id === row.id ? { ...r, shippingLine: v } : r)))}>
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {bookingShippingLineOptions.length > 0 ? (
                                  bookingShippingLineOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="MAERSK">MAERSK</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select
                              value={row.bookingNumber}
                              onValueChange={(v) => {
                                const selectedBooking = bookingListRows.find((booking) => booking.bookingNumber === v);
                                setCosRows(
                                  cosRows.map((r) =>
                                    r.id === row.id
                                      ? {
                                          ...r,
                                          bookingNumber: v,
                                          shippingLine: selectedBooking?.shippingLine && selectedBooking.shippingLine !== '--' ? selectedBooking.shippingLine : r.shippingLine,
                                        }
                                      : r
                                  )
                                );
                              }}
                            >
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Select Booking No" />
                              </SelectTrigger>
                              <SelectContent>
                                {bookingNumberOptions.map((bookingNumber) => (
                                  <SelectItem key={bookingNumber} value={bookingNumber}>
                                    {bookingNumber}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select
                              value={row.containerNo}
                              onValueChange={(v) => setCosRows(cosRows.map((r) => (r.id === row.id ? { ...r, containerNo: v } : r)))}
                            >
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Select Container No" />
                              </SelectTrigger>
                              <SelectContent>
                                {containerNumberOptions.length > 0 ? (
                                  containerNumberOptions.map((containerNo) => (
                                    <SelectItem key={containerNo} value={containerNo}>
                                      {containerNo}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="N/A">N/A</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Badge
                              variant="outline"
                              onClick={() => setCosRows(cosRows.map((r) => (r.id === row.id ? { ...r, atwStatus: r.atwStatus === 'PENDING' ? 'READY' : r.atwStatus === 'READY' ? 'LOADED' : 'PENDING' } : r)))}
                              className={cn(
                                'cursor-pointer border px-2 py-1 text-[10px] font-bold',
                                row.atwStatus === 'PENDING' && 'border-red-200 bg-red-50 text-red-600',
                                row.atwStatus === 'READY' && 'border-amber-200 bg-amber-50 text-amber-600',
                                row.atwStatus === 'LOADED' && 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              )}
                            >
                              {row.atwStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select value={row.pod} onValueChange={(v) => setCosRows(cosRows.map((r) => (r.id === row.id ? { ...r, pod: v } : r)))}>
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                {podMappings?.map((p: any) => (
                                  <SelectItem key={p.id} value={p.portName}>
                                    {p.portName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Input
                              type="date"
                              value={row.cutOffDate}
                              onChange={(e) => setCosRows(cosRows.map((r) => (r.id === row.id ? { ...r, cutOffDate: e.target.value } : r)))}
                              className="h-10 rounded-sm border-slate-300 bg-white shadow-sm text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Input
                              type="date"
                              value={row.etd}
                              onChange={(e) => setCosRows(cosRows.map((r) => (r.id === row.id ? { ...r, etd: e.target.value } : r)))}
                              className="h-10 rounded-sm border-slate-300 bg-white shadow-sm text-xs"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Input
                              value={row.sku}
                              onChange={(e) => setCosRows(cosRows.map((r) => (r.id === row.id ? { ...r, sku: e.target.value } : r)))}
                              placeholder="SKU"
                              className="h-10 rounded-sm border-slate-300 bg-white shadow-sm"
                            />
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top">
                            <Select value={normalizePalletization(row.palletization)} onValueChange={(v) => setCosRows(cosRows.map((r) => (r.id === row.id ? { ...r, palletization: normalizePalletization(v) } : r)))}>
                              <SelectTrigger className="h-10 rounded-sm border-slate-300 bg-white shadow-sm">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Palletized">Palletized</SelectItem>
                                <SelectItem value="Non-Palletized">Non-Palletized</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="px-3 py-3 align-top text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              onClick={() => setCosRows(cosRows.filter((r) => r.id !== row.id))}
                              disabled={cosRows.length === 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </ScrollArea>

            <div className="border-t border-slate-200 bg-white px-6 py-4">
              <div className="mb-5">
                <Button
                  variant="ghost"
                  className="h-9 px-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                  onClick={() =>
                    setCosRows((rows) => [
                      ...rows,
                      createEmptyCOSRow(String(rows.length + 1), cosHeader.pod || ''),
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Row
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  System audit: action will be logged under UID-4412
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => setIsCosModalOpen(false)} className="h-10 rounded-sm border-slate-300 px-6 text-xs font-bold uppercase tracking-[0.18em] text-slate-700">
                    Cancel
                  </Button>
                  <Button className="h-10 rounded-sm bg-emerald-700 px-6 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-sm hover:bg-emerald-800" onClick={handleSaveCOS}>
                    Submit
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDrModalOpen} onOpenChange={setIsDrModalOpen}>
        <DialogContent className="max-w-[1500px] w-[96vw] h-[92vh] p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2 text-emerald-700">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black uppercase tracking-tight text-gray-900">
                    Boxed Banana Delivery Receipt
                  </DialogTitle>
                  <p className="text-xs font-medium text-gray-500">
                    Form No: 3107 <span className="ml-2 italic">Digital Capture Mode</span>
                  </p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 px-6 py-5">
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                  <div className="space-y-4 xl:col-span-2">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Date Prepared</Label>
                        <Input value={drHeader.datePrepared} onChange={(e) => setDrHeader({ ...drHeader, datePrepared: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Customer</Label>
                        <Input value={drHeader.customer} onChange={(e) => setDrHeader({ ...drHeader, customer: e.target.value })} className="h-10 bg-white font-bold uppercase" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Packing Station No.</Label>
                        <Input value={drHeader.packingStationNo} onChange={(e) => setDrHeader({ ...drHeader, packingStationNo: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Van No.</Label>
                        <Input value={drHeader.vanNo} onChange={(e) => setDrHeader({ ...drHeader, vanNo: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Hauler</Label>
                        <Input value={drHeader.hauler} onChange={(e) => setDrHeader({ ...drHeader, hauler: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Trip No.</Label>
                        <Input value={drHeader.tripNo} onChange={(e) => setDrHeader({ ...drHeader, tripNo: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Truck No.</Label>
                        <Input value={drHeader.truckNo} onChange={(e) => setDrHeader({ ...drHeader, truckNo: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Trailer/Chassis No.</Label>
                        <Input value={drHeader.trailerChassisNo} onChange={(e) => setDrHeader({ ...drHeader, trailerChassisNo: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Plate No.</Label>
                        <Input value={drHeader.plateNo} onChange={(e) => setDrHeader({ ...drHeader, plateNo: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Waybill No.</Label>
                        <Input value={drHeader.waybillNo} onChange={(e) => setDrHeader({ ...drHeader, waybillNo: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Seal No.</Label>
                        <Input value={drHeader.sealNo} onChange={(e) => setDrHeader({ ...drHeader, sealNo: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Shipping Lines</Label>
                        <Input value={drHeader.shippingLine} onChange={(e) => setDrHeader({ ...drHeader, shippingLine: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Vessel Name</Label>
                        <Input value={drHeader.vesselName} onChange={(e) => setDrHeader({ ...drHeader, vesselName: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Voyage</Label>
                        <Input value={drHeader.voyage} onChange={(e) => setDrHeader({ ...drHeader, voyage: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Port of Loading</Label>
                        <Input value={drHeader.portOfLoading} onChange={(e) => setDrHeader({ ...drHeader, portOfLoading: e.target.value })} className="h-10 bg-white" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Remarks</Label>
                        <Textarea value={drHeader.remarks} onChange={(e) => setDrHeader({ ...drHeader, remarks: e.target.value })} className="min-h-[44px] bg-white" placeholder="Add optional remarks..." />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-400">Operational Timeline</div>
                    <div className="space-y-3">
                      {[
                        ['vanArrivalAtPs', 'Van Arrival at PS'],
                        ['startOfLoading', 'Start of Loading'],
                        ['finishedLoading', 'Finished Loading'],
                        ['vanDeparture', 'Van Departure'],
                        ['wharfArrival', 'Wharf Arrival'],
                        ['startUnloading', 'Start Unloading'],
                        ['finishUnloading', 'Finish Unloading'],
                      ].map(([key, label]) => (
                        <div key={key} className="space-y-1.5">
                          <Label className="text-[9px] font-black uppercase text-slate-400">{label}</Label>
                          <Input
                            value={drHeader.operationalTimeline[key as keyof typeof drHeader.operationalTimeline]}
                            onChange={(e) =>
                              setDrHeader({
                                ...drHeader,
                                operationalTimeline: {
                                  ...drHeader.operationalTimeline,
                                  [key]: e.target.value,
                                },
                              })
                            }
                            className="h-9 bg-white text-xs"
                            placeholder="..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">Quantity Breakdown</div>
                    <Button variant="ghost" className="h-8 px-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50" onClick={() => setDrRows([...drRows, createEmptyDRRow()])}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Row
                    </Button>
                  </div>
                  <div className="overflow-hidden border border-slate-200 bg-white">
                    <Table>
                      <TableHeader className="bg-black">
                        <TableRow>
                          <TableHead className="text-[9px] font-black uppercase text-white">Destination</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-white">Pack Type</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-white">Class</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-white text-center">Quantity (Pack Date)</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-white text-center">Total Boxes / Type</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-white text-center">No. Pallets</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-white text-center">Total / Destination</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-white text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {drRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="p-2">
                              <Input className="h-9 bg-white text-xs font-bold uppercase" value={row.destination} onChange={(e) => setDrRows(drRows.map((r) => (r.id === row.id ? { ...r, destination: e.target.value } : r)))} />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input className="h-9 bg-white text-xs" value={row.packType} onChange={(e) => setDrRows(drRows.map((r) => (r.id === row.id ? { ...r, packType: e.target.value } : r)))} />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input className="h-9 bg-white text-xs text-center font-bold uppercase" value={row.classValue} onChange={(e) => setDrRows(drRows.map((r) => (r.id === row.id ? { ...r, classValue: e.target.value } : r)))} />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input className="h-9 bg-white text-xs text-center" value={row.quantity} onChange={(e) => setDrRows(drRows.map((r) => (r.id === row.id ? { ...r, quantity: e.target.value } : r)))} />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input className="h-9 bg-white text-xs text-center" value={row.totalBoxes} onChange={(e) => setDrRows(drRows.map((r) => (r.id === row.id ? { ...r, totalBoxes: e.target.value } : r)))} />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input className="h-9 bg-white text-xs text-center" value={row.noPallets} onChange={(e) => setDrRows(drRows.map((r) => (r.id === row.id ? { ...r, noPallets: e.target.value } : r)))} />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input className="h-9 bg-white text-xs text-center" value={row.totalDestination} onChange={(e) => setDrRows(drRows.map((r) => (r.id === row.id ? { ...r, totalDestination: e.target.value } : r)))} />
                            </TableCell>
                            <TableCell className="p-2 text-center">
                              <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-50 hover:text-red-600" onClick={() => setDrRows(drRows.filter((r) => r.id !== row.id))} disabled={drRows.length === 1}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-100">
                          <TableCell className="text-[10px] font-black uppercase text-slate-500">Total Boxes Produced</TableCell>
                          <TableCell />
                          <TableCell />
                          <TableCell className="text-center font-black text-slate-900">{drTotalBoxes}</TableCell>
                          <TableCell className="text-center font-black text-slate-900">{drTotalBoxes}</TableCell>
                          <TableCell />
                          <TableCell className="text-center font-black text-slate-900">{drTotalBoxes}</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-sm bg-white px-4 py-2">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                      <div
                        role="button"
                        tabIndex={0}
                        className="text-center cursor-pointer select-none rounded-lg px-2 py-1 hover:bg-slate-50"
                        onClick={() => openPreparedBySignatureModal('dr')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openPreparedBySignatureModal('dr');
                          }
                        }}
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Prepared By</p>
                        {drVerification.preparedBy.signatureDataUrl ? (
                          <img
                            src={drVerification.preparedBy.signatureDataUrl}
                            alt="DR prepared by signature"
                            className="mx-auto h-14 max-w-full object-contain"
                          />
                        ) : (
                          <div className="h-14" />
                        )}
                        <div className="mx-auto my-2 h-px w-44 bg-slate-200" />
                        <p className="text-[10px] font-bold text-slate-700">Prepared by:</p>
                        <p className="text-[9px] font-black uppercase text-slate-400">{drVerification.preparedBy.role}</p>
                      </div>
                      {[
                        ['?', 'Noted by:', 'PACKING STATION SUPERVISOR'],
                        ['?', 'Confirmed by:', "BUYER'S REPRESENTATIVE"],
                      ].map(([name, label, role], idx) => (
                        <div key={idx} className="text-center">
                          <p className="text-[10px] italic font-black text-slate-400">{name}</p>
                          <div className="mx-auto my-2 h-px w-44 bg-slate-200" />
                          <p className="text-[10px] font-bold text-slate-700">{label}</p>
                          <p className="text-[9px] font-black uppercase text-slate-400">{role}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-sm border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Received By</div>
                    <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-sm font-black uppercase text-slate-700">{drVerification.receivedBy.name}</div>
                        <div className="mt-2 h-px w-full bg-slate-200" />
                        <p className="mt-2 text-[9px] font-black uppercase text-slate-400">Truck Driver</p>
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase text-slate-700">{drVerification.receivedBy.role}</div>
                        <div className="mt-2 h-px w-full bg-slate-200" />
                        <p className="mt-2 text-[9px] font-black uppercase text-slate-400">Receiving Checker</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between border-t bg-white px-6 py-4">
              <div className="flex items-center gap-4 text-[10px] font-semibold uppercase tracking-[0.16em]">
                <span className="text-slate-500">Last Sync: 2 mins ago</span>
                <span className="text-emerald-700">Verified compliant</span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  className="h-10 rounded-sm border-slate-300 px-6 text-xs font-bold uppercase tracking-[0.18em] text-slate-700"
                  onClick={() => handleSaveDr(false)}
                  disabled={isSavingDr}
                >
                  {isSavingDr ? 'Saving...' : 'Save Draft'}
                </Button>
                <Button
                  className="h-10 rounded-sm bg-emerald-700 px-6 text-xs font-bold uppercase tracking-[0.18em] text-white shadow-sm hover:bg-emerald-800"
                  onClick={() => handleSaveDr(true)}
                  disabled={isSavingDr}
                >
                  {isSavingDr ? 'Saving...' : 'Finalize Receipt'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VLS MODAL */}
      <Dialog open={isVlsModalOpen} onOpenChange={setIsVlsModalOpen}>
        <DialogContent className="max-w-[95vw] w-full p-0 overflow-hidden h-[90vh] flex flex-col">
          <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><FileCheck className="h-6 w-6 text-anflocor-green" /></div>
              <DialogTitle className="text-xl font-bold text-gray-900">Create Van Loading Summary</DialogTitle>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-white">
            <Tabs value={vlsType} onValueChange={(val: any) => setVlsType(val)} className="w-full">
              <TabsList className="bg-gray-100 p-1 w-fit mb-8">
                <TabsTrigger value="palletized" className="data-[state=active]:bg-white data-[state=active]:text-anflocor-green font-black uppercase text-[10px] tracking-widest px-8">PALLETIZED</TabsTrigger>
                <TabsTrigger value="non-palletized" className="data-[state=active]:bg-white data-[state=active]:text-anflocor-green font-black uppercase text-[10px] tracking-widest px-8">NON-PALLETIZED</TabsTrigger>
              </TabsList>

              <TabsContent value="palletized" className="space-y-10 mt-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-anflocor-green rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">LOGISTICS MANIFEST INFO</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">DATE PREPARED</Label>
                      <Input type="date" value={vlsManifest.datePrepared} onChange={(e) => setVlsManifest({...vlsManifest, datePrepared: e.target.value})} className="h-10" />
                    </div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">WAYBILL NO.</Label><Input value={vlsManifest.waybillNo} onChange={(e) => setVlsManifest({...vlsManifest, waybillNo: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">HAULER</Label><Input value={vlsManifest.hauler} onChange={(e) => setVlsManifest({...vlsManifest, hauler: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">TRUCK NO.</Label><Input value={vlsManifest.truckNo} onChange={(e) => setVlsManifest({...vlsManifest, truckNo: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">PLATE NO.</Label><Input value={vlsManifest.plateNo} onChange={(e) => setVlsManifest({...vlsManifest, plateNo: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">TRIP NO.</Label><Input value={vlsManifest.tripNo} onChange={(e) => setVlsManifest({...vlsManifest, tripNo: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">VAN NO.</Label><Input value={vlsManifest.vanNo} onChange={(e) => setVlsManifest({...vlsManifest, vanNo: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">SEAL NO.</Label><Input value={vlsManifest.sealNo} onChange={(e) => setVlsManifest({...vlsManifest, sealNo: e.target.value})} className="h-10" /></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-12 pt-8 border-t">
                  <div className="col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-anflocor-green rounded-full"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">LOADING DIAGRAM - TOP VIEW</h3>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold text-gray-400">20 PALLETS CAPACITY</Badge>
                    </div>
                    <div className="bg-gray-50 p-10 rounded-2xl border-2 border-dashed border-gray-200">
                      <div className="grid grid-cols-10 grid-rows-2 gap-4 h-64">
                        {Array.from({ length: 20 }).map((_, i) => {
                          const palletRows = palletsData[i.toString()] || [];
                          const palletSkus = palletRows
                            .map((item) => item.skuNo || item.packType || '')
                            .filter(Boolean);

                          return (
                            <div
                              key={i}
                              onClick={() => handleOpenPalletDetails(i.toString())}
                              className={cn(
                                "relative group cursor-pointer rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1 px-2 text-center overflow-hidden",
                                palletRows.length > 0
                                  ? "bg-green-50 border-anflocor-green shadow-md shadow-green-100"
                                  : "bg-white border-gray-100 hover:border-anflocor-green/30 hover:bg-gray-50"
                              )}
                            >
                              <span className="text-[10px] font-black text-gray-300 group-hover:text-anflocor-green/40">#{i + 1}</span>
                              {palletRows.length > 0 ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <Box className="h-5 w-5 text-anflocor-green" />
                                  <div className="flex max-h-12 flex-col items-center gap-0.5 overflow-hidden">
                                    {palletSkus.map((sku, skuIndex) => (
                                      <span key={`${sku}-${skuIndex}`} className="text-[8px] font-black uppercase leading-none text-anflocor-green">
                                        {sku}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <Plus className="h-5 w-5 text-gray-100 group-hover:text-anflocor-green/20" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2"><div className="w-1 h-4 bg-anflocor-green rounded-full"></div><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">BREAKDOWN SUMMARY</h3></div>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 min-h-[300px]">
                      <Table>
                        <TableHeader><TableRow className="hover:bg-transparent border-b-2 border-gray-200"><TableHead className="text-[9px] font-black uppercase text-gray-400 h-8">SKU NO.</TableHead><TableHead className="text-[9px] font-black uppercase text-gray-400 h-8 text-right">QTY</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {getAggregatedSummary().map((item, idx) => (<TableRow key={idx} className="border-none h-10"><TableCell className="font-medium text-xs text-gray-600">{item.packType}</TableCell><TableCell className="text-right font-black text-anflocor-green text-xs">{item.qty}</TableCell></TableRow>))}
                        </TableBody>
                        <TableFooter className="bg-transparent border-t-2 border-gray-200">
                          <TableRow><TableCell className="text-[10px] font-black uppercase text-gray-400">TOTAL BOXES</TableCell><TableCell className="text-right font-black text-anflocor-green text-lg">{getAggregatedSummary().reduce((acc, curr) => acc + curr.qty, 0)}</TableCell></TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="non-palletized" className="space-y-10 mt-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-anflocor-green rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">LOGISTICS MANIFEST INFO</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">DATE PREPARED</Label><Input type="date" value={vlsManifest.datePrepared} onChange={(e) => setVlsManifest({...vlsManifest, datePrepared: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">WAYBILL NO.</Label><Input value={vlsManifest.waybillNo} onChange={(e) => setVlsManifest({...vlsManifest, waybillNo: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">HAULER</Label><Input value={vlsManifest.hauler} onChange={(e) => setVlsManifest({...vlsManifest, hauler: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">TRUCK NO.</Label><Input value={vlsManifest.truckNo} onChange={(e) => setVlsManifest({...vlsManifest, truckNo: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">PLATE NO.</Label><Input value={vlsManifest.plateNo} onChange={(e) => setVlsManifest({...vlsManifest, plateNo: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">TRIP NO.</Label><Input value={vlsManifest.tripNo} onChange={(e) => setVlsManifest({...vlsManifest, tripNo: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">VAN NO.</Label><Input value={vlsManifest.vanNo} onChange={(e) => setVlsManifest({...vlsManifest, vanNo: e.target.value})} className="h-10" /></div>
                    <div className="space-y-1.5"><Label className="text-[9px] font-bold text-gray-400 uppercase">SEAL NO.</Label><Input value={vlsManifest.sealNo} onChange={(e) => setVlsManifest({...vlsManifest, sealNo: e.target.value})} className="h-10" /></div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-12 pt-8 border-t">
                  <div className="col-span-2 space-y-6">
                    <div className="flex items-center gap-2"><div className="w-1 h-4 bg-anflocor-green rounded-full"></div><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">FLOOR-LOADED BOXES (NON-PALLETIZED)</h3></div>
                    <div className="bg-white p-0 rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                      <ScrollArea className="h-[400px]">
                        <Table className="border-collapse">
                          <TableHeader className="bg-[#f8fafc] sticky top-0 z-10">
                            <TableRow className="hover:bg-transparent border-b">
                              <TableHead className="text-[9px] font-black uppercase text-[#64748b] border-r w-16 text-center h-10">ROW</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-[#64748b] border-r text-center h-10">COL 1</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-[#64748b] border-r text-center h-10">COL 2</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-[#64748b] border-r text-center h-10">COL 3</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-[#64748b] border-r text-center h-10">COL 4</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-[#64748b] border-r text-center h-10">COL 5</TableHead>
                              <TableHead className="text-[9px] font-black uppercase text-[#64748b] text-center h-10">COL 6</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Array.from({ length: 32 }).map((_, rIdx) => (
                              <TableRow key={rIdx} className="hover:bg-transparent border-b last:border-none h-8">
                                <TableCell className="text-center text-[9px] font-black text-[#64748b] border-r bg-[#f8fafc] py-1">{rIdx + 1}</TableCell>
                                <TableCell onClick={() => handleOpenPalletDetails(`${rIdx}-0`)} className={cn("text-center text-[10px] font-bold border-r cursor-pointer transition-colors py-1", floorLoadData[`${rIdx}-0`]?.length > 0 ? "bg-green-50 text-anflocor-green" : "hover:bg-gray-50 text-[#cbd5e1]")}>{floorLoadData[`${rIdx}-0`]?.map(i => i.packType).filter(Boolean).join(', ') || '-'}</TableCell>
                                {Array.from({ length: 5 }).map((_, cIdx) => {
                                  const actualCol = cIdx + 1;
                                  const cellKey = `${rIdx}-${actualCol}`;
                                  if (rIdx < 22) {
                                    return (
                                      <TableCell key={cIdx} onClick={() => handleOpenPalletDetails(cellKey)} className={cn("text-center text-[10px] font-bold border-r last:border-none cursor-pointer transition-colors py-1", floorLoadData[cellKey]?.length > 0 ? "bg-green-50 text-anflocor-green" : "hover:bg-gray-50 text-[#cbd5e1]")}>
                                        {floorLoadData[cellKey]?.map(i => i.packType).filter(Boolean).join(', ') || '-'}
                                      </TableCell>
                                    );
                                  }
                                  return <TableCell key={cIdx} className="bg-gray-100/20 border-r last:border-none cursor-not-allowed py-1" />;
                                })}
                              </TableRow>
                            ))}
                            <TableRow className="bg-[#f8fafc] hover:bg-[#f8fafc] h-10"><TableCell className="text-center text-[9px] font-black text-[#64748b] border-r uppercase">VACANT</TableCell><TableCell colSpan={6} className="text-center text-[10px] font-black text-[#cbd5e1] uppercase tracking-widest">VACANT AREA</TableCell></TableRow>
                          </TableBody>
                        </Table>
                      </ScrollArea>
                      <div className="p-4 border-t bg-white"><p className="text-[10px] italic text-[#64748b]">Note: Loading Diagram for 13.5kg loose packs. Pattern for 1,556 boxes (Non-Palletized)</p></div>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-2"><div className="w-1 h-4 bg-anflocor-green rounded-full"></div><h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">BREAKDOWN SUMMARY</h3></div>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 min-h-[150px]">
                      <Table>
                        <TableHeader><TableRow className="hover:bg-transparent border-b-2 border-gray-200"><TableHead className="text-[9px] font-black uppercase text-gray-400 h-8">PACK TYPE</TableHead><TableHead className="text-[9px] font-black uppercase text-gray-400 h-8 text-right">QTY</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {getAggregatedSummary().map((item, idx) => (<TableRow key={idx} className="border-none h-10"><TableCell className="font-medium text-xs text-gray-600">{item.packType}</TableCell><TableCell className="text-right font-black text-anflocor-green text-xs">{item.qty}</TableCell></TableRow>))}
                        </TableBody>
                        <TableFooter className="bg-transparent border-t-2 border-gray-200">
                          <TableRow><TableCell className="text-[10px] font-black uppercase text-gray-400">TOTAL BOXES</TableCell><TableCell className="text-right font-black text-anflocor-green text-lg">{getAggregatedSummary().reduce((acc, curr) => acc + curr.qty, 0)}</TableCell></TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                    <div className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm space-y-6">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          openPreparedBySignatureModal('vls');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openPreparedBySignatureModal('vls');
                          }
                        }}
                        className="space-y-1 cursor-pointer select-none rounded-lg px-2 py-1 hover:bg-slate-50"
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Prepared By</p>
                        {verificationData.preparedBy.signatureDataUrl ? (
                          <img
                            src={verificationData.preparedBy.signatureDataUrl}
                            alt="Prepared By signature"
                            className="h-14 max-w-full object-contain"
                          />
                        ) : (
                          <div className="h-14" />
                        )}
                        <div className="h-px w-full bg-gray-200" />
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{verificationData.preparedBy.role}</p>
                      </div>
                      <div className="space-y-1 px-2 py-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Checked By</p>
                        <p className="text-lg font-black text-gray-900">{verificationData.checkedBy.name}</p>
                        <div className="h-px w-full bg-gray-200" />
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{verificationData.checkedBy.role}</p>
                      </div>
                      <div className="space-y-1 px-2 py-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Approved for Delivery</p>
                        <p className="text-lg font-black text-gray-900">{verificationData.approvedBy.name}</p>
                        <div className="h-px w-full bg-gray-200" />
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{verificationData.approvedBy.role}</p>
                      </div>
                      <div className="space-y-1 px-2 py-1">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Received By (Hauler)</p>
                        <p className="text-lg font-black text-gray-900 italic">{verificationData.receivedBy.name}</p>
                        <div className="h-px w-full bg-gray-200" />
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{verificationData.receivedBy.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={() => setIsVlsModalOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-400">DISCARD</Button>
            <Button
              className="h-12 px-12 bg-anflocor-green hover:bg-anflocor-green/90 text-white font-black text-[10px] tracking-widest uppercase gap-2"
              onClick={handleSaveVls}
              disabled={isSavingVls}
            >
              <FileSignature className="h-4 w-4" /> {isSavingVls ? 'SAVING...' : 'GENERATE VLS'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pallet Details Sub-Modal */}
      <Dialog open={isPalletDetailsModalOpen} onOpenChange={setIsPalletDetailsModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
             <div className="flex items-center gap-3"><div className="bg-white p-2 rounded-lg border shadow-sm"><Box className="h-5 w-5 text-anflocor-green" /></div><DialogTitle className="text-sm font-bold uppercase tracking-tight">{vlsType === 'palletized' ? `Pallet Details #${parseInt(selectedPalletIndex || '0') + 1}` : `Box Details (Cell ${selectedPalletIndex})`}</DialogTitle></div>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => setIsPalletDetailsModalOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          <div className="p-8 space-y-6">
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {currentPalletRows.map((row, idx) => (
                   <div key={idx} className="grid grid-cols-12 gap-3 items-end group">
                      <div className="col-span-5 space-y-1.5"><Label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">PACK TYPE</Label><Input value={row.packType} onChange={(e) => setCurrentPalletRows(currentPalletRows.map((r, i) => i === idx ? { ...r, packType: e.target.value, skuNo: e.target.value } : r))} className="h-10 bg-gray-50 border-gray-100 font-bold text-xs" placeholder="e.g. 8V" /></div>
                      <div className="col-span-5 space-y-1.5"><Label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">QTY</Label><Input type="number" value={row.qty} onChange={(e) => setCurrentPalletRows(currentPalletRows.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))} className="h-10 bg-gray-50 border-gray-100 font-black text-xs text-center" placeholder="0" /></div>
                      <div className="col-span-1 pb-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-gray-200 hover:text-red-500 hover:bg-red-50" onClick={() => setCurrentPalletRows(currentPalletRows.filter((_, i) => i !== idx))} disabled={currentPalletRows.length === 1}><Trash2 className="h-3.5 w-3.5" /></Button></div>
                   </div>
                ))}
             </div>
             <Button variant="outline" className="w-full h-10 border-dashed border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-anflocor-green hover:border-anflocor-green/40 hover:bg-green-50/30 gap-2" onClick={() => setCurrentPalletRows([...currentPalletRows, { packType: '', qty: '', skuNo: '' }])}><Plus className="h-3 w-3" /> ADD ROW</Button>
          </div>
          <div className="p-4 bg-gray-50 border-t flex gap-2"><Button variant="ghost" onClick={() => setIsPalletDetailsModalOpen(false)} className="flex-1 text-[10px] font-black uppercase">CANCEL</Button><Button onClick={handleSavePalletDetails} className="flex-[2] bg-anflocor-green hover:bg-anflocor-green/90 text-white text-[10px] font-black uppercase h-10">SAVE DETAILS</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreparedByModalOpen} onOpenChange={setIsPreparedByModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
            <DialogTitle className="text-lg font-black text-gray-900">Edit Prepared By</DialogTitle>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase text-gray-400">Signature</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-[10px] font-black uppercase text-gray-500"
                  onClick={clearPreparedBySignature}
                >
                  Clear
                </Button>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
                <canvas
                  ref={preparedByCanvasRef}
                  className="h-[180px] w-full touch-none rounded-lg bg-white"
                  width={520}
                  height={180}
                  onPointerDown={startPreparedBySignature}
                  onPointerMove={drawPreparedBySignature}
                  onPointerUp={endPreparedBySignature}
                  onPointerLeave={endPreparedBySignature}
                  onPointerCancel={endPreparedBySignature}
                />
              </div>
              <p className="text-[10px] font-medium text-gray-400">Draw signature with mouse or touch.</p>
            </div>
          </div>
          <div className="p-4 bg-gray-50 border-t flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsPreparedByModalOpen(false)} className="text-[10px] font-black uppercase">Cancel</Button>
            <Button className="bg-anflocor-green hover:bg-anflocor-green/90 text-white text-[10px] font-black uppercase h-10 px-6" onClick={savePreparedBySignature}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isShippingDocsModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeShippingDocsModal();
          } else {
            setIsShippingDocsModalOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-lg h-[90vh] p-0 overflow-hidden bg-white border-none shadow-2xl flex flex-col">
          <div className="p-6 border-b bg-gray-50 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <FileText className="h-5 w-5 text-emerald-700" />
              </div>
              <DialogTitle className="text-base font-black text-gray-900">Shipping Documents Management</DialogTitle>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-0 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
              {shippingDocRows.map((doc) => (
                <div key={doc.label} className="flex items-center justify-between gap-4 px-3 py-4">
                  <div className="text-sm font-medium text-gray-700">{doc.label}</div>
                  <div className="flex items-center gap-2">
                    {doc.actions.map((action) => (
                      <Button
                        key={action}
                        variant={action === 'generate' ? 'default' : 'outline'}
                        className={cn(
                          'h-9 px-4 text-[10px] font-black uppercase tracking-widest gap-2',
                          action === 'generate'
                            ? 'bg-slate-800 text-white hover:bg-slate-900'
                            : 'border-gray-200 text-slate-700'
                        )}
                        onClick={() => {
                          if (action === 'generate' && doc.docType) {
                            openShippingDocEditor(doc.docType);
                            return;
                          }
                          if (action === 'view' && doc.docType) {
                            openShippingDocEditor(doc.docType);
                            return;
                          }
                          if (action === 'upload') {
                            openShippingDocUpload(doc.label);
                            return;
                          }
                          toast({
                            title: `${action.toUpperCase()} requested`,
                            description: `${doc.label} will be handled in a future upload/export flow.`,
                          });
                        }}
                      >
                        {action === 'generate' && <FileText className="h-3.5 w-3.5" />}
                        {action === 'upload' && <Upload className="h-3.5 w-3.5" />}
                        {action === 'view' && <Search className="h-3.5 w-3.5" />}
                        {action === 'download' && <Download className="h-3.5 w-3.5" />}
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end border-t bg-gray-50 px-6 py-4">
            <Button
              className="bg-emerald-700 px-8 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-800"
              onClick={closeShippingDocsModal}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isShippingDocUploadOpen}
        onOpenChange={(open) => {
          setIsShippingDocUploadOpen(open);
          if (!open) {
            setSelectedShippingDocFile(null);
            setSelectedShippingDocUploadType('');
          }
        }}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <Upload className="h-5 w-5 text-emerald-700" />
              </div>
              <DialogTitle className="text-lg font-black text-gray-900">Upload Document</DialogTitle>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Document Type</Label>
              <Input value={selectedShippingDocUploadType} readOnly className="h-10 bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black uppercase text-slate-400">Choose File</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => setSelectedShippingDocFile(e.target.files?.[0] || null)}
                className="h-10 bg-white"
              />
            </div>
            {selectedShippingDocFile && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                Selected: <span className="font-semibold">{selectedShippingDocFile.name}</span>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsShippingDocUploadOpen(false)} className="text-[10px] font-black uppercase">
              Cancel
            </Button>
            <Button
              className="bg-emerald-700 px-6 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-800"
              onClick={handleSaveShippingDocUpload}
            >
              Save Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShippingDocEditorOpen} onOpenChange={setIsShippingDocEditorOpen}>
        <DialogContent className="max-w-[96vw] w-[96vw] p-0 overflow-hidden bg-slate-100 border-none shadow-2xl h-[92vh] flex flex-col">
          <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2">
                <FileSignature className="h-5 w-5 text-emerald-700" />
              </div>
              <div>
                <DialogTitle className="text-base font-black text-gray-900">{selectedShippingDocType}</DialogTitle>
                <p className="text-[10px] font-medium text-gray-500">
                  {selectedShippingDocType} for {selectedTripForDocs?.vanNo || selectedTripForDocs?.tripId || 'selected trip'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => setIsShippingDocEditorOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[430px_1fr]">
              <div className="space-y-4">
                {renderShippingDocFields()}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Common Fields</div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-4">
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Reference No</Label>
                      <Input value={shippingDocDraft.referenceNo} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, referenceNo: e.target.value })} className="h-10 bg-slate-50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Issue Date</Label>
                      <Input type="date" value={shippingDocDraft.issueDate} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, issueDate: e.target.value })} className="h-10 bg-slate-50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Prepared By</Label>
                      <Input value={shippingDocDraft.preparedBy} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, preparedBy: e.target.value })} className="h-10 bg-slate-50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-slate-400">Recipient</Label>
                      <Input value={shippingDocDraft.recipient} onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, recipient: e.target.value })} className="h-10 bg-slate-50" />
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Notes / Editable Text</Label>
                    <Textarea
                      value={shippingDocDraft.body}
                      onChange={(e) => setShippingDocDraft({ ...shippingDocDraft, body: e.target.value })}
                      className="min-h-40 bg-slate-50 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">PDF Preview</div>
                {renderShippingDocPreview()}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t bg-white px-6 py-4 shrink-0">
            <Button variant="outline" className="h-10 px-6 text-[10px] font-black uppercase tracking-widest" onClick={() => setIsShippingDocEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              className="h-10 bg-emerald-700 px-6 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-800"
              onClick={handleSaveShippingDocDraft}
            >
              Save Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* NEW TRIP MODAL */}
      <Dialog open={isNewTripOpen} onOpenChange={(open) => { setIsNewTripOpen(open); if(!open) setTripStep(1); }}>
        <DialogContent className="max-w-[95vw] w-full p-0 overflow-hidden h-[90vh] flex flex-col">
          <div className="p-4 border-b bg-gray-50 border-l-4 border-l-green-600 shrink-0"><p className="text-sm font-medium">Please ensure all trip details match the physical manifest.</p></div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
            <div className="flex items-center justify-center max-w-2xl mx-auto mb-8">
              <button
                type="button"
                onClick={() => setTripStep(1)}
                className="flex flex-col items-center transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 border transition-all",
                  tripStep === 1
                    ? "bg-anflocor-green text-white border-anflocor-green shadow-md shadow-green-200"
                    : "bg-green-100 text-green-700 border-green-200 hover:border-green-300"
                )}>1</div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  tripStep === 1 ? "text-anflocor-green" : "text-gray-400"
                )}>CONTAINERS</span>
              </button>
              <div className={cn("w-24 h-[2px] mx-4 mb-6", tripStep === 2 ? "bg-anflocor-green" : "bg-gray-100")}></div>
              <button
                type="button"
                onClick={() => setTripStep(2)}
                className="flex flex-col items-center transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2 border transition-all",
                  tripStep === 2
                    ? "bg-anflocor-green text-white border-anflocor-green shadow-md shadow-green-200"
                    : "bg-gray-200 text-gray-500 border-gray-200 hover:border-gray-300"
                )}>2</div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  tripStep === 2 ? "text-anflocor-green" : "text-gray-500"
                )}>BIND CUTTING ORDER</span>
              </button>
            </div>

            {tripStep === 1 ? (
              <>
                <div className="grid grid-cols-2 gap-8 border-b pb-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Customer</Label>
                    <Select value={newTripHeader.customerName} onValueChange={(val) => setNewTripHeader({...newTripHeader, customerName: val})}>
                      <SelectTrigger className="h-12 bg-gray-50"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                      <SelectContent>{customerMappings?.map((c: any) => (<SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-400">Week Number</Label>
                    <Input className="h-12 bg-gray-50" value={newTripHeader.weekNumber} onChange={(e) => setNewTripHeader({...newTripHeader, weekNumber: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 bg-gray-50/50 p-6 rounded-xl border">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-gray-300">Booking No</Label>
                    <Select value={newTripHeader.bookingNo} onValueChange={(val) => {
                      const b = bookingListRows.find((bk: any) => bk.bookingNumber === val);
                      if (b) setNewTripHeader({
                        ...newTripHeader,
                        bookingNo: val,
                        bookingBatchId: b.batchId || '',
                        laId: b.laId || '',
                        shippingLine: b.shippingLine,
                        vessel: b.vesselName,
                        pod: b.pod,
                      });
                      else setNewTripHeader({...newTripHeader, bookingNo: val, bookingBatchId: '', laId: ''});
                    }}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="--Select--" /></SelectTrigger>
                      <SelectContent>{bookingNumberOptions.map((bookingNumber) => (<SelectItem key={bookingNumber} value={bookingNumber}>{bookingNumber}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-300">Shipping Line</Label><Input className="h-10 bg-white" value={newTripHeader.shippingLine} readOnly /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-300">Vessel</Label><Input className="h-10 bg-white" value={newTripHeader.vessel} readOnly /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-300">POD</Label><Input className="h-10 bg-white" value={newTripHeader.pod} readOnly /></div>
                </div>
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead className="w-12 text-center text-[9px] font-black uppercase">PS</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">CONTAINER NO.</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">VAN NO.</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">SEAL NO.</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">ATW STATUS</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">ATW RELEASED</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">PM NO.</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">DRIVER NAME</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">SIGNATURE</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">DATE WITHDRAWN</TableHead>
                      <TableHead className="w-12 text-[9px] font-black uppercase">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tripRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-center font-bold text-gray-400">{row.ps}</TableCell>
                        <TableCell><Input className="h-9 uppercase font-bold" value={row.containerNo} onChange={(e) => updateTripRow(row.id, { containerNo: e.target.value })}/></TableCell>
                        <TableCell><Input className="h-9 uppercase" value={row.vanNo} onChange={(e) => updateTripRow(row.id, { vanNo: e.target.value })}/></TableCell>
                        <TableCell><Input className="h-9 uppercase" value={row.sealNo} onChange={(e) => updateTripRow(row.id, { sealNo: e.target.value })}/></TableCell>
                        <TableCell className="text-center"><Badge variant="outline" className={cn("cursor-pointer font-bold", row.atwStatus === 'Y' ? "text-green-600 border-green-200 bg-green-50" : "text-red-600 border-red-200 bg-red-50")} onClick={() => updateTripRow(row.id, { atwStatus: row.atwStatus === 'Y' ? 'N' : 'Y' })}>{row.atwStatus}</Badge></TableCell>
                        <TableCell><Input type="date" className="h-9 text-[10px]" value={row.atwReleased} onChange={(e) => updateTripRow(row.id, { atwReleased: e.target.value })}/></TableCell>
                        <TableCell><Input className="h-9" placeholder="PM No." value={row.pmNo} onChange={(e) => updateTripRow(row.id, { pmNo: e.target.value })}/></TableCell>
                        <TableCell><Input className="h-9" placeholder="Driver Name" value={row.driverName} onChange={(e) => updateTripRow(row.id, { driverName: e.target.value })}/></TableCell>
                        <TableCell className="text-[10px] italic text-gray-400">Pending</TableCell>
                        <TableCell><Input type="date" className="h-9 text-[10px]" value={row.dateWithdrawn} onChange={(e) => updateTripRow(row.id, { dateWithdrawn: e.target.value })}/></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeTripRow(row.id)}><Trash2 className="h-4 w-4 text-red-300" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button variant="ghost" className="text-anflocor-green text-xs font-bold" onClick={addTripRow}><Plus className="h-4 w-4 mr-2" /> Add Row</Button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400">Customer</Label><Input className="h-12 bg-gray-50 font-bold" value={newTripHeader.customerName} readOnly /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400">Week Number</Label><Input className="h-12 bg-gray-50 font-bold" value={newTripHeader.weekNumber} readOnly /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400">Shipping Line</Label><Input className="h-12 bg-gray-50 font-bold" value={newTripHeader.shippingLine} readOnly /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400">POD</Label><Input className="h-12 bg-gray-50 font-bold" value={newTripHeader.pod} readOnly /></div>
                </div>
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow>
                      <TableHead className="w-12 text-[9px] font-black uppercase text-gray-400">#</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">PS</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">POD</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">CUT-OFF DATE</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">ETD</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">TASK DATE</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">SKU</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">PALLETIZATION</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">CONTAINER NO.</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center text-gray-400">STATUS</TableHead>
                      <TableHead className="w-12 text-[9px] font-black uppercase text-gray-400 text-center">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bindCoRows.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-[11px] font-bold text-gray-400">{index + 1}</TableCell>
                        <TableCell><Input className="h-9 bg-white border shadow-sm font-medium w-20" value={row.ps} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, ps: e.target.value } : r))}/></TableCell>
                        <TableCell><Input className="h-9 bg-white border shadow-sm font-medium w-24" value={row.pod} readOnly/></TableCell>
                        <TableCell><Input type="date" className="h-9 bg-white border shadow-sm text-xs" value={row.cutOffDate} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, cutOffDate: e.target.value } : r))}/></TableCell>
                        <TableCell><Input type="date" className="h-9 bg-white border shadow-sm text-xs" value={row.etd} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, etd: e.target.value } : r))}/></TableCell>
                        <TableCell><Input type="date" className="h-9 bg-white border shadow-sm text-xs" value={row.taskDate} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, taskDate: e.target.value } : r))}/></TableCell>
                        <TableCell><Input className="h-9 bg-white border shadow-sm font-medium w-24" value={row.sku} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, sku: e.target.value } : r))}/></TableCell>
                        <TableCell><Input className="h-9 bg-white border shadow-sm font-medium w-28" value={row.palletization} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, palletization: e.target.value } : r))}/></TableCell>
                        <TableCell>
                          <Select value={row.containerNo} onValueChange={(val) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, containerNo: val } : r))}>
                            <SelectTrigger className="h-9 bg-white border shadow-sm font-bold w-40"><SelectValue placeholder="Select Container" /></SelectTrigger>
                            <SelectContent>{tripRows.filter(tr => tr.containerNo).map(tr => (<SelectItem key={tr.id} value={tr.containerNo}>{tr.containerNo}</SelectItem>))}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-bold uppercase tracking-wider',
                              row.status === 'DEPART'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-amber-200 bg-amber-50 text-amber-700'
                            )}
                          >
                            {row.status || 'PENDING'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center"><Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setBindCoRows(bindCoRows.filter(r => r.id !== row.id))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={() => { setIsNewTripOpen(false); setTripStep(1); }} className="text-[10px] font-black uppercase">CANCEL</Button>
            {tripStep === 1 ? <Button className="bg-anflocor-green text-white text-[10px] font-black uppercase px-8 h-10" onClick={handleNextTripStep}>NEXT STEP</Button> : <Button className="bg-anflocor-green text-white text-[10px] font-black uppercase px-8 h-10 gap-2" onClick={handleSubmitTripBatch}>FINALIZE <CheckSquare className="h-4 w-4" /></Button>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
