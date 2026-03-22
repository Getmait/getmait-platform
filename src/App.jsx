import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
 Pizza,
 Clock,
 MapPin,
 Phone,
 MessageCircle,
 X,
 Sparkles,
 ArrowRight,
 Zap,
 PhoneCall,
 MessageSquare,
 Smartphone,
 ShieldCheck,
 Check,
 Send,
 Loader2,
 ChefHat,
 Lock,
 AlertCircle,
 ChevronDown,
 User,
 Utensils,
 UserCheck,
 Building2,
 ShoppingCart,
 Plus,
 Minus,
} from 'lucide-react';
import { supabase } from './lib/supabase';
import ChatWidget from './ChatWidget';

// ─── Item Customization Modal ────────────────────────────────────────────────
const ItemModal = ({ item, tilbehoerItems, brandColor, onAdd, onClose }) => {
  const sizes = item.variants?.sizes || [];
  const bases = item.variants?.bases || [];
  const prices = item.variants?.prices || {};
  const isTilbehoer = /tilbehør/i.test(item.kategori || '');

  const [selectedSize, setSelectedSize] = useState(sizes.length > 0 ? 'Alm.' : null);
  const [selectedBase, setSelectedBase] = useState(null);
  const [removedIngredients, setRemovedIngredients] = useState([]);
  const [extras, setExtras] = useState([]);
  const [qty, setQty] = useState(1);

  const ingredients = React.useMemo(() => {
    if (!item.beskrivelse || isTilbehoer) return [];
    const raw = item.beskrivelse.split(/valg:/i)[0]
      .replace(/^m\/\s*/i, '').replace(/^med\s+/i, '');
    return raw.split(/[,.]/).map(s => s.trim()).filter(s => s.length > 1);
  }, [item.beskrivelse, isTilbehoer]);

  const unitPrice = React.useMemo(() => {
    if (!selectedSize || selectedSize === 'Alm.') return parseFloat(item.pris) || 0;
    return parseFloat(prices[selectedSize]) || parseFloat(item.pris) || 0;
  }, [selectedSize, item.pris, prices]);

  const extrasTotal = extras.reduce((sum, e) => sum + e.pris, 0);
  const lineTotal = (unitPrice + extrasTotal) * qty;

  const toggleIngredient = (ing) => {
    setRemovedIngredients(prev =>
      prev.includes(ing) ? prev.filter(x => x !== ing) : [...prev, ing]
    );
  };

  const toggleExtra = (tb) => {
    setExtras(prev => {
      if (prev.find(e => e.id === tb.id)) return prev.filter(e => e.id !== tb.id);
      const pris = (selectedSize === 'Fam. 60x60' && tb.variants?.['Fam. 60x60'] !== undefined)
        ? parseFloat(tb.variants['Fam. 60x60'])
        : parseFloat(tb.pris) || 0;
      return [...prev, { id: tb.id, navn: tb.navn, pris }];
    });
  };

  const handleAdd = () => {
    onAdd({
      id: `${item.id}-${Date.now()}`,
      menu_id: item.id,
      nr: item.nr,
      navn: item.navn,
      qty,
      size: selectedSize,
      base: selectedBase,
      removedIngredients,
      extras,
      unitPrice,
      lineTotal: Math.round(lineTotal),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-[40px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-start shrink-0">
          <div>
            {item.nr && <p className="text-xs font-black uppercase tracking-widest mb-0.5" style={{ color: brandColor }}>Nr. {item.nr}</p>}
            <h3 className="text-xl font-black uppercase tracking-tight">{item.navn}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0 ml-4">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 space-y-6">

          {/* Størrelse */}
          {sizes.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Størrelse</p>
              <div className="flex flex-wrap gap-2">
                {sizes.map(size => {
                  const sizePrice = size === 'Alm.' ? parseFloat(item.pris) : (parseFloat(prices[size]) || parseFloat(item.pris));
                  return (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-full text-sm font-black border-2 transition-all ${selectedSize === size ? 'text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                      style={selectedSize === size ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
                    >
                      {size.replace(/^Fam\.\s*/, '')} — {sizePrice} kr
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bund */}
          {bases.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Bund (tilvalg)</p>
              <div className="flex flex-wrap gap-2">
                {bases.map(base => (
                  <button
                    key={base}
                    onClick={() => setSelectedBase(prev => prev === base ? null : base)}
                    className={`px-4 py-2 rounded-full text-sm font-black border-2 transition-all ${selectedBase === base ? 'text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    style={selectedBase === base ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
                  >
                    {base}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ingredienser */}
          {ingredients.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Ingredienser — tryk for at fjerne</p>
              <div className="flex flex-wrap gap-2">
                {ingredients.map(ing => {
                  const removed = removedIngredients.includes(ing);
                  return (
                    <button
                      key={ing}
                      onClick={() => toggleIngredient(ing)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${removed ? 'bg-slate-100 border-slate-200 text-slate-400 line-through' : 'bg-white border-slate-200 text-slate-700 hover:border-red-300'}`}
                    >
                      {ing}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ekstra tilbehør */}
          {tilbehoerItems.length > 0 && !isTilbehoer && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Ekstra tilbehør</p>
              <div className="grid grid-cols-2 gap-2">
                {tilbehoerItems.map(tb => {
                  const tbPris = (selectedSize === 'Fam. 60x60' && tb.variants?.['Fam. 60x60'] !== undefined)
                    ? parseFloat(tb.variants['Fam. 60x60'])
                    : parseFloat(tb.pris) || 0;
                  const isSelected = extras.some(e => e.id === tb.id);
                  return (
                    <button
                      key={tb.id}
                      onClick={() => toggleExtra(tb)}
                      className={`flex items-center justify-between px-3 py-2 rounded-2xl text-xs font-bold border transition-all text-left ${isSelected ? 'text-white' : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'}`}
                      style={isSelected ? { backgroundColor: brandColor, borderColor: brandColor } : {}}
                    >
                      <span className="truncate mr-1">{tb.navn}</span>
                      <span className={`shrink-0 ${isSelected ? 'opacity-75' : 'text-slate-400'}`}>{tbPris > 0 ? `${tbPris} kr` : 'Gratis'}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer: antal + tilføj */}
        <div className="px-6 py-5 border-t border-slate-100 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="h-10 w-10 rounded-full border-2 border-slate-200 flex items-center justify-center hover:border-slate-400 transition-colors"
            >
              <Minus size={16} />
            </button>
            <span className="text-xl font-black w-6 text-center">{qty}</span>
            <button
              onClick={() => setQty(q => q + 1)}
              className="h-10 w-10 rounded-full border-2 flex items-center justify-center transition-colors"
              style={{ borderColor: brandColor, color: brandColor }}
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 rounded-full text-white font-black text-sm shadow-lg transition-transform active:scale-95"
            style={{ backgroundColor: brandColor }}
          >
            <ShoppingCart size={16} />
            Tilføj — {Math.round(lineTotal)} kr
          </button>
        </div>
      </div>
    </div>
  );
};

const App = () => {
 // --- SUPABASE DATA ---
 const [loading, setLoading] = useState(true);
 const [store, setStore] = useState(null);
 const [tenantId, setTenantId] = useState(null);
 const [menu, setMenu] = useState([]);
 const [error, setError] = useState(null);

 // --- UI STATE ---
 const [activeCategory, setActiveCategory] = useState('SE ALT');
 const [scrolled, setScrolled] = useState(false);
 const [isMenuExpanded, setIsMenuExpanded] = useState(false);

 // SMS Kundeklub state
 const [name, setName] = useState('');
 const [phone, setPhone] = useState('');
 const [address, setAddress] = useState('');
 const [gdprAccepted, setGdprAccepted] = useState(false);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [isSubscribed, setIsSubscribed] = useState(false);
 const [klubStep, setKlubStep] = useState(1); // 1 = navn+tlf, 2 = adresse
 const [checkingPhone, setCheckingPhone] = useState(false);

 // Roterende anbefaling (desktop sidebar)
 const [featuredCatIndex, setFeaturedCatIndex] = useState(0);
 const [featuredVisible, setFeaturedVisible] = useState(true);

 // Kundeklub state
 const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
 const [subscribeError, setSubscribeError] = useState('');

 // Chat widget state
 const [chatOpen, setChatOpen] = useState(false);
 const [showTerms, setShowTerms] = useState(false);
 const [pendingOrder, setPendingOrder] = useState(null);

 // Cart & modal state
 const [cart, setCart] = useState([]);
 const [modalItem, setModalItem] = useState(null);
 const pendingCartRef = useRef(null);

 // --- DATA FETCHING ---
 useEffect(() => {
 const loadData = async () => {
 const hostname = window.location.hostname;
 const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

 const defaultSlug = import.meta.env.VITE_DEFAULT_SLUG || 'napoli-esbjerg';

 let slug;
 if (hostname.includes('getmait.dk')) {
 const subdomain = hostname.split('.getmait.dk')[0];
 // System/infra subdomains (e.g. platform-staging, platform-dev) use default slug
 if (subdomain.startsWith('platform-')) {
 slug = defaultSlug;
 } else {
 // Strip miljø-suffiks: devpizza-dev → devpizza, devpizza-staging → devpizza
 slug = subdomain.replace(/-(dev|staging)$/, '');
 }
 } else if (hostname.includes('sslip.io')) {
 slug = hostname.split('.')[0];
 } else if (hostname.includes('localhost') || isIpAddress) {
 slug = defaultSlug;
 } else {
 slug = hostname.split('.')[0];
 }

 try {
 if (!supabase) {
 setError('Manglende Supabase-konfiguration.');
 setLoading(false);
 return;
 }

 const { data: storeData, error: storeError } = await supabase
 .from('stores')
 .select('*')
 .eq('subdomain', slug)
 .single();

 if (storeError || !storeData) {
 setError('Kunne ikke finde pizzaria. Kontakt support@getmait.dk');
 setLoading(false);
 return;
 }

 setStore(storeData);

 // Hent tenant_id til kundeklub-tilmelding
 const { data: tenantData } = await supabase
 .from('tenants')
 .select('id')
 .eq('store_id', storeData.id)
 .single();
 if (tenantData) setTenantId(tenantData.id);

 const { data: menuData, error: menuError } = await supabase
 .from('menu')
 .select('*')
 .eq('store_id', storeData.id)
 .eq('tilgaengelig', true)
 .order('kategori', { ascending: true });

 if (menuError) {
 console.error('Menu error:', menuError);
 }

 const sortedMenu = (menuData || []).sort((a, b) => {
 if (a.kategori !== b.kategori) return 0;
 const nrA = parseInt(a.nr) || Infinity;
 const nrB = parseInt(b.nr) || Infinity;
 return nrA - nrB;
 });

 setMenu(sortedMenu);
 setLoading(false);
 } catch (err) {
 console.error('Error loading data:', err);
 setError('Kunne ikke hente data. Prøv igen senere.');
 setLoading(false);
 }
 };

 loadData();
 }, []);

 useEffect(() => {
 const handleScroll = () => setScrolled(window.scrollY > 50);
 window.addEventListener('scroll', handleScroll);
 return () => window.removeEventListener('scroll', handleScroll);
 }, []);

 // Roter "Dagens anbefaling" gennem kategorier hvert 4. sekund
 useEffect(() => {
 if (menu.length === 0) return;
 const interval = setInterval(() => {
 setFeaturedVisible(false);
 setTimeout(() => {
 setFeaturedCatIndex(i => (i + 1) % [...new Set(menu.map(m => m.kategori))].length);
 setFeaturedVisible(true);
 }, 400);
 }, 4000);
 return () => clearInterval(interval);
 }, [menu]);

 // --- MENU LOGIK ---
 const categories = useMemo(() => [...new Set(menu.map(item => item.kategori))], [menu]);
 const categoryLabels = ['SE ALT', ...categories.map(c => c.toUpperCase())];

 const currentItems = useMemo(() => {
 if (activeCategory === 'SE ALT') return menu;
 return menu.filter(item => item.kategori.toUpperCase() === activeCategory);
 }, [activeCategory, menu]);

 const displayedItems = isMenuExpanded ? currentItems : currentItems.slice(0, 6);

 const tilbehoerItems = useMemo(() =>
   menu.filter(item => /tilbehør/i.test(item.kategori || '')), [menu]);
 const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
 const cartTotal = Math.round(cart.reduce((sum, i) => sum + i.lineTotal, 0));

 // --- ÅBNINGSTIDER HJÆLPER ---
 const formatOpeningHours = (hours) => {
 if (!hours) return null;
 const dayMap = {
 monday: 'Man', tuesday: 'Tir', wednesday: 'Ons',
 thursday: 'Tor', friday: 'Fre', saturday: 'Lør', sunday: 'Søn'
 };
 // Gruppér dage med samme tider
 const groups = [];
 const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
 days.forEach(day => {
 if (!hours[day]) return;
 const timeStr = `${hours[day].open} - ${hours[day].close}`;
 const last = groups[groups.length - 1];
 if (last && last.time === timeStr) {
 last.days.push(dayMap[day]);
 } else {
 groups.push({ days: [dayMap[day]], time: timeStr });
 }
 });
 return groups.map(g => ({
 label: g.days.length > 1 ? `${g.days[0]} - ${g.days[g.days.length - 1]}` : g.days[0],
 time: g.time
 }));
 };

 // --- SMS KUNDEKLUB ---
 const normalizePhone = (raw) => {
 const cleaned = raw.replace(/[\s\-\(\)\.]/g, '');
 if (cleaned.startsWith('+')) return cleaned;
 if (cleaned.startsWith('00')) return '+' + cleaned.slice(2);
 return '+45' + cleaned;
 };

 const doSubscribe = async (normalizedPhone, addr) => {
 setIsSubmitting(true);
 setSubscribeError('');
 const { error } = await supabase
 .from('customers')
 .upsert({
 tenant_id: tenantId,
 name: name.trim(),
 phone: normalizedPhone,
 address: addr || null,
 opted_in_sms: true,
 }, { onConflict: 'tenant_id,phone' });

 if (error) {
 console.error('Kundeklub signup error:', error);
 setSubscribeError('Noget gik galt. Prøv igen eller kontakt os direkte.');
 setIsSubmitting(false);
 return;
 }

 // Send velkomst-SMS via n8n
 fetch('https://n8n.getmait.dk/webhook/kundeklub-velkomst', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ phone: normalizedPhone, name: name.trim(), store_id: store?.id }),
 }).catch(() => {}); // fire-and-forget

 setIsSubmitting(false);
 setIsSubscribed(true);
 };

 const handleStep1 = async (e) => {
 e.preventDefault();
 if (!gdprAccepted) return;
 setCheckingPhone(true);
 setSubscribeError('');

 const normalizedPhone = normalizePhone(phone);
 const { data: existing } = await supabase
 .from('customers')
 .select('address')
 .eq('tenant_id', tenantId)
 .eq('phone', normalizedPhone)
 .maybeSingle();

 setCheckingPhone(false);

 if (existing?.address) {
 await doSubscribe(normalizedPhone, existing.address);
 } else {
 setKlubStep(2);
 }
 };

 const handleSubscribe = async (e) => {
 e.preventDefault();
 await doSubscribe(normalizePhone(phone), address.trim());
 };

 const buildCartMessage = (cartItems) => {
   const lines = cartItems.map(i => {
     const nrStr = i.nr ? `nr. ${i.nr} ` : '';
     const sizeStr = i.size && i.size !== 'Alm.' ? ` (${i.size})` : '';
     const baseStr = i.base ? `, ${i.base}` : '';
     const removedStr = i.removedIngredients.length > 0 ? `, uden ${i.removedIngredients.join(', ')}` : '';
     const extrasStr = i.extras.length > 0 ? `, med ${i.extras.map(e => e.navn).join(', ')}` : '';
     const qtyStr = i.qty > 1 ? `${i.qty}x ` : '';
     return `- ${qtyStr}${nrStr}${i.navn}${sizeStr}${baseStr}${removedStr}${extrasStr} (${i.lineTotal} kr)`;
   });
   const total = Math.round(cartItems.reduce((s, i) => s + i.lineTotal, 0));
   return `Jeg vil gerne bestille:\n${lines.join('\n')}\nTotal: ${total} kr`;
 };

 const handleBestil = () => {
   if (cart.length === 0) return;
   setPendingOrder(buildCartMessage(cart));
   setCart([]);
   setChatOpen(true);
 };

 const scrollToId = (id) => {
 const el = document.getElementById(id);
 if (el) el.scrollIntoView({ behavior: 'smooth' });
 };

 // --- LOADING / ERROR ---
 if (loading) return (
 <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
 <div className="w-12 h-12 border-4 border-slate-100 border-t-orange-600 rounded-full animate-spin mb-4"></div>
 <div className="font-black uppercase text-slate-300 tracking-[0.2em] text-[10px]">Getmait Platform...</div>
 </div>
 );

 if (error) return (
 <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans text-center p-6">
 <AlertCircle size={64} className="text-orange-600 mb-4" />
 <h2 className="text-2xl font-black mb-2">Noget gik galt</h2>
 <p className="text-slate-500 mb-6">{error}</p>
 <button onClick={() => window.location.reload()} className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold">Prøv igen</button>
 </div>
 );

 const brandColor = store?.primary_color || '#ea580c';
 const openingHoursFormatted = formatOpeningHours(store?.opening_hours);
 const menuCategories = [...new Set(menu.map(m => m.kategori))];
 const featuredCategory = menuCategories[featuredCatIndex % Math.max(menuCategories.length, 1)];
 const featuredItem = menu.find(item => item.kategori === featuredCategory);

 // Tjek om butikken er åben baseret på åbningstider (dansk tid)
 // is_open = false er altid lukket (manuel override ved travlhed)
 // is_open = true → tjek mod opening_hours
 const isOpen = (() => {
 if (!store.is_open) return false;
 if (!store.opening_hours) return true;
 // Pålidelig metode: konverter til dansk tid via toLocaleString
 const now = new Date();
 const copenhagenNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' }));
 const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
 const day = days[copenhagenNow.getDay()];
 const current = copenhagenNow.getHours() * 60 + copenhagenNow.getMinutes();
 const todayHours = store.opening_hours[day];
 if (!todayHours) return false;
 const [openH, openM] = todayHours.open.split(':').map(Number);
 const [closeH, closeM] = todayHours.close.split(':').map(Number);
 return current >= openH * 60 + openM && current < closeH * 60 + closeM;
 })();

 return (
 <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-900 selection:bg-orange-100 text-left">

 {/* NAVIGATION */}
 <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-6 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-100 py-4' : 'bg-transparent'}`}>
 <div className="max-w-6xl mx-auto flex justify-between items-center">
 <div
 className="flex items-center gap-2 font-black text-2xl tracking-tighter text-slate-900 uppercase cursor-pointer"
 onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
 >
 <Pizza style={{ color: brandColor }} size={28} strokeWidth={3} />
 {store.name}
 </div>
 <div className="flex items-center gap-8">
 <div className="hidden md:flex items-center gap-12">
 <button onClick={() => scrollToId('menu')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-orange-600 transition-colors ">Menukort</button>
 <button onClick={() => scrollToId('kundeklub')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-orange-600 transition-colors ">Kundeklub</button>
 </div>
 <button onClick={() => scrollToId('menu')} className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-xl active:scale-95 transition-transform">Bestil nu</button>
 </div>
 </div>
 </nav>

 {/* HERO */}
 <section className="pt-24 pb-12 md:pt-48 md:pb-24 px-6 max-w-6xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center text-left">
 <div className="space-y-6 md:space-y-8 text-left">
 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.15em] ">
 <Zap size={10} className="fill-orange-500 text-orange-500" /> Ingen telefonkø hos {store.name}
 </div>
 <h1 className="text-[54px] sm:text-[72px] md:text-[100px] lg:text-[120px] font-black leading-[0.82] uppercase tracking-tighter text-slate-900">
 Din Pizza. <br />
 <span className="underline decoration-[6px] underline-offset-[8px] md:decoration-[12px] md:underline-offset-[14px]" style={{ color: brandColor }}>Din Mait.</span>
 </h1>
 <p className="text-slate-500 text-base md:text-xl max-w-sm font-medium leading-relaxed pt-2 md:pt-4">
 Smagen af {store.name}, nu med hurtigere bestilling. Ring direkte til din Mait, eller start en chat på få sekunder.
 </p>
 <div className="flex flex-col gap-4 pt-4 max-w-sm">
 <a
 href={`tel:${store.phone_number || store.contact_phone}`}
 className="text-white px-10 py-5 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(234,88,12,0.3)] text-base transition-transform hover:scale-[1.02]"
 style={{ backgroundColor: brandColor }}
 >
 <PhoneCall size={20} /> Ring til din Mait
 </a>
 <button
 onClick={() => setChatOpen(true)}
 className="bg-white border-2 border-slate-100 text-slate-800 px-10 py-5 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-3 text-base shadow-sm hover:bg-slate-50 transition-all"
 >
 <MessageSquare size={20} /> Chat din bestilling
 </button>
 </div>
 </div>

 {/* Hero billede */}
 <div className="relative group w-full max-w-[500px] mx-auto">
 <div className="rounded-[80px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rotate-3 border-[16px] border-white bg-slate-50 aspect-square transition-all duration-700 ease-out group-hover:scale-105 group-hover:rotate-1 group-hover:shadow-[0_60px_120px_-30px_rgba(0,0,0,0.2)] cursor-pointer relative">
 <img
 src={store.cover_image_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1000'}
 className="w-full h-full object-cover scale-110 transition-transform duration-1000 group-hover:scale-100"
 alt={store.name}
 />
 </div>
 <div className="absolute -bottom-4 left-2 md:-left-8 bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-[28px] md:rounded-[35px] flex items-center gap-3 md:gap-5 shadow-2xl border border-slate-50 z-10">
 <div className={`h-5 w-5 md:h-6 md:w-6 rounded-full flex items-center justify-center text-white ${isOpen ? 'bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}>
 <Pizza size={10} />
 </div>
 <div>
 <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-0.5 leading-none">{isOpen ? 'Ovnene er varme' : 'Vi holder lukket'}</p>
 <p className={`font-black tracking-tight uppercase text-base md:text-lg leading-none ${isOpen ? 'text-slate-800' : 'text-red-500'}`}>
 {isOpen ? `${store.waiting_time || 20} min ventetid` : 'Lukket'}
 </p>
 </div>
 </div>
 </div>
 </section>

 {/* MENU */}
 <section id="menu" className="bg-white py-16 md:py-32 px-6 rounded-t-[60px] md:rounded-t-[80px] shadow-[0_-30px_60px_rgba(0,0,0,0.02)] -mt-12">
 <div className="max-w-6xl mx-auto">
 <div className="mb-8 md:mb-12">
 <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-2">Menukortet</h2>
 <p className="text-slate-400 font-bold uppercase tracking-widest text-xs ">
 Håndplukket menu fra {store.name}.
 </p>
 </div>
 <div className="flex flex-wrap gap-3 mb-12">
 {categoryLabels.map((cat) => (
 <button
 key={cat}
 onClick={() => { setActiveCategory(cat); setIsMenuExpanded(false); }}
 className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border ${activeCategory === cat ? 'text-white border-transparent shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
 style={activeCategory === cat ? { backgroundColor: brandColor } : {}}
 >
 {cat}
 </button>
 ))}
 </div>

 {displayedItems.length === 0 ? (
 <div className="text-center py-20">
 <p className="text-slate-400 ">Ingen menupunkter tilgængelige i denne kategori.</p>
 </div>
 ) : (
 <>
 {activeCategory.toUpperCase().includes('TILBEH') && currentItems.some(i => i.variants?.['Fam. 60x60']) && (
   <p className="text-xs text-slate-400 mb-4">* Priser gælder alm. størrelse. Fam. 60×60 priser ses ved bestilling.</p>
 )}
 <div className="grid md:grid-cols-2 gap-8">
 {displayedItems.map((item, index) => (
 <div
   key={item.id}
   onClick={() => setModalItem(item)}
   className="p-5 md:p-10 rounded-[32px] md:rounded-[48px] border border-slate-100 flex justify-between items-center bg-[#FAFAFA]/50 hover:bg-white hover:shadow-2xl hover:border-orange-200 transition-all group cursor-pointer"
 >
   <div className="space-y-1 max-w-[68%]">
     <div className="flex items-baseline gap-1.5 md:gap-2 mb-1">
       {item.nr != null && item.nr !== '' && (
         <span className="text-[15px] md:text-[20px] font-black shrink-0" style={{ color: brandColor }}>
           {item.nr}.
         </span>
       )}
       <h3 className="font-black text-[17px] md:text-[22px] text-slate-800 uppercase leading-tight md:leading-none">{item.navn}</h3>
     </div>
     <p className="text-slate-400 text-xs md:text-sm font-medium">{item.beskrivelse}</p>
   </div>
   <div className="text-right shrink-0 flex flex-col items-end gap-2">
     <span className="text-[20px] md:text-[28px] font-black whitespace-nowrap" style={{ color: brandColor }}>{item.pris} kr.</span>
     <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-colors">
       <Plus size={10} /> Tilføj
     </span>
   </div>
 </div>
 ))}
 </div>

 {currentItems.length > 6 && (
 <div className="mt-16 flex justify-center">
 <button onClick={() => setIsMenuExpanded(!isMenuExpanded)} className="flex flex-col items-center gap-3 group transition-all">
 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-orange-600 ">
 {isMenuExpanded ? 'Vis mindre' : 'Se hele menukortet'}
 </span>
 <div className={`h-14 w-14 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-300 group-hover:border-orange-600 group-hover:text-orange-600 transition-all shadow-sm ${isMenuExpanded ? 'rotate-180' : ''}`}>
 <ChevronDown size={28} />
 </div>
 </button>
 </div>
 )}
 </>
 )}
 </div>
 </section>

 {/* MODERNE SERVICE */}
 <section className="py-16 md:py-32 px-6 bg-slate-50">
 <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
 <div className="space-y-5 md:space-y-6">
 <div className="font-black text-xs uppercase tracking-[0.3em] " style={{ color: brandColor }}>Moderne Service</div>
 <h2 className="text-[36px] md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9] uppercase text-slate-900">
 Spørg din Mait <br /> hos {store.name}
 </h2>
 <p className="text-slate-500 text-xl font-medium leading-relaxed max-w-md pt-4">
 Bestil hurtigt og nemt — ingen telefonkø, ingen ventetid på svar. Din Mait er klar med det samme, døgnet rundt.
 </p>
 <div className="flex items-center gap-4 pt-4">
 <div className="h-12 w-12 rounded-full bg-white shadow-md flex items-center justify-center" style={{ color: brandColor }}>
 <Zap size={20} fill="currentColor" />
 </div>
 <p className="text-xs font-black uppercase tracking-widest text-slate-400 ">Intelligent digital ekspedition</p>
 </div>
 </div>

 <div className="bg-[#0B0F19] p-8 md:p-16 rounded-[40px] md:rounded-[65px] text-white relative overflow-hidden shadow-2xl group">
 <div className="relative z-10">
 <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-7 md:mb-10 shadow-lg rotate-3 group-hover:rotate-0 transition-transform" style={{ backgroundColor: brandColor }}>
 <MessageCircle size={24} className="fill-white" />
 </div>
 <blockquote className="text-xl md:text-[30px] font-black mb-7 md:mb-10 tracking-tight leading-[1.2]">
 "Hej Mait, jeg vil gerne have en Roma klar til kl. 18.00 og en Fanta – tak!"
 </blockquote>
 <div className="flex items-center gap-3">
 <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
 <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 ">
 Getmait: Noteret, vi ses kl. 18.00!
 </p>
 </div>
 </div>
 <span className="absolute -bottom-10 -right-10 text-[200px] font-black text-white/[0.03] pointer-events-none uppercase select-none leading-none">MAIT</span>
 </div>
 </div>
 </section>

 {/* SMS KUNDEKLUB */}
 <section id="kundeklub" className="py-16 md:py-32 px-6 bg-white overflow-hidden border-t border-slate-50">
 <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10 md:gap-16">

 {/* VENSTRE SIDE */}
 <div className="lg:w-1/2 space-y-8 text-left text-slate-900">
 <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-orange-50 border border-orange-100" style={{ color: brandColor }}>
 <Smartphone size={16} />
 <span className="text-[10px] font-black uppercase tracking-widest leading-none">
 Bliv en del af {store.name}-familien
 </span>
 </div>
 <h2 className="text-4xl md:text-5xl lg:text-7xl font-black uppercase tracking-tighter leading-[0.9] text-slate-900">
 Få tilbud via <br />
 <span style={{ color: brandColor }}>Kundeklubben.</span>
 </h2>
 <p className="text-slate-500 text-xl font-medium leading-relaxed max-w-md">
 Tilmeld dig vores eksklusive fordelsklub og modtag hemmelige tilbud, før alle andre.
 Det er gratis, og vi sender kun det bedste.
 </p>
 </div>

 {/* HØJRE SIDE */}
 <div className="lg:w-1/2 w-full">
 {isSubscribed ? (
 <div className="p-12 rounded-[50px] text-white text-center shadow-2xl" style={{ backgroundColor: brandColor }}>
 <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
 <Check size={40} strokeWidth={4} />
 </div>
 <h3 className="text-3xl font-black uppercase mb-2">
 Hej {name.trim().split(' ')[0]}! 🎉
 </h3>
 <p className="text-white/80 font-medium leading-relaxed">
 Du er nu en del af {store.name}-familien.<br />
 Vi sørger for, at du kun hører fra os, når det er det hele værd.
 </p>
 </div>
 ) : klubStep === 1 ? (
 <form onSubmit={handleStep1} className="bg-[#FAFAFA] p-7 md:p-14 rounded-[60px] border border-slate-100 shadow-xl space-y-6 relative overflow-hidden">

 {/* NAVN */}
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block">Dit Navn</label>
 <div className="relative">
 <input
 required
 type="text"
 placeholder="F.eks. Anders Andersen"
 className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-5 px-8 pl-14 text-lg font-bold outline-none transition-all placeholder:text-slate-200 shadow-inner "
 onFocus={e => e.target.style.borderColor = brandColor}
 onBlur={e => e.target.style.borderColor = ''}
 value={name}
 onChange={(e) => setName(e.target.value)}
 />
 <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
 </div>
 </div>

 {/* TELEFON */}
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block">Dit Telefonnummer</label>
 <div className="relative">
 <input
 required
 type="tel"
 placeholder="+45 00 00 00 00"
 className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-5 px-8 pl-14 text-lg font-bold outline-none transition-all placeholder:text-slate-200 shadow-inner "
 onFocus={e => e.target.style.borderColor = brandColor}
 onBlur={e => e.target.style.borderColor = ''}
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 />
 <Phone size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
 </div>
 </div>

 {/* GDPR */}
 <label className="flex items-start gap-4 cursor-pointer group">
 <div className="relative mt-1 shrink-0">
 <input type="checkbox" required className="peer sr-only" checked={gdprAccepted} onChange={() => setGdprAccepted(!gdprAccepted)} />
 <div className="w-6 h-6 border-2 border-slate-200 rounded-lg bg-white peer-checked:bg-orange-600 peer-checked:border-orange-600 transition-all shadow-sm" style={gdprAccepted ? { backgroundColor: brandColor, borderColor: brandColor } : {}}></div>
 {gdprAccepted && <Check className="absolute inset-0 text-white w-6 h-6 p-1" strokeWidth={4} />}
 </div>
 <div className="flex-1 text-xs font-medium text-slate-400 leading-relaxed group-hover:text-slate-600 transition-colors">
 Jeg giver samtykke til, at {store.name} må sende mig SMS-marketing. Jeg kan til enhver tid afmelde mig. Læs vores{' '}
 <button type="button" onClick={(e) => { e.preventDefault(); setShowPrivacyPolicy(true); }} className="underline hover:text-orange-600 transition-colors">Privatlivspolitik</button>.
 </div>
 </label>

 {/* KNAP */}
 <button
 disabled={!gdprAccepted || checkingPhone}
 type="submit"
 className="w-full text-white py-6 rounded-[24px] font-black uppercase tracking-widest text-lg shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
 style={{ backgroundColor: brandColor }}
 >
 {checkingPhone ? <Zap className="animate-spin" size={24} /> : <>Næste <ArrowRight size={24} /></>}
 </button>

 {subscribeError && (
 <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
 <AlertCircle size={16} className="shrink-0 text-orange-500" />
 <span>{subscribeError}</span>
 </div>
 )}

 <div className="flex items-center justify-center gap-3 opacity-30 pt-2">
 <ShieldCheck size={14} />
 <span className="text-[10px] font-black uppercase tracking-widest ">100% GDPR Sikret</span>
 </div>
 </form>
 ) : (
 <form onSubmit={handleSubscribe} className="bg-[#FAFAFA] p-7 md:p-14 rounded-[60px] border border-slate-100 shadow-xl space-y-6 relative overflow-hidden">

 {/* TRIN INDIKATOR */}
 <div className="flex items-center gap-2 mb-2">
 <div className="w-8 h-2 rounded-full bg-slate-200"></div>
 <div className="w-8 h-2 rounded-full" style={{ backgroundColor: brandColor }}></div>
 <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Trin 2 / 2</span>
 </div>

 <div className="space-y-1">
 <h3 className="text-2xl font-black uppercase text-slate-900 leading-tight">Hvad er din adresse?</h3>
 <p className="text-sm font-medium text-slate-400 leading-relaxed">
 Vi bruger den, når du svarer ja til levering på vores tilbud.
 </p>
 </div>

 {/* ADRESSE */}
 <div className="space-y-2">
 <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block">Leveringsadresse</label>
 <div className="relative">
 <input
 required
 autoFocus
 type="text"
 placeholder="F.eks. Strandvej 12, 2900 Hellerup"
 className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-5 px-8 pl-14 text-lg font-bold outline-none transition-all placeholder:text-slate-200 shadow-inner "
 onFocus={e => e.target.style.borderColor = brandColor}
 onBlur={e => e.target.style.borderColor = ''}
 value={address}
 onChange={(e) => setAddress(e.target.value)}
 />
 <MapPin size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
 </div>
 </div>

 {/* KNAPPER */}
 <button
 disabled={isSubmitting}
 type="submit"
 className="w-full text-white py-6 rounded-[24px] font-black uppercase tracking-widest text-lg shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
 style={{ backgroundColor: brandColor }}
 >
 {isSubmitting ? <Zap className="animate-spin" size={24} /> : <>Tilmeld mig nu <ArrowRight size={24} /></>}
 </button>

 <button
 type="button"
 onClick={() => setKlubStep(1)}
 className="w-full text-slate-400 text-sm font-bold text-center hover:text-slate-600 transition-colors"
 >
 ← Tilbage
 </button>

 {subscribeError && (
 <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
 <AlertCircle size={16} className="shrink-0 text-orange-500" />
 <span>{subscribeError}</span>
 </div>
 )}

 <div className="flex items-center justify-center gap-3 opacity-30 pt-2">
 <ShieldCheck size={14} />
 <span className="text-[10px] font-black uppercase tracking-widest ">100% GDPR Sikret</span>
 </div>
 </form>
 )}
 </div>
 </div>
 </section>

 {/* FOOTER */}
 <footer className="bg-[#0B0F19] pt-12 md:pt-24 pb-12 px-6 text-white border-t border-white/5">
 <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
 <div className="space-y-6">
 <div className="flex items-center gap-3">
 <Pizza style={{ color: brandColor }} size={32} />
 <div className="font-black text-2xl tracking-tighter uppercase leading-none">{store.name}</div>
 </div>
 <p className="text-white/60 text-sm font-medium leading-relaxed max-w-xs">
 Traditionelt håndværk kombineret med personlig digital service.
 {store.city && ` Autentisk smag fra ${store.city}.`}
 </p>
 {store.smiley_url && (
 <a href={store.smiley_url} target="_blank" rel="noopener noreferrer"
 className="inline-flex items-center gap-2 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:text-orange-600 transition-colors ">
 <ShieldCheck size={12} /> Se kontrolrapport
 </a>
 )}
 </div>

 <div className="space-y-6">
 <h4 className="text-[11px] font-black uppercase tracking-[0.25em] leading-none" style={{ color: brandColor }}>Åbningstider</h4>
 <div className="space-y-3 text-sm font-bold text-slate-400">
 {openingHoursFormatted ? openingHoursFormatted.map((row, i) => (
 <div key={i} className="flex justify-between border-b border-white/5 pb-2">
 <span>{row.label}:</span>
 <span className="text-white">{row.time}</span>
 </div>
 )) : (
 <p className="text-slate-600 text-xs">Kontakt os for åbningstider.</p>
 )}
 </div>
 </div>

 <div className="space-y-6">
 <h4 className="text-[11px] font-black uppercase tracking-[0.25em] leading-none" style={{ color: brandColor }}>Kontakt</h4>
 <div className="space-y-4 text-sm font-bold text-white">
 {store.address && (
 <div className="flex items-start gap-3">
 <MapPin size={18} style={{ color: brandColor }} className="shrink-0 mt-0.5" />
 <span>{store.address}</span>
 </div>
 )}
 {store.contact_phone && (
 <div className="flex items-center gap-3">
 <UserCheck size={18} style={{ color: brandColor }} className="shrink-0" />
 <a href={`tel:${store.contact_phone}`} className="hover:text-orange-400 transition-colors">
 {store.contact_phone}
 </a>
 </div>
 )}
 {store.cvr_number && (
 <div className="flex items-center gap-3">
 <Building2 size={18} style={{ color: brandColor }} className="shrink-0" />
 <span>CVR {store.cvr_number}</span>
 </div>
 )}
 </div>
 </div>
 </div>

 <div className="max-w-6xl mx-auto mt-20 pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-white/20 text-[10px] font-bold uppercase tracking-widest">
 <span>Powered by GetMait • © 2026 {store.name}</span>
 <button onClick={() => setShowTerms(true)} className="hover:text-white/50 transition-colors underline underline-offset-2">
 Handelsbetingelser
 </button>
 </div>
 </footer>

 {/* CHAT WIDGET */}
 <ChatWidget
   forceOpen={chatOpen}
   onOpen={() => setChatOpen(false)}
   pendingOrder={pendingOrder}
   onOrderSent={() => setPendingOrder(null)}
 />

 {/* STICKY KURV-BAR */}
 {cart.length > 0 && (
   <div className="fixed bottom-28 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
     <div className="pointer-events-auto bg-slate-900 text-white rounded-full pl-5 pr-2 py-2 flex items-center gap-4 shadow-2xl border border-slate-800">
       <div className="flex items-center gap-2.5">
         <ShoppingCart size={16} className="opacity-75" />
         <span className="font-black text-sm">{cartCount} vare{cartCount !== 1 ? 'r' : ''}</span>
         <span className="text-slate-500">·</span>
         <span className="font-black text-sm">{cartTotal} kr</span>
       </div>
       <button
         onClick={handleBestil}
         className="text-white font-black text-sm px-5 py-2 rounded-full transition-transform active:scale-95 shadow-lg"
         style={{ backgroundColor: brandColor }}
       >
         Bestil nu
       </button>
     </div>
   </div>
 )}

 {/* ITEM CUSTOMIZATION MODAL */}
 {modalItem && (
   <ItemModal
     item={modalItem}
     tilbehoerItems={tilbehoerItems}
     brandColor={brandColor}
     onAdd={(cartItem) => setCart(prev => [...prev, cartItem])}
     onClose={() => setModalItem(null)}
   />
 )}

 {/* HANDELSBETINGELSER MODAL */}
 {showTerms && (
 <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setShowTerms(false)}>
 <div
 className="bg-white w-full sm:max-w-2xl max-h-[90vh] sm:rounded-[2.5rem] rounded-t-[2.5rem] overflow-y-auto shadow-2xl"
 onClick={e => e.stopPropagation()}
 >
 {/* Header */}
 <div className="sticky top-0 bg-white border-b border-slate-100 px-8 py-6 flex justify-between items-center rounded-t-[2.5rem] z-10">
 <div>
 <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-1" style={{ color: brandColor }}>Juridisk</p>
 <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Handelsbetingelser</h2>
 </div>
 <button onClick={() => setShowTerms(false)} className="p-3 bg-slate-100 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all text-slate-400">
 <X size={20} />
 </button>
 </div>

 {/* Indhold */}
 <div className="px-8 py-8 space-y-8 text-slate-600 text-sm leading-relaxed">

 {/* Virksomhedsoplysninger */}
 <section className="space-y-3">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">1. Virksomhedsoplysninger</h3>
 <div className="bg-slate-50 rounded-2xl p-5 space-y-1 font-medium">
 <p className="font-black text-slate-900">{store.name}</p>
 {store.address && <p>{store.address}</p>}
 {store.city && <p>{store.city}</p>}
 {store.cvr_number && <p>CVR-nr.: {store.cvr_number}</p>}
 {store.contact_phone && (
 <p>Tlf.: <a href={`tel:${store.contact_phone}`} className="underline" style={{ color: brandColor }}>{store.contact_phone}</a></p>
 )}
 </div>
 </section>

 {/* Bestilling */}
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">2. Bestilling</h3>
 <p>Bestilling hos {store.name} kan foretages via vores hjemmeside, telefon eller chat. En bestilling er bindende, når du har modtaget en bekræftelse. Vi forbeholder os ret til at afvise bestillinger ved udsolgte varer eller ved force majeure.</p>
 </section>

 {/* Priser og betaling */}
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">3. Priser og betaling</h3>
 <p>Alle priser er angivet i danske kroner (DKK) inkl. moms. {store.name} forbeholder sig ret til at ændre priser uden forudgående varsel. Betaling sker ved afhentning eller levering med de betalingsmidler, vi accepterer.</p>
 </section>

 {/* Afhentning og levering */}
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">4. Afhentning og levering</h3>
 <p>Forventet ventetid er ca. {store.waiting_time || 20} minutter fra bestillingstidspunktet. Ventetiden er vejledende og kan variere afhængigt af efterspørgsel. {store.name} er ikke ansvarlig for forsinkelser som følge af forhold uden for vores kontrol.</p>
 </section>

 {/* Fortrydelsesret */}
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">5. Fortrydelsesret</h3>
 <p>I henhold til forbrugeraftaleloven § 18, stk. 2, nr. 4, gælder der <strong>ingen fortrydelsesret</strong> for levering af fødevarer og andre varer, der forringes hurtigt. Bestilling af mad og drikkevarer hos {store.name} er derfor bindende.</p>
 </section>

 {/* Reklamation */}
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">6. Reklamation</h3>
 <p>Har du oplevet fejl eller mangler ved din ordre, bedes du kontakte os hurtigst muligt — gerne samme dag. Vi behandler alle reklamationer individuelt og bestræber os på at finde en tilfredsstillende løsning.</p>
 {store.contact_phone && (
 <p>Kontakt os på <a href={`tel:${store.contact_phone}`} className="underline font-bold" style={{ color: brandColor }}>{store.contact_phone}</a>.</p>
 )}
 </section>

 {/* Persondata */}
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">7. Persondata og GDPR</h3>
 <p>{store.name} behandler dine personoplysninger i overensstemmelse med gældende databeskyttelseslovgivning (GDPR). Oplysninger indsamlet i forbindelse med din bestilling bruges udelukkende til at behandle og levere din ordre samt til at kontakte dig ved behov.</p>
 <p>Ved tilmelding til Kundeklubben giver du samtykke til modtagelse af markedsføring. Du kan til enhver tid afmelde dig.</p>
 </section>

 {/* Tvister */}
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">8. Tvister og lovvalg</h3>
 <p>Disse handelsbetingelser er underlagt dansk ret. Opstår der en tvist, som ikke kan løses i mindelighed, kan sagen indbringes for de ordinære danske domstole.</p>
 </section>

 <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">
 Senest opdateret: {new Date().getFullYear()} • {store.name}
 </p>
 </div>
 </div>
 </div>
 )}

 {/* PRIVATLIVSPOLITIK MODAL — Kundeklub */}
 {showPrivacyPolicy && (
 <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setShowPrivacyPolicy(false)}>
 <div className="bg-white w-full sm:max-w-lg max-h-[90vh] rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
 <div>
 <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: brandColor }}>Kundeklub</p>
 <h2 className="text-lg font-black text-slate-900 leading-tight">Privatlivspolitik</h2>
 </div>
 <button onClick={() => setShowPrivacyPolicy(false)} className="p-3 bg-slate-100 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all text-slate-400">
 <X size={18} />
 </button>
 </div>
 <div className="overflow-y-auto p-6 space-y-5 text-sm text-slate-600 leading-relaxed">
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">1. Dataansvarlig</h3>
 <p>{store.name}{store.cvr_number ? ` (CVR: ${store.cvr_number})` : ''}{store.address ? `, ${store.address}` : ''} er dataansvarlig for behandlingen af de personoplysninger, du afgiver ved tilmelding til Kundeklubben.</p>
 {store.contact_phone && <p>Kontakt: <a href={`tel:${store.contact_phone}`} className="underline font-bold" style={{ color: brandColor }}>{store.contact_phone}</a></p>}
 </section>
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">2. Formål og retsgrundlag</h3>
 <p>Vi behandler dine oplysninger med det formål at sende dig tilbud og nyheder via SMS. Retsgrundlaget er dit samtykke, jf. GDPR art. 6(1)(a). Du kan til enhver tid tilbagekalde dit samtykke.</p>
 </section>
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">3. Oplysninger vi behandler</h3>
 <p>Vi gemmer dit navn, telefonnummer, tidspunktet for dit samtykke samt den tekst du accepterede. Vi gemmer ikke betalingsoplysninger eller andre følsomme data.</p>
 </section>
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">4. Opbevaring</h3>
 <p>Dine oplysninger opbevares, så længe du er tilmeldt Kundeklubben. Ved afmelding slettes eller anonymiseres dine data inden for 30 dage.</p>
 </section>
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">5. Dine rettigheder</h3>
 <p>Du har ret til indsigt, berigtigelse, sletning og dataportabilitet. Du har ret til at gøre indsigelse mod behandlingen og til at tilbagekalde dit samtykke. Kontakt os for at udøve disse rettigheder.</p>
 </section>
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">6. Afmelding</h3>
 <p>Du kan til enhver tid afmelde dig Kundeklubben ved at kontakte {store.name} direkte{store.contact_phone ? ` på ${store.contact_phone}` : ''}. Herefter modtager du ikke flere SMS-beskeder.</p>
 </section>
 <section className="space-y-2">
 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">7. Klage</h3>
 <p>Hvis du mener, at vi behandler dine oplysninger i strid med databeskyttelsesreglerne, kan du klage til <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: brandColor }}>Datatilsynet</a> (datatilsynet.dk).</p>
 </section>
 <p className="text-xs text-slate-400 pt-4 border-t border-slate-100">Senest opdateret: {new Date().getFullYear()} • {store.name}</p>
 </div>
 </div>
 </div>
 )}

 <style>{`
 .custom-scrollbar::-webkit-scrollbar { width: 6px; }
 .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
 .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
 @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
 .animate-bounce-slow { animation: bounce-slow 4s infinite ease-in-out; }
 @keyframes chat-overlay-fade { from { opacity: 0; } to { opacity: 1; } }
 @keyframes chat-panel-slide { from { opacity: 0; transform: translateY(40px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
 .chat-overlay-in { animation: chat-overlay-fade 0.4s ease-out; }
 .chat-panel-in { animation: chat-panel-slide 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
 `}</style>
 </div>
 );
};

export default App;
