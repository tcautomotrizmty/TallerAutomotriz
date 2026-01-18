
import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, Search, Plus, Settings, QrCode, ClipboardCheck, MessageCircle, 
  ChevronRight, ChevronLeft, Car, User, CheckCircle2, Clock, AlertCircle, Users, 
  BarChart3, Download, Trash2, ShieldCheck, LogOut, Mail, Lock, Edit2, X, Check,
  Package, Hammer, Layers, ListChecks, ArrowRight, ToggleLeft, ToggleRight,
  Printer, FileJson, Play, Square, UserPlus, Camera, Image as ImageIcon,
  History, Calendar, PlayCircle, CheckCircle, ChevronDown, ChevronUp, Palette,
  CircleDot, CheckCircle2 as CheckIcon, PlusCircle, Loader2, Filter,
  CheckSquare, Square as SquareIcon, Save, Layout
} from 'lucide-react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, setDoc, getDoc, collection, onSnapshot, query, 
  addDoc, updateDoc, deleteDoc, orderBy, where, Timestamp, getDocs, limit
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { 
  ViewMode, VehicleJob, ServiceType, RepairStatus, ItemStatus,
  UserRole, AppUser, JobItem, ItemType, ChatMessage, WorkshopSettings
} from './types';

const DEFAULT_CONFIG: WorkshopSettings = {
  name: "TC AUTOMOTRIZ MTY",
  slogan: "CALIDAD Y CONFIANZA",
  primaryColor: "#3b82f6",
  accentColor: "#60a5fa",
  invoiceTitle: "ORDEN DE SERVICIO",
  invoiceSubtitle: "COMPROBANTE DE RECEPCIÓN Y TRABAJO",
  invoiceFooter: "IMPORTANTE: Garantía de 30 días en mano de obra. Piezas eléctricas no tienen garantía."
};

const STATUS_LABELS: Record<RepairStatus, string> = {
  [RepairStatus.PENDING]: 'PENDIENTE',
  [RepairStatus.OPERATIONS]: 'EN OPERACIÓN',
  [RepairStatus.REASSEMBLY]: 'REARMADO',
  [RepairStatus.TESTING]: 'EN PRUEBAS',
  [RepairStatus.TESTING_OK]: 'PRUEBAS OK',
  [RepairStatus.CLEANING]: 'LIMPIEZA / DETALLADO',
  [RepairStatus.READY]: 'LISTO PARA ENTREGA',
  [RepairStatus.CANCELLED]: 'CANCELADO'
};

const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  [ItemStatus.PENDING]: 'PENDIENTE',
  [ItemStatus.IN_PROGRESS]: 'EN PROCESO',
  [ItemStatus.COMPLETED]: 'LISTO / OK'
};

const compressImage = (base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
      }
      resolve(canvas.toDataURL('image/jpeg', 0.3));
    };
    img.onerror = () => resolve(base64Str);
  });
};

const sanitizeData = (data: any): any => {
  if (Array.isArray(data)) return data.map(v => sanitizeData(v));
  if (data !== null && typeof data === 'object' && !(data instanceof Date) && !(data instanceof Timestamp)) {
    return Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, sanitizeData(v)])
    );
  }
  return data;
};

const ImageUploader = ({ onUpload, label, currentImage, isReadOnly }: { onUpload: (base64: string) => void, label: string, currentImage?: string, isReadOnly?: boolean }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompressing(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result as string);
          onUpload(compressed);
        } catch (err) {
          console.error("Error al procesar imagen:", err);
        } finally {
          setCompressing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 group">
      <div 
        onClick={() => !isReadOnly && !compressing && fileRef.current?.click()}
        className={`w-20 h-20 md:w-28 md:h-28 rounded-2xl md:rounded-3xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all relative ${currentImage ? 'border-blue-500 shadow-lg' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'} ${!isReadOnly && 'cursor-pointer'}`}
      >
        {compressing ? (
          <Loader2 className="w-5 h-5 md:w-6 md:h-6 text-blue-500 animate-spin" />
        ) : currentImage ? (
          <img src={currentImage} className="w-full h-full object-cover" alt="Evidencia" />
        ) : (
          <Camera className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
        )}
      </div>
      <input type="file" ref={fileRef} className="hidden" accept="image/*" capture="environment" onChange={handleFile} />
      <span className="text-[7px] md:text-[8px] font-black uppercase text-slate-500 tracking-tighter">{label}</span>
    </div>
  );
};

const Toast = ({ message, show }: { message: string, show: boolean }) => (
  <div className={`fixed bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 pointer-events-none ${show ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}`}>
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 whitespace-nowrap">
      <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
      <p className="font-black uppercase text-[8px] md:text-[10px] tracking-widest">{message}</p>
    </div>
  </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [workshop, setWorkshop] = useState<WorkshopSettings>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('CLIENT_TRACK');
  const [jobs, setJobs] = useState<VehicleJob[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activeJob, setActiveJob] = useState<VehicleJob | null>(null);
  const [toast, setToast] = useState({ show: false, message: '' });

  const ADMIN_EMAIL = 'tcautomotrizmty@gmail.com';

  const showSuccess = (msg: string) => {
    setToast({ show: true, message: msg });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docRef = doc(db, "users", u.uid);
          const docSnap = await getDoc(docRef);
          let pData: AppUser;
          if (docSnap.exists()) {
            pData = docSnap.data() as AppUser;
            if (u.email === ADMIN_EMAIL && pData.role !== UserRole.ADMIN) {
              await updateDoc(docRef, { role: UserRole.ADMIN });
              pData.role = UserRole.ADMIN;
            }
          } else {
            pData = { 
              id: u.uid, 
              name: u.displayName || u.email?.split('@')[0] || 'User', 
              email: u.email || '', 
              role: u.email === ADMIN_EMAIL ? UserRole.ADMIN : UserRole.CLIENT, 
              createdAt: Date.now() 
            };
            await setDoc(docRef, sanitizeData(pData));
          }
          setProfile(pData);
          if (pData.role !== UserRole.CLIENT) setView('STAFF_DASHBOARD');
        } catch (e) {
          console.error("Fallo al cargar perfil:", e);
        }
      } else {
        setProfile(null);
        setView('CLIENT_TRACK');
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "config", "workshop"), (s) => {
      if (s.exists()) setWorkshop({ ...DEFAULT_CONFIG, ...s.data() as WorkshopSettings });
    });

    if (!profile || profile.role === UserRole.CLIENT) return () => unsubConfig();

    const unsubJobs = onSnapshot(collection(db, "jobs"), 
      (snap) => {
        const data = snap.docs.map(d => ({ ...d.data(), id: d.id } as VehicleJob));
        setJobs(data.sort((a,b) => b.createdAt - a.createdAt));
        if (activeJob) {
          const upd = data.find(j => j.id === activeJob.id);
          if (upd) setActiveJob(upd);
        }
      }
    );

    const unsubServices = onSnapshot(collection(db, "services"), 
      (snap) => {
        setServices(snap.docs.map(d => ({ ...d.data(), id: d.id } as ServiceType)));
      }
    );

    let unsubUsers = () => {};
    if (profile.role === UserRole.ADMIN) {
      unsubUsers = onSnapshot(collection(db, "users"), 
        (snap) => {
          setUsers(snap.docs.map(d => d.data() as AppUser));
        }
      );
    }

    return () => { unsubConfig(); unsubJobs(); unsubServices(); unsubUsers(); };
  }, [profile, activeJob?.id]);

  const handleUpdateJob = async (job: VehicleJob) => {
    try {
      await updateDoc(doc(db, "jobs", job.id), sanitizeData(job));
      setActiveJob({...job});
      showSuccess("ORDEN ACTUALIZADA");
    } catch (e) { 
      console.error(e);
      alert("Error al actualizar. Verifique conexión."); 
    }
  };

  const exportHistoryCSV = () => {
    const historical = jobs.filter(j => j.overallStatus === RepairStatus.READY);
    if (!historical.length) return alert("No hay historial disponible.");
    const data = historical.map(j => ({ Folio: j.id, Cliente: j.clientName, Vehiculo: j.carModel, Placa: j.plate, Monto: j.totalBudget, Fecha: new Date(j.createdAt).toLocaleDateString() }));
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(r => Object.values(r).map(v => `"${v}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Historial_${workshop.name}.csv`;
    link.click();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>;
  if (!user) return <LoginView workshop={workshop} />;
  if (view === 'INVOICE_PRINT' && activeJob) return <InvoicePrintView job={activeJob} workshop={workshop} onBack={() => setView('STATION_SCAN')} />;

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 overflow-x-hidden">
      <Toast message={toast.message} show={toast.show} />
      <header className="sticky top-0 z-50 bg-slate-800/95 backdrop-blur-md border-b border-slate-700 p-3 md:p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden cursor-pointer" onClick={() => setView(profile?.role === UserRole.CLIENT ? 'CLIENT_TRACK' : 'STAFF_DASHBOARD')}>
            <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: workshop.primaryColor }}>
              <Wrench className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            <h1 className="text-sm md:text-xl font-black text-white tracking-tighter uppercase truncate max-w-[140px] md:max-w-none">{workshop.name}</h1>
          </div>
          <nav className="flex gap-1 md:gap-2 items-center">
            {profile?.role !== UserRole.CLIENT && (
              <>
                <button onClick={() => setView('STAFF_DASHBOARD')} title="Dashboard" className={`p-2 rounded-xl transition-colors ${view === 'STAFF_DASHBOARD' ? 'bg-white/10 text-white' : 'text-slate-400'}`}><ClipboardCheck className="w-5 h-5" /></button>
                <button onClick={() => setView('ADMIN_HISTORY')} title="Historial" className={`p-2 rounded-xl transition-colors ${view === 'ADMIN_HISTORY' ? 'bg-white/10 text-white' : 'text-slate-400'}`}><History className="w-5 h-5" /></button>
                {profile?.role === UserRole.ADMIN && (
                  <button onClick={() => setView('ADMIN_PANEL')} title="Administración" className={`p-2 rounded-xl transition-colors ${view === 'ADMIN_PANEL' ? 'bg-white/10 text-white' : 'text-slate-400'}`}><ShieldCheck className="w-5 h-5" /></button>
                )}
              </>
            )}
            <button onClick={() => signOut(auth)} className="ml-2 p-2 text-slate-500 hover:text-red-500 transition-colors"><LogOut className="w-5 h-5" /></button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-6 lg:p-8">
        {view === 'STAFF_DASHBOARD' && <StaffDashboard jobs={jobs.filter(j => j.overallStatus !== RepairStatus.READY)} workshop={workshop} onAdd={() => setView('RECEPTION')} onJob={(j:any) => { setActiveJob(j); setView('STATION_SCAN'); }} />}
        {view === 'ADMIN_HISTORY' && <AdminHistoryView jobs={jobs.filter(j => j.overallStatus === RepairStatus.READY)} workshop={workshop} onExport={exportHistoryCSV} onJob={(j:any) => { setActiveJob(j); setView('STATION_SCAN'); }} />}
        {view === 'RECEPTION' && <ReceptionView catalog={services} onCancel={() => setView('STAFF_DASHBOARD')} workshop={workshop} />}
        {view === 'STATION_SCAN' && activeJob && <JobUpdateView job={activeJob} catalog={services} staff={users.filter(u => u.role !== UserRole.CLIENT)} onUpdate={handleUpdateJob} profile={profile} onBack={() => setView(profile?.role === UserRole.CLIENT ? 'CLIENT_TRACK' : 'STAFF_DASHBOARD')} onPrint={() => setView('INVOICE_PRINT')} workshop={workshop} />}
        {view === 'ADMIN_PANEL' && <AdminControlCenter users={users} services={services} workshop={workshop} showSuccess={showSuccess} />}
        {view === 'CLIENT_TRACK' && <ClientTrackingView setActiveJob={(j: any) => { setActiveJob(j); setView('STATION_SCAN'); }} workshop={workshop} />}
      </main>
    </div>
  );
};

// --- COMPONENTES DE ADMINISTRACIÓN ---

const AdminControlCenter = ({ users, services, workshop, showSuccess }: any) => {
  const [tab, setTab] = useState<'users' | 'services' | 'config'>('services');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter">Panel de Control</h2>
        <div className="flex bg-slate-800 p-1 rounded-2xl md:rounded-3xl border border-white/5 overflow-x-auto no-scrollbar">
          <button onClick={() => setTab('services')} className={`flex-1 py-3 px-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase transition-all whitespace-nowrap ${tab === 'services' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Servicios</button>
          <button onClick={() => setTab('users')} className={`flex-1 py-3 px-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase transition-all whitespace-nowrap ${tab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Personal</button>
          <button onClick={() => setTab('config')} className={`flex-1 py-3 px-4 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase transition-all whitespace-nowrap ${tab === 'config' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Facturación</button>
        </div>
      </div>

      {tab === 'services' && <ServiceManager services={services} showSuccess={showSuccess} />}
      {tab === 'users' && <UserManager users={users} workshop={workshop} />}
      {tab === 'config' && <InvoiceConfig workshop={workshop} showSuccess={showSuccess} />}
    </div>
  );
};

const ServiceManager = ({ services, showSuccess }: any) => {
  const [newSrv, setNewSrv] = useState({ name: '', price: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const addSrv = async () => {
    if (!newSrv.name || !newSrv.price) return;
    const id = Math.random().toString(36).substr(2, 9);
    await setDoc(doc(db, "services", id), { name: newSrv.name.toUpperCase(), price: Number(newSrv.price), type: 'SERVICE' });
    setNewSrv({ name: '', price: '' });
    showSuccess("SERVICIO AGREGADO");
  };

  const updatePrice = async (id: string, newPrice: number) => {
    await updateDoc(doc(db, "services", id), { price: newPrice });
    setEditingId(null);
    showSuccess("PRECIO ACTUALIZADO");
  };

  const deleteSrv = async (id: string) => {
    if (confirm("¿Eliminar este servicio del catálogo?")) {
      await deleteDoc(doc(db, "services", id));
      showSuccess("SERVICIO ELIMINADO");
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-3xl border border-blue-500/20 space-y-4">
        <h3 className="text-xs font-black text-blue-500 uppercase tracking-widest">Añadir Nuevo Servicio</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500" placeholder="Nombre del Servicio" value={newSrv.name} onChange={e => setNewSrv({...newSrv, name: e.target.value})} />
          <input className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-blue-500" type="number" placeholder="Precio MXN" value={newSrv.price} onChange={e => setNewSrv({...newSrv, price: e.target.value})} />
          <button onClick={addSrv} className="bg-blue-600 rounded-xl py-3 font-black text-white text-xs uppercase hover:bg-blue-500 transition-all flex items-center justify-center gap-2"><PlusCircle className="w-4 h-4" /> Agregar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(services || []).map((s: any) => (
          <div key={s.id} className="glass-panel p-5 rounded-[25px] border border-white/5 flex flex-col justify-between group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">Concepto</p>
                <h4 className="text-xs md:text-sm font-black text-white uppercase truncate pr-2">{s.name}</h4>
              </div>
              <button onClick={() => deleteSrv(s.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter mb-1">Precio Actual</p>
                {editingId === s.id ? (
                  <div className="flex gap-2">
                    <input autoFocus className="w-full bg-slate-950 border border-blue-500 rounded-lg px-2 py-1 text-xs font-mono text-white" defaultValue={s.price} onBlur={(e) => updatePrice(s.id, Number(e.target.value))} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setEditingId(s.id)}>
                    <span className="text-xl font-mono font-black text-blue-500">${s.price.toLocaleString()}</span>
                    <Edit2 className="w-3 h-3 text-slate-600" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const UserManager = ({ users, workshop }: any) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    {(users || []).map((u:any) => (
      <div key={u.id} className="glass-panel p-6 md:p-8 rounded-[30px] md:rounded-[40px] space-y-6 shadow-xl border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-white text-xl md:text-3xl shadow-lg" style={{ backgroundColor: workshop.primaryColor }}>{u.name?.[0] || '?'}</div>
          <div className="overflow-hidden">
            <p className="text-sm md:text-lg font-black uppercase text-white truncate">{u.name}</p>
            <p className="text-[9px] md:text-[10px] text-slate-500 truncate">{u.email}</p>
          </div>
        </div>
        <div className="flex gap-1 p-1 bg-slate-950 rounded-xl md:rounded-2xl border border-white/5">
          {Object.values(UserRole).map(r => (
            <button key={r} onClick={() => updateDoc(doc(db, "users", u.id), {role: r})} className={`flex-1 py-2 rounded-lg md:rounded-xl text-[7px] md:text-[8px] font-black uppercase transition-all ${u.role === r ? 'text-white' : 'text-slate-500'}`} style={u.role === r ? { backgroundColor: workshop.primaryColor } : {}}>{r}</button>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const InvoiceConfig = ({ workshop, showSuccess }: any) => {
  const [local, setLocal] = useState<WorkshopSettings>(workshop);
  
  const saveConfig = async () => {
    await setDoc(doc(db, "config", "workshop"), sanitizeData(local));
    showSuccess("CONFIGURACIÓN GUARDADA");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="glass-panel p-8 rounded-[40px] border border-white/5 space-y-8">
        <div className="space-y-6">
          <h3 className="text-sm font-black text-blue-500 uppercase tracking-[4px] border-b border-white/5 pb-4 flex items-center gap-2"><Layout className="w-5 h-5" /> Datos del Negocio</h3>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Nombre Comercial</label>
              <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500" value={local.name} onChange={e => setLocal({...local, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Eslogan o Lema</label>
              <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500" value={local.slogan} onChange={e => setLocal({...local, slogan: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-8 border-t border-white/5">
          <h3 className="text-sm font-black text-blue-500 uppercase tracking-[4px] border-b border-white/5 pb-4 flex items-center gap-2"><Printer className="w-5 h-5" /> Personalización de Factura</h3>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Título de la Factura (Encabezado)</label>
              <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500" placeholder="Ej: ORDEN DE SERVICIO" value={local.invoiceTitle} onChange={e => setLocal({...local, invoiceTitle: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Subtítulo (Debajo del Título)</label>
              <input className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500" placeholder="Ej: COMPROBANTE DE RECEPCIÓN" value={local.invoiceSubtitle} onChange={e => setLocal({...local, invoiceSubtitle: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Nota Legal / Pie de Página (Garantías)</label>
              <textarea className="w-full bg-slate-900 border border-slate-700 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500 min-h-[100px]" placeholder="Escribe aquí tus términos de garantía..." value={local.invoiceFooter} onChange={e => setLocal({...local, invoiceFooter: e.target.value})} />
            </div>
          </div>
        </div>

        <button onClick={saveConfig} className="w-full bg-blue-600 py-5 rounded-[25px] font-black text-white uppercase tracking-widest shadow-2xl hover:bg-blue-500 transition-all flex items-center justify-center gap-3"><Save className="w-5 h-5" /> Guardar Todo</button>
      </div>
    </div>
  );
};

const StaffDashboard = ({ jobs, workshop, onAdd, onJob }: any) => (
  <div className="space-y-6 md:space-y-12 animate-in fade-in duration-500">
    <div className="flex justify-between items-end">
      <div>
        <h2 className="text-2xl md:text-5xl font-black text-white uppercase tracking-tighter leading-none">Vehículos <span style={{ color: workshop.primaryColor }}>Activos</span></h2>
        <p className="text-slate-500 text-[9px] md:text-[12px] font-black uppercase tracking-widest mt-2">Monitoreo en tiempo real</p>
      </div>
      <button onClick={onAdd} className="p-5 md:p-8 rounded-[30%] md:rounded-[35%] text-white shadow-2xl hover:scale-110 active:scale-95 transition-all" style={{ backgroundColor: workshop.primaryColor }}><Plus className="w-6 h-6 md:w-10 md:h-10" /></button>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
      {(jobs || []).map((j:any) => (
        <div key={j.id} onClick={() => onJob(j)} className="glass-panel p-6 md:p-10 rounded-[30px] md:rounded-[50px] cursor-pointer hover:border-blue-500/50 transition-all group shadow-xl">
          <div className="flex justify-between items-start mb-6 md:mb-8">
            <span className="text-[10px] md:text-[12px] font-mono font-black border border-white/10 px-3 py-1 md:px-4 md:py-2 rounded-xl bg-white/5" style={{ color: workshop.primaryColor }}>{j.id}</span>
            <span className="text-[8px] md:text-[9px] font-black uppercase text-slate-400 bg-white/5 px-2 py-1 rounded-lg">{STATUS_LABELS[j.overallStatus as RepairStatus]}</span>
          </div>
          <h3 className="text-xl md:text-3xl font-black uppercase text-white truncate mb-1 md:mb-2 leading-tight">{j.carModel}</h3>
          <p className="text-[9px] md:text-[11px] text-slate-500 font-black uppercase truncate">{j.clientName} • {j.plate}</p>
          <div className="mt-8 md:mt-10 flex items-center justify-between border-t border-white/5 pt-4 md:pt-6">
            <p className="text-[8px] md:text-[9px] font-black text-slate-600 uppercase">Tec: {j.assignedTechnician || '---'}</p>
            <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const AdminHistoryView = ({ jobs, onExport, onJob }: any) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <h2 className="text-xl md:text-4xl font-black text-white uppercase tracking-tighter">Historial</h2>
      <button onClick={onExport} className="bg-slate-800 p-2 md:px-5 md:py-3 rounded-xl text-white flex items-center gap-2 text-[10px] md:text-xs font-black uppercase shadow-xl hover:bg-slate-700 transition-all"><Download className="w-4 h-4" /> CSV</button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {(jobs || []).map((j:any) => (
        <div key={j.id} onClick={() => onJob(j)} className="glass-panel p-6 rounded-3xl border border-white/5 flex justify-between items-center cursor-pointer hover:bg-white/5">
          <div>
            <p className="text-[10px] font-mono font-black text-blue-500">{j.id}</p>
            <h4 className="text-sm font-black text-white uppercase">{j.clientName}</h4>
            <p className="text-[9px] text-slate-500 font-bold uppercase">{j.carModel} • {j.plate}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono font-black text-white">${(j.totalBudget || 0).toLocaleString()}</p>
            <p className="text-[8px] text-slate-500 uppercase">{new Date(j.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const JobUpdateView = ({ job, onUpdate, profile, onBack, onPrint, workshop }: any) => {
  const [localJob, setLocalJob] = useState<VehicleJob>(job);
  const isReadOnly = profile.role === UserRole.CLIENT;

  useEffect(() => { 
    if (job) setLocalJob(job); 
  }, [job]);

  if (!localJob) return <div className="p-10 text-center text-slate-500">CARGANDO ORDEN...</div>;

  const updateStatus = (s: RepairStatus) => {
    if (isReadOnly) return;
    setLocalJob(prev => ({ ...prev, overallStatus: s }));
  };

  const toggleItemStatus = (itemId: string) => {
    if (isReadOnly) return;
    setLocalJob(prev => ({
      ...prev,
      items: (prev.items || []).map(i => i.id === itemId ? { ...i, status: i.status === ItemStatus.COMPLETED ? ItemStatus.PENDING : ItemStatus.COMPLETED } : i)
    }));
  };

  const updateItemPhoto = (itemId: string, field: 'beforePhoto' | 'afterPhoto', data: string) => {
    setLocalJob(prev => ({
      ...prev,
      items: (prev.items || []).map(i => i.id === itemId ? { ...i, [field]: data } : i)
    }));
  };

  const save = () => onUpdate(localJob);

  return (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-6 duration-500">
      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /> Volver</button>
        <div className="flex gap-2">
          <button onClick={onPrint} className="p-3 bg-slate-800 rounded-xl md:rounded-2xl text-white hover:bg-slate-700 transition-all"><Printer className="w-5 h-5" /></button>
          {!isReadOnly && <button onClick={save} className="bg-green-600 px-6 py-3 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs text-white uppercase shadow-xl hover:scale-105 transition-all">Guardar</button>}
        </div>
      </div>

      <div className="glass-panel p-6 md:p-10 rounded-[30px] md:rounded-[40px] border border-white/5 space-y-8 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
          <div className="max-w-full overflow-hidden">
            <h2 className="text-2xl md:text-5xl font-black uppercase text-white tracking-tighter leading-tight truncate">{localJob.carModel}</h2>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm md:text-xl font-black font-mono text-blue-500">{localJob.plate}</span>
              <span className="text-xs md:text-sm text-slate-500 font-bold uppercase truncate">{localJob.clientName}</span>
            </div>
          </div>
          {!isReadOnly && (
            <div className="flex flex-col gap-2">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-2">Estado General</label>
              <select className="bg-slate-900 border border-slate-700 rounded-xl md:rounded-2xl px-4 py-3 text-xs font-black text-white outline-none focus:border-blue-500" value={localJob.overallStatus} onChange={e => updateStatus(e.target.value as RepairStatus)}>
                {Object.entries(STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-4 pt-8 border-t border-white/5">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[4px]">Servicios y Refacciones</h3>
          {(localJob.items || []).map(item => (
            <div key={item.id} className="p-5 md:p-8 bg-slate-900/50 rounded-2xl md:rounded-3xl border border-white/5 space-y-6 hover:bg-slate-900/80 transition-all shadow-lg">
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  {!isReadOnly && (
                    <button onClick={() => toggleItemStatus(item.id)} className={`p-2 rounded-lg transition-all ${item.status === ItemStatus.COMPLETED ? 'bg-green-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                      {item.status === ItemStatus.COMPLETED ? <CheckSquare className="w-5 h-5" /> : <SquareIcon className="w-5 h-5" />}
                    </button>
                  )}
                  <div className="overflow-hidden">
                    <h4 className={`text-xs md:text-base font-black uppercase transition-colors ${item.status === ItemStatus.COMPLETED ? 'text-green-500' : 'text-white'}`}>{item.name}</h4>
                    <p className="text-[8px] font-black text-slate-500 uppercase">{ITEM_STATUS_LABELS[item.status]}</p>
                  </div>
                </div>
                <span className="font-mono text-xs md:text-base font-black text-blue-500">${(item.price || 0).toLocaleString()}</span>
              </div>
              <div className="flex gap-4 md:gap-10 justify-around md:justify-start">
                <ImageUploader label="ESTADO INICIAL" currentImage={item.beforePhoto} onUpload={d => updateItemPhoto(item.id, 'beforePhoto', d)} isReadOnly={isReadOnly} />
                <ImageUploader label="RESULTADO FINAL" currentImage={item.afterPhoto} onUpload={d => updateItemPhoto(item.id, 'afterPhoto', d)} isReadOnly={isReadOnly} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ReceptionView = ({ catalog, onCancel, workshop }: any) => {
  const [form, setForm] = useState({ clientName: '', clientPhone: '', carModel: '', plate: '' });
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.clientName || !form.carModel) return alert("Por favor rellene nombre y vehículo.");
    setSaving(true);
    try {
      const items = (catalog || []).filter((c:any) => selected.includes(c.id)).map((c:any) => ({ ...c, status: ItemStatus.PENDING, id: Math.random().toString(36).substr(2, 5) }));
      const folio = `AW-${Math.floor(10000 + Math.random() * 90000)}`;
      const jobData = { ...form, id: folio, items, overallStatus: RepairStatus.OPERATIONS, messages: [], createdAt: Date.now(), intakeDate: Date.now(), totalBudget: items.reduce((a:any,b:any)=>a+(b.price || 0), 0) };
      await addDoc(collection(db, "jobs"), sanitizeData(jobData));
      onCancel();
    } catch (err) { alert("Error al registrar entrada."); } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto glass-panel p-6 md:p-12 rounded-[30px] md:rounded-[60px] shadow-2xl space-y-8 animate-in slide-in-from-bottom-12 duration-500">
      <h2 className="text-xl md:text-4xl font-black uppercase text-white tracking-tighter">Nueva Recepción</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl md:rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500" placeholder="Nombre del Cliente" value={form.clientName} onChange={e => setForm({...form, clientName: e.target.value})} />
        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl md:rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500" placeholder="Teléfono" value={form.clientPhone} onChange={e => setForm({...form, clientPhone: e.target.value})} />
        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl md:rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500" placeholder="Marca / Modelo" value={form.carModel} onChange={e => setForm({...form, carModel: e.target.value})} />
        <input className="w-full bg-slate-900 border border-slate-700 rounded-xl md:rounded-2xl py-4 px-6 text-white text-sm font-mono uppercase outline-none focus:border-blue-500" placeholder="Placa" value={form.plate} onChange={e => setForm({...form, plate: e.target.value})} />
      </div>
      <div className="space-y-3 max-h-48 overflow-y-auto no-scrollbar border-t border-white/5 pt-6">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2">Seleccione Servicios</p>
        {(catalog || []).map((s:any) => (
          <button key={s.id} onClick={() => setSelected(p => p.includes(s.id) ? p.filter(x=>x!==s.id) : [...p, s.id])} className={`w-full p-4 rounded-xl md:rounded-2xl border-2 text-left flex justify-between items-center transition-all ${selected.includes(s.id) ? 'border-white bg-blue-600 shadow-lg scale-[1.02]' : 'border-slate-800 bg-slate-900 opacity-60'}`}>
            <span className="text-[10px] md:text-xs font-black uppercase text-white">{s.name}</span>
            <span className="font-mono text-xs md:text-sm font-black text-white">${(s.price || 0).toLocaleString()}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-4">
        <button onClick={onCancel} className="flex-1 bg-slate-800 py-4 rounded-xl md:rounded-2xl font-black text-xs text-white uppercase hover:bg-slate-700 transition-colors">Cancelar</button>
        <button onClick={save} disabled={saving} className="flex-1 py-4 rounded-xl md:rounded-2xl font-black text-xs text-white uppercase shadow-xl disabled:opacity-50 flex items-center justify-center gap-2" style={{ backgroundColor: workshop.primaryColor }}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Registrar
        </button>
      </div>
    </div>
  );
};

const ClientTrackingView = ({ setActiveJob, workshop }: any) => {
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);

  const find = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const qRef = query(collection(db, "jobs"), where("id", "==", q.trim().toUpperCase()), limit(1));
      const snap = await getDocs(qRef);
      if (!snap.empty) setActiveJob({ ...snap.docs[0].data(), id: snap.docs[0].id } as VehicleJob);
      else alert("Folio no encontrado.");
    } catch (err) { alert("Error de búsqueda."); } finally { setSearching(false); }
  };

  return (
    <div className="max-w-md mx-auto py-8 md:py-24 text-center space-y-10 md:space-y-16 animate-in zoom-in duration-700">
      <div className="flex flex-col items-center">
        <Wrench className="w-16 h-16 md:w-24 md:h-24 mb-6 opacity-20" />
        <h2 className="text-2xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">{workshop.name}</h2>
        <p className="text-slate-500 text-[9px] md:text-sm font-black mt-3 md:mt-4 uppercase tracking-[3px] md:tracking-[5px]">{workshop.slogan}</p>
      </div>
      <div className="space-y-6">
        <input className="w-full bg-slate-800 border-4 border-slate-700 rounded-[25px] md:rounded-[40px] py-6 md:py-10 text-xl md:text-4xl text-center font-mono uppercase text-white outline-none focus:border-blue-500 transition-all shadow-2xl" placeholder="INGRESE FOLIO" value={q} onChange={e => setQ(e.target.value)} onKeyPress={e => e.key === 'Enter' && find()} />
        <button onClick={find} disabled={searching} className="w-full py-6 md:py-8 rounded-[25px] md:rounded-[40px] font-black text-base md:text-2xl text-white uppercase tracking-widest shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3" style={{ backgroundColor: workshop.primaryColor }}>
          {searching ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Consultar Estatus'}
        </button>
      </div>
    </div>
  );
};

const InvoicePrintView = ({ job, workshop, onBack }: any) => {
  useEffect(() => { 
    setTimeout(() => window.print(), 1000); 
  }, []);

  return (
    <div className="bg-white text-black min-h-screen font-sans invoice-print-container">
      <style>{`
        @media screen {
          .invoice-print-container {
            max-width: 850px;
            margin: 0 auto;
            padding: 2rem;
            background: white;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
        }
        @media print {
          @page {
            size: portrait;
            margin: 8mm;
          }
          body { 
            background: white !important; 
            color: black !important;
            margin: 0;
            padding: 0;
          }
          .invoice-print-container { 
            width: 100% !important; 
            max-width: 100% !important;
            margin: 0 !important; 
            padding: 0 !important;
            box-shadow: none !important;
            display: block !important;
          }
          .print-hidden { display: none !important; }
          * { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            color: #000000 !important; 
            border-color: #000000 !important; 
          }
        }
        .invoice-text-black { color: #000000 !important; }
        .invoice-photo-container { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-top: 8px; 
            width: 100%;
        }
        .invoice-photo-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .invoice-photo {
            width: 100%;
            height: 180px;
            object-fit: cover;
            border: 1.5px solid #000;
        }
        .photo-label {
            font-size: 7px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
      `}</style>
      
      {/* Encabezado con tamaños ajustados */}
      <div className="flex flex-row justify-between items-start border-b-4 border-black pb-4 mb-6 gap-2 w-full overflow-hidden">
        <div className="flex-1 min-w-0 pr-4">
          <h1 className="text-xl md:text-3xl font-black uppercase leading-none invoice-text-black m-0 p-0 break-words">
            {workshop.name}
          </h1>
          <p className="text-[7px] md:text-[9px] uppercase font-bold tracking-[1px] mt-1 invoice-text-black">
            {workshop.slogan}
          </p>
        </div>
        <div className="text-right flex-shrink-0 min-w-0">
          <p className="text-[10px] md:text-sm font-black invoice-text-black m-0 p-0 uppercase">
            {workshop.invoiceTitle || "ORDEN DE SERVICIO"}
          </p>
          <p className="text-[6px] md:text-[8px] font-bold invoice-text-black opacity-80 uppercase leading-none">
            {workshop.invoiceSubtitle}
          </p>
          <div className="mt-2 text-right">
            <span className="text-[7px] font-black invoice-text-black block opacity-60">ID DE SERVICIO</span>
            <span className="text-sm md:text-lg font-black invoice-text-black leading-none">
              #{job.id}
            </span>
          </div>
        </div>
      </div>

      {/* Info Cliente/Auto */}
      <div className="grid grid-cols-2 gap-4 mb-8 border-b-2 border-black pb-4">
        <div>
          <p className="text-[7px] font-black uppercase opacity-60 mb-1">CLIENTE</p>
          <p className="text-sm md:text-lg font-black leading-tight break-words">{job.clientName}</p>
          <p className="text-xs font-bold">{job.clientPhone}</p>
        </div>
        <div className="text-right">
          <p className="text-[7px] font-black uppercase opacity-60 mb-1">VEHÍCULO</p>
          <p className="text-sm md:text-lg font-black leading-tight break-words">{job.carModel}</p>
          <p className="text-sm md:text-lg font-black font-mono tracking-tighter">{job.plate}</p>
        </div>
      </div>

      {/* Tabla de Servicios + Fotos Dinámicas */}
      <table className="w-full text-left mb-8 border-collapse">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="py-2 font-black uppercase text-[8px] px-1 w-[70%]">DESCRIPCIÓN Y EVIDENCIA</th>
            <th className="py-2 text-center font-black uppercase text-[8px] px-1 w-[10%]">ST</th>
            <th className="py-2 text-right font-black uppercase text-[8px] px-1 w-[20%]">TOTAL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/10">
          {(job.items || []).map((i:any) => (
            <tr key={i.id} className="align-top">
              <td className="py-4 px-1">
                <p className="text-xs md:text-base font-black uppercase leading-tight mb-2">{i.name}</p>
                {/* Visualización de fotos solo si existen */}
                {(i.beforePhoto || i.afterPhoto) && (
                  <div className="invoice-photo-container">
                    <div className="invoice-photo-item">
                      {i.beforePhoto ? (
                        <>
                          <span className="photo-label">Estado Inicial (Antes)</span>
                          <img src={i.beforePhoto} className="invoice-photo" />
                        </>
                      ) : <div className="h-[20px] invisible" />}
                    </div>
                    <div className="invoice-photo-item">
                      {i.afterPhoto ? (
                        <>
                          <span className="photo-label">Trabajo Terminado (Después)</span>
                          <img src={i.afterPhoto} className="invoice-photo" />
                        </>
                      ) : <div className="h-[20px] invisible" />}
                    </div>
                  </div>
                )}
              </td>
              <td className="py-4 text-center text-[8px] font-black uppercase px-1">
                {i.status === ItemStatus.COMPLETED ? 'OK' : '...'}
              </td>
              <td className="py-4 text-right font-mono text-[10px] md:text-base font-black px-1">
                ${(i.price || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer / Totales */}
      <div className="flex justify-between items-end border-t-4 border-black pt-4 mb-10">
        <div className="text-[6px] font-bold opacity-50 uppercase">
            Emitido: {new Date(job.createdAt).toLocaleString('es-MX')}
        </div>
        <div className="text-right">
          <p className="text-[7px] font-black uppercase opacity-60">SUBTOTAL NETO (MXN)</p>
          <p className="text-2xl md:text-4xl font-black m-0 leading-none">${(job.totalBudget || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 mb-10 pt-4">
        <div className="border-t border-black pt-1 text-center">
          <p className="text-[7px] font-black uppercase tracking-widest">FIRMA DEL CLIENTE</p>
        </div>
        <div className="border-t border-black pt-1 text-center">
          <p className="text-[7px] font-black uppercase tracking-widest">AUTORIZADO POR TALLER</p>
        </div>
      </div>

      <div className="border-2 border-black p-3 bg-black/5 text-center mb-4">
          <p className="text-[7px] font-bold uppercase leading-tight">
            {workshop.invoiceFooter}
          </p>
      </div>

      <button onClick={onBack} className="fixed bottom-6 right-6 bg-black text-white px-6 py-3 rounded-full print-hidden font-black uppercase text-[8px] shadow-2xl z-[200] hover:scale-105 transition-all">
        VOLVER AL SISTEMA
      </button>
    </div>
  );
};

const LoginView = ({ workshop }: { workshop: WorkshopSettings }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", cred.user.uid), { id: cred.user.uid, name: name || email.split('@')[0], email, role: UserRole.CLIENT, createdAt: Date.now() });
      }
    } catch (err: any) { alert("Error: " + err.message); } finally { setLoading(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950">
      <div className="w-full max-sm bg-slate-900 border border-slate-800 rounded-[40px] md:rounded-[50px] p-8 md:p-12 shadow-2xl">
        <div className="flex flex-col items-center mb-10 text-center">
          <Wrench className="w-12 h-12 mb-4" style={{ color: workshop.primaryColor }} />
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter uppercase leading-tight">{workshop.name}</h2>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-3">Portal de Gestión Automotriz</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <input className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500" placeholder="Nombre Completo" value={name} onChange={e => setName(e.target.value)} required />}
          <input className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500" type="email" placeholder="Correo Electrónico" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-4 px-6 text-white text-sm outline-none focus:border-blue-500" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl font-black text-white shadow-2xl transition-all hover:brightness-110 flex items-center justify-center gap-2" style={{ backgroundColor: workshop.primaryColor }}>
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
          </button>
        </form>
        <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-8 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:text-white transition-colors">{isLogin ? '¿No tiene cuenta? Regístrese' : '¿Ya tiene cuenta? Acceda aquí'}</button>
      </div>
    </div>
  );
};

export default App;
